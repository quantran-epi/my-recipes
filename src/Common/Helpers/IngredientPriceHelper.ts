import { Ingredient, IngredientPriceEstimate, IngredientUnit } from "@store/Models/Ingredient";
import { IngredientUnitHelper } from "./IngredientUnitHelper";

export type IngredientPriceRange = {
    min: number;
    max: number;
    currency: IngredientPriceEstimate["currency"];
}

const isPositiveNumber = (value: unknown): value is number => {
    return typeof value === "number" && isFinite(value) && value > 0;
}

export const IngredientPriceHelper = {
    formatCurrency(value: number): string {
        if (!isFinite(value)) return "0đ";
        return `${Math.round(value).toLocaleString("vi-VN")}đ`;
    },

    formatRange(range: IngredientPriceRange): string {
        const min = IngredientPriceHelper.formatCurrency(range.min);
        const max = IngredientPriceHelper.formatCurrency(range.max);
        return range.min === range.max ? min : `${min} - ${max}`;
    },

    normalizePriceEstimate(value?: Partial<IngredientPriceEstimate>): IngredientPriceEstimate | undefined {
        if (!value || !isPositiveNumber(value.min) || !isPositiveNumber(value.max)) return undefined;

        return {
            min: Math.min(value.min, value.max),
            max: Math.max(value.min, value.max),
            amount: isPositiveNumber(value.amount) ? value.amount : 1,
            unit: value.unit ?? "g",
            currency: value.currency ?? "VND",
        };
    },

    validatePriceEstimate(value?: Partial<IngredientPriceEstimate>): string | null {
        if (!value || (!isPositiveNumber(value.min) && !isPositiveNumber(value.max))) return null;
        if (!isPositiveNumber(value.min) || !isPositiveNumber(value.max)) return "Nhập đủ giá thấp nhất và cao nhất.";
        if (value.max < value.min) return "Giá cao nhất phải lớn hơn hoặc bằng giá thấp nhất.";
        if (!isPositiveNumber(value.amount)) return "Số lượng quy đổi giá phải lớn hơn 0.";
        if (!value.unit) return "Chọn đơn vị tính giá.";
        return null;
    },

    estimateForAmount(ingredient: Ingredient | undefined, amount: number, unit: IngredientUnit): IngredientPriceRange | null {
        const price = ingredient?.priceEstimate;
        if (!price || amount <= 0) return null;

        const baseUnit = IngredientUnitHelper.getBaseUnit(ingredient, [unit, price.unit]);
        const amountBase = IngredientUnitHelper.toBaseAmount(ingredient, amount, unit, baseUnit);
        const priceAmountBase = IngredientUnitHelper.toBaseAmount(ingredient, price.amount, price.unit, baseUnit);
        if (amountBase === null || priceAmountBase === null || priceAmountBase <= 0) return null;

        const multiplier = amountBase / priceAmountBase;
        return {
            min: price.min * multiplier,
            max: price.max * multiplier,
            currency: price.currency,
        };
    },
};
