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
import { CookingSession } from '@store/Models/CookingSession';
import { HouseholdMemberProfile } from '@store/Reducers/AppContextReducer';
import dayjs, { Dayjs } from 'dayjs';

export type SmartPlannerScope = 'cook_now' | 'day' | 'week';
export type SmartPlannerMealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'any';
export type PlannerMealSlot = 'breakfast' | 'lunch' | 'dinner';
export type SmartPlannerShoppingMode = 'no_shopping' | 'small_top_up' | 'normal';
export type SmartPlannerVarietyMode = 'familiar' | 'balanced' | 'more_variety';
export type SmartPlannerPreset = 'balanced' | 'quick' | 'budget' | 'healthy' | 'family_fit' | 'use_inventory' | 'no_shopping' | 'more_variety';
export type SmartPlannerCriterion = 'budget' | 'nutrition' | 'member';

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

export type SmartPlannerDayAlternative = {
    id: string;
    label: string;
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
    preferExpiring: boolean;
    varietyMode: SmartPlannerVarietyMode;
    preset: SmartPlannerPreset;
    requiredTags: string[];
    avoidedIngredientIds: string[];
    requiredExpiringIngredientIds: string[];
    criteria: SmartPlannerCriterion[];
    inventoryAwareBudget: boolean;
    dishes: Dishes[];
    ingredients: Ingredient[];
    ingredientsById: Map<string, Ingredient>;
    inventoryItems: Record<string, IngredientInventory>;
    inventoryConfig?: InventoryHealthConfig;
    members: HouseholdMemberProfile[];
    nutritionGoals: NutritionGoal[];
    scheduledMeals: ScheduledMeal[];
    cookingSessions: CookingSession[];
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
const METHOD_TAGS = ['Nướng', 'Chiên', 'Hấp', 'Luộc', 'Xào', 'Salad'];

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

const getPresetWeights = (preset: SmartPlannerPreset): PlannerWeights => {
    const weights = { ...DEFAULT_WEIGHTS };
    if (preset === 'quick') weights.time += 0.18;
    if (preset === 'budget') weights.budget += 0.18;
    if (preset === 'healthy') weights.nutrition += 0.18;
    if (preset === 'family_fit') weights.household += 0.18;
    if (preset === 'use_inventory' || preset === 'no_shopping') weights.inventory += 0.20;
    if (preset === 'more_variety') weights.variety += 0.18;
    return normalizeWeights(weights);
};

const getSummaryAverage = (summary: { min: number; max: number; pricedCount: number }, emptyValue?: number): number | undefined => {
    if (summary.pricedCount <= 0) return emptyValue;
    return (summary.min + summary.max) / 2;
};

const formatPercent = (value: number): string => `${Math.round(value)}%`;

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

export const getAlternativeItems = (alternative: SmartPlannerDayAlternative): PlannedDish[] => [alternative.breakfast, alternative.lunch, alternative.dinner].filter((item): item is PlannedDish => Boolean(item));

const getSlotScore = (dish: Dishes, slot: PlannerMealSlot | 'any'): { score: number; reason?: string } => {
    const tags = dish.tags ?? [];
    if (slot === 'any') return { score: 8, reason: 'linh hoạt bữa' };
    if (slot === 'breakfast') {
        if (tags.includes('Ăn sáng')) return { score: 16, reason: 'hợp bữa sáng' };
        const minutes = DishDurationHelper.getTotalMinutes(dish.duration);
        if (minutes > 0 && minutes <= 25) return { score: 9, reason: 'nấu nhanh buổi sáng' };
        return { score: -2 };
    }
    if (tags.includes('Món chính')) return { score: 12, reason: 'món chính' };
    if (tags.includes('Canh') || tags.includes('Xào')) return { score: 7, reason: 'dễ ghép bữa' };
    return { score: 0 };
};

const getMethodTags = (dish: Dishes): string[] => (dish.tags ?? []).filter(tag => METHOD_TAGS.includes(tag));

const getPrimaryIngredientIds = (dish: Dishes, dishes: Dishes[]): string[] => getSmartPlannerDishIngredientIds(dish, dishes).slice(0, 3);

const getBudgetScore = (costAverage: number | undefined, referenceBudget: number, missingPriceCount: number): number => {
    if (costAverage === undefined) return missingPriceCount > 0 ? 42 : 70;
    if (referenceBudget <= 0) return 74;
    if (costAverage <= referenceBudget) return 100;
    const ratio = costAverage / referenceBudget;
    return clamp(100 - Math.min(70, (ratio - 1) * 72));
};

const getInventoryScore = (cost: DishCostInfo, preferExpiring: boolean): number => {
    let score = cost.missingRequiredIngredientCount === 0 ? 94 : Math.max(35, 84 - cost.missingRequiredIngredientCount * 17 - cost.missingIngredientCount * 6);
    if (cost.shoppingCostAverage === 0) score += 8;
    if (cost.urgentIngredientCount > 0) score += preferExpiring ? Math.min(18, cost.urgentIngredientCount * 8) : Math.min(8, cost.urgentIngredientCount * 4);
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
    const windowDays = input.varietyMode === 'more_variety' ? 21 : input.varietyMode === 'balanced' ? 14 : 7;
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
    let penalty = 0;
    const recentCount = getRecentDishCount(dish.id, input);
    const recentMultiplier = input.varietyMode === 'more_variety' ? 18 : input.varietyMode === 'balanced' ? 12 : 6;
    penalty += Math.min(42, recentCount * recentMultiplier);
    if (usage.usedDishIds.has(dish.id)) penalty += input.varietyMode === 'familiar' ? 30 : 46;

    getPrimaryIngredientIds(dish, input.dishes).forEach(id => {
        const count = usage.usedIngredientCounts.get(id) ?? 0;
        penalty += Math.min(18, count * (input.varietyMode === 'more_variety' ? 8 : 4));
    });
    getMethodTags(dish).forEach(tag => {
        const count = usage.usedMethodCounts.get(tag) ?? 0;
        penalty += Math.min(14, count * (input.varietyMode === 'more_variety' ? 7 : 3));
    });

    return {
        score: clamp(96 - penalty),
        detail: recentCount > 0 ? `${recentCount} lần gần đây` : usage.usedDishIds.has(dish.id) ? 'đã có trong gợi ý hiện tại' : 'không lặp gần đây',
        penalty,
    };
};

const getHardBlockReasons = (dish: Dishes, input: BuildSmartPlannerInput, cost: DishCostInfo, minutes: number): string[] => {
    const ingredientIds = new Set(getSmartPlannerDishIngredientIds(dish, input.dishes));
    const tags = new Set(dish.tags ?? []);
    const hardSafetyReasons = HouseholdSuitabilityHelper.getHardBlockReasons(dish, input.members, input.dishes, input.ingredientsById);
    const blockers = [...hardSafetyReasons];
    const shoppingMode = input.shoppingMode;

    if (shoppingMode === 'no_shopping' && cost.missingRequiredIngredientCount > 0) blockers.push('Thiếu nguyên liệu bắt buộc trong chế độ không đi mua');
    if (input.strictTime && input.maxCookMinutes && (minutes <= 0 || minutes > input.maxCookMinutes)) blockers.push('Vượt thời gian nấu tối đa');
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
): PlannedDish | null => {
    const minutes = DishDurationHelper.getTotalMinutes(dish.duration);
    const cost = getDishCostInfo(dish, input.ingredients, input.dishes, targetServings, input.inventoryItems, input.inventoryConfig);
    const blockers = getHardBlockReasons(dish, input, cost, minutes);
    if (blockers.length > 0) return null;

    const enabledCriteria = new Set(input.criteria);
    const reasons: string[] = [];
    const warnings: string[] = [];
    const details: SmartPlannerScoreDetail[] = [];
    const slotResult = getSlotScore(dish, slot);
    const slotScore = clamp(68 + slotResult.score * 2);
    if (slotResult.reason) reasons.push(slotResult.reason);
    details.push(buildScoreDetail('Độ hợp bữa ăn', slotResult.reason ?? 'Không có tag phù hợp rõ ràng', slotScore, 0.08, 'So khớp món với bữa đang lập. Bữa sáng ưu tiên tag Ăn sáng hoặc món nấu nhanh; bữa trưa và tối ưu tiên món chính, canh hoặc món dễ ghép bữa.'));

    const timeScore = getTimeScore(minutes, input.maxCookMinutes);
    if (minutes > 0) reasons.push(DishDurationHelper.formatMinutes(minutes));
    else warnings.push('Thiếu thời gian nấu');
    details.push(buildScoreDetail('Thời gian nấu', minutes > 0 ? DishDurationHelper.formatMinutes(minutes) : 'Chưa có thời gian nấu', timeScore, weights.time, 'Món càng gần giới hạn thời gian người dùng chọn càng được ưu tiên. Thiếu thời gian nấu làm giảm độ tin cậy.'));

    const inventoryScore = getInventoryScore(cost, input.preferExpiring || input.preset === 'use_inventory');
    if (cost.shoppingCostAverage === 0) reasons.push('không cần mua');
    if (cost.urgentIngredientCount > 0) reasons.push(`dùng ${cost.urgentIngredientCount} đồ sắp hết hạn`);
    if (cost.missingIngredientCount > 0) warnings.push(`Cần mua ${cost.missingIngredientCount} nguyên liệu`);
    details.push(buildScoreDetail('Tồn kho và đồ sắp hết hạn', cost.shoppingCostAverage === 0 ? 'Có đủ theo tồn kho hiện tại' : `Cần mua ${cost.shoppingCostLabel ?? 'thiếu giá'}`, inventoryScore, weights.inventory, 'Tính nguyên liệu đang có, nguyên liệu luôn có và phần cần mua thêm. Nguyên liệu sắp hết hạn được cộng điểm khi bật ưu tiên dùng tồn kho.'));

    const budgetReference = input.scope === 'cook_now'
        ? Math.max(1, input.maxExtraSpend ?? input.dailyBudget ?? 100000)
        : Math.max(1, (input.dailyBudget ?? 150000) / 3);
    const budgetCost = input.inventoryAwareBudget ? cost.shoppingCostAverage : cost.costAverage;
    const budgetScore = enabledCriteria.has('budget') ? getBudgetScore(budgetCost, budgetReference, cost.missingPriceCount) : 62;
    if (enabledCriteria.has('budget')) {
        if (budgetCost === undefined || cost.missingPriceCount > 0) warnings.push('Thiếu dữ liệu giá');
        else if (budgetCost <= budgetReference) reasons.push(input.inventoryAwareBudget ? 'vừa tiền mua thêm' : 'vừa ngân sách');
    }
    details.push(buildScoreDetail('Ngân sách', enabledCriteria.has('budget') ? `${input.inventoryAwareBudget ? 'Cần mua' : 'Tổng'} ${input.inventoryAwareBudget ? cost.shoppingCostLabel ?? 'thiếu giá' : cost.costLabel ?? 'thiếu giá'}` : 'Không dùng để xếp hạng', budgetScore, weights.budget, enabledCriteria.has('budget') ? 'So chi phí với ngân sách đang chọn. Khi bật tính theo tủ lạnh, planner dùng phần cần mua thêm sau khi trừ tồn kho.' : 'Tiêu chí Ngân sách đang tắt, nên chi phí món không ảnh hưởng mạnh đến xếp hạng.'));

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
    details.push(buildScoreDetail('Mục tiêu dinh dưỡng', enabledCriteria.has('nutrition') && selectedNutritionGoal ? nutritionLabel ? `${nutritionLabel} (${formatPercent(nutritionScore)} gần mục tiêu)` : `Thiếu dữ liệu cho ${selectedNutritionGoal.name}` : 'Không dùng để xếp hạng', nutritionScore, weights.nutrition, enabledCriteria.has('nutrition') && selectedNutritionGoal ? 'So sánh dinh dưỡng mỗi phần ăn với mục tiêu đã chọn. Thiếu dữ liệu dinh dưỡng làm giảm độ tin cậy.' : 'Tiêu chí Dinh dưỡng đang tắt hoặc chưa chọn mục tiêu.'));

    let suitability: HouseholdDishSuitability | undefined;
    let suitabilityScore = 64;
    if (enabledCriteria.has('member') && input.members.length > 0) {
        suitability = HouseholdSuitabilityHelper.evaluateDishForMembers(dish, input.members, input.dishes, input.ingredientsById, input.nutritionGoals);
        suitabilityScore = suitability.averageScore;
        if (suitability.warningCount > 0) warnings.push(`${suitability.warningCount} lưu ý nhà mình`);
        else if (suitability.positiveCount > 0) reasons.push('hợp nhà mình');
    }
    const feedback = getFeedbackImpact(dish.id, input);
    const householdWithFeedbackScore = clamp(suitabilityScore + feedback.impact);
    if (feedback.label) reasons.push(feedback.label);
    details.push(buildScoreDetail('Độ hợp nhà mình', enabledCriteria.has('member') && input.members.length > 0 ? `${householdWithFeedbackScore}% cho ${input.members.length} thành viên${feedback.label ? ` · ${feedback.label}` : ''}` : 'Không dùng để xếp hạng', householdWithFeedbackScore, weights.household, 'Tính hồ sơ các thành viên đang chọn và phản hồi nấu ăn đã lưu. Dị ứng và nguyên liệu chặn cứng được lọc trước khi chấm điểm.'));

    const variety = getVarietyScore(dish, input, usage);
    if (variety.penalty > 0) warnings.push('Bị trừ vì lặp món hoặc nguyên liệu gần đây');
    details.push(buildScoreDetail('Đa dạng thực đơn', variety.detail, variety.score, weights.variety, 'Dựa trên lịch nấu/lịch ăn gần đây và các món đã chọn trong lần lập hiện tại. Chế độ nhiều đa dạng trừ điểm lặp mạnh hơn.'));

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
        suitabilityScore: enabledCriteria.has('member') ? householdWithFeedbackScore : undefined,
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

const buildRecommendations = (input: BuildSmartPlannerInput, usage: UsageContext, targetServings: number, weights: PlannerWeights, slot: PlannerMealSlot | 'any'): PlannedDish[] => input.dishes
    .filter(dish => dish.isCompleted !== false)
    .map(dish => scoreDish(dish, slot, input, usage, targetServings, weights))
    .filter((item): item is PlannedDish => Boolean(item))
    .sort((a, b) => b.score - a.score || a.dish.name.localeCompare(b.dish.name));

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

const applyDailyBudgetToDay = (itemsBySlot: Partial<Record<PlannerMealSlot, PlannedDish>>, input: BuildSmartPlannerInput): Partial<Record<PlannerMealSlot, PlannedDish>> => {
    if (!input.criteria.includes('budget')) return itemsBySlot;
    const items = PLANNER_MEAL_SLOTS.map(slot => itemsBySlot[slot]).filter((item): item is PlannedDish => Boolean(item));
    if (items.length === 0) return itemsBySlot;

    const dailyBudgetScore = getDailyBudgetScore(items, input);
    const perDishImpact = dailyBudgetScore.impact / items.length;

    return PLANNER_MEAL_SLOTS.reduce((result, slot) => {
        const item = itemsBySlot[slot];
        if (!item) return result;
        const itemCostLabel = item.costLabel ?? 'thiếu dữ liệu giá';
        result[slot] = {
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
        return result;
    }, {} as Partial<Record<PlannerMealSlot, PlannedDish>>);
};

const buildAlternative = (itemsBySlot: Partial<Record<PlannerMealSlot, PlannedDish>>, index: number, input: BuildSmartPlannerInput): SmartPlannerDayAlternative => {
    const withBudget = applyDailyBudgetToDay(itemsBySlot, input);
    const items = PLANNER_MEAL_SLOTS.map(slot => withBudget[slot]).filter((item): item is PlannedDish => Boolean(item));
    const totalCostAverage = items.reduce((sum, item) => sum + (item.costAverage ?? 0), 0);
    const shoppingCostAverage = items.reduce((sum, item) => sum + (item.shoppingCostAverage ?? 0), 0);
    const nutritionScores = items.map(item => item.nutritionMatch?.score).filter((value): value is number => value !== undefined);
    const suitabilityScores = items.map(item => item.suitabilityScore).filter((value): value is number => value !== undefined);
    const missingRows = aggregateShoppingRows(items.flatMap(item => item.missingRows ?? []));
    return {
        id: `alt-${index + 1}-${items.map(item => item.dish.id).join('-')}`,
        label: `Phương án ${index + 1}`,
        breakfast: withBudget.breakfast,
        lunch: withBudget.lunch,
        dinner: withBudget.dinner,
        totalScore: clamp(items.reduce((sum, item) => sum + item.score, 0) / Math.max(1, items.length)),
        totalCostAverage,
        totalCostLabel: IngredientPriceHelper.formatCurrency(totalCostAverage),
        shoppingCostAverage,
        shoppingCostLabel: IngredientPriceHelper.formatCurrency(shoppingCostAverage),
        nutritionScore: nutritionScores.length > 0 ? Math.round(nutritionScores.reduce((sum, value) => sum + value, 0) / nutritionScores.length * 100) : undefined,
        suitabilityScore: suitabilityScores.length > 0 ? Math.round(suitabilityScores.reduce((sum, value) => sum + value, 0) / suitabilityScores.length) : undefined,
        reasons: Array.from(new Set(items.flatMap(item => item.reasons))).slice(0, 5),
        warnings: Array.from(new Set(items.flatMap(item => item.warnings))).slice(0, 6),
        missingRows,
    };
};

const buildPlannedDays = (input: BuildSmartPlannerInput, targetServings: number, weights: PlannerWeights): SmartPlannerPlannedDay[] => {
    const usage = createUsageContext();
    const dayCount = input.scope === 'week' ? 7 : 1;

    const buildSlotCandidates = (slot: PlannerMealSlot): PlannedDish[] => {
        const ranked = buildRecommendations(input, usage, targetServings, weights, slot);
        const byId = new Map<string, PlannedDish>();
        const addCandidate = (item: PlannedDish) => {
            if (!byId.has(item.dish.id)) byId.set(item.dish.id, item);
        };

        ranked.slice(0, BASE_CANDIDATE_LIMIT).forEach(addCandidate);

        if (input.criteria.includes('budget')) {
            ranked
                .filter(item => (input.inventoryAwareBudget ? item.shoppingCostAverage : item.costAverage) !== undefined)
                .sort((a, b) => ((input.inventoryAwareBudget ? a.shoppingCostAverage : a.costAverage) ?? Number.POSITIVE_INFINITY) - ((input.inventoryAwareBudget ? b.shoppingCostAverage : b.costAverage) ?? Number.POSITIVE_INFINITY))
                .slice(0, LOW_COST_CANDIDATE_LIMIT)
                .forEach(addCandidate);
        }

        return Array.from(byId.values()).sort((a, b) => b.score - a.score || a.dish.name.localeCompare(b.dish.name));
    };

    const pickDayAlternatives = (): SmartPlannerDayAlternative[] => {
        const breakfastCandidates = buildSlotCandidates('breakfast');
        const lunchCandidates = buildSlotCandidates('lunch');
        const dinnerCandidates = buildSlotCandidates('dinner');

        const collectRankedCombos = (allowDuplicateDishes: boolean) => {
            const combos: Array<{ itemsBySlot: Partial<Record<PlannerMealSlot, PlannedDish>>; score: number; overage: number; key: string }> = [];

            breakfastCandidates.forEach(breakfast => {
                lunchCandidates.forEach(lunch => {
                    dinnerCandidates.forEach(dinner => {
                        const items = [breakfast, lunch, dinner].filter(Boolean);
                        const ids = items.map(item => item.dish.id);
                        if (!allowDuplicateDishes && new Set(ids).size !== ids.length) return;

                        const dailyBudgetScore = input.criteria.includes('budget') ? getDailyBudgetScore(items, input) : undefined;
                        const score = items.reduce((sum, item) => sum + item.score, 0) + (dailyBudgetScore?.impact ?? 0);
                        const overage = dailyBudgetScore ? Math.max(0, dailyBudgetScore.budgetCostAverage - dailyBudgetScore.dayBudget) : 0;
                        combos.push({ itemsBySlot: { breakfast, lunch, dinner }, score, overage, key: ids.join('|') });
                    });
                });
            });

            return combos.sort((a, b) => b.score - a.score || a.overage - b.overage);
        };

        const comboMap = new Map<string, { itemsBySlot: Partial<Record<PlannerMealSlot, PlannedDish>>; score: number; overage: number; key: string }>();
        [...collectRankedCombos(false), ...collectRankedCombos(true)].forEach(combo => {
            if (comboMap.size >= ALTERNATIVE_COUNT) return;
            if (!comboMap.has(combo.key)) comboMap.set(combo.key, combo);
        });

        return Array.from(comboMap.values()).map((combo, index) => buildAlternative(combo.itemsBySlot, index, input));
    };

    return Array.from({ length: dayCount }).map((_, index) => {
        const alternatives = pickDayAlternatives();
        const picked = alternatives[0];
        if (picked) getAlternativeItems(picked).forEach(item => addUsage(usage, item.dish, input.dishes));
        return {
            date: input.startDate.add(index, 'day').startOf('day'),
            alternatives,
            selectedAlternativeId: picked?.id,
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
    const warnings = Array.from(repeatedDishWarnings.entries())
        .filter(([, count]) => count > 1)
        .map(([dishId, count]) => `Món ${items.find(item => item.dish.id === dishId)?.dish.name ?? dishId} lặp ${count} lần`);
    const summary = buildSummaryFromItems(items, warnings);
    if (input.scope === 'week' && input.weeklyBudget && summary.shoppingCostAverage > input.weeklyBudget) {
        return {
            ...summary,
            warnings: [...summary.warnings, `Vượt ngân sách tuần ${IngredientPriceHelper.formatCurrency(input.weeklyBudget)}`].slice(0, 8),
            confidence: clamp(summary.confidence - 8),
        };
    }
    return summary;
};

export const buildSmartPlannerResult = (input: BuildSmartPlannerInput): SmartPlannerPlanResult => {
    const weights = getPresetWeights(input.preset);
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
