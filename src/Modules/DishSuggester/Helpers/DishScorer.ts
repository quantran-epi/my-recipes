import { Dishes, DishesIngredientAmount } from "@store/Models/Dishes";
import { Ingredient, IngredientInventory, IngredientUnit } from "@store/Models/Ingredient";
import { IngredientUnitHelper } from "@common/Helpers/IngredientUnitHelper";
import { InventoryHelper } from "@common/Helpers/InventoryHelper";
import { CostEstimateHelper } from "@common/Helpers/CostEstimateHelper";
import { IngredientPriceHelper, IngredientPriceRange } from "@common/Helpers/IngredientPriceHelper";
import { DishDurationHelper } from "@common/Helpers/DishDurationHelper";
import { DishNutritionHelper } from "@common/Helpers/DishNutritionHelper";
import { NutritionGoalHelper } from "@common/Helpers/NutritionGoalHelper";
import { InventoryHealthConfig, NutritionGoal } from "@store/Models/SharedConfig";
import type { HouseholdPreferenceProfile } from "@store/Reducers/AppContextReducer";

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
    cookNowScore?: number;
    cookNowReasons?: string[];
    totalMinutes?: number;
    preferenceMatchedTags?: string[];
    preferenceAvoidedTags?: string[];
    householdMatches?: string[];
    householdWarnings?: string[];
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

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const getDishServingScale = (dish: Dishes, servingCount: number): number => {
    const baseServings = typeof dish.baseServings === "number" && dish.baseServings > 0 ? dish.baseServings : 2;
    return Math.max(0.25, servingCount / baseServings);
};

