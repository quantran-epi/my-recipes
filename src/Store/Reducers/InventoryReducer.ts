import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { Ingredient, IngredientInventory, IngredientUnit } from '@store/Models/Ingredient';
import { IngredientUnitHelper } from '@common/Helpers/IngredientUnitHelper';

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
    unit?: IngredientUnit;
    ingredient?: Ingredient;
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
            const ingredient = action.payload.ingredient;
            const baseUnit = action.payload.unit ?? IngredientUnitHelper.getBaseUnit(ingredient, [inv.unit].filter(Boolean) as IngredientUnit[]);
            // Migrate old flat data on the fly
            if (!inv.batches) {
                const legacyAmount = (inv as any).amount ?? 0;
                inv.batches = legacyAmount > 0 ? [{ id: "legacy", amount: legacyAmount, unit: inv.unit ?? baseUnit }] : [];
            }
            let remaining = IngredientUnitHelper.toBaseAmount(ingredient, action.payload.amount, action.payload.unit ?? baseUnit, baseUnit) ?? action.payload.amount;
            // Sort batches oldest first (no purchasedAt treated as oldest)
            const sorted = [...inv.batches].sort((a, b) => {
                if (!a.purchasedAt && !b.purchasedAt) return 0;
                if (!a.purchasedAt) return -1;
                if (!b.purchasedAt) return 1;
                return a.purchasedAt < b.purchasedAt ? -1 : 1;
            });
            const updated = sorted.map(batch => {
                if (remaining <= 0) return batch;
                const batchUnit = IngredientUnitHelper.getBatchUnit(inv, batch, ingredient);
                const batchBaseAmount = IngredientUnitHelper.toBaseAmount(ingredient, batch.amount, batchUnit, baseUnit) ?? batch.amount;
                const deductBaseAmount = Math.min(batchBaseAmount, remaining);
                remaining -= deductBaseAmount;
                const nextBaseAmount = Math.max(0, batchBaseAmount - deductBaseAmount);
                const nextAmount = IngredientUnitHelper.fromBaseAmount(ingredient, nextBaseAmount, batchUnit, baseUnit) ?? nextBaseAmount;
                return { ...batch, unit: batchUnit, amount: nextAmount };
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
