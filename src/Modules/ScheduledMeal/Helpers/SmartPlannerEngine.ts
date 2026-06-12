import { CostEstimateHelper } from '@common/Helpers/CostEstimateHelper';
import { DishDurationHelper } from '@common/Helpers/DishDurationHelper';
import { DishNutritionHelper } from '@common/Helpers/DishNutritionHelper';
import { DishServingHelper } from '@common/Helpers/DishServingHelper';
import { HouseholdDishSuitability, HouseholdSuitabilityHelper } from '@common/Helpers/HouseholdSuitabilityHelper';
import { IngredientPriceHelper } from '@common/Helpers/IngredientPriceHelper';
import { InventoryHelper } from '@common/Helpers/InventoryHelper';
import { NutritionGoalHelper, NutritionGoalMatch } from '@common/Helpers/NutritionGoalHelper';
import { Dishes } from '@store/Models/Dishes';
import { Ingredient, IngredientInventory, IngredientUnit } from '@store/Models/Ingredient';
import { ScheduledMeal } from '@store/Models/ScheduledMeal';
import { InventoryHealthConfig, NutritionGoal } from '@store/Models/SharedConfig';
import { CookingSession, DishFeedbackStat } from '@store/Models/CookingSession';
import { HouseholdMemberProfile } from '@store/Reducers/AppContextReducer';
import dayjs, { Dayjs } from 'dayjs';

export type SmartPlannerScope = 'cook_now' | 'day' | 'week';
export type SmartPlannerMealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'any';
export type PlannerMealSlot = 'breakfast' | 'lunch' | 'dinner';
export type SmartPlannerShoppingMode = 'no_shopping' | 'small_top_up' | 'normal';
// One key per scoring dimension. Selecting a priority weights that dimension and
// turns on its companion behaviour (variety de-dupe, expiring-stock bonus). An
// empty list means "balance everything" and falls back to DEFAULT_WEIGHTS.
export type SmartPlannerPriority = 'budget' | 'time' | 'nutrition' | 'household' | 'inventory' | 'variety';

export type SmartPlannerScoreDetail = {
    label: string;
    value: string;
    impact: number;
    description: string;
}

export type ShoppingPreviewRow = {
    ingredientId: string;
    name: string;
    amount: number;
    unit: IngredientUnit;
    costLabel?: string;
    costAverage?: number;
}

export type SmartPlannerDishRecommendation = {
    dish: Dishes;
    score: number;
    reasons: string[];
    warnings: string[];
    costLabel?: string;
    costAverage?: number;
    shoppingCostLabel?: string;
    shoppingCostAverage?: number;
    missingIngredientCount?: number;
    missingRequiredIngredientCount?: number;
    missingRows?: ShoppingPreviewRow[];
    missingIngredientRows: ShoppingPreviewRow[];
    dayCostLabel?: string;
    dayCostAverage?: number;
    dayShoppingCostLabel?: string;
    dayShoppingCostAverage?: number;
    dayBudget?: number;
    nutritionLabel?: string;
    nutritionGoalName?: string;
    nutritionMatch?: NutritionGoalMatch;
    suitabilityScore?: number;
    suitability?: HouseholdDishSuitability;
    totalMinutes?: number;
    urgentIngredientCount: number;
    scoreDetails: SmartPlannerScoreDetail[];
}

export type PlannedDish = SmartPlannerDishRecommendation;

export type SmartPlannerMealSlotDishRange = {
    min: number;
    max: number;
}

export type SmartPlannerMealSlotDishRanges = Record<PlannerMealSlot, SmartPlannerMealSlotDishRange>;

export type SmartPlannerSlotTagRequirement = {
    tag: string;
    min: number;
}

export type SmartPlannerMealSlotTagRequirements = Record<PlannerMealSlot, SmartPlannerSlotTagRequirement[]>;

export type SmartPlannerDayItemsBySlot = Record<PlannerMealSlot, PlannedDish[]>;

export type SmartPlannerDayAlternative = {
    id: string;
    label: string;
    itemsBySlot: SmartPlannerDayItemsBySlot;
    breakfast?: PlannedDish;
    lunch?: PlannedDish;
    dinner?: PlannedDish;
    totalScore: number;
    totalCostAverage: number;
    totalCostLabel: string;
    shoppingCostAverage: number;
    shoppingCostLabel: string;
    nutritionScore?: number;
    suitabilityScore?: number;
    reasons: string[];
    warnings: string[];
    missingRows: ShoppingPreviewRow[];
}

export type PlannedDayAlternative = SmartPlannerDayAlternative;

export type SmartPlannerPlannedDay = {
    date: Dayjs;
    alternatives?: SmartPlannerDayAlternative[];
    selectedAlternativeId?: string;
    itemsBySlot?: SmartPlannerDayItemsBySlot;
    breakfast?: PlannedDish;
    lunch?: PlannedDish;
    dinner?: PlannedDish;
}

export type PlannedDay = SmartPlannerPlannedDay;

export type SmartPlannerPlanSummary = {
    totalScore: number;
    totalCostAverage: number;
    totalCostLabel: string;
    shoppingCostAverage: number;
    shoppingCostLabel: string;
    averageNutritionScore?: number;
    averageHouseholdScore?: number;
    missingIngredientCount: number;
    expiringIngredientCount: number;
    warnings: string[];
    confidence: number;
}

export type SmartPlannerCookNowCategoryKey = 'best_overall' | 'fastest' | 'cheapest' | 'uses_expiring' | 'best_household' | 'best_nutrition' | 'ready_from_inventory';

export type SmartPlannerCookNowCategory = {
    key: SmartPlannerCookNowCategoryKey;
    label: string;
    description: string;
    recommendation?: SmartPlannerDishRecommendation;
}

export type SmartPlannerPlanResult = {
    cookNowCategories?: SmartPlannerCookNowCategory[];
    rankedRecommendations?: SmartPlannerDishRecommendation[];
    plannedDays?: SmartPlannerPlannedDay[];
    summary: SmartPlannerPlanSummary;
}

export type BuildSmartPlannerInput = {
    scope: SmartPlannerScope;
    startDate: Dayjs;
    memberIds: string[];
    mealSlots: SmartPlannerMealSlot[];
    dailyBudget?: number;
    weeklyBudget?: number;
    maxCookMinutes?: number;
    strictTime?: boolean;
    shoppingMode: SmartPlannerShoppingMode;
    maxExtraSpend?: number;
    nutritionGoalId?: string;
    priorities: SmartPlannerPriority[];
    requiredTags: string[];
    avoidedDishIds: string[];
    avoidedIngredientIds: string[];
    requiredExpiringIngredientIds: string[];
    inventoryAwareBudget: boolean;
    advancedEnabled?: boolean;
    mealSlotDishRanges?: SmartPlannerMealSlotDishRanges;
    mealSlotTagRequirements?: SmartPlannerMealSlotTagRequirements;
    shuffleAlternatives?: boolean;
    dishes: Dishes[];
    ingredients: Ingredient[];
    ingredientsById: Map<string, Ingredient>;
    inventoryItems: Record<string, IngredientInventory>;
    inventoryConfig?: InventoryHealthConfig;
    members: HouseholdMemberProfile[];
    nutritionGoals: NutritionGoal[];
    scheduledMeals: ScheduledMeal[];
    cookingSessions: CookingSession[];
    dishFeedback: Record<string, DishFeedbackStat>;
}

type PlannerWeights = {
    household: number;
    inventory: number;
    nutrition: number;
    budget: number;
    time: number;
    variety: number;
}

type UsageContext = {
    usedDishIds: Set<string>;
    usedIngredientCounts: Map<string, number>;
    usedMethodCounts: Map<string, number>;
}

type DishCostInfo = {
    costLabel?: string;
    costAverage?: number;
    shoppingCostLabel?: string;
    shoppingCostAverage?: number;
    missingIngredientCount: number;
    missingRequiredIngredientCount: number;
    missingRows: ShoppingPreviewRow[];
    urgentIngredientCount: number;
    missingPriceCount: number;
}

const PLANNER_MEAL_SLOTS: PlannerMealSlot[] = ['breakfast', 'lunch', 'dinner'];
const ALTERNATIVE_COUNT = 3;
const BASE_CANDIDATE_LIMIT = 18;
const LOW_COST_CANDIDATE_LIMIT = 10;
const DAY_COMBO_POOL_LIMIT = 42;
const SHUFFLE_POOL_LIMIT = 36;
const MEAL_SLOT_DISH_RANGE_MAX = 6;
const METHOD_TAGS = ['Nướng', 'Chiên', 'Hấp', 'Luộc', 'Xào', 'Salad'];

const DEFAULT_MEAL_SLOT_DISH_RANGES: SmartPlannerMealSlotDishRanges = {
    breakfast: { min: 1, max: 1 },
    lunch: { min: 1, max: 1 },
    dinner: { min: 1, max: 1 },
};

