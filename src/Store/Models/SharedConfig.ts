import { IngredientPreservationCondition, IngredientShelfLife } from "./Ingredient";

export type InventoryExpirationDefaults = Record<IngredientShelfLife, Record<IngredientPreservationCondition, number>>;
export type NutritionGoalNutrientKey = "calories" | "protein" | "carbs" | "fat" | "saturatedFat" | "cholesterol" | "fiber" | "sugar" | "sodium" | "potassium" | "calcium" | "iron" | "vitaminA" | "vitaminC";
export type NutritionGoalCriteriaDirection = "at_least" | "at_most" | "between";

export type NutritionGoalCriterion = {
    id: string;
    nutrient: NutritionGoalNutrientKey;
    direction: NutritionGoalCriteriaDirection;
    min?: number;
    max?: number;
}

export type NutritionGoal = {
    id: string;
    name: string;
    description?: string;
    color?: string;
    criteria: NutritionGoalCriterion[];
    createdAt?: string;
    updatedAt?: string;
}

export type NutritionConfig = {
    goals: NutritionGoal[];
}

export type InventoryHealthConfig = {
    lowStockAmount: number;
    urgentExpiryDays: number;
    expirationDefaults: InventoryExpirationDefaults;
}

export type SharedConfig = {
    inventory: InventoryHealthConfig;
    nutrition: NutritionConfig;
}

export const DEFAULT_INVENTORY_EXPIRATION_DEFAULTS: InventoryExpirationDefaults = {
    very_short: { room_temperature: 1, cool_dry: 1, fridge: 2, freezer: 14 },
    short: { room_temperature: 2, cool_dry: 3, fridge: 5, freezer: 30 },
    medium: { room_temperature: 5, cool_dry: 7, fridge: 10, freezer: 60 },
    long: { room_temperature: 14, cool_dry: 21, fridge: 21, freezer: 90 },
    very_long: { room_temperature: 60, cool_dry: 90, fridge: 90, freezer: 180 },
};

export const DEFAULT_INVENTORY_HEALTH_CONFIG: InventoryHealthConfig = {
    lowStockAmount: 2,
    urgentExpiryDays: 3,
    expirationDefaults: DEFAULT_INVENTORY_EXPIRATION_DEFAULTS,
};

export const DEFAULT_NUTRITION_GOALS: NutritionGoal[] = [
    {
        id: "balanced-meal",
        name: "Bữa cân bằng",
        description: "Kcal vừa phải, đủ đạm và có chất xơ cho một khẩu phần.",
        color: "#7436dc",
        criteria: [
            { id: "balanced-calories", nutrient: "calories", direction: "between", min: 350, max: 650 },
            { id: "balanced-protein", nutrient: "protein", direction: "at_least", min: 18 },
            { id: "balanced-fat", nutrient: "fat", direction: "at_most", max: 28 },
            { id: "balanced-fiber", nutrient: "fiber", direction: "at_least", min: 4 },
        ],
    },
    {
        id: "high-protein",
        name: "Giàu đạm",
        description: "Ưu tiên món có lượng protein cao cho mỗi khẩu phần.",
        color: "#1677ff",
        criteria: [
            { id: "high-protein-protein", nutrient: "protein", direction: "at_least", min: 28 },
            { id: "high-protein-calories", nutrient: "calories", direction: "at_most", max: 750 },
        ],
    },
    {
        id: "light-calories",
        name: "Nhẹ kcal",
        description: "Ưu tiên món nhẹ năng lượng nhưng vẫn có đạm cơ bản.",
        color: "#389e0d",
        criteria: [
            { id: "light-calories-calories", nutrient: "calories", direction: "at_most", max: 450 },
            { id: "light-calories-protein", nutrient: "protein", direction: "at_least", min: 12 },
        ],
    },
    {
        id: "high-fiber",
        name: "Nhiều chất xơ",
        description: "Ưu tiên món có nhiều rau củ, đậu, ngũ cốc hoặc chất xơ.",
        color: "#d48806",
        criteria: [
            { id: "high-fiber-fiber", nutrient: "fiber", direction: "at_least", min: 7 },
            { id: "high-fiber-calories", nutrient: "calories", direction: "at_most", max: 700 },
        ],
    },
];

