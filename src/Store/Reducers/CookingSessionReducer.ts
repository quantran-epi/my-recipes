import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import { Ingredient } from '@store/Models/Ingredient';
import { CookingSession } from '@store/Models/CookingSession';
import { nanoid } from 'nanoid';

export type StartCookingParams = {
    dishId: string;
    dishName: string;
}

export type FinishCookingParams = {
    sessionId: string;
    allIngredients: Ingredient[];
    // ingredientId → amount to deduct
    deductions: { ingredientId: string; amount: number }[];
}

export interface CookingSessionState {
    sessions: CookingSession[];
}

const initialState: CookingSessionState = {
    sessions: []
}

export const CookingSessionSlice = createSlice({
    name: 'cookingSession',
    initialState,
    reducers: {
        start: (state, action: PayloadAction<StartCookingParams>) => {
            state.sessions.push({
                id: nanoid(),
                dishId: action.payload.dishId,
                dishName: action.payload.dishName,
                startedAt: new Date().toISOString(),
                status: "cooking",
            });
        },
        finish: (state, action: PayloadAction<string>) => {
            state.sessions = state.sessions.map(s =>
                s.id === action.payload
                    ? { ...s, status: "finished", finishedAt: new Date().toISOString() }
                    : s
            );
        },
        cancel: (state, action: PayloadAction<string>) => {
            state.sessions = state.sessions.map(s =>
                s.id === action.payload
                    ? { ...s, status: "cancelled", finishedAt: new Date().toISOString() }
                    : s
            );
        },
    }
});

export const { start: startCooking, finish: finishCooking, cancel: cancelCooking } = CookingSessionSlice.actions;
export default CookingSessionSlice.reducer;