const CATEGORY_DEFINITIONS: Array<Omit<SmartPlannerCookNowCategory, 'recommendation'>> = [
    { key: 'best_overall', label: 'Tốt nhất', description: 'Điểm tổng hợp cao nhất theo các tiêu chí đang chọn.' },
    { key: 'fastest', label: 'Nhanh nhất', description: 'Ưu tiên món có thời gian nấu ngắn và vẫn đủ điểm phù hợp.' },
    { key: 'cheapest', label: 'Rẻ nhất', description: 'Xếp theo chi phí cần mua thêm sau khi trừ tồn kho.' },
    { key: 'uses_expiring', label: 'Dùng đồ sắp hết hạn', description: 'Ưu tiên món dùng nguyên liệu đang gần hết hạn trong kho.' },
    { key: 'best_household', label: 'Hợp nhà mình', description: 'Điểm hồ sơ thành viên cao nhất.' },
    { key: 'best_nutrition', label: 'Hợp dinh dưỡng', description: 'Khớp mục tiêu dinh dưỡng tốt nhất.' },
    { key: 'ready_from_inventory', label: 'Không cần mua', description: 'Có thể nấu từ tồn kho và nguyên liệu luôn có.' },
];

const DEFAULT_WEIGHTS: PlannerWeights = {
    household: 0.25,
    inventory: 0.20,
    nutrition: 0.15,
    budget: 0.15,
    time: 0.15,
    variety: 0.10,
};

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const normalizeWeights = (weights: PlannerWeights): PlannerWeights => {
    const total = Object.values(weights).reduce((sum, value) => sum + value, 0) || 1;
    return {
        household: weights.household / total,
        inventory: weights.inventory / total,
        nutrition: weights.nutrition / total,
        budget: weights.budget / total,
        time: weights.time / total,
        variety: weights.variety / total,
    };
};

// Variety keeps a small floor weight even when unselected, so day/week plans
// never repeat the same dish across slots — see getVarietyScore.
const VARIETY_FLOOR_WEIGHT = 0.05;

const getPriorityWeights = (priorities: SmartPlannerPriority[]): PlannerWeights => {
    // No priorities chosen → balance every dimension (the default profile).
    if (priorities.length === 0) return { ...DEFAULT_WEIGHTS };
    const selected = new Set(priorities);
    // Only selected dimensions score; the rest go to weight 0 and stay neutral
    // (variety keeps a floor so de-duplication still works).
    const weights: PlannerWeights = {
        household: selected.has('household') ? DEFAULT_WEIGHTS.household : 0,
        inventory: selected.has('inventory') ? DEFAULT_WEIGHTS.inventory : 0,
        nutrition: selected.has('nutrition') ? DEFAULT_WEIGHTS.nutrition : 0,
        budget: selected.has('budget') ? DEFAULT_WEIGHTS.budget : 0,
        time: selected.has('time') ? DEFAULT_WEIGHTS.time : 0,
        variety: selected.has('variety') ? DEFAULT_WEIGHTS.variety : VARIETY_FLOOR_WEIGHT,
    };
    return normalizeWeights(weights);
};

// A dimension scores when it is selected, or when nothing is selected (the
// balanced default). Mirrors getPriorityWeights so weighting and gating agree.
const isPriorityActive = (priorities: SmartPlannerPriority[], priority: SmartPlannerPriority): boolean =>
    priorities.length === 0 || priorities.includes(priority);

const getSummaryAverage = (summary: { min: number; max: number; pricedCount: number }, emptyValue?: number): number | undefined => {
    if (summary.pricedCount <= 0) return emptyValue;
    return (summary.min + summary.max) / 2;
};

const formatPercent = (value: number): string => `${Math.round(value)}%`;

const normalizeMealSlotDishRange = (range?: Partial<SmartPlannerMealSlotDishRange>): SmartPlannerMealSlotDishRange => {
    const min = Math.max(0, Math.min(MEAL_SLOT_DISH_RANGE_MAX, Math.round(Number(range?.min ?? 1))));
    const max = Math.max(0, Math.min(MEAL_SLOT_DISH_RANGE_MAX, Math.round(Number(range?.max ?? min))));
    return max < min ? { min: max, max: min } : { min, max };
};

const getMealSlotDishRanges = (input: BuildSmartPlannerInput): SmartPlannerMealSlotDishRanges => ({
    breakfast: normalizeMealSlotDishRange(input.mealSlotDishRanges?.breakfast ?? DEFAULT_MEAL_SLOT_DISH_RANGES.breakfast),
    lunch: normalizeMealSlotDishRange(input.mealSlotDishRanges?.lunch ?? DEFAULT_MEAL_SLOT_DISH_RANGES.lunch),
    dinner: normalizeMealSlotDishRange(input.mealSlotDishRanges?.dinner ?? DEFAULT_MEAL_SLOT_DISH_RANGES.dinner),
});

const normalizeSlotTagRequirements = (requirements?: SmartPlannerSlotTagRequirement[]): SmartPlannerSlotTagRequirement[] => {
    if (!Array.isArray(requirements)) return [];
    const collapsed = new Map<string, number>();
    requirements.forEach(item => {
        const tag = String(item?.tag ?? '').trim();
        const min = Math.max(0, Math.min(MEAL_SLOT_DISH_RANGE_MAX, Math.round(Number(item?.min ?? 0))));
        if (!tag || min <= 0) return;
        collapsed.set(tag, Math.max(collapsed.get(tag) ?? 0, min));
    });
    return Array.from(collapsed.entries()).map(([tag, min]) => ({ tag, min }));
};

const getMealSlotTagRequirements = (input: BuildSmartPlannerInput): SmartPlannerMealSlotTagRequirements => ({
    breakfast: normalizeSlotTagRequirements(input.mealSlotTagRequirements?.breakfast),
    lunch: normalizeSlotTagRequirements(input.mealSlotTagRequirements?.lunch),
    dinner: normalizeSlotTagRequirements(input.mealSlotTagRequirements?.dinner),
});

const getSlotTagMinTotal = (requirements: SmartPlannerSlotTagRequirement[]): number =>
    requirements.reduce((sum, requirement) => sum + Math.max(0, requirement.min), 0);

const dishHasTag = (dish: Dishes, tag: string): boolean => Array.isArray(dish.tags) && dish.tags.some(item => item === tag);

const getRandomDishCount = (range: SmartPlannerMealSlotDishRange): number => {
    if (range.max <= range.min) return range.min;
    return range.min + Math.floor(Math.random() * (range.max - range.min + 1));
};

const createEmptyItemsBySlot = (): SmartPlannerDayItemsBySlot => ({
    breakfast: [],
    lunch: [],
    dinner: [],
});

const normalizeItemsBySlot = (itemsBySlot?: Partial<Record<PlannerMealSlot, PlannedDish | PlannedDish[]>>): SmartPlannerDayItemsBySlot => PLANNER_MEAL_SLOTS.reduce((result, slot) => {
    const raw = itemsBySlot?.[slot];
    result[slot] = Array.isArray(raw) ? raw.filter(Boolean) : raw ? [raw] : [];
    return result;
}, createEmptyItemsBySlot());

const flattenItemsBySlot = (itemsBySlot: SmartPlannerDayItemsBySlot): PlannedDish[] => PLANNER_MEAL_SLOTS.flatMap(slot => itemsBySlot[slot]);

const getComboKey = (itemsBySlot: SmartPlannerDayItemsBySlot): string => PLANNER_MEAL_SLOTS
    .map(slot => `${slot}:${itemsBySlot[slot].map(item => item.dish.id).join(',')}`)
    .join('|');

const normalizePlannerInput = (input: BuildSmartPlannerInput): BuildSmartPlannerInput => {
    const advancedEnabled = input.advancedEnabled === true;
    return {
        ...input,
        advancedEnabled,
        dailyBudget: advancedEnabled ? input.dailyBudget : undefined,
        weeklyBudget: advancedEnabled ? input.weeklyBudget : undefined,
        maxCookMinutes: advancedEnabled ? input.maxCookMinutes : undefined,
        strictTime: advancedEnabled ? input.strictTime : false,
        shoppingMode: advancedEnabled ? input.shoppingMode : 'normal',
        maxExtraSpend: advancedEnabled ? input.maxExtraSpend : undefined,
        requiredTags: advancedEnabled ? input.requiredTags : [],
        avoidedDishIds: advancedEnabled ? (input.avoidedDishIds ?? []) : [],
        avoidedIngredientIds: advancedEnabled ? (input.avoidedIngredientIds ?? []) : [],
        requiredExpiringIngredientIds: advancedEnabled ? input.requiredExpiringIngredientIds : [],
        inventoryAwareBudget: advancedEnabled ? input.inventoryAwareBudget : true,
        mealSlotDishRanges: getMealSlotDishRanges(input),
        mealSlotTagRequirements: getMealSlotTagRequirements(input),
    };
};

export const getSmartPlannerDishIngredientIds = (dish: Dishes, dishes: Dishes[]): string[] => {
    return Array.from(new Set(DishServingHelper.collectIngredientAmounts(dish, dishes).map(item => item.ingredientId)));
};

