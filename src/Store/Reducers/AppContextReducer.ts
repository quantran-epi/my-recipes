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

export type IngredientPriceHistoryEntry = IngredientPriceMemory & {
    id: string;
    shoppingListId?: string;
    shoppingListName?: string;
}

export type HouseholdPreferenceProfile = {
    servingCount: number;
    maxCookMinutes: number;
    maxExtraCost?: number;
    preferredTags: string[];
    avoidedTags: string[];
    nutritionGoalId?: string;
}

export type LeftoverTrackerItemStatus = 'available' | 'finished' | 'discarded';

export type LeftoverTrackerItem = {
    id: string;
    dishId: string;
    dishName: string;
    portions: number;
    storedAt: string;
    eatBy?: string;
    note?: string;
    cookingSessionId?: string;
    status: LeftoverTrackerItemStatus;
}

export const DEFAULT_HOUSEHOLD_PREFERENCE_PROFILE: HouseholdPreferenceProfile = {
    servingCount: 2,
    maxCookMinutes: 45,
    maxExtraCost: 100000,
    preferredTags: [],
    avoidedTags: [],
};

export interface AppContextState {
    loading: boolean;
    currentFeatureName: string;
    shoppingListNameHistory: string[];
    scheduledMealNameHistory: string[];
    weeklyMealTemplates?: WeeklyMealTemplate[];
    shoppingListTemplates?: ShoppingListTemplate[];
    ingredientPriceMemory?: Record<string, IngredientPriceMemory>;
    ingredientPriceHistory?: Record<string, IngredientPriceHistoryEntry[]>;
    householdPreferenceProfile?: HouseholdPreferenceProfile;
    leftoverTrackerItems?: LeftoverTrackerItem[];
}

const initialState: AppContextState = {
    loading: false,
    currentFeatureName: "",
    shoppingListNameHistory: [],
    scheduledMealNameHistory: [],
    weeklyMealTemplates: [],
    shoppingListTemplates: [],
    ingredientPriceMemory: {},
    ingredientPriceHistory: {},
    householdPreferenceProfile: DEFAULT_HOUSEHOLD_PREFERENCE_PROFILE,
    leftoverTrackerItems: [],
}

const rememberName = (current: string[] | undefined, name: string): string[] => {
    const normalizedName = name.trim();
    if (!normalizedName) return current ?? [];

    const withoutDuplicate = (current ?? []).filter(item => item.trim().toLowerCase() !== normalizedName.toLowerCase());
    return [normalizedName, ...withoutDuplicate].slice(0, 30);
}

const normalizePositiveNumber = (value: unknown, fallback: number, max?: number): number => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    const rounded = Math.round(parsed);
    return max ? Math.min(max, rounded) : rounded;
}

const normalizeNonNegativeNumber = (value: unknown, fallback: number, max?: number): number => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) return fallback;
    const rounded = Math.round(parsed);
    return max ? Math.min(max, rounded) : rounded;
}

const normalizeTagList = (value: unknown): string[] => Array.isArray(value)
    ? Array.from(new Set(value.map(item => String(item).trim()).filter(Boolean))).slice(0, 20)
    : [];

export const normalizeHouseholdPreferenceProfile = (profile?: Partial<HouseholdPreferenceProfile> | null): HouseholdPreferenceProfile => ({
    servingCount: normalizePositiveNumber(profile?.servingCount, DEFAULT_HOUSEHOLD_PREFERENCE_PROFILE.servingCount, 24),
    maxCookMinutes: normalizePositiveNumber(profile?.maxCookMinutes, DEFAULT_HOUSEHOLD_PREFERENCE_PROFILE.maxCookMinutes, 480),
    maxExtraCost: profile?.maxExtraCost === undefined || profile?.maxExtraCost === null
        ? DEFAULT_HOUSEHOLD_PREFERENCE_PROFILE.maxExtraCost
        : normalizeNonNegativeNumber(profile.maxExtraCost, DEFAULT_HOUSEHOLD_PREFERENCE_PROFILE.maxExtraCost ?? 100000, 10000000),
    preferredTags: normalizeTagList(profile?.preferredTags),
    avoidedTags: normalizeTagList(profile?.avoidedTags),
    nutritionGoalId: profile?.nutritionGoalId?.trim() || undefined,
});

const normalizePortions = (value: unknown): number => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return 0;
    return Math.round(parsed * 10) / 10;
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
        rememberIngredientPrice: (state, action: PayloadAction<IngredientPriceHistoryEntry>) => {
            const current = state.ingredientPriceMemory ?? {};
            state.ingredientPriceMemory = {
                ...current,
                [action.payload.ingredientId]: {
                    ingredientId: action.payload.ingredientId,
                    price: action.payload.price,
                    amount: action.payload.amount,
                    unit: action.payload.unit,
                    currency: action.payload.currency,
                    updatedAt: action.payload.updatedAt,
                },
            };
            const history = state.ingredientPriceHistory ?? {};
            const existing = history[action.payload.ingredientId] ?? [];
            state.ingredientPriceHistory = {
                ...history,
                [action.payload.ingredientId]: [action.payload, ...existing.filter(item => item.id !== action.payload.id)]
                    .sort((a, b) => new Date(b.updatedAt).valueOf() - new Date(a.updatedAt).valueOf())
                    .slice(0, 60),
            };
        },
        updateHouseholdPreferenceProfile: (state, action: PayloadAction<Partial<HouseholdPreferenceProfile>>) => {
            state.householdPreferenceProfile = normalizeHouseholdPreferenceProfile({
                ...(state.householdPreferenceProfile ?? DEFAULT_HOUSEHOLD_PREFERENCE_PROFILE),
                ...action.payload,
            });
        },
        addLeftoverTrackerItem: (state, action: PayloadAction<LeftoverTrackerItem>) => {
            const portions = normalizePortions(action.payload.portions);
            if (portions <= 0) return;
            const current = state.leftoverTrackerItems ?? [];
            const nextItem: LeftoverTrackerItem = { ...action.payload, portions, status: 'available' };
            state.leftoverTrackerItems = [nextItem, ...current]
                .slice(0, 80);
        },
        eatLeftoverPortion: (state, action: PayloadAction<string>) => {
            state.leftoverTrackerItems = (state.leftoverTrackerItems ?? []).map(item => {
                if (item.id !== action.payload || item.status !== 'available') return item;
                const portions = Math.max(0, normalizePortions(item.portions - 1));
                return { ...item, portions, status: portions > 0 ? 'available' : 'finished' };
            });
        },
        finishLeftoverItem: (state, action: PayloadAction<string>) => {
            state.leftoverTrackerItems = (state.leftoverTrackerItems ?? []).map(item => item.id === action.payload ? { ...item, portions: 0, status: 'finished' } : item);
        },
        discardLeftoverItem: (state, action: PayloadAction<string>) => {
            state.leftoverTrackerItems = (state.leftoverTrackerItems ?? []).map(item => item.id === action.payload ? { ...item, status: 'discarded' } : item);
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
    updateHouseholdPreferenceProfile,
    addLeftoverTrackerItem,
    eatLeftoverPortion,
    finishLeftoverItem,
    discardLeftoverItem,
} = appContextSlice.actions

export default appContextSlice.reducer
