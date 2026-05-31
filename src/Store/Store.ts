import { combineReducers, configureStore } from "@reduxjs/toolkit";
import storage from 'redux-persist/lib/storage';
import { persistReducer, persistStore } from 'redux-persist';
import IngredientReducer from "./Reducers/IngredientReducer";
import AppContextReducer from "./Reducers/AppContextReducer";
import DishesReducer from "./Reducers/DishesReducer";
import ShoppingListReducer from "./Reducers/ShoppingListReducer";
import ScheduledMealReducer from "./Reducers/ScheduledMealReducer";
import CookingSessionReducer from "./Reducers/CookingSessionReducer";
import InventoryReducer from "./Reducers/InventoryReducer";

// Shared data: ingredients + dishes — published by admin, synced by users
const sharedReducer = combineReducers({
    ingredient: IngredientReducer,
    dishes: DishesReducer,
});

// Personal data: everything else — stays per-device
const personalReducer = combineReducers({
    appContext: AppContextReducer,
    inventory: InventoryReducer,
    shoppingList: ShoppingListReducer,
    scheduledMeal: ScheduledMealReducer,
    cookingSession: CookingSessionReducer,
});

const sharedPersistConfig = {
    key: 'shared',
    storage,
};

const personalPersistConfig = {
    key: 'personal',
    storage,
};

const rootReducer = combineReducers({
    shared: persistReducer(sharedPersistConfig, sharedReducer),
    personal: persistReducer(personalPersistConfig, personalReducer),
});

export const store = configureStore({
    reducer: rootReducer,
    devTools: process.env.NODE_ENV !== 'production',
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({ serializableCheck: false }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
