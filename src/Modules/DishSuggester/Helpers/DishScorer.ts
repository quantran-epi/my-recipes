import { Dishes, DishesIngredientAmount } from "@store/Models/Dishes";
import { Ingredient, IngredientInventory, IngredientUnit } from "@store/Models/Ingredient";
import { IngredientUnitHelper } from "@common/Helpers/IngredientUnitHelper";
import { InventoryHelper } from "@common/Helpers/InventoryHelper";
import { CostEstimateHelper } from "@common/Helpers/CostEstimateHelper";
import { IngredientPriceRange } from "@common/Helpers/IngredientPriceHelper";
import { InventoryHealthConfig } from "@store/Models/SharedConfig";

export type ScoredDish = {
    dish: Dishes;
    score: number; // 0..1
    matchedIngredientIds: string[];
    missingIngredientIds: string[];
    stockedIngredientIds?: string[];
    partialIngredientIds?: string[];
    urgentIngredients?: ScoredDishUrgentIngredient[];
    ingredientDetails?: ScoredDishIngredientDetail[];
    extraShoppingCost?: IngredientPriceRange | null;
    missingPriceCount?: number;
}

export type ScoredDishUrgentIngredient = {
    ingredientId: string;
    daysLeft: number;
}

export type ScoredDishIngredientDetail = {
    ingredientId: string;
    requiredAmount: number;
    inStockAmount: number;
    needToBuyAmount: number;
    unit: IngredientUnit;
    matched: boolean;
    partial: boolean;
    alwaysAvailable: boolean;
}

export type ScoredDishGroup = {
    label: string;
    minScore: number;
    maxScore: number;
    color: string;
    dishes: ScoredDish[];
}

// Recursively collect all unique ingredient IDs from a dish and its included dishes
const collectAllIngredientIds = (
    dish: Dishes,
    dishById: Map<string, Dishes>,
    cache = new Map<string, string[]>(),
    visited = new Set<string>(),
): string[] => {
    if (visited.has(dish.id)) return [];
    const cached = cache.get(dish.id);
    if (cached) return cached;
    visited.add(dish.id);
    const own = dish.ingredients.filter(i => i.required !== false).map(i => i.ingredientId);
    const fromIncluded = dish.includeDishes.flatMap(id => {
        const d = dishById.get(id);
        return d ? collectAllIngredientIds(d, dishById, cache, visited) : [];
    });
    const result = Array.from(new Set([...own, ...fromIncluded]));
    cache.set(dish.id, result);
    return result;
};

const collectAllIngredientAmounts = (
    dish: Dishes,
    dishById: Map<string, Dishes>,
    cache = new Map<string, DishesIngredientAmount[]>(),
    visited = new Set<string>(),
): DishesIngredientAmount[] => {
    if (visited.has(dish.id)) return [];
    const cached = cache.get(dish.id);
    if (cached) return cached;
    visited.add(dish.id);
    const own = dish.ingredients.filter(i => i.required !== false);
    const fromIncluded = dish.includeDishes.flatMap(id => {
        const d = dishById.get(id);
        return d ? collectAllIngredientAmounts(d, dishById, cache, visited) : [];
    });
    const result = [...own, ...fromIncluded];
    cache.set(dish.id, result);
    return result;
};

const getNearestUrgentDays = (scored: ScoredDish): number => {
    const days = scored.urgentIngredients?.map(item => item.daysLeft) ?? [];
    return days.length > 0 ? Math.min(...days) : Number.POSITIVE_INFINITY;
};

const compareInventoryPriority = (a: ScoredDish, b: ScoredDish): number => {
    const aUrgentCount = a.urgentIngredients?.length ?? 0;
    const bUrgentCount = b.urgentIngredients?.length ?? 0;
    const aHasUrgent = aUrgentCount > 0;
    const bHasUrgent = bUrgentCount > 0;

    if (aHasUrgent !== bHasUrgent) return aHasUrgent ? -1 : 1;
    if (aHasUrgent && bHasUrgent) {
        const daysDiff = getNearestUrgentDays(a) - getNearestUrgentDays(b);
        if (daysDiff !== 0) return daysDiff;
        if (aUrgentCount !== bUrgentCount) return bUrgentCount - aUrgentCount;
    }
    if (b.score !== a.score) return b.score - a.score;
    return a.missingIngredientIds.length - b.missingIngredientIds.length;
};