export const DEFAULT_NUTRITION_CONFIG: NutritionConfig = {
    goals: DEFAULT_NUTRITION_GOALS,
};

export const DEFAULT_SHARED_CONFIG: SharedConfig = {
    inventory: DEFAULT_INVENTORY_HEALTH_CONFIG,
    nutrition: DEFAULT_NUTRITION_CONFIG,
};

export const normalizeInventoryHealthConfig = (config?: Partial<InventoryHealthConfig> | null): InventoryHealthConfig => ({
    lowStockAmount: typeof config?.lowStockAmount === "number" && config.lowStockAmount >= 0
        ? config.lowStockAmount
        : DEFAULT_INVENTORY_HEALTH_CONFIG.lowStockAmount,
    urgentExpiryDays: typeof config?.urgentExpiryDays === "number" && config.urgentExpiryDays >= 0
        ? config.urgentExpiryDays
        : DEFAULT_INVENTORY_HEALTH_CONFIG.urgentExpiryDays,
    expirationDefaults: {
        very_short: { ...DEFAULT_INVENTORY_EXPIRATION_DEFAULTS.very_short, ...config?.expirationDefaults?.very_short },
        short: { ...DEFAULT_INVENTORY_EXPIRATION_DEFAULTS.short, ...config?.expirationDefaults?.short },
        medium: { ...DEFAULT_INVENTORY_EXPIRATION_DEFAULTS.medium, ...config?.expirationDefaults?.medium },
        long: { ...DEFAULT_INVENTORY_EXPIRATION_DEFAULTS.long, ...config?.expirationDefaults?.long },
        very_long: { ...DEFAULT_INVENTORY_EXPIRATION_DEFAULTS.very_long, ...config?.expirationDefaults?.very_long },
    },
});

const normalizeNumber = (value: unknown): number | undefined => {
    if (value === null || value === undefined || value === "") return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 10) / 10 : undefined;
};

export const normalizeNutritionGoals = (goals?: Partial<NutritionGoal>[] | null): NutritionGoal[] => {
    const source = Array.isArray(goals) ? goals : DEFAULT_NUTRITION_GOALS;
    return source
        .map((goal, goalIndex) => {
            const criteria = (goal.criteria ?? [])
                .map((criterion, criterionIndex) => {
                    const direction = criterion.direction === "at_most" || criterion.direction === "between" ? criterion.direction : "at_least";
                    return {
                        id: criterion.id || `${goal.id || `goal-${goalIndex}`}-criterion-${criterionIndex}`,
                        nutrient: criterion.nutrient ?? "calories",
                        direction,
                        min: normalizeNumber(criterion.min),
                        max: normalizeNumber(criterion.max),
                    } as NutritionGoalCriterion;
                })
                .filter(criterion => {
                    if (criterion.direction === "at_least") return criterion.min !== undefined;
                    if (criterion.direction === "at_most") return criterion.max !== undefined;
                    return criterion.min !== undefined && criterion.max !== undefined;
                });

            return {
                id: goal.id || `nutrition-goal-${goalIndex}`,
                name: (goal.name || "Mục tiêu dinh dưỡng").trim(),
                description: goal.description?.trim(),
                color: goal.color || DEFAULT_NUTRITION_GOALS[goalIndex % DEFAULT_NUTRITION_GOALS.length]?.color || "#7436dc",
                criteria,
                createdAt: goal.createdAt,
                updatedAt: goal.updatedAt,
            } as NutritionGoal;
        })
        .filter(goal => goal.name && goal.criteria.length > 0);
};

export const normalizeNutritionConfig = (config?: Partial<NutritionConfig> | null): NutritionConfig => ({
    goals: normalizeNutritionGoals(config?.goals),
});

export const normalizeSharedConfig = (config?: Partial<SharedConfig> | null): SharedConfig => ({
    inventory: normalizeInventoryHealthConfig(config?.inventory),
    nutrition: normalizeNutritionConfig(config?.nutrition),
});