const scoreInventoryDishes = (
    dishes: Dishes[],
    inventory: Record<string, IngredientInventory>,
    allDishes: Dishes[],
    allIngredients: Ingredient[],
    inventoryConfig?: InventoryHealthConfig,
    getScale: (dish: Dishes) => number = () => 1,
): ScoredDish[] => {
    if (Object.keys(inventory).length === 0) return [];

    const dishById = new Map(allDishes.map(dish => [dish.id, dish]));
    const ingredientById = new Map(allIngredients.map(ingredient => [ingredient.id, ingredient]));
    const amountsCache = new Map<string, DishesIngredientAmount[]>();

    return dishes
        .filter(dish => dish.isAccompaniment !== true)
        .map(dish => {
            const amounts = collectAllIngredientAmounts(dish, dishById, amountsCache);
            const scale = getScale(dish);
            const grouped: Record<string, { required: number; unit: IngredientUnit; ingredient?: Ingredient }> = {};
            amounts.forEach(amount => {
                const ingredient = ingredientById.get(amount.ingredientId);
                if (InventoryHelper.isAlwaysAvailable(ingredient)) return;
                const baseUnit = IngredientUnitHelper.getBaseUnit(ingredient, [amount.unit]);
                const required = (IngredientUnitHelper.toBaseAmount(ingredient, amount.amount, amount.unit, baseUnit)
                    ?? IngredientUnitHelper.parseAmount(amount.amount)) * scale;
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
        .filter((s): s is ScoredDish => s !== null && s.score > 0 && (s.stockedIngredientIds?.length ?? 0) > 0);
};

const getPreferenceScore = (dish: Dishes, profile: HouseholdPreferenceProfile) => {
    const tags = dish.tags ?? [];
    const dishIngredientIds = Array.from(new Set((dish.ingredients ?? []).map(item => item.ingredientId)));
    const preferred = profile.preferredTags.filter(tag => tags.includes(tag));
    const avoided = profile.avoidedTags.filter(tag => tags.includes(tag));
    const favoriteDish = (profile.favoriteDishIds ?? []).includes(dish.id);
    const avoidedDish = (profile.avoidedDishIds ?? []).includes(dish.id);
    const favoriteIngredients = (profile.favoriteIngredientIds ?? []).filter(id => dishIngredientIds.includes(id));
    const avoidedIngredients = (profile.avoidedIngredientIds ?? []).filter(id => dishIngredientIds.includes(id));
    const preferredScore = profile.preferredTags.length > 0 ? preferred.length / profile.preferredTags.length : 1;
    const favoriteBoost = (favoriteDish ? 0.28 : 0) + Math.min(0.18, favoriteIngredients.length * 0.06);
    const avoidPenalty = (avoidedDish ? 0.45 : 0) + avoided.length * 0.3 + Math.min(0.35, avoidedIngredients.length * 0.12);
    return {
        score: clamp01(0.65 + preferredScore * 0.35 + favoriteBoost - avoidPenalty),
        preferred,
        avoided,
        favoriteDish,
        avoidedDish,
        favoriteIngredients,
        avoidedIngredients,
    };
};

const getSpeedScore = (totalMinutes: number, maxMinutes: number): number => {
    if (totalMinutes <= 0) return 0.7;
    if (totalMinutes <= maxMinutes) return 1;
    return clamp01(maxMinutes / totalMinutes);
};

const getBudgetScore = (extraCost: IngredientPriceRange | null | undefined, missingPriceCount: number | undefined, maxExtraCost?: number): number => {
    const unknownPenalty = Math.min(0.35, (missingPriceCount ?? 0) * 0.08);
    if (!extraCost) return clamp01(1 - unknownPenalty);
    if (!maxExtraCost || maxExtraCost <= 0) return clamp01(0.82 - unknownPenalty);
    const base = extraCost.max <= maxExtraCost ? 1 : maxExtraCost / Math.max(extraCost.max, 1);
    return clamp01(base - unknownPenalty);
};

const getCookNowReasons = (
    scored: ScoredDish,
    totalMinutes: number,
    profile: HouseholdPreferenceProfile,
    preference: ReturnType<typeof getPreferenceScore>,
    nutritionGoal?: NutritionGoal,
): string[] => {
    const reasons = [
        scored.missingIngredientIds.length === 0
            ? "Đủ nguyên liệu"
            : `Cần mua ${scored.missingIngredientIds.length} nguyên liệu`,
    ];
    if (totalMinutes > 0) reasons.push(DishDurationHelper.formatMinutes(totalMinutes));
    if (scored.extraShoppingCost) reasons.push(`Mua thêm ~ ${IngredientPriceHelper.formatRange(scored.extraShoppingCost)}`);
    if (preference.favoriteDish) reasons.push("Có người thích món này");
    if (preference.preferred.length > 0) reasons.push(`Hợp ${preference.preferred.slice(0, 2).join(", ")}`);
    if (preference.avoidedDish) reasons.push("Có người tránh món này");
    if (preference.avoided.length > 0) reasons.push(`Cân nhắc ${preference.avoided.slice(0, 2).join(", ")}`);
    if (profile.memberNames?.length) reasons.push(profile.memberNames.slice(0, 2).join(", "));
    if (nutritionGoal) reasons.push(nutritionGoal.name);
    return reasons.slice(0, 5);
};

export const DishScorer = {
    score(dishes: Dishes[], selectedIngredientIds: string[], allDishes: Dishes[]): ScoredDish[] {
        if (selectedIngredientIds.length === 0) return [];

        const dishById = new Map(allDishes.map(dish => [dish.id, dish]));
        const ingredientIdsCache = new Map<string, string[]>();
        const selectedIngredientSet = new Set(selectedIngredientIds);

        return dishes
            .filter(dish => dish.isAccompaniment !== true)
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
        return scoreInventoryDishes(dishes, inventory, allDishes, allIngredients, inventoryConfig)
            .sort(compareInventoryPriority);
    },

    scoreCookNow(
        dishes: Dishes[],
        inventory: Record<string, IngredientInventory>,
        allDishes: Dishes[],
        allIngredients: Ingredient[],
        profile: HouseholdPreferenceProfile,
        inventoryConfig?: InventoryHealthConfig,
        nutritionGoal?: NutritionGoal,
    ): ScoredDish[] {
        const ingredientById = new Map(allIngredients.map(ingredient => [ingredient.id, ingredient]));
        const dishById = new Map(allDishes.map(dish => [dish.id, dish]));
        return scoreInventoryDishes(
            dishes,
            inventory,
            allDishes,
            allIngredients,
            inventoryConfig,
            dish => getDishServingScale(dish, profile.servingCount),
        )
            .map(scored => {
                const totalMinutes = DishDurationHelper.getTotalMinutesForDish(scored.dish, dishById);
                const speedScore = getSpeedScore(totalMinutes, profile.maxCookMinutes);
                const preference = getPreferenceScore(scored.dish, profile);
                const budgetScore = getBudgetScore(scored.extraShoppingCost, scored.missingPriceCount, profile.maxExtraCost);
                const nutrition = nutritionGoal
                    ? NutritionGoalHelper.score(DishNutritionHelper.calculateDishNutrition(scored.dish, allDishes, ingredientById), nutritionGoal)
                    : null;
                const urgentBoost = Math.min(0.08, (scored.urgentIngredients?.length ?? 0) * 0.03);
                const cookNowScore = clamp01(
                    scored.score * 0.42
                    + speedScore * 0.18
                    + preference.score * 0.16
                    + (nutrition?.score ?? 1) * 0.14
                    + budgetScore * 0.10
                    + urgentBoost,
                );

                return {
                    ...scored,
                    cookNowScore,
                    totalMinutes,
                    preferenceMatchedTags: preference.preferred,
                    preferenceAvoidedTags: preference.avoided,
                    householdMatches: [
                        ...(preference.favoriteDish ? ["Món yêu thích"] : []),
                        ...preference.preferred.map(tag => `Thích ${tag}`),
                        ...(preference.favoriteIngredients.length > 0 ? [`Thích ${preference.favoriteIngredients.length} nguyên liệu`] : []),
                    ],
                    householdWarnings: [
                        ...(preference.avoidedDish ? ["Có người tránh món này"] : []),
                        ...preference.avoided.map(tag => `Tránh ${tag}`),
                        ...(preference.avoidedIngredients.length > 0 ? [`Tránh ${preference.avoidedIngredients.length} nguyên liệu`] : []),
                    ],
                    cookNowReasons: getCookNowReasons(scored, totalMinutes, profile, preference, nutritionGoal),
                } as ScoredDish;
            })
            .sort((a, b) => {
                const scoreDiff = (b.cookNowScore ?? 0) - (a.cookNowScore ?? 0);
                if (scoreDiff !== 0) return scoreDiff;
                return compareInventoryPriority(a, b);
            })
            .slice(0, 60);
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
    },

    groupCookNow(scored: ScoredDish[]): ScoredDishGroup[] {
        const groups: ScoredDishGroup[] = [
            { label: "Nấu ngay", minScore: 0.75, maxScore: 1, color: "#389e0d", dishes: [] },
            { label: "Mua thêm ít", minScore: 0.5, maxScore: 0.75, color: "#1677ff", dishes: [] },
            { label: "Dự phòng", minScore: 0, maxScore: 0.5, color: "#fa8c16", dishes: [] },
        ];

        for (const item of scored) {
            if (item.missingIngredientIds.length === 0) {
                groups[0].dishes.push(item);
            } else if ((item.score >= 0.5 || (item.cookNowScore ?? 0) >= 0.58) && item.missingIngredientIds.length <= 3) {
                groups[1].dishes.push(item);
            } else {
                groups[2].dishes.push(item);
            }
        }

        groups.forEach(group => group.dishes.sort((a, b) => (b.cookNowScore ?? b.score) - (a.cookNowScore ?? a.score)));
        return groups.filter(group => group.dishes.length > 0);
    }
};
