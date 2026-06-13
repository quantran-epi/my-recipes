/**
 * Typed selectors for the split store structure.
 * Import from here instead of accessing state.shared.* or state.personal.* directly.
 */
import { RootState } from "@store/Store";
import { DEFAULT_SHARED_CONFIG, normalizeSharedConfig } from "@store/Models/SharedConfig";
import { buildHouseholdPreferenceProfile, getSelectedHouseholdMembers, normalizeHouseholdMembers, normalizeKind, normalizeMealSlotTimes } from "@store/Reducers/AppContextReducer";
import { normalizeHouseholdHealthState } from "@store/Reducers/HouseholdHealthReducer";
import type { HouseholdHealthRecord } from "@store/Reducers/HouseholdHealthReducer";
import { createSelector } from "reselect";

// ── Shared (admin-published) ─────────────────────────────────────────────────
export const selectIngredients = (state: RootState) => state.shared.ingredient.ingredients;
export const selectDishes = (state: RootState) => state.shared.dishes.dishes;
export const selectSharedConfig = (state: RootState) => normalizeSharedConfig(state.shared.config?.config ?? DEFAULT_SHARED_CONFIG);
export const selectInventoryHealthConfig = createSelector(
    [selectSharedConfig],
    config => config.inventory
);

export const selectNutritionGoals = createSelector(
    [selectSharedConfig],
    config => config.nutrition.goals
);

export const selectIngredientsById = createSelector(
    [selectIngredients],
    ingredients => new Map(ingredients.map(item => [item.id, item]))
);

export const selectDishesById = createSelector(
    [selectDishes],
    dishes => new Map(dishes.map(item => [item.id, item]))
);

export const selectDishNameById = createSelector(
    [selectDishes],
    dishes => new Map(dishes.map(item => [item.id, item.name]))
);

// ── Personal ─────────────────────────────────────────────────────────────────
export const selectInventory = (state: RootState) => state.personal.inventory.items;
export const selectInventoryById = (ingredientId: string) => (state: RootState) =>
    state.personal.inventory.items[ingredientId];
export const selectShoppingLists = (state: RootState) => state.personal.shoppingList.shoppingLists;
export const selectScheduledMeals = (state: RootState) => state.personal.scheduledMeal.scheduledMeals;
export const selectSelectedMeals = (state: RootState) => state.personal.scheduledMeal.selectedMeals;
export const selectCookingSessions = (state: RootState) => state.personal.cookingSession.sessions;
export const selectCookTimeStats = (state: RootState) => state.personal.cookingSession.cookTimeStats ?? {};
export const selectDishFeedback = (state: RootState) => state.personal.cookingSession.dishFeedback ?? {};
export const selectDishFeedbackHistory = (state: RootState) => state.personal.cookingSession.dishFeedbackHistory ?? [];
export const selectAppContext = (state: RootState) => state.personal.appContext;
// `?? []` tolerates devices whose persisted personal blob predates the smartPlannerTemplate slice.
export const selectSmartPlannerTemplates = (state: RootState) => state.personal.smartPlannerTemplate?.templates ?? [];
export const selectHouseholdHealthState = createSelector(
    [(state: RootState) => state.personal.householdHealth],
    householdHealth => normalizeHouseholdHealthState(householdHealth)
);
export const selectCurrentFeatureName = (state: RootState) => state.personal.appContext.currentFeatureName;
export const selectShoppingListNameHistory = (state: RootState) => state.personal.appContext.shoppingListNameHistory ?? [];
export const selectScheduledMealNameHistory = (state: RootState) => state.personal.appContext.scheduledMealNameHistory ?? [];
export const selectWeeklyMealTemplates = (state: RootState) => state.personal.appContext.weeklyMealTemplates ?? [];
export const selectShoppingListTemplates = (state: RootState) => state.personal.appContext.shoppingListTemplates ?? [];
export const selectIngredientPriceMemory = (state: RootState) => state.personal.appContext.ingredientPriceMemory ?? {};
export const selectIngredientPriceHistory = (state: RootState) => state.personal.appContext.ingredientPriceHistory ?? {};
export const selectHouseholdMembers = createSelector(
    [selectAppContext],
    appContext => normalizeHouseholdMembers(appContext.householdMembers)
);

export const selectSelectedHouseholdMemberIds = (state: RootState) => state.personal.appContext.selectedHouseholdMemberIds ?? [];

export const selectCurrentHouseholdMemberId = createSelector(
    [selectAppContext, selectHouseholdMembers],
    (appContext, members) => {
        const memberId = String(appContext.currentHouseholdMemberId ?? '').trim();
        return memberId && members.some(member => member.id === memberId) ? memberId : undefined;
    }
);

export const selectSelectedHouseholdMembers = createSelector(
    [selectHouseholdMembers, selectSelectedHouseholdMemberIds],
    (members, selectedIds) => getSelectedHouseholdMembers(members, selectedIds)
);

export const selectHouseholdHealthProfiles = createSelector(
    [selectHouseholdHealthState],
    householdHealth => householdHealth.profiles
);

export const selectHouseholdHealthRecords = createSelector(
    [selectHouseholdHealthState],
    householdHealth => householdHealth.records
);

export const selectMemberHealthProfile = (memberId: string) => createSelector(
    [selectHouseholdHealthProfiles],
    profiles => profiles[memberId]
);

export const selectHealthRecordsByMember = (memberId: string) => createSelector(
    [selectHouseholdHealthRecords],
    records => records
        .filter(record => record.memberId === memberId)
        .sort((a, b) => new Date(b.startedAt).valueOf() - new Date(a.startedAt).valueOf())
);

export const selectActiveSicknessByMember = (memberId: string) => createSelector(
    [selectHealthRecordsByMember(memberId)],
    records => records.filter((record): record is HouseholdHealthRecord => record.type === 'sickness' && !record.endedAt)
);

export const selectHouseholdPreferenceProfile = createSelector(
    [selectAppContext, selectSelectedHouseholdMembers],
    (appContext, selectedMembers) => buildHouseholdPreferenceProfile(appContext.householdPreferenceProfile, selectedMembers)
);
export const selectMealSlotTimes = createSelector(
    [selectHouseholdPreferenceProfile],
    profile => normalizeMealSlotTimes(profile.mealSlotTimes)
);
export const selectPrepTaskCompletions = (state: RootState) => state.personal.appContext.prepTaskCompletions ?? {};
export const selectLeftoverTrackerItems = (state: RootState) => state.personal.appContext.leftoverTrackerItems ?? [];

export const selectAvailableServingsByDishKind = createSelector(
    [selectLeftoverTrackerItems],
    items => {
        const map = new Map<string, { fresh: number; leftover: number }>();
        items.forEach(item => {
            if (item.status !== 'available') return;
            const portions = Number(item.portions);
            if (!Number.isFinite(portions) || portions <= 0) return;
            const kind = normalizeKind(item.kind);
            const current = map.get(item.dishId) ?? { fresh: 0, leftover: 0 };
            current[kind] += portions;
            map.set(item.dishId, current);
        });
        return map;
    }
);

export const selectShoppingListsById = createSelector(
    [selectShoppingLists],
    shoppingLists => new Map(shoppingLists.map(item => [item.id, item]))
);

export const selectScheduledMealsById = createSelector(
    [selectScheduledMeals],
    scheduledMeals => new Map(scheduledMeals.map(item => [item.id, item]))
);

export const selectSelectedMealIds = createSelector(
    [selectSelectedMeals],
    selectedMeals => new Set(selectedMeals)
);
