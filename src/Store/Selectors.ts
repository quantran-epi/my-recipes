/**
 * Typed selectors for the split store structure.
 * Import from here instead of accessing state.shared.* or state.personal.* directly.
 */
import { RootState } from "@store/Store";

// ── Shared (admin-published) ─────────────────────────────────────────────────
export const selectIngredients = (state: RootState) => state.shared.ingredient.ingredients;
export const selectDishes = (state: RootState) => state.shared.dishes.dishes;

// ── Personal ─────────────────────────────────────────────────────────────────
export const selectInventory = (state: RootState) => state.personal.inventory.items;
export const selectInventoryById = (ingredientId: string) => (state: RootState) =>
    state.personal.inventory.items[ingredientId];
export const selectShoppingLists = (state: RootState) => state.personal.shoppingList.shoppingLists;
export const selectScheduledMeals = (state: RootState) => state.personal.scheduledMeal.scheduledMeals;
export const selectCookingSessions = (state: RootState) => state.personal.cookingSession.sessions;
export const selectAppContext = (state: RootState) => state.personal.appContext;
export const selectCurrentFeatureName = (state: RootState) => state.personal.appContext.currentFeatureName;
