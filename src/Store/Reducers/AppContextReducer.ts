import { PayloadAction, createSlice } from '@reduxjs/toolkit'
import { ScheduledMeal } from '@store/Models/ScheduledMeal';

export type WeeklyMealTemplateDay = {
    offset: number;
    meals: ScheduledMeal['meals'];
    dishServings?: Record<string, number>;
}

export type WeeklyMealTemplate = {
    id: string;
    name: string;
    days: WeeklyMealTemplateDay[];
    createdAt: string;
    updatedAt: string;
}

export type ShoppingListTemplate = {
    id: string;
    name: string;
    dishes: string[];
    dishServings?: Record<string, number>;
    createdAt: string;
    updatedAt: string;
}

export interface AppContextState {
    loading: boolean;
    currentFeatureName: string;
    shoppingListNameHistory: string[];
    scheduledMealNameHistory: string[];
    weeklyMealTemplates?: WeeklyMealTemplate[];
    shoppingListTemplates?: ShoppingListTemplate[];
}

const initialState: AppContextState = {
    loading: false,
    currentFeatureName: "",
    shoppingListNameHistory: [],
    scheduledMealNameHistory: [],
    weeklyMealTemplates: [],
    shoppingListTemplates: []
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
        },
        upsertWeeklyMealTemplate: (state, action: PayloadAction<WeeklyMealTemplate>) => {
            const templates = state.weeklyMealTemplates ?? [];
            state.weeklyMealTemplates = [action.payload, ...templates.filter(item => item.id !== action.payload.id)]
                .sort((a, b) => new Date(b.updatedAt).valueOf() - new Date(a.updatedAt).valueOf());
        },
        removeWeeklyMealTemplate: (state, action: PayloadAction<string>) => {
            state.weeklyMealTemplates = (state.weeklyMealTemplates ?? []).filter(item => item.id !== action.payload);
        },
        upsertShoppingListTemplate: (state, action: PayloadAction<ShoppingListTemplate>) => {
            const templates = state.shoppingListTemplates ?? [];
            state.shoppingListTemplates = [action.payload, ...templates.filter(item => item.id !== action.payload.id)]
                .sort((a, b) => new Date(b.updatedAt).valueOf() - new Date(a.updatedAt).valueOf());
        },
        removeShoppingListTemplate: (state, action: PayloadAction<string>) => {
            state.shoppingListTemplates = (state.shoppingListTemplates ?? []).filter(item => item.id !== action.payload);
        }
    }
})

export const {
    updateCurrentFeatureName,
    rememberShoppingListName,
    rememberScheduledMealName,
    upsertWeeklyMealTemplate,
    removeWeeklyMealTemplate,
    upsertShoppingListTemplate,
    removeShoppingListTemplate,
} = appContextSlice.actions

export default appContextSlice.reducer
