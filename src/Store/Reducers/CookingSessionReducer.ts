import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import { Ingredient } from '@store/Models/Ingredient';
import { ActiveStepTimer, CookingMealFeedbackHistoryRecord, CookingMealFeedbackSlot, CookingSession, CookingSessionIngredientStatus, CookingSessionMemberFeedback, CookingTimer, DishCookTimeStat, DishFeedbackStat } from '@store/Models/CookingSession';
import { DishDurationPhaseKey } from '@store/Models/Dishes';
import { nanoid } from 'nanoid';

// Weight on the newest sample. Higher = adapts faster to recent cooks; lower = smoother.
const COOK_TIME_EMA_ALPHA = 0.4;
const emaRound = (next: number, prev: number): number => Math.round(COOK_TIME_EMA_ALPHA * next + (1 - COOK_TIME_EMA_ALPHA) * prev);
const FEEDBACK_VALUES: CookingSessionMemberFeedback[] = ['liked', 'neutral', 'disliked'];

const isMemberFeedback = (value: unknown): value is CookingSessionMemberFeedback => FEEDBACK_VALUES.includes(value as CookingSessionMemberFeedback);

const normalizeMemberFeedback = (feedback?: Record<string, CookingSessionMemberFeedback | undefined>): Record<string, CookingSessionMemberFeedback> => {
    return Object.fromEntries(
        Object.entries(feedback ?? {})
            .filter(([memberId, value]) => Boolean(memberId) && isMemberFeedback(value))
    ) as Record<string, CookingSessionMemberFeedback>;
};

const adjustDishFeedbackTally = (state: CookingSessionState, dishId: string, memberId: string, feedback: CookingSessionMemberFeedback, amount: 1 | -1) => {
    if (!dishId || !memberId) return;
    const store = state.dishFeedback ?? (state.dishFeedback = {});
    const stat = store[dishId] ?? { dishId, members: {}, updatedAt: '' };
    const tally = stat.members[memberId] ?? { liked: 0, neutral: 0, disliked: 0 };
    tally[feedback] = Math.max(0, tally[feedback] + amount);
    stat.members[memberId] = tally;
    stat.updatedAt = new Date().toISOString();
    store[dishId] = stat;
};

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

// Same idea as finalizeRunningSegment but for the per-step timer slice. Safe no-op when
// paused/done/dismissed.
const finalizeStepRunningSegment = (timer: ActiveStepTimer): void => {
    if (timer.status !== "running") return;
    const startedMs = Date.parse(timer.startedAt);
    if (!Number.isFinite(startedMs)) return;
    const elapsedSeconds = Math.max(0, Math.round((Date.now() - startedMs) / 1000));
    timer.accumulatedSeconds += elapsedSeconds;
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
    dishFeedback?: Record<string, DishFeedbackStat>;   // durable per-dish household feedback, keyed by dishId
    dishFeedbackHistory?: CookingMealFeedbackHistoryRecord[];
}

