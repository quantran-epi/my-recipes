import { Ingredient, IngredientNutritionInfo, IngredientUnit } from "@store/Models/Ingredient";
import { IngredientUnitHelper } from "./IngredientUnitHelper";

const nutritionKeys: Array<keyof Pick<IngredientNutritionInfo, "calories" | "protein" | "carbs" | "fat" | "fiber" | "sugar" | "sodium">> = [
    "calories",
    "protein",
    "carbs",
    "fat",
    "fiber",
    "sugar",
    "sodium",
];

const normalizeNumber = (value: unknown): number | undefined => {
    if (value === null || value === undefined || value === "") return undefined;
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? Math.round(numberValue * 10) / 10 : undefined;
};

export const IngredientNutritionHelper = {
    hasNutrition(value?: Partial<IngredientNutritionInfo> | null): boolean {
        if (!value) return false;
        return nutritionKeys.some(key => normalizeNumber(value[key]) !== undefined);
    },
    normalizeNutrition(value?: Partial<IngredientNutritionInfo> | null, fallbackUnit: IngredientUnit = "g"): IngredientNutritionInfo | undefined {
        if (!IngredientNutritionHelper.hasNutrition(value)) return undefined;
        const amount = normalizeNumber(value?.amount) ?? 100;
        return {
            amount: amount > 0 ? amount : 100,
            unit: value?.unit ?? fallbackUnit,
            calories: normalizeNumber(value?.calories),
            protein: normalizeNumber(value?.protein),
            carbs: normalizeNumber(value?.carbs),
            fat: normalizeNumber(value?.fat),
            fiber: normalizeNumber(value?.fiber),
            sugar: normalizeNumber(value?.sugar),
            sodium: normalizeNumber(value?.sodium),
        };
    },
    validateNutrition(value?: Partial<IngredientNutritionInfo> | null): string | null {
        if (!IngredientNutritionHelper.hasNutrition(value)) return null;
        const amount = normalizeNumber(value?.amount);
        if (!amount || amount <= 0) return "Số lượng quy đổi dinh dưỡng phải lớn hơn 0.";
        for (const key of nutritionKeys) {
            const nextValue = normalizeNumber(value?.[key]);
            if (nextValue !== undefined && nextValue < 0) return "Chỉ số dinh dưỡng không được nhỏ hơn 0.";
        }
        return null;
    },
    formatBasis(value?: IngredientNutritionInfo): string {
        if (!value) return "";
        return `${IngredientUnitHelper.formatAmount(value.amount)} ${value.unit}`;
    },
    formatMacro(value?: number, unit = "g"): string {
        if (value === undefined || value === null || !Number.isFinite(value)) return "-";
        return `${IngredientUnitHelper.formatAmount(value)}${unit}`;
    },
    formatCalories(value?: number): string {
        if (value === undefined || value === null || !Number.isFinite(value)) return "-";
        return `${IngredientUnitHelper.formatAmount(value)} kcal`;
    },
    getNutrition(ingredient?: Ingredient | null): IngredientNutritionInfo | undefined {
        return IngredientNutritionHelper.normalizeNutrition(ingredient?.nutrition, IngredientUnitHelper.getBaseUnit(ingredient));
    },
};
