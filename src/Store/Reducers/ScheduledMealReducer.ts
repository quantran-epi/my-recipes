import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import { ScheduledMeal, ScheduledMealActualRecord, ScheduledMealSkipMarker, ScheduledMealSlotKey } from '@store/Models/ScheduledMeal';

// export type ShoppingListAddDishesParams = {
//     shoppingList: ShoppingList;
//     dishesIds: string[];
// }

export interface ScheduledMealState {
    scheduledMeals: ScheduledMeal[];
    selectedMeals: string[];
}

const initialState: ScheduledMealState = {
    scheduledMeals: [],
    selectedMeals: []
}

export const ScheduledMealSlice = createSlice({
    name: 'scheduledMeals',
    initialState,
    reducers: {
        add: (state, action: PayloadAction<ScheduledMeal>) => {
            state.scheduledMeals.push(action.payload);
        },
        edit: (state, action: PayloadAction<ScheduledMeal>) => {
            state.scheduledMeals = state.scheduledMeals.map(e => {
                if (e.id === action.payload.id) return action.payload;
                return e;
            })
        },
        markSkipMeal: (state, action: PayloadAction<{ mealId: string; slot: ScheduledMealSlotKey; marker: ScheduledMealSkipMarker }>) => {
            const meal = state.scheduledMeals.find(item => item.id === action.payload.mealId);
            if (!meal) return;
            if (!meal.skipMeals) meal.skipMeals = {};
            meal.skipMeals[action.payload.slot] = action.payload.marker;
            meal.meals[action.payload.slot] = [];
        },
        unmarkSkipMeal: (state, action: PayloadAction<{ mealId: string; slot: ScheduledMealSlotKey }>) => {
            const meal = state.scheduledMeals.find(item => item.id === action.payload.mealId);
            if (!meal?.skipMeals) return;
            delete meal.skipMeals[action.payload.slot];
        },
        setMealSlotCooked: (state, action: PayloadAction<{ mealId: string; slot: ScheduledMealSlotKey; cooked: boolean }>) => {
            const meal = state.scheduledMeals.find(item => item.id === action.payload.mealId);
            if (!meal) return;
            if (!meal.cookedSlots) meal.cookedSlots = {};
            if (action.payload.cooked) meal.cookedSlots[action.payload.slot] = true;
            else delete meal.cookedSlots[action.payload.slot];
        },
        setMealSlotActual: (state, action: PayloadAction<{ mealId: string; slot: ScheduledMealSlotKey; record: ScheduledMealActualRecord }>) => {
            const meal = state.scheduledMeals.find(item => item.id === action.payload.mealId);
            if (!meal) return;
            if (!meal.actualMeals) meal.actualMeals = {};
            meal.actualMeals[action.payload.slot] = action.payload.record;
        },
        remove: (state, action: PayloadAction<string[]>) => {
            state.scheduledMeals = state.scheduledMeals.filter(dish => !action.payload.includes(dish.id));
        },
        toggleSelectedMeals: (state, action: PayloadAction<{ ids: string[], selected: boolean }>) => {
            if (action.payload.selected)
                state.selectedMeals = [...state.selectedMeals, ...action.payload.ids]
            else
                state.selectedMeals = state.selectedMeals.filter(e => !action.payload.ids.includes(e));
        },
        removeAllSelectedMeals: (state) => {
            state.selectedMeals = [];
        },
        reset: (state) => {
            state.scheduledMeals = [];
            state.selectedMeals = [];
        }
    },
})

// Action creators are generated for each case reducer function
export const {
    add: addScheduledMeal,
    edit: editScheduledMeal,
    markSkipMeal,
    unmarkSkipMeal,
    setMealSlotCooked,
    setMealSlotActual,
    remove: removeScheduledMeal,
    toggleSelectedMeals,
    removeAllSelectedMeals,
    reset: resetScheduleMeals
} = ScheduledMealSlice.actions

export default ScheduledMealSlice.reducer