const getDishCostInfo = (
    dish: Dishes,
    ingredients: Ingredient[],
    dishes: Dishes[],
    targetServings: number,
    inventoryItems: Record<string, IngredientInventory>,
    inventoryConfig?: InventoryHealthConfig,
): DishCostInfo => {
    const amounts = DishServingHelper.collectIngredientAmounts(dish, dishes, { targetServings });
    const estimate = CostEstimateHelper.estimateIngredientAmounts(amounts, ingredients, { inventoryItems });
    const costAverage = getSummaryAverage(estimate.total);
    const urgentIngredientIds = new Set<string>();
    const missingRows = estimate.rows
        .filter(row => row.missingAmount > 0)
        .map(row => {
            const expiry = InventoryHelper.nearestExpiryBatch(inventoryItems[row.ingredientId], row.ingredient, inventoryConfig);
            if (InventoryHelper.isUrgentExpiry(expiry?.daysLeft, inventoryConfig)) urgentIngredientIds.add(row.ingredientId);
            const cost = IngredientPriceHelper.estimateForAmount(row.ingredient, row.missingAmount, row.unit);
            return {
                ingredientId: row.ingredientId,
                name: row.ingredient?.name ?? row.ingredientId,
                amount: row.missingAmount,
                unit: row.unit,
                costLabel: cost ? IngredientPriceHelper.formatRange(cost) : undefined,
                costAverage: cost ? (cost.min + cost.max) / 2 : undefined,
            } as ShoppingPreviewRow;
        });
    estimate.rows.forEach(row => {
        if (row.missingAmount > 0) return;
        const expiry = InventoryHelper.nearestExpiryBatch(inventoryItems[row.ingredientId], row.ingredient, inventoryConfig);
        if (InventoryHelper.isUrgentExpiry(expiry?.daysLeft, inventoryConfig)) urgentIngredientIds.add(row.ingredientId);
    });
    const shoppingCostAverage = missingRows.length === 0 ? 0 : getSummaryAverage(estimate.missing);
    const missingRequiredIngredientCount = estimate.rows.filter(row => row.required && row.missingAmount > 0).length;

    return {
        costLabel: CostEstimateHelper.hasPrice(estimate.total) ? IngredientPriceHelper.formatRange(estimate.total) : undefined,
        costAverage,
        shoppingCostLabel: missingRows.length === 0 ? '0đ' : CostEstimateHelper.hasPrice(estimate.missing) ? IngredientPriceHelper.formatRange(estimate.missing) : undefined,
        shoppingCostAverage,
        missingIngredientCount: missingRows.length,
        missingRequiredIngredientCount,
        missingRows,
        urgentIngredientCount: urgentIngredientIds.size,
        missingPriceCount: estimate.total.missingPriceCount + estimate.missing.missingPriceCount,
    };
};

export const aggregateShoppingRows = (rows: ShoppingPreviewRow[]): ShoppingPreviewRow[] => {
    const grouped = new Map<string, ShoppingPreviewRow>();
    rows.forEach(row => {
        const key = `${row.ingredientId}-${row.unit}`;
        const current = grouped.get(key);
        if (!current) {
            grouped.set(key, { ...row });
            return;
        }

        current.amount = Math.round((current.amount + row.amount) * 10) / 10;
        current.costAverage = (current.costAverage ?? 0) + (row.costAverage ?? 0);
        current.costLabel = current.costAverage ? IngredientPriceHelper.formatCurrency(current.costAverage) : current.costLabel;
    });

    return Array.from(grouped.values()).sort((a, b) => a.name.localeCompare(b.name));
};

export const getAlternativeItems = (alternative: SmartPlannerDayAlternative): PlannedDish[] => {
    const slotItems = alternative.itemsBySlot ? flattenItemsBySlot(alternative.itemsBySlot) : [];
    if (slotItems.length > 0) return slotItems;
    return [alternative.breakfast, alternative.lunch, alternative.dinner].filter((item): item is PlannedDish => Boolean(item));
};

const getSlotScore = (dish: Dishes, slot: PlannerMealSlot | 'any', dishesById: Map<string, Dishes>): { score: number; reason?: string } => {
    const tags = dish.tags ?? [];
    if (slot === 'any') return { score: 8, reason: 'linh hoạt bữa' };
    if (slot === 'breakfast') {
        if (tags.includes('Ăn sáng')) return { score: 16, reason: 'hợp bữa sáng' };
        const minutes = DishDurationHelper.getTotalMinutesForDish(dish, dishesById);
        if (minutes > 0 && minutes <= 25) return { score: 9, reason: 'nấu nhanh buổi sáng' };
        return { score: -2 };
    }
    if (tags.includes('Món chính')) return { score: 12, reason: 'món chính' };
    if (tags.includes('Canh') || tags.includes('Xào')) return { score: 7, reason: 'dễ ghép bữa' };
    return { score: 0 };
};

const getMethodTags = (dish: Dishes): string[] => (dish.tags ?? []).filter(tag => METHOD_TAGS.includes(tag));

const getPrimaryIngredientIds = (dish: Dishes, dishes: Dishes[]): string[] => getSmartPlannerDishIngredientIds(dish, dishes).slice(0, 3);

const getBudgetScore = (costAverage: number | undefined, referenceBudget: number | undefined, missingPriceCount: number): number => {
    if (costAverage === undefined) return missingPriceCount > 0 ? 42 : 70;
    if (!referenceBudget || referenceBudget <= 0) {
        if (costAverage <= 0) return 100;
        if (costAverage <= 30000) return 96;
        if (costAverage <= 70000) return 88;
        if (costAverage <= 120000) return 76;
        if (costAverage <= 220000) return 62;
        return clamp(62 - Math.min(34, (costAverage - 220000) / 12000));
    }
    if (costAverage <= referenceBudget) return 100;
    const ratio = costAverage / referenceBudget;
    return clamp(100 - Math.min(70, (ratio - 1) * 72));
};

const getInventoryScore = (cost: DishCostInfo, preferExpiring: boolean): number => {
    let score = cost.missingRequiredIngredientCount === 0 ? 88 : Math.max(32, 82 - cost.missingRequiredIngredientCount * 18 - cost.missingIngredientCount * 7);
    if (cost.shoppingCostAverage === 0) score += 12;
    if (cost.urgentIngredientCount > 0) score += preferExpiring ? Math.min(28, cost.urgentIngredientCount * 11) : Math.min(10, cost.urgentIngredientCount * 4);
    return clamp(score);
};

const getTimeScore = (minutes: number, maxCookMinutes?: number): number => {
    if (minutes <= 0) return 42;
    if (maxCookMinutes && maxCookMinutes > 0) {
        if (minutes <= maxCookMinutes) return clamp(100 - (minutes / maxCookMinutes) * 24);
        return clamp(58 - Math.min(42, (minutes / maxCookMinutes - 1) * 70));
    }
    if (minutes <= 25) return 96;
    if (minutes <= 45) return 86;
    if (minutes <= 75) return 68;
    if (minutes <= 105) return 48;
    return 34;
};

const getRecentDishCount = (dishId: string, input: BuildSmartPlannerInput): number => {
    const start = input.startDate.startOf('day');
    const windowDays = input.priorities.includes('variety') ? 21 : 10;
    const since = start.subtract(windowDays, 'day');
    const scheduledCount = input.scheduledMeals.filter(meal => {
        const date = dayjs(meal.plannedDate);
        if (!date.isValid() || date.isBefore(since) || date.isAfter(start.add(1, 'day'))) return false;
        return Object.values(meal.meals ?? {}).flat().includes(dishId);
    }).length;
    const cookingCount = input.cookingSessions.filter(session => {
        const date = dayjs(session.finishedAt ?? session.startedAt);
        return session.dishId === dishId && date.isValid() && !date.isBefore(since) && !date.isAfter(start.add(1, 'day'));
    }).length;
    return scheduledCount + cookingCount;
};

const getFeedbackImpact = (dishId: string, input: BuildSmartPlannerInput): { impact: number; label?: string } => {
    const memberSet = new Set(input.memberIds);
    let liked = 0;
    let disliked = 0;
    // Durable per-dish feedback store (collected at meal completion) is the source of truth.
    // Tallies are per member, so scope to the selected members like the legacy path does.
    const stat = input.dishFeedback[dishId];
    if (stat) {
        Object.entries(stat.members).forEach(([memberId, tally]) => {
            if (memberSet.size > 0 && !memberSet.has(memberId)) return;
            liked += tally.liked;
            disliked += tally.disliked;
        });
    }
    // Legacy fallback: feedback recorded on cooking sessions before it moved to the durable
    // store. Still member-scoped. Folded in so pre-upgrade data keeps influencing ranking.
    input.cookingSessions.forEach(session => {
        if (session.dishId !== dishId) return;
        Object.entries(session.memberFeedback ?? {}).forEach(([memberId, feedback]) => {
            if (memberSet.size > 0 && !memberSet.has(memberId)) return;
            if (feedback === 'liked') liked += 1;
            if (feedback === 'disliked') disliked += 1;
        });
    });
    const impact = Math.max(-18, Math.min(14, liked * 5 - disliked * 8));
    if (liked === 0 && disliked === 0) return { impact };
    return { impact, label: `${liked} thích · ${disliked} không hợp` };
};

