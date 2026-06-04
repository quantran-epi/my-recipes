/**
 * Typed selectors for the split store structure.
 * Import from here instead of accessing state.shared.* or state.personal.* directly.
 */
import { RootState } from "@store/Store";
import { createSelector } from "reselect";

// ── Shared (admin-published) ─────────────────────────────────────────────────
export const selectIngredients = (state: RootState) => state.shared.ingredient.ingredients;
export const selectDishes = (state: RootState) => state.shared.dishes.dishes;

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
export const selectAppContext = (state: RootState) => state.personal.appContext;
export const selectCurrentFeatureName = (state: RootState) => state.personal.appContext.currentFeatureName;

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
