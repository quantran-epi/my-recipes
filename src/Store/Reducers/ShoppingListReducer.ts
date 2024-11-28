import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import { DishIngredientAmountDishMeta, DishIngredientAmountMealMeta, Dishes } from '@store/Models/Dishes';
import { ScheduledMeal } from '@store/Models/ScheduledMeal';
import { ShoppingList, ShoppingListIngredientAmount, ShoppingListIngredientGroup } from '@store/Models/ShoppingList';
import dayjs from 'dayjs';
import { groupBy } from 'lodash';
import { nanoid } from 'nanoid';

export type ShoppingListGenerateIngredientParams = {
    shoppingListId: string;
    allDishes: Dishes[];
    allScheduledMeals: ScheduledMeal[];
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


export type ShoppingListAddDishesParams = {
    shoppingList: ShoppingList;
    dishesIds: string[];
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

export const ShoppingListSlice = createSlice({
    name: 'shoppingList',
    initialState,
    reducers: {
        add: (state, action: PayloadAction<ShoppingList>) => {
            state.shoppingLists.push(action.payload);
        },
        edit: (state, action: PayloadAction<ShoppingList>) => {
            state.shoppingLists = state.shoppingLists.map(e => {
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
                    let shoppingList = state.shoppingLists.find(l => l.id === action.payload.shoppingListId);

                    //process meals
                    let allMeals = action.payload.allScheduledMeals.filter(m => e.scheduledMeals.includes(m.id));
                    let ingredientAmountsFromMeals: ShoppingListIngredientAmount[] = [];
                    allMeals.forEach(meal => {
                        let dishesFromThisMeal = [...meal.meals.breakfast, ...meal.meals.lunch, ...meal.meals.dinner]
                            .flat()
                            .map(d => action.payload.allDishes.find(d1 => d1.id === d));

                        let ingredientAmountFromThisMeal: ShoppingListIngredientAmount[] = [];
                        dishesFromThisMeal.forEach(dish => {
                            ingredientAmountFromThisMeal = ingredientAmountFromThisMeal.concat(...dish.ingredients.map(e => ({
                                ...e,
                                id: shoppingList.id.concat("-" + e.ingredientId).concat("-" + nanoid(5)),
                                meal: { id: meal.id, plannedDate: dayjs(meal.plannedDate).toDate() } as DishIngredientAmountMealMeta,
                                dish: { id: dish.id, name: dish.name } as DishIngredientAmountDishMeta
                            })))
                        })

                        let ingredientAmountRecursiveFromThisMeal: ShoppingListIngredientAmount[] = [];
                        dishesFromThisMeal.map(e => ShoppingListIngredientHelpers.getIncludedDishesRecursive(e, action.payload.allDishes))
                            .flat()
                            .map(d => action.payload.allDishes.find(d1 => d1.id === d))
                            .forEach(dish => {
                                ingredientAmountRecursiveFromThisMeal = ingredientAmountRecursiveFromThisMeal.concat(...dish.ingredients.map(e => ({
                                    ...e,
                                    id: shoppingList.id.concat("-" + e.ingredientId).concat("-" + nanoid(5)),
                                    meal: { id: meal.id, plannedDate: dayjs(meal.plannedDate).toDate() } as DishIngredientAmountMealMeta,
                                    dish: { id: dish.id, name: dish.name } as DishIngredientAmountDishMeta
                                })))
                            })
                        ingredientAmountsFromMeals = ingredientAmountsFromMeals.concat([...ingredientAmountFromThisMeal, ...ingredientAmountRecursiveFromThisMeal]);
                    })
                    //end process meals

                    let allDishesFromShoppingList = action.payload.allDishes
                        .filter(e => shoppingList.dishes.includes(e.id));

                    let ingredientAmountsFromShoppingList: ShoppingListIngredientAmount[] = [];
                    allDishesFromShoppingList.forEach(dish => {
                        ingredientAmountsFromShoppingList.push(...dish.ingredients.map(ingre => ({
                            ...ingre,
                            id: shoppingList.id.concat("-" + ingre.ingredientId).concat("-" + nanoid(5)),
                            dish: { id: dish.id, name: dish.name } as DishIngredientAmountDishMeta
                        })))
                    })
                    allDishesFromShoppingList.map(e => ShoppingListIngredientHelpers.getIncludedDishesRecursive(e, action.payload.allDishes))
                        .flat()
                        .map(d => action.payload.allDishes.find(d1 => d1.id === d))
                        .forEach(dish => {
                            ingredientAmountsFromShoppingList.push(...dish.ingredients.map(ingre => ({
                                ...ingre,
                                id: shoppingList.id.concat("-" + ingre.ingredientId).concat("-" + nanoid(5)),
                                dish: { id: dish.id, name: dish.name } as DishIngredientAmountDishMeta
                            })))
                        })

                    let groups = groupBy([...ingredientAmountsFromShoppingList, ...ingredientAmountsFromMeals], "ingredientId");
                    return {
                        ...e,
                        ingredients: Object.keys(groups).map(key => ({
                            id: key.concat('-gr-').concat(nanoid(10)),
                            ingredientId: key,
                            amounts: groups[key],
                            isDone: false
                        })),
                    }
                }
                return e;
            })
        },
        toggleDoneIngredientGroup: (state, action: PayloadAction<ShoppingListToggleDoneIngredientGroupParams>) => {
            state.shoppingLists = state.shoppingLists.map(e => {
                if (e.id === action.payload.shoppingListId) {
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
        addDishesToShoppingList: (state, action: PayloadAction<ShoppingListAddDishesParams>) => {
            state.shoppingLists = state.shoppingLists.map(e => {
                if (e.id === action.payload.shoppingList.id) {
                    return {
                        ...e,
                        dishes: action.payload.dishesIds
                    }
                }
                return e;
            })
        },
        updateShoppingListIngredientMealData: (state, action: PayloadAction<ScheduledMeal>) => {
            state.shoppingLists = state.shoppingLists.map(e => {
                let groups: ShoppingListIngredientGroup[] = e.ingredients;
                groups = groups.map(gr => {
                    return {
                        ...gr,
                        amounts: gr.amounts.map(amt => {
                            if (amt.meal?.id === action.payload.id) {
                                return {
                                    ...amt,
                                    meal: {
                                        ...amt.meal,
                                        plannedDate: action.payload.plannedDate
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
        updateShoppingListIngredientDishData: (state, action: PayloadAction<Dishes>) => {
            state.shoppingLists = state.shoppingLists.map(e => {
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
                                        name: action.payload.name
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
    remove: removeShoppingList, generateIngredient, toggleDoneIngredientGroup, toggleDoneIngredientAmount, addDishesToShoppingList,
    updateShoppingListIngredientMealData, updateShoppingListIngredientDishData,
    reset: resetShoppingList
} = ShoppingListSlice.actions

export default ShoppingListSlice.reducer