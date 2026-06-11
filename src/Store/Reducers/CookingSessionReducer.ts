import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import { Ingredient } from '@store/Models/Ingredient';
import { CookingSession, CookingSessionIngredientStatus, CookingSessionMemberFeedback, CookingTimer, DishCookTimeStat } from '@store/Models/CookingSession';
import { DishDurationPhaseKey } from '@store/Models/Dishes';
import { nanoid } from 'nanoid';

// Weight on the newest sample. Higher = adapts faster to recent cooks; lower = smoother.
const COOK_TIME_EMA_ALPHA = 0.4;
const emaRound = (next: number, prev: number): number => Math.round(COOK_TIME_EMA_ALPHA * next + (1 - COOK_TIME_EMA_ALPHA) * prev);

export type CookingTimerPhaseInput = {
    phaseKey: DishDurationPhaseKey;
    plannedMinutes: number;
}

export type StartCookingParams = {
    dishId: string;
    dishName: string;
    baseServings?: number;
    targetServings?: number;
    steps: string[];
    ingredientIds?: string[];
    householdMemberIds?: string[];
    timerPhases?: CookingTimerPhaseInput[]; // active duration phases; when present, the live timer starts with cooking
}

// Folds the currently-running segment (now − phaseStartedAt) into the active phase's
// accumulatedSeconds, then clears phaseStartedAt. Safe to call when paused/finished (no-op).
const finalizeRunningSegment = (timer: CookingTimer): void => {
    if (!timer.phaseStartedAt || timer.isPaused || !timer.activePhaseKey) return;
    const startedMs = Date.parse(timer.phaseStartedAt);
    if (!Number.isFinite(startedMs)) {
        timer.phaseStartedAt = null;
        return;
    }
    const elapsedSeconds = Math.max(0, Math.round((Date.now() - startedMs) / 1000));
    const phase = timer.phases.find(p => p.phaseKey === timer.activePhaseKey);
    if (phase) phase.accumulatedSeconds += elapsedSeconds;
    timer.phaseStartedAt = null;
}

export type FinishCookingParams = {
    sessionId: string;
    allIngredients: Ingredient[];
    // ingredientId → amount to deduct
    deductions: { ingredientId: string; amount: number }[];
}

export interface CookingSessionState {
    sessions: CookingSession[];
    cookTimeStats?: Record<string, DishCookTimeStat>; // durable per-dish learned times, keyed by dishId
}

const initialState: CookingSessionState = {
    sessions: [],
    cookTimeStats: {},
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
                timer: action.payload.timerPhases && action.payload.timerPhases.length > 0 ? {
                    phases: action.payload.timerPhases.map(p => ({
                        phaseKey: p.phaseKey,
                        plannedMinutes: p.plannedMinutes,
                        accumulatedSeconds: 0,
                    })),
                    activePhaseKey: action.payload.timerPhases[0].phaseKey,
                    phaseStartedAt: new Date().toISOString(),
                    isPaused: false,
                    completedPhaseKeys: [],
                    soundEnabled: true,
                } : undefined,
            });
        },
        finish: (state, action: PayloadAction<string>) => {
            const s = state.sessions.find(s => s.id === action.payload);
            if (!s) return;
            if (s.timer) finalizeRunningSegment(s.timer); // fold in-progress phase time before locking the session
            s.status = "finished";
            s.finishedAt = new Date().toISOString();
        },
        cancel: (state, action: PayloadAction<string>) => {
            const s = state.sessions.find(s => s.id === action.payload);
            if (!s) return;
            if (s.timer) finalizeRunningSegment(s.timer);
            s.status = "cancelled";
            s.finishedAt = new Date().toISOString();
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
        pauseTimer: (state, action: PayloadAction<{ sessionId: string }>) => {
            const s = state.sessions.find(s => s.id === action.payload.sessionId);
            if (!s?.timer || s.timer.isPaused) return;
            finalizeRunningSegment(s.timer); // freeze elapsed into accumulatedSeconds, clears phaseStartedAt
            s.timer.isPaused = true;
        },
        resumeTimer: (state, action: PayloadAction<{ sessionId: string }>) => {
            const s = state.sessions.find(s => s.id === action.payload.sessionId);
            if (!s?.timer || !s.timer.isPaused || !s.timer.activePhaseKey) return;
            s.timer.isPaused = false;
            s.timer.phaseStartedAt = new Date().toISOString();
        },
        advancePhase: (state, action: PayloadAction<{ sessionId: string }>) => {
            const s = state.sessions.find(s => s.id === action.payload.sessionId);
            if (!s?.timer || !s.timer.activePhaseKey) return;
            const timer = s.timer;
            finalizeRunningSegment(timer);
            const currentKey = timer.activePhaseKey;
            const currentIndex = timer.phases.findIndex(p => p.phaseKey === currentKey);
            if (currentKey && !timer.completedPhaseKeys.includes(currentKey)) {
                timer.completedPhaseKeys.push(currentKey);
            }
            const next = timer.phases[currentIndex + 1];
            if (next) {
                timer.activePhaseKey = next.phaseKey;
                timer.phaseStartedAt = timer.isPaused ? null : new Date().toISOString();
            } else {
                timer.activePhaseKey = null; // all phases done; accumulatedSeconds preserved for learning
                timer.phaseStartedAt = null;
            }
        },
        toggleTimerSound: (state, action: PayloadAction<{ sessionId: string }>) => {
            const s = state.sessions.find(s => s.id === action.payload.sessionId);
            if (!s?.timer) return;
            s.timer.soundEnabled = !s.timer.soundEnabled;
        },
        recordCookTime: (state, action: PayloadAction<{ dishId: string; totalMinutes: number; phaseMinutes?: Partial<Record<DishDurationPhaseKey, number>> }>) => {
            const { dishId, totalMinutes, phaseMinutes } = action.payload;
            if (!dishId || !Number.isFinite(totalMinutes) || totalMinutes <= 0) return;
            const stats = state.cookTimeStats ?? (state.cookTimeStats = {});
            const existing = stats[dishId];
            const now = new Date().toISOString();
            if (!existing) {
                stats[dishId] = {
                    dishId,
                    samples: 1,
                    avgTotalMinutes: Math.round(totalMinutes),
                    lastTotalMinutes: Math.round(totalMinutes),
                    phaseAverages: phaseMinutes
                        ? Object.fromEntries(Object.entries(phaseMinutes).map(([k, v]) => [k, Math.round(v as number)]))
                        : undefined,
                    updatedAt: now,
                };
                return;
            }
            existing.avgTotalMinutes = emaRound(totalMinutes, existing.avgTotalMinutes);
            existing.lastTotalMinutes = Math.round(totalMinutes);
            existing.samples += 1;
            existing.updatedAt = now;
            if (phaseMinutes) {
                const nextPhaseAverages = { ...(existing.phaseAverages ?? {}) };
                (Object.entries(phaseMinutes) as [DishDurationPhaseKey, number][]).forEach(([key, value]) => {
                    if (!Number.isFinite(value) || value <= 0) return;
                    const prev = nextPhaseAverages[key];
                    nextPhaseAverages[key] = prev != null ? emaRound(value, prev) : Math.round(value);
                });
                existing.phaseAverages = nextPhaseAverages;
            }
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
    pauseTimer: pauseCookingTimer,
    resumeTimer: resumeCookingTimer,
    advancePhase: advanceCookingPhase,
    toggleTimerSound: toggleCookingTimerSound,
    recordCookTime: recordCookTime,
    clearFinished: clearCookingHistory,
} = CookingSessionSlice.actions;
export default CookingSessionSlice.reducer;
