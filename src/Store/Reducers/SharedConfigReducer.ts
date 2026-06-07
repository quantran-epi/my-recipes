import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { DEFAULT_SHARED_CONFIG, InventoryHealthConfig, normalizeInventoryHealthConfig, normalizeSharedConfig, SharedConfig } from "@store/Models/SharedConfig";

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
        replaceSharedConfig: (state, action: PayloadAction<Partial<SharedConfig>>) => {
            state.config = normalizeSharedConfig(action.payload);
        },
        resetSharedConfig: (state) => {
            state.config = DEFAULT_SHARED_CONFIG;
        },
    },
});

export const { updateInventoryConfig, replaceSharedConfig, resetSharedConfig } = sharedConfigSlice.actions;

export default sharedConfigSlice.reducer;
