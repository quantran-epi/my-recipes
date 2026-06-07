import { PayloadAction, createSlice } from '@reduxjs/toolkit'

export interface AppContextState {
    loading: boolean;
    currentFeatureName: string;
    shoppingListNameHistory: string[];
    scheduledMealNameHistory: string[];
}

const initialState: AppContextState = {
    loading: false,
    currentFeatureName: "",
    shoppingListNameHistory: [],
    scheduledMealNameHistory: []
}

const rememberName = (current: string[] | undefined, name: string): string[] => {
    const normalizedName = name.trim();
    if (!normalizedName) return current ?? [];

    const withoutDuplicate = (current ?? []).filter(item => item.trim().toLowerCase() !== normalizedName.toLowerCase());
    return [normalizedName, ...withoutDuplicate].slice(0, 30);
}

export const appContextSlice = createSlice({
    name: 'appContext',
    initialState,
    reducers: {
        updateCurrentFeatureName: (state, action: PayloadAction<string>) => {
            state.currentFeatureName = action.payload;
        },
        rememberShoppingListName: (state, action: PayloadAction<string>) => {
            state.shoppingListNameHistory = rememberName(state.shoppingListNameHistory, action.payload);
        },
        rememberScheduledMealName: (state, action: PayloadAction<string>) => {
            state.scheduledMealNameHistory = rememberName(state.scheduledMealNameHistory, action.payload);
        }
    }
})

export const { updateCurrentFeatureName, rememberShoppingListName, rememberScheduledMealName } = appContextSlice.actions

export default appContextSlice.reducer
