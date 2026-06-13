import { PayloadAction, createSlice } from '@reduxjs/toolkit'
import { IngredientPriceCurrency, IngredientUnit } from '@store/Models/Ingredient';
import { ScheduledMeal, ScheduledMealSlotKey } from '@store/Models/ScheduledMeal';

export type WeeklyMealTemplateDay = {
    offset: number;
    meals: ScheduledMeal['meals'];
    dishServings?: Record<string, number>;
}

export type WeeklyMealTemplate = {
    id: string;
    name: string;
    scope?: 'day' | 'week';
    memberIds?: string[];   // whole-template member binding; undefined/[] = for everyone
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
    favoriteDishIds?: string[];
    avoidedDishIds?: string[];
    favoriteIngredientIds?: string[];
    avoidedIngredientIds?: string[];
    allergenIngredientIds?: string[];
    hardExcludedIngredientIds?: string[];
    preferredTags: string[];
    avoidedTags: string[];
    nutritionGoalId?: string;
    memberIds?: string[];
    memberNames?: string[];
    notes?: string[];
    mealSlotTimes?: MealSlotTimes;
}

export type MealSlotTimeKey = ScheduledMealSlotKey;

export type MealSlotClock = {
    hour: number;
    minute: number;
}

export type MealSlotTimes = Record<MealSlotTimeKey, MealSlotClock>;

export type PrepTaskCompletionMap = Record<string, string>;

