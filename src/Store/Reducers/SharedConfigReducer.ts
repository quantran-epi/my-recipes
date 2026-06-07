import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { DEFAULT_NUTRITION_GOALS, DEFAULT_SHARED_CONFIG, InventoryHealthConfig, normalizeInventoryHealthConfig, normalizeNutritionGoals, normalizeSharedConfig, NutritionGoal, SharedConfig } from "@store/Models/SharedConfig";

export interface SharedConfigState {
    config: SharedConfig;
}

const initialState: SharedConfigState = {
    config: DEFAULT_SHARED_CONFIG,
};

export const sharedConfigSlice = createSlice({
    name: "sharedConfig",
    initialState,
    reducers: {
        updateInventoryConfig: (state, action: PayloadAction<Partial<InventoryHealthConfig>>) => {
            state.config = normalizeSharedConfig({
                ...state.config,
                inventory: normalizeInventoryHealthConfig({
                    ...state.config.inventory,
                    ...action.payload,
                    expirationDefaults: {
                        ...state.config.inventory.expirationDefaults,
                        ...action.payload.expirationDefaults,
                    },
                }),
            });
        },
        upsertNutritionGoal: (state, action: PayloadAction<NutritionGoal>) => {
            const existingGoals = normalizeNutritionGoals(state.config.nutrition?.goals);
            state.config = normalizeSharedConfig({
                ...state.config,
                nutrition: {
                    goals: [action.payload, ...existingGoals.filter(item => item.id !== action.payload.id)]
                        .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "")),
                },
            });
        },
        removeNutritionGoal: (state, action: PayloadAction<string>) => {
            state.config = normalizeSharedConfig({
                ...state.config,
                nutrition: {
                    goals: normalizeNutritionGoals(state.config.nutrition?.goals).filter(item => item.id !== action.payload),
                },
            });
        },
        resetNutritionGoals: (state) => {
            state.config = normalizeSharedConfig({
                ...state.config,
                nutrition: { goals: DEFAULT_NUTRITION_GOALS },
            });
        },
        replaceSharedConfig: (state, action: PayloadAction<Partial<SharedConfig>>) => {
            state.config = normalizeSharedConfig(action.payload);
        },
        resetSharedConfig: (state) => {
            state.config = DEFAULT_SHARED_CONFIG;
        },
    },
});

export const { updateInventoryConfig, upsertNutritionGoal, removeNutritionGoal, resetNutritionGoals, replaceSharedConfig, resetSharedConfig } = sharedConfigSlice.actions;

export default sharedConfigSlice.reducer;
