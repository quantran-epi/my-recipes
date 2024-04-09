import { combineReducers, configureStore } from "@reduxjs/toolkit";
import storage from 'redux-persist/lib/storage';
import { persistReducer, persistStore } from 'redux-persist';
import IngredientReducer from "./Reducers/IngredientReducer";
import AppContextReducer from "./Reducers/AppContextReducer";
import DishesReducer from "./Reducers/DishesReducer";

const combinedReducer = combineReducers({
    appContext: AppContextReducer,
    ingredient: IngredientReducer,
    dishes: DishesReducer
})

const persistConfig = {
    key: 'root',
    storage,
}

const persistedReducer = persistReducer(persistConfig, combinedReducer);

export const store = configureStore({
    reducer: persistedReducer,
    devTools: process.env.NODE_ENV !== 'production',
})

export const persistor = persistStore(store)

export type RootState = ReturnType<typeof store.getState>