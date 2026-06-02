import { Ingredient, IngredientInventory, IngredientUnit, INGREDIENT_UNITS, InventoryBatch } from "@store/Models/Ingredient";

const LITER_UNIT: IngredientUnit = "lít";
const DEFAULT_BASE_UNIT: IngredientUnit = "g";

const uniqueUnits = (units: IngredientUnit[]): IngredientUnit[] => Array.from(new Set(units.filter(Boolean)));

const hasConfiguredConversions = (ingredient?: Ingredient): boolean => {
    return Object.keys(ingredient?.recipeUnitConversions ?? {}).length > 0;
};

const isPositiveNumber = (value: unknown): value is number => {
    return typeof value === "number" && isFinite(value) && value > 0;
};

const defaultFactorToBase = (unit: IngredientUnit, baseUnit: IngredientUnit): number | null => {
    if (unit === baseUnit) return 1;
    if (baseUnit === "g") {
        if (unit === "kg") return 1000;
        if (unit === "g") return 1;
    }
    if (baseUnit === "kg") {
        if (unit === "g") return 0.001;
        if (unit === "kg") return 1;
    }
    if (baseUnit === "ml") {
        if (unit === LITER_UNIT) return 1000;
        if (unit === "ml") return 1;
    }
    if (baseUnit === LITER_UNIT) {
        if (unit === "ml") return 0.001;
        if (unit === LITER_UNIT) return 1;
    }
    return hasSameFallbackFamily(unit, baseUnit) ? 1 : null;
};

const hasSameFallbackFamily = (unit: IngredientUnit, baseUnit: IngredientUnit): boolean => {
    const mass = ["g", "kg"];
    const volume = ["ml", LITER_UNIT];
    if (mass.includes(unit) || mass.includes(baseUnit)) return mass.includes(unit) && mass.includes(baseUnit);
    if (volume.includes(unit) || volume.includes(baseUnit)) return volume.includes(unit) && volume.includes(baseUnit);
    return unit === baseUnit;
};

