import { Dishes } from '@store/Models/Dishes';
import { Ingredient, IngredientNutritionInfo } from '@store/Models/Ingredient';
import { DishServingHelper } from './DishServingHelper';
import { IngredientNutritionHelper } from './IngredientNutritionHelper';
import { IngredientUnitHelper } from './IngredientUnitHelper';

export type DishNutritionNutrientKey = keyof Pick<IngredientNutritionInfo,
    'calories' | 'protein' | 'carbs' | 'fat' | 'saturatedFat' | 'cholesterol' | 'fiber' | 'sugar' | 'sodium' | 'potassium' | 'calcium' | 'iron' | 'vitaminA' | 'vitaminC'
>;

export type DishNutritionTotals = Partial<Record<DishNutritionNutrientKey, number>>;

export type DishNutritionSummary = {
    dishId: string;
    servings: number;
    ingredientCount: number;
    coveredIngredientCount: number;
    coveragePercent: number;
    total: DishNutritionTotals;
    perServing: DishNutritionTotals;
    missingNutritionIngredientIds: string[];
    missingConversionIngredientIds: string[];
    sourceNames: string[];
    hasNutrition: boolean;
}

const nutrientKeys: DishNutritionNutrientKey[] = [
    'calories',
    'protein',
    'carbs',
    'fat',
    'saturatedFat',
    'cholesterol',
    'fiber',
    'sugar',
    'sodium',
    'potassium',
    'calcium',
    'iron',
    'vitaminA',
    'vitaminC',
];

const roundOne = (value: number): number => Math.round(value * 10) / 10;

const hasNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

const addScaledNutrition = (target: DishNutritionTotals, nutrition: IngredientNutritionInfo, factor: number) => {
    nutrientKeys.forEach(key => {
        const value = nutrition[key];
        if (!hasNumber(value)) return;
        target[key] = (target[key] ?? 0) + value * factor;
    });
};

const normalizeTotals = (value: DishNutritionTotals): DishNutritionTotals => {
    return nutrientKeys.reduce((result, key) => {
        const nextValue = value[key];
        if (hasNumber(nextValue)) result[key] = roundOne(nextValue);
        return result;
    }, {} as DishNutritionTotals);
};

const divideTotals = (value: DishNutritionTotals, divisor: number): DishNutritionTotals => {
    const safeDivisor = divisor > 0 ? divisor : 1;
    return nutrientKeys.reduce((result, key) => {
        const nextValue = value[key];
        if (hasNumber(nextValue)) result[key] = roundOne(nextValue / safeDivisor);
        return result;
    }, {} as DishNutritionTotals);
};

const hasAnyNutrition = (value: DishNutritionTotals): boolean => nutrientKeys.some(key => hasNumber(value[key]));

export const DishNutritionHelper = {
    nutrientKeys,

    roundOne,

    calculateDishNutrition(
        dish: Dishes,
        allDishes: Dishes[],
        ingredientsById: Map<string, Ingredient>,
        options: { targetServings?: number } = {},
    ): DishNutritionSummary {
        const servings = DishServingHelper.getTargetServings(dish, options.targetServings);
        const amounts = DishServingHelper.collectIngredientAmounts(dish, allDishes, { targetServings: servings })
            .filter(item => item.required !== false);
        const ingredientIds = new Set(amounts.map(item => item.ingredientId));
        const coveredIngredientIds = new Set<string>();
        const missingNutritionIds = new Set<string>();
        const missingConversionIds = new Set<string>();
        const sourceNames = new Set<string>();
        const rawTotals: DishNutritionTotals = {};

        amounts.forEach(amount => {
            const ingredient = ingredientsById.get(amount.ingredientId);
            const nutrition = IngredientNutritionHelper.getNutrition(ingredient);
            if (!nutrition) {
                missingNutritionIds.add(amount.ingredientId);
                return;
            }

            const convertedAmount = IngredientUnitHelper.toBaseAmount(ingredient, amount.amount, amount.unit, nutrition.unit);
            if (convertedAmount === null || convertedAmount <= 0) {
                missingConversionIds.add(amount.ingredientId);
                return;
            }

            const factor = convertedAmount / nutrition.amount;
            addScaledNutrition(rawTotals, nutrition, factor);
            coveredIngredientIds.add(amount.ingredientId);
            nutrition.sources?.forEach(source => sourceNames.add(source.name));
        });

        const total = normalizeTotals(rawTotals);
        const perServing = divideTotals(total, servings);
        const ingredientCount = ingredientIds.size;

        return {
            dishId: dish.id,
            servings,
            ingredientCount,
            coveredIngredientCount: coveredIngredientIds.size,
            coveragePercent: ingredientCount > 0 ? Math.round(coveredIngredientIds.size / ingredientCount * 100) : 0,
            total,
            perServing,
            missingNutritionIngredientIds: Array.from(missingNutritionIds),
            missingConversionIngredientIds: Array.from(missingConversionIds),
            sourceNames: Array.from(sourceNames),
            hasNutrition: hasAnyNutrition(perServing),
        };
    },

    formatCalories(value?: number): string {
        if (!hasNumber(value)) return '-';
        return `${IngredientUnitHelper.formatAmount(roundOne(value))} kcal`;
    },

    formatGram(value?: number): string {
        if (!hasNumber(value)) return '-';
        return `${IngredientUnitHelper.formatAmount(roundOne(value))}g`;
    },

    formatMilligram(value?: number): string {
        if (!hasNumber(value)) return '-';
        return `${IngredientUnitHelper.formatAmount(roundOne(value))}mg`;
    },
};
