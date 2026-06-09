import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import { Ingredient } from '@store/Models/Ingredient';
import { CookingSession, CookingSessionIngredientStatus, CookingSessionMemberFeedback } from '@store/Models/CookingSession';
import { nanoid } from 'nanoid';

export type StartCookingParams = {
    dishId: string;
    dishName: string;
    baseServings?: number;
    targetServings?: number;
    steps: string[];
    ingredientIds?: string[];
    householdMemberIds?: string[];
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
            const existing = state.sessions.find(session => session.dishId === action.payload.dishId && session.status === "cooking");
            if (existing) return;
            state.sessions.push({
                id: nanoid(),
                dishId: action.payload.dishId,
                dishName: action.payload.dishName,
                baseServings: action.payload.baseServings,
                targetServings: action.payload.targetServings,
                startedAt: new Date().toISOString(),
                status: "cooking",
                steps: action.payload.steps,
                currentStepIndex: 0,
                completedStepIndexes: [],
                ingredients: (action.payload.ingredientIds ?? []).map(ingredientId => ({ ingredientId, status: "needed" })),
                householdMemberIds: action.payload.householdMemberIds ?? [],
                notes: "",
                memberFeedback: {},
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
        setStep: (state, action: PayloadAction<{ sessionId: string; stepIndex: number }>) => {
            const s = state.sessions.find(s => s.id === action.payload.sessionId);
            if (s) s.currentStepIndex = action.payload.stepIndex;
        },
        setTargetServings: (state, action: PayloadAction<{ sessionId: string; targetServings: number }>) => {
            const s = state.sessions.find(s => s.id === action.payload.sessionId);
            if (s) s.targetServings = action.payload.targetServings;
        },
        setIngredientStatus: (state, action: PayloadAction<{ sessionId: string; ingredientId: string; status: CookingSessionIngredientStatus; substituteNote?: string }>) => {
            const s = state.sessions.find(s => s.id === action.payload.sessionId);
            if (!s) return;
            const current = s.ingredients ?? [];
            const exists = current.some(item => item.ingredientId === action.payload.ingredientId);
            const nextItem = {
                ingredientId: action.payload.ingredientId,
                status: action.payload.status,
                substituteNote: action.payload.substituteNote,
            };
            s.ingredients = exists
                ? current.map(item => item.ingredientId === action.payload.ingredientId ? { ...item, ...nextItem } : item)
                : [...current, nextItem];
        },
        toggleStepComplete: (state, action: PayloadAction<{ sessionId: string; stepIndex: number }>) => {
            const s = state.sessions.find(s => s.id === action.payload.sessionId);
            if (!s) return;
            const current = new Set(s.completedStepIndexes ?? []);
            if (current.has(action.payload.stepIndex)) current.delete(action.payload.stepIndex);
            else current.add(action.payload.stepIndex);
            s.completedStepIndexes = Array.from(current).sort((a, b) => a - b);
        },
        updateNotes: (state, action: PayloadAction<{ sessionId: string; notes: string }>) => {
            const s = state.sessions.find(s => s.id === action.payload.sessionId);
            if (s) s.notes = action.payload.notes;
        },
        setMemberFeedback: (state, action: PayloadAction<{ sessionId: string; memberId: string; feedback: CookingSessionMemberFeedback }>) => {
            const s = state.sessions.find(s => s.id === action.payload.sessionId);
            if (!s) return;
            s.memberFeedback = {
                ...(s.memberFeedback ?? {}),
                [action.payload.memberId]: action.payload.feedback,
            };
        },
        clearFinished: (state) => {
            state.sessions = state.sessions.filter(s => s.status === "cooking");
        },
    }
});

export const {
    start: startCooking,
    finish: finishCooking,
    cancel: cancelCooking,
    setStep: setStepCooking,
    setTargetServings: setTargetServingsCooking,
    setIngredientStatus: setCookingIngredientStatus,
    toggleStepComplete: toggleCookingStepComplete,
    updateNotes: updateCookingNotes,
    setMemberFeedback: setCookingMemberFeedback,
    clearFinished: clearCookingHistory,
} = CookingSessionSlice.actions;
export default CookingSessionSlice.reducer;