const getVarietyScore = (dish: Dishes, input: BuildSmartPlannerInput, usage: UsageContext): { score: number; detail: string; penalty: number } => {
    const aggressive = input.priorities.includes('variety');
    let penalty = 0;
    const recentCount = getRecentDishCount(dish.id, input);
    const recentMultiplier = aggressive ? 18 : 8;
    penalty += Math.min(42, recentCount * recentMultiplier);
    // Repeating a dish already chosen in this plan stays heavily penalised even
    // when variety isn't prioritised, so a day/week never serves the same dish twice.
    if (usage.usedDishIds.has(dish.id)) penalty += aggressive ? 46 : 30;

    getPrimaryIngredientIds(dish, input.dishes).forEach(id => {
        const count = usage.usedIngredientCounts.get(id) ?? 0;
        penalty += Math.min(18, count * (aggressive ? 8 : 4));
    });
    getMethodTags(dish).forEach(tag => {
        const count = usage.usedMethodCounts.get(tag) ?? 0;
        penalty += Math.min(14, count * (aggressive ? 7 : 3));
    });

    return {
        score: clamp(96 - penalty),
        detail: recentCount > 0 ? `${recentCount} lần gần đây` : usage.usedDishIds.has(dish.id) ? 'đã có trong gợi ý hiện tại' : 'không lặp gần đây',
        penalty,
    };
};

const getDishTreeIds = (dish: Dishes, dishes: Dishes[], visited = new Set<string>()): string[] => {
    if (visited.has(dish.id)) return [];
    visited.add(dish.id);
    return [dish.id, ...(dish.includeDishes ?? []).flatMap(id => {
        const included = dishes.find(item => item.id === id);
        return included ? getDishTreeIds(included, dishes, visited) : [id];
    })];
};

const getHardBlockReasons = (dish: Dishes, input: BuildSmartPlannerInput, cost: DishCostInfo, minutes: number): string[] => {
    const ingredientIds = new Set(getSmartPlannerDishIngredientIds(dish, input.dishes));
    const tags = new Set(dish.tags ?? []);
    const avoidedDishIds = input.avoidedDishIds ?? [];
    const dishIds = avoidedDishIds.length > 0 ? new Set(getDishTreeIds(dish, input.dishes)) : null;
    const hardSafetyReasons = HouseholdSuitabilityHelper.getHardBlockReasons(dish, input.members, input.dishes, input.ingredientsById);
    const blockers = [...hardSafetyReasons];
    const shoppingMode = input.shoppingMode;

    if (shoppingMode === 'no_shopping' && cost.missingRequiredIngredientCount > 0) blockers.push('Thiếu nguyên liệu bắt buộc trong chế độ không đi mua');
    if (input.strictTime && input.maxCookMinutes && (minutes <= 0 || minutes > input.maxCookMinutes)) blockers.push('Vượt thời gian nấu tối đa');
    if (dishIds && avoidedDishIds.some(id => dishIds.has(id))) blockers.push('Có món trong danh sách chặn');
    if (input.avoidedIngredientIds.length > 0 && input.avoidedIngredientIds.some(id => ingredientIds.has(id))) blockers.push('Có nguyên liệu trong danh sách chặn');
    if (input.requiredExpiringIngredientIds.length > 0 && input.requiredExpiringIngredientIds.some(id => !ingredientIds.has(id))) blockers.push('Không dùng đủ nguyên liệu sắp hết hạn bắt buộc');
    if (input.requiredTags.length > 0 && input.requiredTags.some(tag => !tags.has(tag))) blockers.push('Không có tag món bắt buộc');

    return blockers;
};

const buildScoreDetail = (label: string, value: string, componentScore: number, weight: number, description: string): SmartPlannerScoreDetail => ({
    label,
    value,
    impact: Math.round((componentScore - 50) * weight),
    description,
});

