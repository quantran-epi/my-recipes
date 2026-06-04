import { Dishes, DishesIngredientAmount } from "@store/Models/Dishes";
import { Ingredient, IngredientInventory, IngredientUnit } from "@store/Models/Ingredient";
import { IngredientPriceHelper, IngredientPriceRange } from "./IngredientPriceHelper";
import { IngredientUnitHelper } from "./IngredientUnitHelper";

import { DishServingHelper } from './DishServingHelper';
import { InventoryHelper } from "./InventoryHelper";

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

export type IngredientNeedEstimateRow = {
    ingredientId: string;
    ingredient?: Ingredient;
    amount: number;
    unit: IngredientUnit;
    availableAmount: number;
    missingAmount: number;
    required: boolean;
}

export type IngredientAmountCostEstimate = DishCostEstimate & {
    missing: CostEstimateSummary;
    missingRequired: CostEstimateSummary;
    missingOptional: CostEstimateSummary;
    rows: IngredientNeedEstimateRow[];
}

export type IngredientAmountCostEstimateOptions = {
    inventoryItems?: Record<string, IngredientInventory>;
    selectedIngredientIds?: string[];
}

const createSummary = (): CostEstimateSummary => ({
    min: 0,
    max: 0,
    currency: "VND",
    itemCount: 0,
    pricedCount: 0,
    missingPriceCount: 0,
});

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

    emptyIngredientAmountEstimate(): IngredientAmountCostEstimate {
        return {
            total: createSummary(),
            required: createSummary(),
            optional: createSummary(),
            missing: createSummary(),
            missingRequired: createSummary(),
            missingOptional: createSummary(),
            rows: [],
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

    divideSummary(summary: CostEstimateSummary, divisor: number): CostEstimateSummary | null {
        if (!isFinite(divisor) || divisor <= 0 || !CostEstimateHelper.hasPrice(summary)) return null;
        return {
            min: summary.min / divisor,
            max: summary.max / divisor,
            currency: summary.currency,
            itemCount: summary.itemCount,
            pricedCount: summary.pricedCount,
            missingPriceCount: summary.missingPriceCount,
        };
    },

    estimateIngredientAmounts(
        amounts: DishesIngredientAmount[],
        ingredients: Ingredient[],
        options: IngredientAmountCostEstimateOptions = {},
    ): IngredientAmountCostEstimate {
        const estimate = CostEstimateHelper.emptyIngredientAmountEstimate();
        const ingredientById = new Map(ingredients.map(item => [item.id, item]));
        const selectedIds = options.selectedIngredientIds ? new Set(options.selectedIngredientIds) : null;
        const includedAmounts = amounts.filter(item => !selectedIds || selectedIds.has(item.ingredientId));

        includedAmounts.forEach(item => {
            const ingredient = ingredientById.get(item.ingredientId);
            const target = item.required ? estimate.required : estimate.optional;
            CostEstimateHelper.addIngredientAmount(target, item, ingredient);
            CostEstimateHelper.addIngredientAmount(estimate.total, item, ingredient);
        });

        const grouped = includedAmounts.reduce((result, item) => {
            result[item.ingredientId] = [...(result[item.ingredientId] ?? []), item];
            return result;
        }, {} as Record<string, DishesIngredientAmount[]>);

        Object.keys(grouped).forEach(ingredientId => {
            const group = grouped[ingredientId];
            const ingredient = ingredientById.get(ingredientId);
            const unit = IngredientUnitHelper.getBaseUnit(ingredient, group.map(item => item.unit));
            const getAmount = (items: DishesIngredientAmount[]) => items.reduce((sum, item) => {
                const converted = IngredientUnitHelper.toBaseAmount(ingredient, item.amount, item.unit, unit);
                return sum + (converted ?? IngredientUnitHelper.parseAmount(item.amount));
            }, 0);
            const requiredAmount = InventoryHelper.roundAmount(getAmount(group.filter(item => item.required !== false)));
            const optionalAmount = InventoryHelper.roundAmount(getAmount(group.filter(item => item.required === false)));
            const amount = InventoryHelper.roundAmount(requiredAmount + optionalAmount);
            const availableAmount = InventoryHelper.availableAmount(options.inventoryItems?.[ingredientId], ingredient, amount);
            const requiredMissingAmount = InventoryHelper.isAlwaysAvailable(ingredient) ? 0 : InventoryHelper.roundAmount(Math.max(0, requiredAmount - availableAmount));
            const remainingAvailableForOptional = Math.max(0, availableAmount - requiredAmount);
            const optionalMissingAmount = InventoryHelper.isAlwaysAvailable(ingredient) ? 0 : InventoryHelper.roundAmount(Math.max(0, optionalAmount - remainingAvailableForOptional));
            const missingAmount = InventoryHelper.roundAmount(requiredMissingAmount + optionalMissingAmount);

            if (missingAmount > 0) {
                CostEstimateHelper.addAmount(estimate.missing, ingredient, missingAmount, unit);
            }
            if (requiredMissingAmount > 0) CostEstimateHelper.addAmount(estimate.missingRequired, ingredient, requiredMissingAmount, unit);
            if (optionalMissingAmount > 0) CostEstimateHelper.addAmount(estimate.missingOptional, ingredient, optionalMissingAmount, unit);

            estimate.rows.push({
                ingredientId,
                ingredient,
                amount,
                unit,
                availableAmount,
                missingAmount: InventoryHelper.isAlwaysAvailable(ingredient) ? 0 : missingAmount,
                required: group.some(item => item.required !== false),
            });
        });

        return estimate;
    },

    estimateDish(dish: Dishes, ingredients: Ingredient[], dishes: Dishes[] = [], targetServings?: number): DishCostEstimate {
        const estimate = CostEstimateHelper.emptyDishEstimate();
        if (!dish) return estimate;

        return CostEstimateHelper.estimateIngredientAmounts(
            DishServingHelper.collectIngredientAmounts(dish, dishes, { targetServings }),
            ingredients,
        );
    },
};
