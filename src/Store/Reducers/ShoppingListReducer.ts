import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import { Dishes } from '@store/Models/Dishes';
import { ShoppingList } from '@store/Models/ShoppingList';
import { groupBy } from 'lodash';
import { nanoid } from 'nanoid';

export type ShoppingListGenerateIngredientParams = {
    shoppingListId: string;
    allDishes: Dishes[];
}

export type ShoppingListToggleDoneIngredientParams = {
    shoppingListId: string;
    ingredientGroupId: string;
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
                    let currentDishes = action.payload.allDishes
                        .filter(e => shoppingList.dishes.includes(e.id))
                    let ingredientAmounts = currentDishes
                        .map(dish => dish.ingredients)
                        .flat();
                    let includeIngredientAmounts = currentDishes.map(d => d.includeDishes)
                        .flat()
                        .map(d => action.payload.allDishes.find(d1 => d1.id === d))
                        .map(e => e.ingredients)
                        .flat();
                    let groups = groupBy([...ingredientAmounts, ...includeIngredientAmounts], "ingredientId");
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
        toggleDoneIngredient: (state, action: PayloadAction<ShoppingListToggleDoneIngredientParams>) => {
            state.shoppingLists = state.shoppingLists.map(e => {
                if (e.id === action.payload.shoppingListId) {
                    return {
                        ...e,
                        ingredients: e.ingredients.map(ingre => {
                            if (ingre.id === action.payload.ingredientGroupId) {
                                return {
                                    ...ingre,
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
    },
})

// Action creators are generated for each case reducer function
export const { add: addShoppingList, edit: editShoppingList, remove: removeShoppingList, generateIngredient, toggleDoneIngredient, addDishesToShoppingList } = ShoppingListSlice.actions

export default ShoppingListSlice.reducer