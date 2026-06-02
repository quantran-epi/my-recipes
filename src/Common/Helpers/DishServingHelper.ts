import { Dishes, DishesIngredientAmount } from '@store/Models/Dishes';
import { IngredientUnitHelper } from './IngredientUnitHelper';

export type DishServingCollectOptions = {
    targetServings?: number;
}

const DEFAULT_BASE_SERVINGS = 2;

const normalizeServings = (value: unknown, fallback: number): number => {
    const parsed = typeof value === 'number' ? value : parseFloat(String(value ?? ''));
    return isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const isZeroLikeAmount = (value: string | number): boolean => {
    if (typeof value === 'number') return value === 0;
    return /^0+(?:[.,]0+)?$/.test(value.trim());
};

const scaleAmountString = (amount: string | number, scale: number): string => {
    const raw = String(amount ?? '').trim();
    if (!raw || !isFinite(scale) || scale <= 0 || scale === 1) return raw;

    const parsed = IngredientUnitHelper.parseAmount(raw);
    if (parsed === 0 && !isZeroLikeAmount(raw)) return raw;
    return IngredientUnitHelper.formatAmount(parsed * scale);
};

const collectWithScale = (
    dish: Dishes,
    allDishes: Dishes[],
    scale: number,
    visited: Set<string>,
): DishesIngredientAmount[] => {
    if (!dish || visited.has(dish.id)) return [];
    visited.add(dish.id);

    const baseServings = DishServingHelper.getBaseServings(dish);
    const targetServings = DishServingHelper.normalizeTargetServings(baseServings * scale, baseServings);
    const dishMeta = {
        id: dish.id,
        name: dish.name,
        baseServings,
        targetServings,
    };

    const own = (dish.ingredients ?? []).map(item => ({
        ...DishServingHelper.scaleIngredientAmount(item, scale),
        dish: dishMeta,
    }));
    const fromIncluded = (dish.includeDishes ?? []).flatMap(id => {
        const includedDish = allDishes.find(item => item.id === id);
        return includedDish ? collectWithScale(includedDish, allDishes, scale, visited) : [];
    });

    return [...own, ...fromIncluded];
};

export const DishServingHelper = {
    getBaseServings(dish?: Pick<Dishes, 'baseServings'>): number {
        return normalizeServings(dish?.baseServings, DEFAULT_BASE_SERVINGS);
    },

    normalizeTargetServings(targetServings: unknown, fallback: number): number {
        return normalizeServings(targetServings, fallback);
    },

    getTargetServings(dish: Dishes | undefined, targetServings?: number): number {
        const baseServings = DishServingHelper.getBaseServings(dish);
        return DishServingHelper.normalizeTargetServings(targetServings, baseServings);
    },

    getScale(dish: Dishes | undefined, targetServings?: number): number {
        const baseServings = DishServingHelper.getBaseServings(dish);
        const normalizedTarget = DishServingHelper.normalizeTargetServings(targetServings, baseServings);
        return normalizedTarget / baseServings;
    },

    formatAmount(amount: string | number, scale: number): string {
        return scaleAmountString(amount, scale);
    },

    scaleIngredientAmount(item: DishesIngredientAmount, scale: number): DishesIngredientAmount {
        return {
            ...item,
            amount: DishServingHelper.formatAmount(item.amount, scale),
        };
    },

    scaleIngredientAmounts(dish: Dishes, targetServings?: number): DishesIngredientAmount[] {
        const scale = DishServingHelper.getScale(dish, targetServings);
        return (dish.ingredients ?? []).map(item => DishServingHelper.scaleIngredientAmount(item, scale));
    },

    collectIngredientAmounts(
        dish: Dishes,
        allDishes: Dishes[],
        options: DishServingCollectOptions = {},
    ): DishesIngredientAmount[] {
        const scale = DishServingHelper.getScale(dish, options.targetServings);
        return collectWithScale(dish, allDishes, scale, new Set<string>());
    },
};