const scoreDish = (
    dish: Dishes,
    slot: PlannerMealSlot | 'any',
    input: BuildSmartPlannerInput,
    usage: UsageContext,
    targetServings: number,
    weights: PlannerWeights,
    dishesById: Map<string, Dishes>,
): PlannedDish | null => {
    const minutes = DishDurationHelper.getTotalMinutesForDish(dish, dishesById);
    const cost = getDishCostInfo(dish, input.ingredients, input.dishes, targetServings, input.inventoryItems, input.inventoryConfig);
    const blockers = getHardBlockReasons(dish, input, cost, minutes);
    if (blockers.length > 0) return null;

    // Active scoring dimensions. Empty selection means "balance everything",
    // so every dimension scores; otherwise only the chosen ones do.
    const enabledCriteria = new Set<SmartPlannerPriority>(
        input.priorities.length === 0
            ? ['budget', 'time', 'nutrition', 'household', 'inventory', 'variety']
            : input.priorities,
    );
    const reasons: string[] = [];
    const warnings: string[] = [];
    const details: SmartPlannerScoreDetail[] = [];
    const slotResult = getSlotScore(dish, slot, dishesById);
    const slotScore = clamp(68 + slotResult.score * 2);
    if (slotResult.reason) reasons.push(slotResult.reason);
    const slotLabel = slot === 'breakfast' ? 'bữa sáng' : slot === 'lunch' ? 'bữa trưa' : slot === 'dinner' ? 'bữa tối' : 'bữa linh hoạt';
    const slotDescription = slot === 'any'
        ? 'Món không gắn bữa cố định nên được chấm linh hoạt cho mọi bữa.'
        : slotResult.reason
            ? `Hợp ${slotLabel} vì ${slotResult.reason}${(dish.tags ?? []).length > 0 ? ` (tag: ${(dish.tags ?? []).join(', ')})` : ''}.`
            : `Không có tag chuyên cho ${slotLabel} nên món chỉ giữ điểm nền cho bữa này.`;
    details.push(buildScoreDetail('Độ hợp bữa ăn', slotResult.reason ?? 'Không có tag phù hợp rõ ràng', slotScore, 0.08, slotDescription));

    const timeScore = getTimeScore(minutes, input.maxCookMinutes);
    if (minutes > 0) reasons.push(DishDurationHelper.formatMinutes(minutes));
    else warnings.push('Thiếu thời gian nấu');
    const timeDescription = minutes <= 0
        ? 'Món chưa có dữ liệu thời gian nấu nên không thể ưu tiên theo thời gian và bị giảm độ tin cậy.'
        : input.maxCookMinutes && input.maxCookMinutes > 0
            ? minutes <= input.maxCookMinutes
                ? `Nấu khoảng ${DishDurationHelper.formatMinutes(minutes)}, nằm trong giới hạn ${DishDurationHelper.formatMinutes(input.maxCookMinutes)} bạn chọn nên được ưu tiên.`
                : `Nấu khoảng ${DishDurationHelper.formatMinutes(minutes)}, vượt giới hạn ${DishDurationHelper.formatMinutes(input.maxCookMinutes)} bạn chọn nên bị trừ điểm.`
            : `Nấu khoảng ${DishDurationHelper.formatMinutes(minutes)}; chưa đặt giới hạn thời gian nên món càng nhanh càng được ưu tiên.`;
    details.push(buildScoreDetail('Thời gian nấu', minutes > 0 ? DishDurationHelper.formatMinutes(minutes) : 'Chưa có thời gian nấu', timeScore, weights.time, timeDescription));

    const inventoryScore = getInventoryScore(cost, enabledCriteria.has('inventory'));
    if (cost.shoppingCostAverage === 0) reasons.push('không cần mua');
    if (cost.urgentIngredientCount > 0) reasons.push(`dùng ${cost.urgentIngredientCount} đồ sắp hết hạn`);
    if (cost.missingIngredientCount > 0) warnings.push(`Cần mua ${cost.missingIngredientCount} nguyên liệu`);
    const inventoryParts: string[] = [];
    if (cost.shoppingCostAverage === 0) inventoryParts.push('Đủ nguyên liệu theo tồn kho hiện tại nên không cần đi mua');
    else inventoryParts.push(`Cần mua thêm ${cost.missingIngredientCount} nguyên liệu${cost.shoppingCostLabel ? ` (~${cost.shoppingCostLabel})` : ''}`);
    if (cost.missingRequiredIngredientCount > 0) inventoryParts.push(`trong đó ${cost.missingRequiredIngredientCount} là bắt buộc`);
    if (cost.urgentIngredientCount > 0) inventoryParts.push(`dùng ${cost.urgentIngredientCount} đồ sắp hết hạn${enabledCriteria.has('inventory') ? ' nên được cộng điểm ưu tiên' : ''}`);
    details.push(buildScoreDetail('Tồn kho và đồ sắp hết hạn', cost.shoppingCostAverage === 0 ? 'Có đủ theo tồn kho hiện tại' : `Cần mua ${cost.shoppingCostLabel ?? 'thiếu giá'}`, inventoryScore, weights.inventory, inventoryParts.join(', ') + '.'));

    const budgetReference = input.advancedEnabled
        ? input.scope === 'cook_now'
            ? Math.max(1, input.maxExtraSpend ?? input.dailyBudget ?? 100000)
            : input.dailyBudget ? Math.max(1, input.dailyBudget / 3) : undefined
        : undefined;
    const budgetCost = input.inventoryAwareBudget ? cost.shoppingCostAverage : cost.costAverage;
    const budgetScore = enabledCriteria.has('budget') ? getBudgetScore(budgetCost, budgetReference, cost.missingPriceCount) : 62;
    if (enabledCriteria.has('budget')) {
        if (budgetCost === undefined || cost.missingPriceCount > 0) warnings.push('Thiếu dữ liệu giá');
        else if (!budgetReference) reasons.push(input.inventoryAwareBudget ? 'ít phải mua thêm' : 'chi phí thấp');
        else if (budgetCost <= budgetReference) reasons.push(input.inventoryAwareBudget ? 'vừa tiền mua thêm' : 'vừa ngân sách');
    }
    const budgetCostLabelText = input.inventoryAwareBudget ? 'phần cần mua thêm' : 'tổng chi phí';
    const budgetDescription = !enabledCriteria.has('budget')
        ? 'Tiêu chí Ngân sách đang tắt, nên chi phí món không ảnh hưởng mạnh đến xếp hạng.'
        : budgetCost === undefined || cost.missingPriceCount > 0
            ? `Thiếu giá cho ${cost.missingPriceCount} nguyên liệu nên chi phí chưa chắc chắn và bị giảm độ tin cậy.`
            : !budgetReference
                ? `Đang ưu tiên tiết kiệm theo ${budgetCostLabelText} ~${IngredientPriceHelper.formatCurrency(budgetCost)}; chưa bật ngân sách nâng cao nên không so với giới hạn tiền ngày hay tuần.`
            : budgetCost <= budgetReference
                ? `Mức ${budgetCostLabelText} ~${IngredientPriceHelper.formatCurrency(budgetCost)} nằm trong tham chiếu ~${IngredientPriceHelper.formatCurrency(budgetReference)} nên được cộng điểm.`
                : `Mức ${budgetCostLabelText} ~${IngredientPriceHelper.formatCurrency(budgetCost)} vượt tham chiếu ~${IngredientPriceHelper.formatCurrency(budgetReference)} nên bị trừ điểm.`;
    details.push(buildScoreDetail('Ngân sách', enabledCriteria.has('budget') ? `${input.inventoryAwareBudget ? 'Cần mua' : 'Tổng'} ${input.inventoryAwareBudget ? cost.shoppingCostLabel ?? 'thiếu giá' : cost.costLabel ?? 'thiếu giá'}` : 'Không dùng để xếp hạng', budgetScore, weights.budget, budgetDescription));

    let nutritionMatch: NutritionGoalMatch | undefined;
    let nutritionLabel: string | undefined;
    let nutritionGoalName: string | undefined;
    let nutritionScore = 62;
    const selectedNutritionGoal = input.nutritionGoals.find(goal => goal.id === input.nutritionGoalId);
    if (enabledCriteria.has('nutrition') && selectedNutritionGoal) {
        const nutrition = DishNutritionHelper.calculateDishNutrition(dish, input.dishes, input.ingredientsById, { targetServings });
        nutritionGoalName = selectedNutritionGoal.name;
        if (nutrition.hasNutrition) {
            nutritionMatch = NutritionGoalHelper.score(nutrition, selectedNutritionGoal);
            nutritionScore = clamp(nutritionMatch.score * 100);
            nutritionLabel = `${nutritionMatch.matchedCriteriaCount}/${nutritionMatch.totalCriteriaCount} điều`;
            if (nutritionMatch.score >= 0.7) reasons.push(selectedNutritionGoal.name);
        } else {
            nutritionScore = 42;
            warnings.push('Thiếu dữ liệu dinh dưỡng');
        }
    }
    const nutritionDescription = !(enabledCriteria.has('nutrition') && selectedNutritionGoal)
        ? 'Tiêu chí Dinh dưỡng đang tắt hoặc chưa chọn mục tiêu.'
        : nutritionMatch
            ? `Đạt ${nutritionMatch.matchedCriteriaCount}/${nutritionMatch.totalCriteriaCount} tiêu chí của mục tiêu ${selectedNutritionGoal.name}, tính theo mỗi phần ăn (${formatPercent(nutritionScore)} gần mục tiêu).`
            : `Thiếu dữ liệu dinh dưỡng cho ${selectedNutritionGoal.name} nên không chấm được theo mục tiêu và bị giảm độ tin cậy.`;
    details.push(buildScoreDetail('Mục tiêu dinh dưỡng', enabledCriteria.has('nutrition') && selectedNutritionGoal ? nutritionLabel ? `${nutritionLabel} (${formatPercent(nutritionScore)} gần mục tiêu)` : `Thiếu dữ liệu cho ${selectedNutritionGoal.name}` : 'Không dùng để xếp hạng', nutritionScore, weights.nutrition, nutritionDescription));

    let suitability: HouseholdDishSuitability | undefined;
    let suitabilityScore = 64;
    if (enabledCriteria.has('household') && input.members.length > 0) {
        suitability = HouseholdSuitabilityHelper.evaluateDishForMembers(dish, input.members, input.dishes, input.ingredientsById, input.nutritionGoals);
        suitabilityScore = suitability.averageScore;
        if (suitability.warningCount > 0) warnings.push(`${suitability.warningCount} lưu ý nhà mình`);
        else if (suitability.positiveCount > 0) reasons.push('hợp nhà mình');
    }
    const feedback = getFeedbackImpact(dish.id, input);
    const householdWithFeedbackScore = clamp(suitabilityScore + feedback.impact);
    if (feedback.label) reasons.push(feedback.label);
    const householdParts: string[] = [];
    if (enabledCriteria.has('household') && input.members.length > 0) {
        householdParts.push(`Khẩu vị trung bình ${formatPercent(suitability ? suitability.averageScore : suitabilityScore)} cho ${input.members.length} thành viên đang chọn`);
        if (suitability && suitability.warningCount > 0) householdParts.push(`có ${suitability.warningCount} lưu ý cần cân nhắc`);
        else if (suitability && suitability.positiveCount > 0) householdParts.push('nhiều điểm hợp khẩu vị');
        if (feedback.label) householdParts.push(`phản hồi nấu ăn đã lưu: ${feedback.label}`);
    } else {
        householdParts.push('Chưa chọn thành viên nào nên khẩu vị nhà mình không tính vào điểm');
    }
    details.push(buildScoreDetail('Độ hợp nhà mình', enabledCriteria.has('household') && input.members.length > 0 ? `${householdWithFeedbackScore}% cho ${input.members.length} thành viên${feedback.label ? ` · ${feedback.label}` : ''}` : 'Không dùng để xếp hạng', householdWithFeedbackScore, weights.household, householdParts.join(', ') + '.'));

    const variety = getVarietyScore(dish, input, usage);
    if (variety.penalty > 0) warnings.push('Bị trừ vì lặp món hoặc nguyên liệu gần đây');
    const varietyDescription = variety.penalty <= 0
        ? 'Món không trùng lịch gần đây hay các món đã chọn trong lần lập này nên giữ điểm đa dạng cao.'
        : `Bị trừ điểm đa dạng vì ${variety.detail}${input.priorities.includes('variety') ? ' (đang ưu tiên đa dạng nên trừ mạnh hơn)' : ''}.`;
    details.push(buildScoreDetail('Đa dạng thực đơn', variety.detail, variety.score, weights.variety, varietyDescription));

    const weightedScore = clamp(
        slotScore * 0.08
        + householdWithFeedbackScore * weights.household
        + inventoryScore * weights.inventory
        + nutritionScore * weights.nutrition
        + budgetScore * weights.budget
        + timeScore * weights.time
        + variety.score * weights.variety,
    );

    return {
        dish,
        score: weightedScore,
        reasons: Array.from(new Set(reasons)).slice(0, 5),
        warnings: Array.from(new Set(warnings)).slice(0, 6),
        costLabel: cost.costLabel,
        costAverage: cost.costAverage,
        shoppingCostLabel: cost.shoppingCostLabel,
        shoppingCostAverage: cost.shoppingCostAverage,
        missingIngredientCount: cost.missingIngredientCount,
        missingRequiredIngredientCount: cost.missingRequiredIngredientCount,
        missingRows: cost.missingRows,
        missingIngredientRows: cost.missingRows,
        nutritionLabel,
        nutritionGoalName,
        nutritionMatch,
        suitabilityScore: enabledCriteria.has('household') ? householdWithFeedbackScore : undefined,
        suitability,
        totalMinutes: minutes,
        urgentIngredientCount: cost.urgentIngredientCount,
        scoreDetails: details,
    };
};

const getTargetServings = (members: HouseholdMemberProfile[]): number => Math.max(1, Math.round(members.reduce((sum, member) => sum + (member.portionPreference ?? 1), 0) || 2));

const createUsageContext = (): UsageContext => ({
    usedDishIds: new Set<string>(),
    usedIngredientCounts: new Map<string, number>(),
    usedMethodCounts: new Map<string, number>(),
});

