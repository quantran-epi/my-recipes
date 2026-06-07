import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import { DishIngredientAmountMealMeta, Dishes } from '@store/Models/Dishes';
import { Ingredient, IngredientInventory, IngredientUnit } from '@store/Models/Ingredient';
import { ScheduledMeal } from '@store/Models/ScheduledMeal';
import { ShoppingList, ShoppingListCompletionImport, ShoppingListIngredientAmount, ShoppingListIngredientGroup } from '@store/Models/ShoppingList';
import { InventoryHealthConfig } from '@store/Models/SharedConfig';
import { IngredientUnitHelper } from '@common/Helpers/IngredientUnitHelper';
import { DishServingHelper } from '@common/Helpers/DishServingHelper';
import { InventoryHelper } from '@common/Helpers/InventoryHelper';
import dayjs from 'dayjs';
import { groupBy } from 'lodash';
import { nanoid } from 'nanoid';

export type ShoppingListGenerateIngredientParams = {
    shoppingListId: string;
    allDishes: Dishes[];
    allScheduledMeals: ScheduledMeal[];
    allIngredients?: Ingredient[];
    inventory?: Record<string, IngredientInventory>;
    inventoryConfig?: InventoryHealthConfig;
    alreadyHaveIngredientIds?: string[];
    autoMarkCoveredByInventory?: boolean;
    dishServings?: Record<string, number>;
}

export type ShoppingListToggleDoneIngredientGroupParams = {
    shoppingListId: string;
    ingredientGroupId: string;
    isDone: boolean;
}

export type ShoppingListToggleDoneIngredientAmountParams = {
    shoppingListId: string;
    ingredientGroupId: string;
    ingredientAmoutId: string;
    isDone: boolean;
}

export type ShoppingListSetIngredientBoughtAmountParams = {
    shoppingListId: string;
    ingredientGroupId: string;
    boughtAmount?: number;
    boughtUnit?: IngredientUnit;
}

export type ShoppingListCompleteParams = {
    shoppingListId: string;
    imports?: ShoppingListCompletionImport[];
}


export type ShoppingListAddDishesParams = {
    shoppingList: ShoppingList;
    dishesIds: string[];
    dishServings?: Record<string, number>;
}

export interface ShoppingListState {
    shoppingLists: ShoppingList[];
}

const initialState: ShoppingListState = {
    shoppingLists: []
}

export const ShoppingListIngredientHelpers = {
    getIncludedDishesRecursive: (curDish: Dishes, allDishes: Dishes[]) => {
        if (curDish.includeDishes.length === 0) return [];
        let includedDishes = allDishes.filter(e => curDish.includeDishes.includes(e.id));
        return includedDishes.reduce((prev, cur) => [...prev, ...ShoppingListIngredientHelpers.getIncludedDishesRecursive(cur, allDishes)], curDish.includeDishes)
    },
    isInclude: (dish: string, allDishes: Dishes[], includeDish: string) => {
        let dishObj = allDishes.find(e => e.id === dish);
        if (dishObj.includeDishes.length === 0) return false;
        if (dishObj.includeDishes.includes(includeDish)) return true;
        let includedDishes = allDishes.filter(e => dishObj.includeDishes.includes(e.id));
        return includedDishes.some(e => ShoppingListIngredientHelpers.isInclude(e.id, allDishes, includeDish));
    }
}

const createShoppingListIngredientAmounts = (
    shoppingListId: string,
    dish: Dishes | undefined,
    allDishes: Dishes[],
    targetServings?: number,
    meal?: DishIngredientAmountMealMeta,
): ShoppingListIngredientAmount[] => {
    if (!dish) return [];
    return DishServingHelper.collectIngredientAmounts(dish, allDishes, { targetServings }).map(amt => ({
        ...amt,
        id: shoppingListId.concat('-' + amt.ingredientId).concat('-' + nanoid(5)),
        meal,
        dish: amt.dish ?? {
            id: dish.id,
            name: dish.name,
            baseServings: DishServingHelper.getBaseServings(dish),
            targetServings: DishServingHelper.getTargetServings(dish, targetServings),
        },
    }));
}

