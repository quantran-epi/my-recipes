import { DishNutritionHelper, DishNutritionSummary } from './DishNutritionHelper';
import { NutritionGoal, NutritionGoalCriterion, NutritionGoalCriteriaDirection, NutritionGoalNutrientKey } from '@store/Models/SharedConfig';

export type NutritionGoalMatch = {
    score: number;
    matchedCriteriaCount: number;
    totalCriteriaCount: number;
    criteria: Array<{
        criterion: NutritionGoalCriterion;
        value: number;
        score: number;
        matched: boolean;
        label: string;
    }>;
}

export const NUTRITION_NUTRIENT_OPTIONS: { value: NutritionGoalNutrientKey; label: string; unit: string; format: (value?: number) => string }[] = [
    { value: 'calories', label: 'Kcal', unit: 'kcal', format: DishNutritionHelper.formatCalories },
    { value: 'protein', label: 'Đạm', unit: 'g', format: DishNutritionHelper.formatGram },
    { value: 'carbs', label: 'Tinh bột', unit: 'g', format: DishNutritionHelper.formatGram },
    { value: 'fat', label: 'Chất béo', unit: 'g', format: DishNutritionHelper.formatGram },
    { value: 'saturatedFat', label: 'Béo bão hòa', unit: 'g', format: DishNutritionHelper.formatGram },
    { value: 'cholesterol', label: 'Cholesterol', unit: 'mg', format: DishNutritionHelper.formatMilligram },
    { value: 'fiber', label: 'Chất xơ', unit: 'g', format: DishNutritionHelper.formatGram },
    { value: 'sugar', label: 'Đường', unit: 'g', format: DishNutritionHelper.formatGram },
    { value: 'sodium', label: 'Natri', unit: 'mg', format: DishNutritionHelper.formatMilligram },
    { value: 'potassium', label: 'Kali', unit: 'mg', format: DishNutritionHelper.formatMilligram },
    { value: 'calcium', label: 'Canxi', unit: 'mg', format: DishNutritionHelper.formatMilligram },
    { value: 'iron', label: 'Sắt', unit: 'mg', format: DishNutritionHelper.formatMilligram },
    { value: 'vitaminA', label: 'Vitamin A', unit: 'mcg', format: value => value === undefined ? '-' : `${DishNutritionHelper.roundOne(value)}mcg` },
    { value: 'vitaminC', label: 'Vitamin C', unit: 'mg', format: DishNutritionHelper.formatMilligram },
];

export const NUTRITION_GOAL_DIRECTION_OPTIONS: { value: NutritionGoalCriteriaDirection; label: string }[] = [
    { value: 'at_least', label: 'Tối thiểu' },
    { value: 'at_most', label: 'Tối đa' },
    { value: 'between', label: 'Trong khoảng' },
];

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

const getOption = (key: NutritionGoalNutrientKey) => NUTRITION_NUTRIENT_OPTIONS.find(item => item.value === key) ?? NUTRITION_NUTRIENT_OPTIONS[0];

const getCriterionScore = (value: number, criterion: NutritionGoalCriterion): number => {
    if (criterion.direction === 'at_most') {
        const max = criterion.max ?? 0;
        if (max <= 0) return value <= 0 ? 1 : 0;
        return value <= max ? 1 : clamp(max / Math.max(value, 1));
    }

    if (criterion.direction === 'between') {
        const min = criterion.min ?? 0;
        const max = criterion.max ?? min;
        if (value >= min && value <= max) return 1;
        if (value < min) return min > 0 ? clamp(value / min) : 0;
        return max > 0 ? clamp(max / Math.max(value, 1)) : 0;
    }

    const min = criterion.min ?? 0;
    if (min <= 0) return 1;
    return clamp(value / min);
};

const isCriterionMatched = (value: number, criterion: NutritionGoalCriterion): boolean => {
    if (criterion.direction === 'at_most') return value <= (criterion.max ?? 0);
    if (criterion.direction === 'between') return value >= (criterion.min ?? 0) && value <= (criterion.max ?? Number.POSITIVE_INFINITY);
    return value >= (criterion.min ?? 0);
};

export const NutritionGoalHelper = {
    nutrientOptions: NUTRITION_NUTRIENT_OPTIONS,
    directionOptions: NUTRITION_GOAL_DIRECTION_OPTIONS,

    getNutrientLabel(key: NutritionGoalNutrientKey): string {
        return getOption(key).label;
    },

    getNutrientUnit(key: NutritionGoalNutrientKey): string {
        return getOption(key).unit;
    },

    formatNutrientValue(key: NutritionGoalNutrientKey, value?: number): string {
        return getOption(key).format(value);
    },

    formatCriterion(criterion: NutritionGoalCriterion): string {
        const option = getOption(criterion.nutrient);
        if (criterion.direction === 'at_most') return `${option.label} <= ${option.format(criterion.max)}`;
        if (criterion.direction === 'between') return `${option.label} ${option.format(criterion.min)} - ${option.format(criterion.max)}`;
        return `${option.label} >= ${option.format(criterion.min)}`;
    },

    score(summary: DishNutritionSummary, goal: NutritionGoal): NutritionGoalMatch {
        const criteria = goal.criteria.map(criterion => {
            const rawValue = summary.perServing[criterion.nutrient];
            const value = rawValue ?? 0;
            const score = rawValue === undefined ? 0 : getCriterionScore(value, criterion);
            const matched = rawValue === undefined ? false : isCriterionMatched(value, criterion);
            return {
                criterion,
                value,
                score,
                matched,
                label: NutritionGoalHelper.formatCriterion(criterion),
            };
        });
        const totalCriteriaCount = criteria.length;
        const matchedCriteriaCount = criteria.filter(item => item.matched).length;
        const criteriaScore = totalCriteriaCount > 0
            ? criteria.reduce((sum, item) => sum + item.score, 0) / totalCriteriaCount
            : 0;
        const coverageScore = summary.coveragePercent / 100;

        return {
            score: summary.hasNutrition && totalCriteriaCount > 0 ? clamp(criteriaScore * 0.78 + coverageScore * 0.22) : 0,
            matchedCriteriaCount,
            totalCriteriaCount,
            criteria,
        };
    },
};