export const IngredientUnitHelper = {
    parseAmount(value: string | number | null | undefined): number {
        if (typeof value === "number") return isFinite(value) ? value : 0;
        const raw = String(value ?? "").trim();
        const normalized = raw.replace(",", ".");
        const fractionMatch = normalized.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);
        if (fractionMatch) {
            const numerator = parseFloat(fractionMatch[1]);
            const denominator = parseFloat(fractionMatch[2]);
            return denominator > 0 ? numerator / denominator : 0;
        }

        const mixedFractionMatch = normalized.match(/^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);
        if (mixedFractionMatch) {
            const whole = parseFloat(mixedFractionMatch[1]);
            const numerator = parseFloat(mixedFractionMatch[2]);
            const denominator = parseFloat(mixedFractionMatch[3]);
            return denominator > 0 ? whole + numerator / denominator : whole;
        }

        const parsed = parseFloat(normalized);
        return isNaN(parsed) ? 0 : parsed;
    },

    formatAmount(value: number): string {
        if (!isFinite(value)) return "0";
        return String(Math.round(value * 1000) / 1000);
    },

    getBaseUnit(ingredient?: Ingredient, units: IngredientUnit[] = []): IngredientUnit {
        if (ingredient?.baseUnit) return ingredient.baseUnit;
        const candidates = uniqueUnits(units);
        if (candidates.some(unit => unit === "g" || unit === "kg")) return "g";
        if (candidates.some(unit => unit === "ml" || unit === LITER_UNIT)) return "ml";
        return candidates[0] ?? DEFAULT_BASE_UNIT;
    },

    getInventoryUnits(ingredient?: Ingredient): IngredientUnit[] {
        return ingredient?.inventoryUnits?.length ? uniqueUnits(ingredient.inventoryUnits) : INGREDIENT_UNITS;
    },

    getRecipeUnitConversions(ingredient?: Ingredient): Partial<Record<IngredientUnit, number>> {
        const baseUnit = IngredientUnitHelper.getBaseUnit(ingredient);
        if (hasConfiguredConversions(ingredient)) {
            return { ...ingredient.recipeUnitConversions, [baseUnit]: 1 };
        }
        return INGREDIENT_UNITS.reduce((result, unit) => {
            result[unit] = defaultFactorToBase(unit, baseUnit) ?? 1;
            return result;
        }, {} as Partial<Record<IngredientUnit, number>>);
    },

    getRecipeUnits(ingredient?: Ingredient): IngredientUnit[] {
        const conversions = IngredientUnitHelper.getRecipeUnitConversions(ingredient);
        return uniqueUnits(Object.keys(conversions)
            .filter(unit => isPositiveNumber(conversions[unit as IngredientUnit])) as IngredientUnit[]);
    },

    getConversionFactor(ingredient: Ingredient | undefined, unit: IngredientUnit, baseUnit?: IngredientUnit): number | null {
        const resolvedBaseUnit = baseUnit ?? IngredientUnitHelper.getBaseUnit(ingredient, [unit]);
        if (unit === resolvedBaseUnit) return 1;

        const configured = ingredient?.recipeUnitConversions?.[unit];
        if (isPositiveNumber(configured)) return configured;

        const defaultFactor = defaultFactorToBase(unit, resolvedBaseUnit);
        if (defaultFactor !== null) return defaultFactor;

        return hasConfiguredConversions(ingredient) ? null : 1;
    },

    canConvert(ingredient: Ingredient | undefined, unit: IngredientUnit): boolean {
        return IngredientUnitHelper.getConversionFactor(ingredient, unit) !== null;
    },

    toBaseAmount(ingredient: Ingredient | undefined, amount: string | number, unit: IngredientUnit, baseUnit?: IngredientUnit): number | null {
        const factor = IngredientUnitHelper.getConversionFactor(ingredient, unit, baseUnit);
        if (factor === null) return null;
        return IngredientUnitHelper.parseAmount(amount) * factor;
    },

    fromBaseAmount(ingredient: Ingredient | undefined, amount: number, unit: IngredientUnit, baseUnit?: IngredientUnit): number | null {
        const factor = IngredientUnitHelper.getConversionFactor(ingredient, unit, baseUnit);
        if (factor === null || factor === 0) return null;
        return amount / factor;
    },

    getBatchUnit(inv: IngredientInventory | undefined, batch: Partial<InventoryBatch> | undefined, ingredient?: Ingredient): IngredientUnit {
        return batch?.unit ?? inv?.unit ?? IngredientUnitHelper.getBaseUnit(ingredient);
    },

    totalInventoryAmount(inv: IngredientInventory | undefined, ingredient?: Ingredient, baseUnit?: IngredientUnit): number {
        if (!inv) return 0;
        const resolvedBaseUnit = baseUnit ?? IngredientUnitHelper.getBaseUnit(ingredient, [inv.unit].filter(Boolean) as IngredientUnit[]);
        if (!inv.batches) {
            const legacyAmount = (inv as any).amount ?? 0;
            const legacyUnit = inv.unit ?? resolvedBaseUnit;
            return IngredientUnitHelper.toBaseAmount(ingredient, legacyAmount, legacyUnit, resolvedBaseUnit) ?? legacyAmount;
        }

        return inv.batches.reduce((sum, batch) => {
            const unit = IngredientUnitHelper.getBatchUnit(inv, batch, ingredient);
            const converted = IngredientUnitHelper.toBaseAmount(ingredient, batch.amount, unit, resolvedBaseUnit);
            return sum + (converted ?? batch.amount);
        }, 0);
    },

    normalizeRecipeConversions(baseUnit: IngredientUnit, units: IngredientUnit[], values: Partial<Record<IngredientUnit, number>>): Partial<Record<IngredientUnit, number>> {
        return uniqueUnits([...units, baseUnit]).reduce((result, unit) => {
            const value = unit === baseUnit ? 1 : values[unit];
            result[unit] = isPositiveNumber(value) ? value : (defaultFactorToBase(unit, baseUnit) ?? 1);
            return result;
        }, {} as Partial<Record<IngredientUnit, number>>);
    },

    validateRules(ingredient: Ingredient): string | null {
        const baseUnit = ingredient.baseUnit;
        if (!baseUnit) return "Chọn đơn vị gốc.";
        if (!ingredient.inventoryUnits?.length) return "Chọn ít nhất một đơn vị nhập kho.";
        if (!ingredient.inventoryUnits.includes(baseUnit)) return "Đơn vị nhập kho phải bao gồm đơn vị gốc.";
        const conversions = ingredient.recipeUnitConversions ?? {};
        const recipeUnits = Object.keys(conversions) as IngredientUnit[];
        if (recipeUnits.length === 0) return "Chọn ít nhất một đơn vị trong công thức.";
        for (const unit of recipeUnits) {
            if (!isPositiveNumber(conversions[unit])) return `Quy đổi cho ${unit} phải lớn hơn 0.`;
        }
        return null;
    },
};