export type HouseholdMemberProfile = {
    id: string;
    name: string;
    color?: string;
    avatar?: string;
    favoriteDishIds: string[];
    avoidedDishIds: string[];
    favoriteIngredientIds: string[];
    avoidedIngredientIds: string[];
    allergenIngredientIds: string[];
    hardExcludedIngredientIds: string[];
    preferredTags: string[];
    avoidedTags: string[];
    nutritionGoalId?: string;
    portionPreference?: number;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

export type LeftoverTrackerItemStatus = 'available' | 'finished' | 'discarded';

export type DishServingKind = 'fresh' | 'leftover';

export type LeftoverTrackerItem = {
    id: string;
    dishId: string;
    dishName: string;
    portions: number;
    storedAt: string;
    eatBy?: string;
    note?: string;
    cookingSessionId?: string;
    scheduledMealId?: string;
    mealSlot?: string;
    mealDate?: string;
    mealTitle?: string;
    status: LeftoverTrackerItemStatus;
    kind?: DishServingKind;
    discardReason?: string;
}

export const DEFAULT_HOUSEHOLD_PREFERENCE_PROFILE: HouseholdPreferenceProfile = {
    servingCount: 2,
    maxCookMinutes: 45,
    maxExtraCost: 100000,
    preferredTags: [],
    avoidedTags: [],
};

export const DEFAULT_MEAL_SLOT_TIMES: MealSlotTimes = {
    breakfast: { hour: 7, minute: 0 },
    lunch: { hour: 12, minute: 0 },
    dinner: { hour: 19, minute: 0 },
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
    householdMembers?: HouseholdMemberProfile[];
    selectedHouseholdMemberIds?: string[];
    currentHouseholdMemberId?: string;
    leftoverTrackerItems?: LeftoverTrackerItem[];
    prepTaskCompletions?: PrepTaskCompletionMap;
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
    householdMembers: [],
    selectedHouseholdMemberIds: [],
    currentHouseholdMemberId: undefined,
    leftoverTrackerItems: [],
    prepTaskCompletions: {},
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

const normalizePositiveDecimal = (value: unknown, fallback: number, max?: number): number => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    const rounded = Math.round(parsed * 10) / 10;
    return max ? Math.min(max, rounded) : rounded;
}

const normalizeStringList = (value: unknown, max = 80): string[] => Array.isArray(value)
    ? Array.from(new Set(value.map(item => String(item).trim()).filter(Boolean))).slice(0, max)
    : [];

const normalizeTagList = (value: unknown): string[] => normalizeStringList(value, 20);

const normalizeMealSlotClock = (value: unknown, fallback: MealSlotClock): MealSlotClock => {
    const source = value as Partial<MealSlotClock> | undefined;
    const hour = Number(source?.hour);
    const minute = Number(source?.minute);
    return {
        hour: Number.isFinite(hour) && hour >= 0 && hour <= 23 ? Math.round(hour) : fallback.hour,
        minute: Number.isFinite(minute) && minute >= 0 && minute <= 59 ? Math.round(minute) : fallback.minute,
    };
};

export const normalizeMealSlotTimes = (value?: Partial<Record<MealSlotTimeKey, Partial<MealSlotClock>>> | null): MealSlotTimes => ({
    breakfast: normalizeMealSlotClock(value?.breakfast, DEFAULT_MEAL_SLOT_TIMES.breakfast),
    lunch: normalizeMealSlotClock(value?.lunch, DEFAULT_MEAL_SLOT_TIMES.lunch),
    dinner: normalizeMealSlotClock(value?.dinner, DEFAULT_MEAL_SLOT_TIMES.dinner),
});

export const normalizeHouseholdPreferenceProfile = (profile?: Partial<HouseholdPreferenceProfile> | null): HouseholdPreferenceProfile => ({
    servingCount: normalizePositiveNumber(profile?.servingCount, DEFAULT_HOUSEHOLD_PREFERENCE_PROFILE.servingCount, 24),
    maxCookMinutes: normalizePositiveNumber(profile?.maxCookMinutes, DEFAULT_HOUSEHOLD_PREFERENCE_PROFILE.maxCookMinutes, 480),
    maxExtraCost: profile?.maxExtraCost === undefined || profile?.maxExtraCost === null
        ? DEFAULT_HOUSEHOLD_PREFERENCE_PROFILE.maxExtraCost
        : normalizeNonNegativeNumber(profile.maxExtraCost, DEFAULT_HOUSEHOLD_PREFERENCE_PROFILE.maxExtraCost ?? 100000, 10000000),
    favoriteDishIds: normalizeStringList(profile?.favoriteDishIds),
    avoidedDishIds: normalizeStringList(profile?.avoidedDishIds),
    favoriteIngredientIds: normalizeStringList(profile?.favoriteIngredientIds),
    avoidedIngredientIds: normalizeStringList(profile?.avoidedIngredientIds),
    allergenIngredientIds: normalizeStringList(profile?.allergenIngredientIds),
    hardExcludedIngredientIds: normalizeStringList(profile?.hardExcludedIngredientIds),
    preferredTags: normalizeTagList(profile?.preferredTags),
    avoidedTags: normalizeTagList(profile?.avoidedTags),
    nutritionGoalId: profile?.nutritionGoalId?.trim() || undefined,
    memberIds: normalizeStringList(profile?.memberIds, 30),
    memberNames: normalizeStringList(profile?.memberNames, 30),
    notes: normalizeStringList(profile?.notes, 30),
    mealSlotTimes: normalizeMealSlotTimes(profile?.mealSlotTimes),
});

export const normalizeHouseholdMemberProfile = (profile: Partial<HouseholdMemberProfile>): HouseholdMemberProfile => {
    const now = new Date().toISOString();
    return {
        id: String(profile.id ?? "").trim(),
        name: String(profile.name ?? "").trim() || "Thành viên",
        color: profile.color?.trim() || undefined,
        avatar: profile.avatar?.trim() || undefined,
        favoriteDishIds: normalizeStringList(profile.favoriteDishIds),
        avoidedDishIds: normalizeStringList(profile.avoidedDishIds),
        favoriteIngredientIds: normalizeStringList(profile.favoriteIngredientIds),
        avoidedIngredientIds: normalizeStringList(profile.avoidedIngredientIds),
        allergenIngredientIds: normalizeStringList(profile.allergenIngredientIds),
        hardExcludedIngredientIds: normalizeStringList(profile.hardExcludedIngredientIds),
        preferredTags: normalizeTagList(profile.preferredTags),
        avoidedTags: normalizeTagList(profile.avoidedTags),
        nutritionGoalId: profile.nutritionGoalId?.trim() || undefined,
        portionPreference: profile.portionPreference === undefined || profile.portionPreference === null
            ? undefined
            : normalizePositiveDecimal(profile.portionPreference, 1, 12),
        notes: profile.notes?.trim() || undefined,
        createdAt: profile.createdAt || now,
        updatedAt: profile.updatedAt || now,
    };
};

export const normalizeHouseholdMembers = (members?: Partial<HouseholdMemberProfile>[] | null): HouseholdMemberProfile[] => {
    if (!Array.isArray(members)) return [];
    return members
        .map(normalizeHouseholdMemberProfile)
        .filter(item => Boolean(item.id))
        .slice(0, 30);
};

export const getSelectedHouseholdMembers = (members: HouseholdMemberProfile[], selectedIds?: string[]): HouseholdMemberProfile[] => {
    const normalizedSelectedIds = normalizeStringList(selectedIds, 30);
    if (normalizedSelectedIds.length === 0) return members;
    const selectedSet = new Set(normalizedSelectedIds);
    const selected = members.filter(member => selectedSet.has(member.id));
    return selected.length > 0 ? selected : members;
};

const mergeUnique = (...lists: Array<string[] | undefined>): string[] => Array.from(new Set(lists.flatMap(list => list ?? []).filter(Boolean)));

export const buildHouseholdPreferenceProfile = (
    fallbackProfile?: Partial<HouseholdPreferenceProfile> | null,
    members: HouseholdMemberProfile[] = [],
): HouseholdPreferenceProfile => {
    const fallback = normalizeHouseholdPreferenceProfile(fallbackProfile);
    if (members.length === 0) return fallback;

    const portionTotal = members.reduce((sum, member) => sum + (member.portionPreference ?? 1), 0);
    const nutritionGoalId = members.find(member => Boolean(member.nutritionGoalId))?.nutritionGoalId ?? fallback.nutritionGoalId;

    return normalizeHouseholdPreferenceProfile({
        ...fallback,
        servingCount: Math.max(1, Math.min(24, Math.round(portionTotal))),
        maxCookMinutes: fallback.maxCookMinutes,
        preferredTags: mergeUnique(...members.map(member => member.preferredTags)),
        avoidedTags: mergeUnique(...members.map(member => member.avoidedTags)),
        favoriteDishIds: mergeUnique(...members.map(member => member.favoriteDishIds)),
        avoidedDishIds: mergeUnique(...members.map(member => member.avoidedDishIds)),
        favoriteIngredientIds: mergeUnique(...members.map(member => member.favoriteIngredientIds)),
        avoidedIngredientIds: mergeUnique(...members.map(member => member.avoidedIngredientIds)),
        allergenIngredientIds: mergeUnique(...members.map(member => member.allergenIngredientIds)),
        hardExcludedIngredientIds: mergeUnique(...members.map(member => member.hardExcludedIngredientIds)),
        nutritionGoalId,
        memberIds: members.map(member => member.id),
        memberNames: members.map(member => member.name),
        notes: members.map(member => member.notes).filter((note): note is string => Boolean(note)),
    });
};

const normalizePortions = (value: unknown): number => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return 0;
    return Math.round(parsed * 10) / 10;
}

