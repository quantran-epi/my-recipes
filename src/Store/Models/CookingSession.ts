import { DishDurationPhaseKey } from "./Dishes";

export type CookingSessionStatus = "cooking" | "finished" | "cancelled";

export type CookingSessionIngredientStatus = "needed" | "prepared" | "used" | "skipped" | "substituted";

export type CookingPhaseTimer = {
    phaseKey: DishDurationPhaseKey;
    plannedMinutes: number;     // planned time from the dish duration at start
    accumulatedSeconds: number; // frozen actual time; the live running segment is added in the UI
}

export type CookingTimer = {
    phases: CookingPhaseTimer[];                  // ordered active phases (from getActiveItems)
    activePhaseKey: DishDurationPhaseKey | null;  // null = timer finished / not started
    phaseStartedAt: string | null;                // ISO; null while paused or finished
    isPaused: boolean;
    completedPhaseKeys: DishDurationPhaseKey[];
    soundEnabled: boolean;                        // user mute toggle, default true
}

export type CookingSessionIngredientProgress = {
    ingredientId: string;
    status: CookingSessionIngredientStatus;
    substituteNote?: string;
}

export type CookingSessionMemberFeedback = "liked" | "neutral" | "disliked";

export type CookingMealFeedbackSlot = "breakfast" | "lunch" | "dinner" | "day" | "dish";

// Per-member reaction tally for one dish, accumulated across meals.
export type MemberFeedbackTally = {
    liked: number;
    neutral: number;
    disliked: number;
}

// Durable per-dish household feedback, kept per member so the planner can scope to the
// currently selected members. Lives outside the session list (like DishCookTimeStat) so
// clearCookingHistory can't wipe it — feedback is collected at meal completion and may
// have no cooking session behind it at all.
export type DishFeedbackStat = {
    dishId: string;
    members: Record<string, MemberFeedbackTally>; // keyed by householdMemberId
    updatedAt: string;
}

export type CookingMealFeedbackHistoryRecord = {
    id: string;
    dishId: string;
    dishName: string;
    scheduledMealId?: string;
    mealSlot?: CookingMealFeedbackSlot;
    mealTitle?: string;
    mealDate: string; // YYYY-MM-DD
    memberFeedback: Record<string, CookingSessionMemberFeedback>;
    createdAt: string;
    updatedAt: string;
}

// Durable per-dish learned cook-time stat. Lives outside the session list because
// clearCookingHistory wipes finished sessions; stats must survive that.
export type DishCookTimeStat = {
    dishId: string;
    samples: number;            // how many cooks have been recorded
    avgTotalMinutes: number;    // EMA of total minutes
    lastTotalMinutes: number;
    phaseAverages?: Partial<Record<DishDurationPhaseKey, number>>; // EMA per phase, minutes
    updatedAt: string;
}

export type CookingSession = {
    id: string;
    dishId: string;
    dishName: string;
    baseServings?: number;
    targetServings?: number;
    startedAt: string; // ISO string
    finishedAt?: string;
    status: CookingSessionStatus;
    steps: string[];          // ordered step contents
    currentStepIndex: number; // 0-based
    completedStepIndexes?: number[];
    ingredients?: CookingSessionIngredientProgress[];
    householdMemberIds?: string[];
    notes?: string;
    memberFeedback?: Record<string, CookingSessionMemberFeedback>;
    timer?: CookingTimer;
}
