import { Dishes, DishesIngredientAmount } from "@store/Models/Dishes";
import { Ingredient, IngredientUnit } from "@store/Models/Ingredient";
import { IngredientPriceHelper, IngredientPriceRange } from "./IngredientPriceHelper";
import { IngredientUnitHelper } from "./IngredientUnitHelper";

import { DishServingHelper } from './DishServingHelper';

export type CostEstimateSummary = IngredientPriceRange & {
    itemCount: number;
    pricedCount: number;
    missingPriceCount: number;
}

export type DishCostEstimate = {
    total: CostEstimateSummary;
    required: CostEstimateSummary;
    optional: CostEstimateSummary;
}

const createSummary = (): CostEstimateSummary => ({
    min: 0,
    max: 0,
    currency: "VND",
    itemCount: 0,
    pricedCount: 0,
    missingPriceCount: 0,
});

const findIngredient = (ingredients: Ingredient[], ingredientId: string): Ingredient | undefined => {
    return ingredients.find(item => item.id === ingredientId);
};

export const CostEstimateHelper = {
    emptySummary(): CostEstimateSummary {
        return createSummary();
    },

    emptyDishEstimate(): DishCostEstimate {
        return {
            total: createSummary(),
            required: createSummary(),
            optional: createSummary(),
        };
    },

    hasAny(summary: CostEstimateSummary): boolean {
        return summary.itemCount > 0 || summary.pricedCount > 0 || summary.missingPriceCount > 0;
    },

    hasPrice(summary: CostEstimateSummary): boolean {
        return summary.pricedCount > 0;
    },

    addRange(summary: CostEstimateSummary, range: IngredientPriceRange | null): CostEstimateSummary {
        summary.itemCount += 1;
        if (!range) {
            summary.missingPriceCount += 1;
            return summary;
        }

        summary.min += range.min;
        summary.max += range.max;
        summary.currency = range.currency;
        summary.pricedCount += 1;
        return summary;
    },

    addAmount(summary: CostEstimateSummary, ingredient: Ingredient | undefined, amount: number, unit: IngredientUnit): CostEstimateSummary {
        if (!amount || amount <= 0) return summary;
        return CostEstimateHelper.addRange(summary, IngredientPriceHelper.estimateForAmount(ingredient, amount, unit));
    },

    addIngredientAmount(summary: CostEstimateSummary, item: DishesIngredientAmount, ingredient: Ingredient | undefined): CostEstimateSummary {
        const amount = IngredientUnitHelper.parseAmount(item.amount);
        return CostEstimateHelper.addAmount(summary, ingredient, amount, item.unit);
    },

    mergeSummary(target: CostEstimateSummary, source: CostEstimateSummary): CostEstimateSummary {
        target.min += source.min;
        target.max += source.max;
        target.currency = source.currency;
        target.itemCount += source.itemCount;
        target.pricedCount += source.pricedCount;
        target.missingPriceCount += source.missingPriceCount;
        return target;
    },

    estimateDish(dish: Dishes, ingredients: Ingredient[], dishes: Dishes[] = [], targetServings?: number): DishCostEstimate {
        const estimate = CostEstimateHelper.emptyDishEstimate();
        if (!dish) return estimate;

        DishServingHelper.collectIngredientAmounts(dish, dishes, { targetServings }).forEach(item => {
            const ingredient = findIngredient(ingredients, item.ingredientId);
            const target = item.required ? estimate.required : estimate.optional;
            CostEstimateHelper.addIngredientAmount(target, item, ingredient);
            CostEstimateHelper.addIngredientAmount(estimate.total, item, ingredient);
        });

        return estimate;
    },
};