const addUsage = (usage: UsageContext, dish: Dishes, allDishes: Dishes[]) => {
    usage.usedDishIds.add(dish.id);
    getPrimaryIngredientIds(dish, allDishes).forEach(id => usage.usedIngredientCounts.set(id, (usage.usedIngredientCounts.get(id) ?? 0) + 1));
    getMethodTags(dish).forEach(tag => usage.usedMethodCounts.set(tag, (usage.usedMethodCounts.get(tag) ?? 0) + 1));
};

const buildRecommendations = (input: BuildSmartPlannerInput, usage: UsageContext, targetServings: number, weights: PlannerWeights, slot: PlannerMealSlot | 'any'): PlannedDish[] => {
    const dishesById = new Map(input.dishes.map(dish => [dish.id, dish]));
    return input.dishes
        .filter(dish => dish.isCompleted !== false)
        .filter(dish => dish.isAccompaniment !== true)
        .map(dish => scoreDish(dish, slot, input, usage, targetServings, weights, dishesById))
        .filter((item): item is PlannedDish => Boolean(item))
        .sort((a, b) => b.score - a.score || a.dish.name.localeCompare(b.dish.name));
};

const getDailyBudgetScore = (items: PlannedDish[], input: BuildSmartPlannerInput) => {
    const dayBudget = Math.max(1, input.dailyBudget ?? 150000);
    const dayCostAverage = items.reduce((sum, item) => sum + (item.costAverage ?? 0), 0);
    const dayShoppingCostAverage = items.reduce((sum, item) => sum + (item.shoppingCostAverage ?? 0), 0);
    const budgetCostAverage = input.inventoryAwareBudget ? dayShoppingCostAverage : dayCostAverage;
    const missingPriceCount = items.filter(item => (input.inventoryAwareBudget ? item.shoppingCostAverage : item.costAverage) === undefined).length;
    const dayCostLabel = IngredientPriceHelper.formatCurrency(dayCostAverage);
    const dayShoppingCostLabel = IngredientPriceHelper.formatCurrency(dayShoppingCostAverage);
    const budgetCostLabel = input.inventoryAwareBudget ? dayShoppingCostLabel : dayCostLabel;
    let impact = 0;
    let reason = input.inventoryAwareBudget ? 'vừa ngân sách mua thêm' : 'vừa ngân sách ngày';
    let description = input.inventoryAwareBudget
        ? 'Chi phí cần mua thêm của cả ngày nằm trong ngân sách ngày, nên tổ hợp bữa này được ưu tiên. Món có tổng giá cao vẫn có thể hợp nếu trong nhà đã có phần lớn nguyên liệu.'
        : 'Tổng chi phí ước tính của cả ngày nằm trong ngân sách ngày, nên tổ hợp bữa này được ưu tiên. Các bữa có thể dùng ngân sách không đều nhau miễn tổng ngày phù hợp.';

    if (missingPriceCount === items.length) {
        impact = -9;
        reason = 'thiếu giá';
        description = 'Cả ngày chưa đủ dữ liệu giá để kiểm tra ngân sách. Planner trừ điểm vì chưa chắc tổ hợp bữa này có nằm trong ngân sách ngày hay không.';
    } else if (budgetCostAverage <= dayBudget) {
        impact = 30;
    } else {
        impact = -Math.min(45, (budgetCostAverage / dayBudget - 1) * 35);
        reason = input.inventoryAwareBudget ? 'vượt ngân sách mua thêm' : 'vượt ngân sách ngày';
        description = input.inventoryAwareBudget
            ? 'Chi phí cần mua thêm của cả ngày cao hơn ngân sách ngày, nên tổ hợp bữa này bị trừ điểm theo mức vượt ngân sách.'
            : 'Tổng chi phí ước tính của cả ngày cao hơn ngân sách ngày, nên tổ hợp bữa này bị trừ điểm theo mức vượt ngân sách.';
    }

    if (missingPriceCount > 0 && missingPriceCount < items.length) {
        impact -= Math.min(9, missingPriceCount * 3);
        description += ` Có ${missingPriceCount} bữa thiếu dữ liệu giá, nên tổng ngày có thể thấp hơn thực tế.`;
    }

    return { dayBudget, dayCostAverage, dayCostLabel, dayShoppingCostAverage, dayShoppingCostLabel, budgetCostAverage, budgetCostLabel, impact, reason, description };
};

type PlannerDayCombo = {
    itemsBySlot: SmartPlannerDayItemsBySlot;
    score: number;
    overage: number;
    key: string;
    warnings: string[];
}

const applyDailyBudgetToDay = (itemsBySlot: Partial<Record<PlannerMealSlot, PlannedDish[]>>, input: BuildSmartPlannerInput): SmartPlannerDayItemsBySlot => {
    const normalized = normalizeItemsBySlot(itemsBySlot);
    if (!input.advancedEnabled || !input.dailyBudget || !isPriorityActive(input.priorities, 'budget')) return normalized;
    const items = flattenItemsBySlot(normalized);
    if (items.length === 0) return normalized;

    const dailyBudgetScore = getDailyBudgetScore(items, input);
    const perDishImpact = dailyBudgetScore.impact / items.length;

    return PLANNER_MEAL_SLOTS.reduce((result, slot) => {
        result[slot] = normalized[slot].map(item => {
            const itemCostLabel = item.costLabel ?? 'thiếu dữ liệu giá';
            return {
                ...item,
                score: clamp(item.score + perDishImpact),
                dayCostLabel: dailyBudgetScore.dayCostLabel,
                dayCostAverage: dailyBudgetScore.dayCostAverage,
                dayShoppingCostLabel: dailyBudgetScore.dayShoppingCostLabel,
                dayShoppingCostAverage: dailyBudgetScore.dayShoppingCostAverage,
                dayBudget: dailyBudgetScore.dayBudget,
                reasons: Array.from(new Set([...item.reasons, dailyBudgetScore.reason])).slice(0, 5),
                warnings: item.warnings,
                scoreDetails: [
                    ...item.scoreDetails,
                    {
                        label: 'Ngân sách ngày',
                        value: `${input.inventoryAwareBudget ? 'Cần mua' : 'Tổng ngày'} ${dailyBudgetScore.budgetCostLabel} / ngân sách ${IngredientPriceHelper.formatCurrency(dailyBudgetScore.dayBudget)}; món này ${itemCostLabel}`,
                        impact: perDishImpact,
                        description: dailyBudgetScore.description,
                    },
                ],
            };
        });
        return result;
    }, createEmptyItemsBySlot());
};

const buildAlternative = (itemsBySlot: Partial<Record<PlannerMealSlot, PlannedDish[]>>, index: number, input: BuildSmartPlannerInput, comboWarnings: string[] = []): SmartPlannerDayAlternative => {
    const withBudget = applyDailyBudgetToDay(itemsBySlot, input);
    const items = flattenItemsBySlot(withBudget);
    const totalCostAverage = items.reduce((sum, item) => sum + (item.costAverage ?? 0), 0);
    const shoppingCostAverage = items.reduce((sum, item) => sum + (item.shoppingCostAverage ?? 0), 0);
    const nutritionScores = items.map(item => item.nutritionMatch?.score).filter((value): value is number => value !== undefined);
    const suitabilityScores = items.map(item => item.suitabilityScore).filter((value): value is number => value !== undefined);
    const missingRows = aggregateShoppingRows(items.flatMap(item => item.missingRows ?? []));
    return {
        id: `alt-${index + 1}-${items.map(item => item.dish.id).join('-')}`,
        label: `Phương án ${index + 1}`,
        itemsBySlot: withBudget,
        breakfast: withBudget.breakfast[0],
        lunch: withBudget.lunch[0],
        dinner: withBudget.dinner[0],
        totalScore: clamp(items.reduce((sum, item) => sum + item.score, 0) / Math.max(1, items.length)),
        totalCostAverage,
        totalCostLabel: IngredientPriceHelper.formatCurrency(totalCostAverage),
        shoppingCostAverage,
        shoppingCostLabel: IngredientPriceHelper.formatCurrency(shoppingCostAverage),
        nutritionScore: nutritionScores.length > 0 ? Math.round(nutritionScores.reduce((sum, value) => sum + value, 0) / nutritionScores.length * 100) : undefined,
        suitabilityScore: suitabilityScores.length > 0 ? Math.round(suitabilityScores.reduce((sum, value) => sum + value, 0) / suitabilityScores.length) : undefined,
        reasons: Array.from(new Set(items.flatMap(item => item.reasons))).slice(0, 5),
        warnings: Array.from(new Set([...comboWarnings, ...items.flatMap(item => item.warnings)])).slice(0, 6),
        missingRows,
    };
};

const getDifferenceRatio = (left: Set<string>, right: Set<string>): number => {
    const union = new Set([...Array.from(left), ...Array.from(right)]);
    if (union.size === 0) return 0;
    const intersectionCount = Array.from(left).filter(item => right.has(item)).length;
    return 1 - intersectionCount / union.size;
};

