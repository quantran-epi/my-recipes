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
        /** FIFO deduction — removes from oldest batch (by purchasedAt) first */
        deductInventory: (state, action: PayloadAction<DeductInventoryParams>) => {
            const inv = state.items[action.payload.ingredientId];
            if (!inv) return;
            // Migrate old flat data on the fly
            if (!inv.batches) {
                const legacyAmount = (inv as any).amount ?? 0;
                inv.batches = legacyAmount > 0 ? [{ id: "legacy", amount: legacyAmount }] : [];
            }
            let remaining = action.payload.amount;
            // Sort batches oldest first (no purchasedAt treated as oldest)
            const sorted = [...inv.batches].sort((a, b) => {
                if (!a.purchasedAt && !b.purchasedAt) return 0;
                if (!a.purchasedAt) return -1;
                if (!b.purchasedAt) return 1;
                return a.purchasedAt < b.purchasedAt ? -1 : 1;
            });
            const updated = sorted.map(batch => {
                if (remaining <= 0) return batch;
                const deduct = Math.min(batch.amount, remaining);
                remaining -= deduct;
                return { ...batch, amount: batch.amount - deduct };
            });
            state.items[action.payload.ingredientId] = {
                ...inv,
                batches: updated.filter(b => b.amount > 0),
                lastUpdated: new Date(),
            };
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