export const normalizeKind = (value: unknown): DishServingKind => value === 'fresh' ? 'fresh' : 'leftover';

const prunePrepTaskCompletions = (completions: PrepTaskCompletionMap | undefined, now = new Date()): PrepTaskCompletionMap => {
    const cutoff = now.getTime() - 3 * 24 * 60 * 60 * 1000;
    return Object.fromEntries(Object.entries(completions ?? {}).filter(([, completedAt]) => {
        const value = new Date(completedAt).getTime();
        return Number.isFinite(value) && value >= cutoff;
    }));
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
            const normalized: WeeklyMealTemplate = {
                ...action.payload,
                memberIds: normalizeStringList(action.payload.memberIds, 30),
            };
            state.weeklyMealTemplates = [normalized, ...templates.filter(item => item.id !== normalized.id)]
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
        upsertHouseholdMemberProfile: (state, action: PayloadAction<Partial<HouseholdMemberProfile>>) => {
            const current = normalizeHouseholdMembers(state.householdMembers);
            const normalized = normalizeHouseholdMemberProfile({
                ...action.payload,
                updatedAt: new Date().toISOString(),
            });
            if (!normalized.id) return;
            const exists = current.some(item => item.id === normalized.id);
            state.householdMembers = exists
                ? current.map(item => item.id === normalized.id ? { ...item, ...normalized, createdAt: item.createdAt } : item)
                : [normalized, ...current].slice(0, 30);
            const selected = normalizeStringList(state.selectedHouseholdMemberIds, 30);
            if (!exists && selected.length === 0) {
                state.selectedHouseholdMemberIds = [normalized.id];
            }
        },
        removeHouseholdMemberProfile: (state, action: PayloadAction<string>) => {
            state.householdMembers = normalizeHouseholdMembers(state.householdMembers).filter(item => item.id !== action.payload);
            state.selectedHouseholdMemberIds = normalizeStringList(state.selectedHouseholdMemberIds, 30).filter(id => id !== action.payload);
            if (state.currentHouseholdMemberId === action.payload) {
                state.currentHouseholdMemberId = undefined;
            }
        },
        setSelectedHouseholdMemberIds: (state, action: PayloadAction<string[]>) => {
            const memberIds = new Set(normalizeHouseholdMembers(state.householdMembers).map(item => item.id));
            state.selectedHouseholdMemberIds = normalizeStringList(action.payload, 30).filter(id => memberIds.has(id));
        },
        setCurrentHouseholdMemberId: (state, action: PayloadAction<string | undefined>) => {
            const memberIds = new Set(normalizeHouseholdMembers(state.householdMembers).map(item => item.id));
            const memberId = String(action.payload ?? '').trim();
            state.currentHouseholdMemberId = memberId && memberIds.has(memberId) ? memberId : undefined;
        },
        markPrepTaskDone: (state, action: PayloadAction<string>) => {
            const now = new Date();
            state.prepTaskCompletions = {
                ...prunePrepTaskCompletions(state.prepTaskCompletions, now),
                [action.payload]: now.toISOString(),
            };
        },
        unmarkPrepTaskDone: (state, action: PayloadAction<string>) => {
            const current = prunePrepTaskCompletions(state.prepTaskCompletions);
            delete current[action.payload];
            state.prepTaskCompletions = current;
        },
        addLeftoverTrackerItem: (state, action: PayloadAction<LeftoverTrackerItem>) => {
            const portions = normalizePortions(action.payload.portions);
            if (portions <= 0) return;
            const current = state.leftoverTrackerItems ?? [];
            const nextItem: LeftoverTrackerItem = { ...action.payload, portions, status: 'available', kind: normalizeKind(action.payload.kind) };
            state.leftoverTrackerItems = [nextItem, ...current]
                .slice(0, 80);
        },
        consumeDishServings: (state, action: PayloadAction<{ dishId: string; portions: number; kind: DishServingKind }>) => {
            let remaining = normalizePortions(action.payload.portions);
            if (remaining <= 0) return;
            const { dishId, kind } = action.payload;
            const items = state.leftoverTrackerItems ?? [];
            const order = items
                .map((item, index) => ({ item, index }))
                .filter(({ item }) => item.dishId === dishId && normalizeKind(item.kind) === kind && item.status === 'available')
                .sort((a, b) => {
                    const aKey = new Date(a.item.eatBy ?? a.item.storedAt).valueOf();
                    const bKey = new Date(b.item.eatBy ?? b.item.storedAt).valueOf();
                    return aKey - bKey;
                });
            for (const { item } of order) {
                if (remaining <= 0) break;
                const deduct = Math.min(remaining, item.portions);
                const nextPortions = normalizePortions(item.portions - deduct);
                item.portions = nextPortions;
                if (nextPortions <= 0) {
                    item.portions = 0;
                    item.status = 'finished';
                }
                remaining = normalizePortions(remaining - deduct);
            }
        },
        eatLeftoverPortion: (state, action: PayloadAction<string>) => {
            state.leftoverTrackerItems = (state.leftoverTrackerItems ?? []).map(item => {
                if (item.id !== action.payload || item.status !== 'available') return item;
                const portions = Math.max(0, normalizePortions(item.portions - 1));
                return { ...item, portions, status: portions > 0 ? 'available' : 'finished' };
            });
        },
        eatLeftoverServings: (state, action: PayloadAction<{ id: string; count: number }>) => {
            const eat = normalizePortions(action.payload.count);
            if (eat <= 0) return;
            state.leftoverTrackerItems = (state.leftoverTrackerItems ?? []).map(item => {
                if (item.id !== action.payload.id || item.status !== 'available') return item;
                const portions = Math.max(0, normalizePortions(item.portions - eat));
                return { ...item, portions, status: portions > 0 ? 'available' : 'finished' };
            });
        },
        finishLeftoverItem: (state, action: PayloadAction<string>) => {
            state.leftoverTrackerItems = (state.leftoverTrackerItems ?? []).map(item => item.id === action.payload ? { ...item, portions: 0, status: 'finished' } : item);
        },
        discardLeftoverItem: (state, action: PayloadAction<{ id: string; reason?: string }>) => {
            const reason = action.payload.reason?.trim();
            state.leftoverTrackerItems = (state.leftoverTrackerItems ?? []).map(item => item.id === action.payload.id ? { ...item, status: 'discarded', discardReason: reason || undefined } : item);
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
    upsertHouseholdMemberProfile,
    removeHouseholdMemberProfile,
    setSelectedHouseholdMemberIds,
    setCurrentHouseholdMemberId,
    markPrepTaskDone,
    unmarkPrepTaskDone,
    addLeftoverTrackerItem,
    consumeDishServings,
    eatLeftoverPortion,
    eatLeftoverServings,
    finishLeftoverItem,
    discardLeftoverItem,
} = appContextSlice.actions

export default appContextSlice.reducer