const getComboDiversityScore = (best: PlannerDayCombo, combo: PlannerDayCombo, input: BuildSmartPlannerInput): number => {
    const bestItems = flattenItemsBySlot(best.itemsBySlot);
    const comboItems = flattenItemsBySlot(combo.itemsBySlot);
    const bestDishIds = new Set(bestItems.map(item => item.dish.id));
    const comboDishIds = new Set(comboItems.map(item => item.dish.id));
    const bestIngredients = new Set(bestItems.flatMap(item => getPrimaryIngredientIds(item.dish, input.dishes)));
    const comboIngredients = new Set(comboItems.flatMap(item => getPrimaryIngredientIds(item.dish, input.dishes)));
    const bestMethods = new Set(bestItems.flatMap(item => getMethodTags(item.dish)));
    const comboMethods = new Set(comboItems.flatMap(item => getMethodTags(item.dish)));
    const slotShapeDiff = PLANNER_MEAL_SLOTS.reduce((sum, slot) => {
        const maxCount = Math.max(1, best.itemsBySlot[slot].length, combo.itemsBySlot[slot].length);
        return sum + Math.abs(best.itemsBySlot[slot].length - combo.itemsBySlot[slot].length) / maxCount;
    }, 0) / PLANNER_MEAL_SLOTS.length;

    return clamp(
        getDifferenceRatio(bestDishIds, comboDishIds) * 48
        + getDifferenceRatio(bestIngredients, comboIngredients) * 26
        + getDifferenceRatio(bestMethods, comboMethods) * 16
        + slotShapeDiff * 10,
    );
};

const selectSlotItems = (
    candidates: PlannedDish[],
    targetCount: number,
    usedDishIds: Set<string>,
    variantIndex: number,
    randomize: boolean,
    tagRequirements: SmartPlannerSlotTagRequirement[] = [],
): PlannedDish[] => {
    const selected: PlannedDish[] = [];
    const selectedIds = new Set<string>();

    const pickFrom = (pool: PlannedDish[], localIndex: number): PlannedDish | undefined => {
        if (pool.length === 0) return undefined;
        if (randomize) {
            const samplePool = pool.slice(0, SHUFFLE_POOL_LIMIT);
            const totalWeight = samplePool.reduce((sum, item) => sum + Math.max(1, item.score), 0);
            let roll = Math.random() * totalWeight;
            for (let i = 0; i < samplePool.length; i += 1) {
                roll -= Math.max(1, samplePool[i].score);
                if (roll <= 0) return samplePool[i];
            }
            return samplePool[0];
        }
        return pool[Math.min(pool.length - 1, variantIndex + localIndex)] ?? pool[0];
    };

    const isAvailable = (item: PlannedDish): boolean => !usedDishIds.has(item.dish.id) && !selectedIds.has(item.dish.id);

    // First pass: satisfy tag minimums. Each requirement asks for `min` dishes carrying that tag.
    tagRequirements.forEach(requirement => {
        const tagged = candidates.filter(item => isAvailable(item) && dishHasTag(item.dish, requirement.tag));
        const alreadyMatching = selected.filter(item => dishHasTag(item.dish, requirement.tag)).length;
        const needed = Math.max(0, requirement.min - alreadyMatching);
        for (let i = 0; i < needed; i += 1) {
            if (selected.length >= targetCount) return;
            const pool = tagged.filter(isAvailable);
            const picked = pickFrom(pool, i);
            if (!picked) break;
            selected.push(picked);
            selectedIds.add(picked.dish.id);
            usedDishIds.add(picked.dish.id);
        }
    });

    // Second pass: fill remaining slots with top-scored dishes regardless of tag.
    for (let itemIndex = selected.length; itemIndex < targetCount; itemIndex += 1) {
        const pool = candidates.filter(isAvailable);
        const picked = pickFrom(pool, itemIndex);
        if (!picked) break;
        selected.push(picked);
        selectedIds.add(picked.dish.id);
        usedDishIds.add(picked.dish.id);
    }

    return selected;
};

const buildComboFromCandidates = (
    candidatesBySlot: Record<PlannerMealSlot, PlannedDish[]>,
    ranges: SmartPlannerMealSlotDishRanges,
    input: BuildSmartPlannerInput,
    variantIndex: number,
    randomize: boolean,
): PlannerDayCombo | null => {
    const itemsBySlot = createEmptyItemsBySlot();
    const usedDishIds = new Set<string>();
    const warnings: string[] = [];
    const tagRequirementsBySlot = getMealSlotTagRequirements(input);

    PLANNER_MEAL_SLOTS.forEach(slot => {
        const range = ranges[slot];
        const tagRequirements = tagRequirementsBySlot[slot];
        const tagMinTotal = getSlotTagMinTotal(tagRequirements);
        const adjustedMin = Math.max(range.min, tagMinTotal);
        const adjustedMax = Math.max(range.max, adjustedMin);
        const targetCount = getRandomDishCount({ min: adjustedMin, max: adjustedMax });
        if (targetCount <= 0) return;

        const selected = selectSlotItems(candidatesBySlot[slot], targetCount, usedDishIds, variantIndex % Math.max(1, candidatesBySlot[slot].length), randomize, tagRequirements);
        itemsBySlot[slot] = selected;

        const slotLabel = slot === 'breakfast' ? 'bữa sáng' : slot === 'lunch' ? 'bữa trưa' : 'bữa tối';
        if (selected.length < targetCount) {
            warnings.push(`${slotLabel} chỉ có ${selected.length}/${targetCount} món phù hợp`);
        }
        tagRequirements.forEach(requirement => {
            const matched = selected.filter(item => dishHasTag(item.dish, requirement.tag)).length;
            if (matched < requirement.min) {
                warnings.push(`${slotLabel} cần ${requirement.min} món "${requirement.tag}" nhưng chỉ có ${matched}`);
            }
        });
    });

    const items = flattenItemsBySlot(itemsBySlot);
    if (items.length === 0) return null;

    const dailyBudgetScore = input.advancedEnabled && input.dailyBudget && isPriorityActive(input.priorities, 'budget')
        ? getDailyBudgetScore(items, input)
        : undefined;
    const averageScore = items.reduce((sum, item) => sum + item.score, 0) / items.length;
    const score = clamp(averageScore + (dailyBudgetScore?.impact ?? 0) / items.length);
    const overage = dailyBudgetScore ? Math.max(0, dailyBudgetScore.budgetCostAverage - dailyBudgetScore.dayBudget) : 0;

    return {
        itemsBySlot,
        score,
        overage,
        key: getComboKey(itemsBySlot),
        warnings,
    };
};

const pickAlternativeCombos = (pool: PlannerDayCombo[], input: BuildSmartPlannerInput): PlannerDayCombo[] => {
    if (!input.shuffleAlternatives) return pool.slice(0, ALTERNATIVE_COUNT);

    const best = pool[0];
    if (!best) return [];

    const selected: PlannerDayCombo[] = [best];
    const qualityFloor = best.score - 25;
    const topBandSize = Math.max(1, Math.ceil(pool.length * 0.2));
    let samplePool = pool.slice(1).filter((combo, index) => combo.score >= qualityFloor && (combo.score <= best.score - 3 || index >= topBandSize));
    if (samplePool.length < ALTERNATIVE_COUNT - 1) samplePool = pool.slice(1).filter(combo => combo.score >= qualityFloor);
    if (samplePool.length < ALTERNATIVE_COUNT - 1) samplePool = pool.slice(1);

    while (selected.length < ALTERNATIVE_COUNT && samplePool.length > 0) {
        const totalWeight = samplePool.reduce((sum, combo) => {
            const diversity = getComboDiversityScore(best, combo, input);
            const scoreWeight = Math.max(1, combo.score - Math.max(0, qualityFloor) + 1);
            return sum + scoreWeight * (1 + diversity / 45);
        }, 0);
        let roll = Math.random() * totalWeight;
        let pickedIndex = samplePool.length - 1;
        for (let i = 0; i < samplePool.length; i += 1) {
            const diversity = getComboDiversityScore(best, samplePool[i], input);
            const scoreWeight = Math.max(1, samplePool[i].score - Math.max(0, qualityFloor) + 1);
            roll -= scoreWeight * (1 + diversity / 45);
            if (roll <= 0) { pickedIndex = i; break; }
        }
        const [picked] = samplePool.splice(pickedIndex, 1);
        selected.push(picked);
    }

    return selected;
};