export const ShoppingListSlice = createSlice({
    name: 'shoppingList',
    initialState,
    reducers: {
        add: (state, action: PayloadAction<ShoppingList>) => {
            state.shoppingLists.push(action.payload);
        },
        edit: (state, action: PayloadAction<ShoppingList>) => {
            state.shoppingLists = state.shoppingLists.map(e => {
                if (e.id === action.payload.id && e.completedAt) return e;
                if (e.id === action.payload.id) return action.payload;
                return e;
            })
        },
        remove: (state, action: PayloadAction<string[]>) => {
            state.shoppingLists = state.shoppingLists.filter(dish => !action.payload.includes(dish.id));
        },
        generateIngredient: (state, action: PayloadAction<ShoppingListGenerateIngredientParams>) => {
            state.shoppingLists = state.shoppingLists.map(e => {
                if (e.id === action.payload.shoppingListId) {
                    if (e.completedAt) return e;
                    let shoppingList = state.shoppingLists.find(l => l.id === action.payload.shoppingListId) ?? e;

                    const shoppingListDishServings = action.payload.dishServings ?? shoppingList.dishServings ?? {};

                    let allMeals = action.payload.allScheduledMeals.filter(m => e.scheduledMeals.includes(m.id));
                    let ingredientAmountsFromMeals: ShoppingListIngredientAmount[] = [];
                    allMeals.forEach(meal => {
                        const mealMeta = { id: meal.id, plannedDate: dayjs(meal.plannedDate).toDate() } as DishIngredientAmountMealMeta;
                        let dishIdsFromThisMeal = [...meal.meals.breakfast, ...meal.meals.lunch, ...meal.meals.dinner].flat();

                        dishIdsFromThisMeal.forEach(dishId => {
                            const dish = action.payload.allDishes.find(d1 => d1.id === dishId);
                            ingredientAmountsFromMeals = ingredientAmountsFromMeals.concat(
                                createShoppingListIngredientAmounts(shoppingList.id, dish, action.payload.allDishes, meal.dishServings?.[dishId], mealMeta)
                            );
                        });
                    });

                    let allDishesFromShoppingList = action.payload.allDishes
                        .filter(e => shoppingList.dishes.includes(e.id));

                    let ingredientAmountsFromShoppingList: ShoppingListIngredientAmount[] = [];
                    allDishesFromShoppingList.forEach(dish => {
                        ingredientAmountsFromShoppingList = ingredientAmountsFromShoppingList.concat(
                            createShoppingListIngredientAmounts(shoppingList.id, dish, action.payload.allDishes, shoppingListDishServings[dish.id])
                        );
                    });

                    let groups = groupBy([...ingredientAmountsFromShoppingList, ...ingredientAmountsFromMeals], "ingredientId");
                    return {
                        ...e,
                        ingredients: Object.keys(groups).map(key => {
                            const ingredient = action.payload.allIngredients?.find(i => i.id === key);
                            const baseUnit = IngredientUnitHelper.getBaseUnit(ingredient, groups[key].map(amt => amt.unit));
                            const shouldAutoMark = action.payload.autoMarkCoveredByInventory === true;
                            const forceCoveredByManualSelection = action.payload.inventory === undefined && action.payload.alreadyHaveIngredientIds?.includes(key);
                            const requiredBaseAmount = groups[key].reduce((sum, amt) => {
                                const converted = IngredientUnitHelper.toBaseAmount(ingredient, amt.amount, amt.unit, baseUnit);
                                return sum + (converted ?? IngredientUnitHelper.parseAmount(amt.amount));
                            }, 0);
                            const inStockBaseAmount = forceCoveredByManualSelection
                                ? requiredBaseAmount
                                : InventoryHelper.availableAmount(action.payload.inventory?.[key], ingredient, requiredBaseAmount, action.payload.inventoryConfig);
                            const isCovered = shouldAutoMark && (
                                InventoryHelper.isAlwaysAvailable(ingredient)
                                || forceCoveredByManualSelection
                                || (requiredBaseAmount > 0 && inStockBaseAmount >= requiredBaseAmount)
                            );

                            return {
                                id: key.concat('-gr-').concat(nanoid(10)),
                                ingredientId: key,
                                amounts: groups[key].map(amt => ({ ...amt, isDone: isCovered })),
                                isDone: isCovered,
                            };
                        }) as ShoppingListIngredientGroup[],
                    }
                }
                return e;
            })
        },
        toggleDoneIngredientGroup: (state, action: PayloadAction<ShoppingListToggleDoneIngredientGroupParams>) => {
            state.shoppingLists = state.shoppingLists.map(e => {
                if (e.id === action.payload.shoppingListId) {
                    if (e.completedAt) return e;
                    return {
                        ...e,
                        ingredients: e.ingredients.map(ingre => {
                            if (ingre.id === action.payload.ingredientGroupId) {
                                return {
                                    ...ingre,
                                    amounts: ingre.amounts.map(amt => ({ ...amt, isDone: action.payload.isDone })),
                                    isDone: action.payload.isDone
                                }
                            }
                            return ingre;
                        }),
                    }
                }
                return e;
            })
        },
        toggleDoneIngredientAmount: (state, action: PayloadAction<ShoppingListToggleDoneIngredientAmountParams>) => {
            state.shoppingLists = state.shoppingLists.map(e => {
                if (e.id === action.payload.shoppingListId) {
                    if (e.completedAt) return e;
                    return {
                        ...e,
                        ingredients: e.ingredients.map(ingre => {
                            if (ingre.id === action.payload.ingredientGroupId) {
                                let newAmounts = ingre.amounts.map(amt => {
                                    if (amt.id === action.payload.ingredientAmoutId) {
                                        return { ...amt, isDone: action.payload.isDone };
                                    }
                                    return amt;
                                });
                                return {
                                    ...ingre,
                                    amounts: newAmounts,
                                    isDone: newAmounts.every(e => e.isDone) ? true : false
                                }
                            }
                            return ingre;
                        }),
                    }
                }
                return e;
            })
        },
        setIngredientBoughtAmount: (state, action: PayloadAction<ShoppingListSetIngredientBoughtAmountParams>) => {
            state.shoppingLists = state.shoppingLists.map(e => {
                if (e.id === action.payload.shoppingListId) {
                    if (e.completedAt) return e;
                    return {
                        ...e,
                        ingredients: e.ingredients.map(ingre => {
                            if (ingre.id === action.payload.ingredientGroupId) {
                                return {
                                    ...ingre,
                                    boughtAmount: action.payload.boughtAmount,
                                    boughtUnit: action.payload.boughtUnit,
                                };
                            }
                            return ingre;
                        }),
                    };
                }
                return e;
            });
        },
        completeShoppingList: (state, action: PayloadAction<string | ShoppingListCompleteParams>) => {
            const shoppingListId = typeof action.payload === "string" ? action.payload : action.payload.shoppingListId;
            const completionImports = typeof action.payload === "string" ? undefined : action.payload.imports;
            state.shoppingLists = state.shoppingLists.map(e => {
                if (e.id === shoppingListId && !e.completedAt) {
                    return {
                        ...e,
                        completedAt: new Date(),
                        completionImports,
                    };
                }
                return e;
            });
        },
        addDishesToShoppingList: (state, action: PayloadAction<ShoppingListAddDishesParams>) => {
            state.shoppingLists = state.shoppingLists.map(e => {
                if (e.id === action.payload.shoppingList.id) {
                    if (e.completedAt) return e;
                    return {
                        ...e,
                        dishes: action.payload.dishesIds,
                        dishServings: action.payload.dishServings ?? e.dishServings,
                    }
                }
                return e;
            })
        },
        updateShoppingListIngredientMealData: (state, action: PayloadAction<ScheduledMeal>) => {
            state.shoppingLists = state.shoppingLists.map(e => {
                if (e.completedAt) return e;
                let groups: ShoppingListIngredientGroup[] = e.ingredients;
                groups = groups.map(gr => {
                    return {
                        ...gr,
                        amounts: gr.amounts.map(amt => {
                            if (amt.meal?.id === action.payload.id) {
                                const nextTargetServings = amt.dish?.id ? action.payload.dishServings?.[amt.dish.id] : undefined;
                                const currentTargetServings = amt.dish?.targetServings;
                                const normalizedNextTargetServings = nextTargetServings && amt.dish
                                    ? DishServingHelper.normalizeTargetServings(nextTargetServings, currentTargetServings ?? amt.dish.baseServings ?? 1)
                                    : currentTargetServings;
                                const servingScale = normalizedNextTargetServings && currentTargetServings
                                    ? normalizedNextTargetServings / currentTargetServings
                                    : 1;

                                return {
                                    ...amt,
                                    amount: servingScale !== 1 ? DishServingHelper.formatAmount(amt.amount, servingScale) : amt.amount,
                                    meal: {
                                        ...amt.meal,
                                        plannedDate: action.payload.plannedDate
                                    },
                                    dish: amt.dish ? {
                                        ...amt.dish,
                                        targetServings: normalizedNextTargetServings,
                                    } : amt.dish,
                                }
                            }
                            return amt;
                        })
                    }
                })
                return {
                    ...e,
                    ingredients: groups
                }
            })
        },
        updateShoppingListIngredientDishData: (state, action: PayloadAction<Dishes>) => {
            state.shoppingLists = state.shoppingLists.map(e => {
                if (e.completedAt) return e;
                let groups: ShoppingListIngredientGroup[] = e.ingredients;
                groups = groups.map(gr => {
                    return {
                        ...gr,
                        amounts: gr.amounts.map(amt => {
                            if (amt.dish?.id === action.payload.id) {
                                return {
                                    ...amt,
                                    dish: {
                                        ...amt.dish,
                                        name: action.payload.name,
                                        baseServings: action.payload.baseServings ?? amt.dish?.baseServings,
                                    }
                                }
                            }
                            return amt;
                        })
                    }
                })
                return {
                    ...e,
                    ingredients: groups
                }
            })
        },
        reset: (state) => {
            state.shoppingLists = [];
        }
    },
})

// Action creators are generated for each case reducer function
export const { add: addShoppingList, edit: editShoppingList,
    remove: removeShoppingList, generateIngredient, toggleDoneIngredientGroup, toggleDoneIngredientAmount, setIngredientBoughtAmount, completeShoppingList, addDishesToShoppingList,
    updateShoppingListIngredientMealData, updateShoppingListIngredientDishData,
    reset: resetShoppingList
} = ShoppingListSlice.actions

export default ShoppingListSlice.reducer
