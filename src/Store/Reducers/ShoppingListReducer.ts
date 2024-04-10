import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import { DishesIngredientAmount } from '@store/Models/Dishes';
import { ShoppingList } from '@store/Models/ShoppingList';

export type ShoppingListGenerateIngredientParams = {
    shoppingListId: string;
    ingredientGroups: ShoppingList["ingredients"];
}

export type ShoppingListToggleDoneIngredientParams = {
    shoppingListId: string;
    ingredientGroupId: string;
    isDone: boolean;
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
                    return {
                        ...e,
                        ingredients: action.payload.ingredientGroups,
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
    }
})

// Action creators are generated for each case reducer function
export const { add: addShoppingList, edit: editShoppingList, remove: removeShoppingList, generateIngredient, toggleDoneIngredient } = ShoppingListSlice.actions

export default ShoppingListSlice.reducer