import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { IngredientInventory, IngredientUnit } from '@store/Models/Ingredient';

export interface InventoryState {
    items: Record<string, IngredientInventory>; // keyed by ingredientId
}

const initialState: InventoryState = {
    items: {}
}

export type SetInventoryParams = {
    ingredientId: string;
    inventory: IngredientInventory;
}

export type DeductInventoryParams = {
    ingredientId: string;
    amount: number;
}

export const inventorySlice = createSlice({
    name: 'inventory',
    initialState,
    reducers: {
        setInventory: (state, action: PayloadAction<SetInventoryParams>) => {
            state.items[action.payload.ingredientId] = action.payload.inventory;
        },
        deductInventory: (state, action: PayloadAction<DeductInventoryParams>) => {
            const inv = state.items[action.payload.ingredientId];
            if (inv) {
                state.items[action.payload.ingredientId] = {
                    ...inv,
                    amount: Math.max(0, inv.amount - action.payload.amount),
                    lastUpdated: new Date(),
                };
            }
        },
        removeInventory: (state, action: PayloadAction<string>) => {
            delete state.items[action.payload];
        },
        resetInventory: (state) => {
            state.items = {};
        }
    }
});

export const { setInventory, deductInventory, removeInventory, resetInventory } = inventorySlice.actions;
export default inventorySlice.reducer;
