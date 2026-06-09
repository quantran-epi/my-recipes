import { PayloadAction, createSlice } from '@reduxjs/toolkit'
import { IngredientPriceCurrency, IngredientUnit } from '@store/Models/Ingredient';
import { ScheduledMeal } from '@store/Models/ScheduledMeal';

export type WeeklyMealTemplateDay = {
    offset: number;
    meals: ScheduledMeal['meals'];
    dishServings?: Record<string, number>;
}

export type WeeklyMealTemplate = {
    id: string;
    name: string;
    scope?: 'day' | 'week';
    days: WeeklyMealTemplateDay[];
    createdAt: string;
    updatedAt: string;
}

export type ShoppingListTemplate = {
    id: string;
    name: string;
    source?: 'existing' | 'scratch';
    dishes: string[];
    dishServings?: Record<string, number>;
    createdAt: string;
    updatedAt: string;
}

export type IngredientPriceMemory = {
    ingredientId: string;
    price: number;
    amount: number;
    unit: IngredientUnit;
    currency: IngredientPriceCurrency;
    updatedAt: string;
}

export interface AppContextState {
    loading: boolean;
    currentFeatureName: string;
    shoppingListNameHistory: string[];
    scheduledMealNameHistory: string[];
    weeklyMealTemplates?: WeeklyMealTemplate[];
    shoppingListTemplates?: ShoppingListTemplate[];
    ingredientPriceMemory?: Record<string, IngredientPriceMemory>;
}

const initialState: AppContextState = {
    loading: false,
    currentFeatureName: "",
    shoppingListNameHistory: [],
    scheduledMealNameHistory: [],
    weeklyMealTemplates: [],
    shoppingListTemplates: [],
    ingredientPriceMemory: {},
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
        },
        rememberIngredientPrice: (state, action: PayloadAction<IngredientPriceMemory>) => {
            const current = state.ingredientPriceMemory ?? {};
            state.ingredientPriceMemory = {
                ...current,
                [action.payload.ingredientId]: action.payload,
            };
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
    rememberIngredientPrice,
} = appContextSlice.actions

export default appContextSlice.reducer