export const DishScorer = {
    score(dishes: Dishes[], selectedIngredientIds: string[], allDishes: Dishes[]): ScoredDish[] {
        if (selectedIngredientIds.length === 0) return [];

        const dishById = new Map(allDishes.map(dish => [dish.id, dish]));
        const ingredientIdsCache = new Map<string, string[]>();
        const selectedIngredientSet = new Set(selectedIngredientIds);

        return dishes
            .map(dish => {
                const allRequired = collectAllIngredientIds(dish, dishById, ingredientIdsCache);
                if (allRequired.length === 0) return null;

                const matched = allRequired.filter(id => selectedIngredientSet.has(id));
                const missing = allRequired.filter(id => !selectedIngredientSet.has(id));
                const score = matched.length / allRequired.length;

                return {
                    dish,
                    score,
                    matchedIngredientIds: matched,
                    missingIngredientIds: missing,
                } as ScoredDish;
            })
            .filter((s): s is ScoredDish => s !== null && s.score > 0)
            .sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score;
                return a.missingIngredientIds.length - b.missingIngredientIds.length;
            });
    },

    scoreWithInventory(dishes: Dishes[], inventory: Record<string, IngredientInventory>, allDishes: Dishes[], allIngredients: Ingredient[], inventoryConfig?: InventoryHealthConfig): ScoredDish[] {
        if (Object.keys(inventory).length === 0) return [];

        const dishById = new Map(allDishes.map(dish => [dish.id, dish]));
        const ingredientById = new Map(allIngredients.map(ingredient => [ingredient.id, ingredient]));
        const amountsCache = new Map<string, DishesIngredientAmount[]>();

        return dishes
            .map(dish => {
                const amounts = collectAllIngredientAmounts(dish, dishById, amountsCache);
                const grouped: Record<string, { required: number; unit: IngredientUnit; ingredient?: Ingredient }> = {};
                amounts.forEach(amount => {
                    const ingredient = ingredientById.get(amount.ingredientId);
                    if (InventoryHelper.isAlwaysAvailable(ingredient)) return;
                    const baseUnit = IngredientUnitHelper.getBaseUnit(ingredient, [amount.unit]);
                    const required = IngredientUnitHelper.toBaseAmount(ingredient, amount.amount, amount.unit, baseUnit)
                        ?? IngredientUnitHelper.parseAmount(amount.amount);
                    if (!grouped[amount.ingredientId]) grouped[amount.ingredientId] = { required: 0, unit: baseUnit, ingredient };
                    grouped[amount.ingredientId].required += required;
                });

                const requiredIds = Object.keys(grouped);
                if (requiredIds.length === 0) return null;

                const ingredientDetails = requiredIds.map(id => {
                    const item = grouped[id];
                    const inStock = InventoryHelper.availableAmount(inventory[id], item.ingredient, item.required, inventoryConfig);
                    const matched = item.required > 0 && inStock >= item.required;
                    const needToBuy = Math.max(0, item.required - inStock);
                    return {
                        ingredientId: id,
                        requiredAmount: item.required,
                        inStockAmount: inStock,
                        needToBuyAmount: needToBuy,
                        unit: item.unit,
                        matched,
                        partial: !matched && inStock > 0,
                        alwaysAvailable: false,
                    } as ScoredDishIngredientDetail;
                });
                const stocked = ingredientDetails.filter(item => item.inStockAmount > 0).map(item => item.ingredientId);
                const matched = ingredientDetails.filter(item => item.matched).map(item => item.ingredientId);
                const matchedSet = new Set(matched);
                const missing = requiredIds.filter(id => !matchedSet.has(id));
                const partial = ingredientDetails.filter(item => item.partial).map(item => item.ingredientId);
                const score = matched.length / requiredIds.length;
                const extraShoppingSummary = ingredientDetails.reduce((summary, detail) => {
                    if (detail.needToBuyAmount > 0) {
                        CostEstimateHelper.addAmount(summary, grouped[detail.ingredientId].ingredient, detail.needToBuyAmount, detail.unit);
                    }
                    return summary;
                }, CostEstimateHelper.emptySummary());
                const urgentIngredients = requiredIds
                    .map(id => {
                        const urgent = InventoryHelper.nearestExpiryBatch(inventory[id], grouped[id].ingredient, inventoryConfig);
                        return urgent && InventoryHelper.isUrgentExpiry(urgent.daysLeft, inventoryConfig)
                            ? { ingredientId: id, daysLeft: urgent.daysLeft }
                            : null;
                    })
                    .filter((item): item is ScoredDishUrgentIngredient => item !== null);

                return {
                    dish,
                    score,
                    matchedIngredientIds: matched,
                    missingIngredientIds: missing,
                    stockedIngredientIds: stocked,
                    partialIngredientIds: partial,
                    urgentIngredients,
                    ingredientDetails,
                    extraShoppingCost: CostEstimateHelper.hasPrice(extraShoppingSummary)
                        ? { min: extraShoppingSummary.min, max: extraShoppingSummary.max, currency: extraShoppingSummary.currency }
                        : null,
                    missingPriceCount: extraShoppingSummary.missingPriceCount,
                } as ScoredDish;
            })
            .filter((s): s is ScoredDish => s !== null && s.score > 0 && (s.stockedIngredientIds?.length ?? 0) > 0)
            .sort(compareInventoryPriority);
    },

    group(scored: ScoredDish[]): ScoredDishGroup[] {
        const groups: ScoredDishGroup[] = [
            { label: "Nấu được ngay 🟢", minScore: 1, maxScore: 1, color: "#52c41a", dishes: [] },
            { label: "Gần đủ nguyên liệu 🟡", minScore: 0.5, maxScore: 1, color: "#faad14", dishes: [] },
            { label: "Có thể gợi ý 🟠", minScore: 0, maxScore: 0.5, color: "#fa8c16", dishes: [] },
        ];

        for (const s of scored) {
            if (s.score >= 1) {
                groups[0].dishes.push(s);
            } else if (s.score >= 0.5) {
                groups[1].dishes.push(s);
            } else {
                groups[2].dishes.push(s);
            }
        }

        return groups.filter(g => g.dishes.length > 0);
    }
};