const initialState: CookingSessionState = {
    sessions: [],
    cookTimeStats: {},
    dishFeedback: {},
    dishFeedbackHistory: [],
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
        startStepTimer: (state, action: PayloadAction<{ sessionId: string; stepIndex: number; stepContent: string; phaseKey?: DishDurationPhaseKey; minutes: number; unattended: boolean }>) => {
            const s = state.sessions.find(s => s.id === action.payload.sessionId);
            if (!s) return;
            const minutes = Math.max(1, Math.min(600, Math.round(action.payload.minutes)));
            // Don't restart if already running for the same step.
            if (s.activeStepTimer && s.activeStepTimer.stepIndex === action.payload.stepIndex && s.activeStepTimer.status === "running") return;
            s.activeStepTimer = {
                stepIndex: action.payload.stepIndex,
                stepContent: action.payload.stepContent,
                phaseKey: action.payload.phaseKey,
                startedAt: new Date().toISOString(),
                plannedSeconds: minutes * 60,
                accumulatedSeconds: 0,
                unattended: action.payload.unattended,
                status: "running",
            };
        },
        pauseStepTimer: (state, action: PayloadAction<{ sessionId: string }>) => {
            const s = state.sessions.find(s => s.id === action.payload.sessionId);
            if (!s?.activeStepTimer || s.activeStepTimer.status !== "running") return;
            finalizeStepRunningSegment(s.activeStepTimer);
            s.activeStepTimer.status = "paused";
        },
        resumeStepTimer: (state, action: PayloadAction<{ sessionId: string }>) => {
            const s = state.sessions.find(s => s.id === action.payload.sessionId);
            if (!s?.activeStepTimer || s.activeStepTimer.status !== "paused") return;
            s.activeStepTimer.startedAt = new Date().toISOString();
            s.activeStepTimer.status = "running";
        },
        extendStepTimer: (state, action: PayloadAction<{ sessionId: string; minutes: number }>) => {
            const s = state.sessions.find(s => s.id === action.payload.sessionId);
            if (!s?.activeStepTimer) return;
            const add = Math.max(1, Math.round(action.payload.minutes)) * 60;
            s.activeStepTimer.plannedSeconds += add;
        },
        completeStepTimer: (state, action: PayloadAction<{ sessionId: string }>) => {
            const s = state.sessions.find(s => s.id === action.payload.sessionId);
            if (!s?.activeStepTimer) return;
            finalizeStepRunningSegment(s.activeStepTimer);
            s.activeStepTimer.status = "done";
        },
        dismissStepTimer: (state, action: PayloadAction<{ sessionId: string }>) => {
            const s = state.sessions.find(s => s.id === action.payload.sessionId);
            if (!s?.activeStepTimer) return;
            finalizeStepRunningSegment(s.activeStepTimer);
            s.activeStepTimer.status = "dismissed";
        },
        clearStepTimer: (state, action: PayloadAction<{ sessionId: string }>) => {
            const s = state.sessions.find(s => s.id === action.payload.sessionId);
            if (!s) return;
            s.activeStepTimer = undefined;
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
        recordDishFeedback: (state, action: PayloadAction<{ dishId: string; memberId: string; feedback: CookingSessionMemberFeedback }>) => {
            const { dishId, memberId, feedback } = action.payload;
            adjustDishFeedbackTally(state, dishId, memberId, feedback, 1);
        },
        saveMealFeedbackHistory: (state, action: PayloadAction<{
            id?: string;
            dishId: string;
            dishName: string;
            scheduledMealId?: string;
            mealSlot?: CookingMealFeedbackSlot;
            mealTitle?: string;
            mealDate: string;
            memberFeedback?: Record<string, CookingSessionMemberFeedback | undefined>;
        }>) => {
            const { dishId, scheduledMealId, mealSlot } = action.payload;
            if (!dishId) return;

            const history = state.dishFeedbackHistory ?? (state.dishFeedbackHistory = []);
            const existingIndex = history.findIndex(record => {
                if (action.payload.id && record.id === action.payload.id) return true;
                if (scheduledMealId && mealSlot) {
                    return record.scheduledMealId === scheduledMealId
                        && record.mealSlot === mealSlot
                        && record.dishId === dishId;
                }
                if (scheduledMealId) {
                    return record.scheduledMealId === scheduledMealId
                        && record.dishId === dishId
                        && record.mealDate === action.payload.mealDate;
                }
                return record.dishId === dishId
                    && record.mealDate === action.payload.mealDate
                    && record.mealTitle === action.payload.mealTitle;
            });
            const existing = existingIndex >= 0 ? history[existingIndex] : undefined;
            Object.entries(existing?.memberFeedback ?? {}).forEach(([memberId, feedback]) => {
                adjustDishFeedbackTally(state, dishId, memberId, feedback, -1);
            });

            const memberFeedback = normalizeMemberFeedback(action.payload.memberFeedback);
            Object.entries(memberFeedback).forEach(([memberId, feedback]) => {
                adjustDishFeedbackTally(state, dishId, memberId, feedback, 1);
            });

            const now = new Date().toISOString();
            const nextRecord: CookingMealFeedbackHistoryRecord = {
                id: existing?.id ?? action.payload.id ?? nanoid(10),
                dishId,
                dishName: action.payload.dishName || existing?.dishName || dishId,
                scheduledMealId,
                mealSlot,
                mealTitle: action.payload.mealTitle,
                mealDate: action.payload.mealDate,
                memberFeedback,
                createdAt: existing?.createdAt ?? now,
                updatedAt: now,
            };

            if (existingIndex >= 0) history[existingIndex] = nextRecord;
            else history.push(nextRecord);
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
    startStepTimer,
    pauseStepTimer,
    resumeStepTimer,
    extendStepTimer,
    completeStepTimer,
    dismissStepTimer,
    clearStepTimer,
    recordCookTime,
    recordDishFeedback,
    saveMealFeedbackHistory,
    clearFinished: clearCookingHistory,
} = CookingSessionSlice.actions;
export default CookingSessionSlice.reducer;
