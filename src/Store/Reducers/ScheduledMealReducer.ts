import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import { ScheduledMeal } from '@store/Models/ScheduledMeal';

// export type ShoppingListAddDishesParams = {
//     shoppingList: ShoppingList;
//     dishesIds: string[];
// }

export interface ScheduledMealState {
    scheduledMeals: ScheduledMeal[];
}

const initialState: ScheduledMealState = {
    scheduledMeals: []
}

export const ScheduledMealSlice = createSlice({
    name: 'shoppingList',
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
        remove: (state, action: PayloadAction<string[]>) => {
            state.scheduledMeals = state.scheduledMeals.filter(dish => !action.payload.includes(dish.id));
        },
    },
})

// Action creators are generated for each case reducer function
export const { add: addScheduledMeal, edit: editScheduledMeal, remove: removeScheduledMeal } = ScheduledMealSlice.actions

export default ScheduledMealSlice.reducer