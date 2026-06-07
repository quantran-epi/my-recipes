import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { Ingredient, IngredientInventory, IngredientUnit } from '@store/Models/Ingredient';
import { InventoryHealthConfig } from '@store/Models/SharedConfig';
import { IngredientUnitHelper } from '@common/Helpers/IngredientUnitHelper';
import { InventoryHelper } from '@common/Helpers/InventoryHelper';

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
    inventoryConfig?: InventoryHealthConfig;
}

export const inventorySlice = createSlice({
    name: 'inventory',
    initialState,
    reducers: {
        setInventory: (state, action: PayloadAction<SetInventoryParams>) => {
            state.items[action.payload.ingredientId] = action.payload.inventory;
        },
        /** FEFO deduction: removes from the earliest-expiring usable batch first. */
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
            const nextAmounts = new Map<string, { amount: number; unit: IngredientUnit }>();
            InventoryHelper.sortBatchesForConsumption(inv, ingredient, action.payload.inventoryConfig).forEach(batch => {
                if (remaining <= 0) return batch;
                const batchUnit = IngredientUnitHelper.getBatchUnit(inv, batch, ingredient);
                const batchBaseAmount = IngredientUnitHelper.toBaseAmount(ingredient, batch.amount, batchUnit, baseUnit) ?? batch.amount;
                const deductBaseAmount = Math.min(batchBaseAmount, remaining);
                remaining -= deductBaseAmount;
                const nextBaseAmount = Math.max(0, batchBaseAmount - deductBaseAmount);
                const nextAmount = InventoryHelper.roundAmount(IngredientUnitHelper.fromBaseAmount(ingredient, nextBaseAmount, batchUnit, baseUnit) ?? nextBaseAmount);
                nextAmounts.set(batch.id, { unit: batchUnit, amount: nextAmount });
                return batch;
            });
            const updated = inv.batches.map(batch => {
                const next = nextAmounts.get(batch.id);
                return next ? { ...batch, unit: next.unit, amount: next.amount } : batch;
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