const buildPlannedDays = (input: BuildSmartPlannerInput, targetServings: number, weights: PlannerWeights): SmartPlannerPlannedDay[] => {
    const usage = createUsageContext();
    const dayCount = input.scope === 'week' ? 7 : 1;
    const ranges = getMealSlotDishRanges(input);

    const buildSlotCandidates = (slot: PlannerMealSlot): PlannedDish[] => {
        const ranked = buildRecommendations(input, usage, targetServings, weights, slot);
        const byId = new Map<string, PlannedDish>();
        const addCandidate = (item: PlannedDish) => {
            if (!byId.has(item.dish.id)) byId.set(item.dish.id, item);
        };

        ranked.slice(0, BASE_CANDIDATE_LIMIT).forEach(addCandidate);

        if (isPriorityActive(input.priorities, 'budget')) {
            ranked
                .filter(item => (input.inventoryAwareBudget ? item.shoppingCostAverage : item.costAverage) !== undefined)
                .sort((a, b) => ((input.inventoryAwareBudget ? a.shoppingCostAverage : a.costAverage) ?? Number.POSITIVE_INFINITY) - ((input.inventoryAwareBudget ? b.shoppingCostAverage : b.costAverage) ?? Number.POSITIVE_INFINITY))
                .slice(0, LOW_COST_CANDIDATE_LIMIT)
                .forEach(addCandidate);
        }

        return Array.from(byId.values()).sort((a, b) => b.score - a.score || a.dish.name.localeCompare(b.dish.name));
    };

    const pickDayAlternatives = (): SmartPlannerDayAlternative[] => {
        const candidatesBySlot: Record<PlannerMealSlot, PlannedDish[]> = {
            breakfast: buildSlotCandidates('breakfast'),
            lunch: buildSlotCandidates('lunch'),
            dinner: buildSlotCandidates('dinner'),
        };
        const comboMap = new Map<string, PlannerDayCombo>();

        for (let index = 0; index < DAY_COMBO_POOL_LIMIT; index += 1) {
            const combo = buildComboFromCandidates(candidatesBySlot, ranges, input, index, input.shuffleAlternatives || index >= ALTERNATIVE_COUNT);
            if (combo && !comboMap.has(combo.key)) comboMap.set(combo.key, combo);
        }

        const pool = Array.from(comboMap.values()).sort((a, b) => b.score - a.score || a.overage - b.overage);
        return pickAlternativeCombos(pool, input).map((combo, index) => buildAlternative(combo.itemsBySlot, index, input, combo.warnings));
    };

    return Array.from({ length: dayCount }).map((_, index) => {
        const alternatives = pickDayAlternatives();
        const picked = alternatives[0];
        if (picked) getAlternativeItems(picked).forEach(item => addUsage(usage, item.dish, input.dishes));
        return {
            date: input.startDate.add(index, 'day').startOf('day'),
            alternatives,
            selectedAlternativeId: picked?.id,
            itemsBySlot: picked?.itemsBySlot,
            breakfast: picked?.breakfast,
            lunch: picked?.lunch,
            dinner: picked?.dinner,
        };
    });
};

export const buildCookNowCategories = (recommendations: SmartPlannerDishRecommendation[]): SmartPlannerCookNowCategory[] => {
    const byBest = recommendations[0];
    const fastest = recommendations
        .filter(item => (item.totalMinutes ?? 0) > 0)
        .slice()
        .sort((a, b) => (a.totalMinutes ?? Number.POSITIVE_INFINITY) - (b.totalMinutes ?? Number.POSITIVE_INFINITY) || b.score - a.score)[0];
    const cheapest = recommendations
        .slice()
        .sort((a, b) => (a.shoppingCostAverage ?? Number.POSITIVE_INFINITY) - (b.shoppingCostAverage ?? Number.POSITIVE_INFINITY) || b.score - a.score)[0];
    const expiring = recommendations
        .filter(item => item.urgentIngredientCount > 0)
        .slice()
        .sort((a, b) => b.urgentIngredientCount - a.urgentIngredientCount || b.score - a.score)[0];
    const household = recommendations
        .filter(item => item.suitabilityScore !== undefined)
        .slice()
        .sort((a, b) => (b.suitabilityScore ?? 0) - (a.suitabilityScore ?? 0) || b.score - a.score)[0];
    const nutrition = recommendations
        .filter(item => item.nutritionMatch)
        .slice()
        .sort((a, b) => (b.nutritionMatch?.score ?? 0) - (a.nutritionMatch?.score ?? 0) || b.score - a.score)[0];
    const ready = recommendations
        .filter(item => (item.missingRequiredIngredientCount ?? 0) === 0)
        .slice()
        .sort((a, b) => (a.shoppingCostAverage ?? 0) - (b.shoppingCostAverage ?? 0) || b.score - a.score)[0];

    const picks: Record<SmartPlannerCookNowCategoryKey, SmartPlannerDishRecommendation | undefined> = {
        best_overall: byBest,
        fastest,
        cheapest,
        uses_expiring: expiring,
        best_household: household,
        best_nutrition: nutrition,
        ready_from_inventory: ready,
    };

    return CATEGORY_DEFINITIONS.map(category => ({ ...category, recommendation: picks[category.key] }));
};

const buildSummaryFromItems = (items: PlannedDish[], warnings: string[] = []): SmartPlannerPlanSummary => {
    const totalCostAverage = items.reduce((sum, item) => sum + (item.costAverage ?? 0), 0);
    const shoppingCostAverage = items.reduce((sum, item) => sum + (item.shoppingCostAverage ?? 0), 0);
    const nutritionScores = items.map(item => item.nutritionMatch?.score).filter((value): value is number => value !== undefined);
    const householdScores = items.map(item => item.suitabilityScore).filter((value): value is number => value !== undefined);
    const missingRows = aggregateShoppingRows(items.flatMap(item => item.missingRows ?? []));
    const itemWarnings = Array.from(new Set([...warnings, ...items.flatMap(item => item.warnings)])).slice(0, 8);
    const missingDataCount = items.filter(item => item.warnings.some(warning => warning.includes('Thiếu dữ liệu') || warning.includes('Thiếu thời gian'))).length;
    return {
        totalScore: clamp(items.reduce((sum, item) => sum + item.score, 0) / Math.max(1, items.length)),
        totalCostAverage,
        totalCostLabel: IngredientPriceHelper.formatCurrency(totalCostAverage),
        shoppingCostAverage,
        shoppingCostLabel: IngredientPriceHelper.formatCurrency(shoppingCostAverage),
        averageNutritionScore: nutritionScores.length > 0 ? Math.round(nutritionScores.reduce((sum, value) => sum + value, 0) / nutritionScores.length * 100) : undefined,
        averageHouseholdScore: householdScores.length > 0 ? Math.round(householdScores.reduce((sum, value) => sum + value, 0) / householdScores.length) : undefined,
        missingIngredientCount: missingRows.length,
        expiringIngredientCount: items.reduce((sum, item) => sum + item.urgentIngredientCount, 0),
        warnings: itemWarnings,
        confidence: clamp(92 - missingDataCount * 10 - itemWarnings.length * 3),
    };
};

const buildSummaryFromDays = (days: SmartPlannerPlannedDay[], input: BuildSmartPlannerInput): SmartPlannerPlanSummary => {
    const alternatives = days
        .map(day => day.alternatives?.find(alternative => alternative.id === day.selectedAlternativeId) ?? day.alternatives?.[0])
        .filter((alternative): alternative is SmartPlannerDayAlternative => Boolean(alternative));
    const items = alternatives.flatMap(getAlternativeItems);
    const repeatedDishWarnings = new Map<string, number>();
    items.forEach(item => repeatedDishWarnings.set(item.dish.id, (repeatedDishWarnings.get(item.dish.id) ?? 0) + 1));
    const warnings = [
        ...Array.from(repeatedDishWarnings.entries())
        .filter(([, count]) => count > 1)
        .map(([dishId, count]) => `Món ${items.find(item => item.dish.id === dishId)?.dish.name ?? dishId} lặp ${count} lần`),
        ...alternatives.flatMap(alternative => alternative.warnings),
    ];
    const summary = buildSummaryFromItems(items, warnings);
    if (input.advancedEnabled && input.scope === 'week' && input.weeklyBudget && summary.shoppingCostAverage > input.weeklyBudget) {
        return {
            ...summary,
            warnings: [...summary.warnings, `Vượt ngân sách tuần ${IngredientPriceHelper.formatCurrency(input.weeklyBudget)}`].slice(0, 8),
            confidence: clamp(summary.confidence - 8),
        };
    }
    return summary;
};

export const buildSmartPlannerResult = (rawInput: BuildSmartPlannerInput): SmartPlannerPlanResult => {
    const input = normalizePlannerInput(rawInput);
    const weights = getPriorityWeights(input.priorities);
    const targetServings = getTargetServings(input.members);
    const usage = createUsageContext();

    if (input.scope === 'cook_now') {
        const slot = input.mealSlots.find((item): item is PlannerMealSlot => item === 'breakfast' || item === 'lunch' || item === 'dinner');
        const rankedRecommendations = buildRecommendations(input, usage, targetServings, weights, slot ?? 'any').slice(0, 60);
        return {
            rankedRecommendations,
            cookNowCategories: buildCookNowCategories(rankedRecommendations),
            summary: buildSummaryFromItems(rankedRecommendations.slice(0, 12)),
        };
    }

    const plannedDays = buildPlannedDays(input, targetServings, weights);
    return {
        plannedDays,
        summary: buildSummaryFromDays(plannedDays, input),
    };
};

export const SmartPlannerEngine = {
    aggregateShoppingRows,
    buildCookNowCategories,
    buildSmartPlannerResult,
    getAlternativeItems,
    getDishIngredientIds: getSmartPlannerDishIngredientIds,
};
