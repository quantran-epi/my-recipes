import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { Ingredient, IngredientInventory } from '@store/Models/Ingredient'

export interface IngredientState {
    ingredients: Ingredient[];
}

const initialState: IngredientState = {
    ingredients: []
}

export type UpdateInventoryParams = {
    id: string;
    inventory: IngredientInventory;
}

export type DeductInventoryParams = {
    id: string;
    amount: number;
}

export const ingredientSlice = createSlice({
    name: 'ingredient',
    initialState,
    reducers: {
        add: (state, action: PayloadAction<Ingredient>) => {
            state.ingredients.push(action.payload);
        },
        edit: (state, action: PayloadAction<Ingredient>) => {
            state.ingredients = state.ingredients.map(e => {
                if (e.id === action.payload.id) return action.payload;
                return e;
            })
        },
        remove: (state, action: PayloadAction<string[]>) => {
            state.ingredients = state.ingredients.filter(ingre => !action.payload.includes(ingre.id));
        },
        updateInventory: (state, action: PayloadAction<UpdateInventoryParams>) => {
            state.ingredients = state.ingredients.map(e => {
                if (e.id === action.payload.id) return { ...e, inventory: action.payload.inventory };
                return e;
            });
        },
        deductInventory: (state, action: PayloadAction<DeductInventoryParams>) => {
            state.ingredients = state.ingredients.map(e => {
                if (e.id === action.payload.id && e.inventory) {
                    const newAmount = Math.max(0, e.inventory.amount - action.payload.amount);
                    return { ...e, inventory: { ...e.inventory, amount: newAmount, lastUpdated: new Date() } };
                }
                return e;
            });
        },
        reset: (state) => {
            state.ingredients = [];
        }
    },
})

// Action creators are generated for each case reducer function
export const { add: addIngredient, edit: editIngredient, remove: removeIngredient, reset: resetIngredient, updateInventory, deductInventory } = ingredientSlice.actions

export default ingredientSlice.reducer