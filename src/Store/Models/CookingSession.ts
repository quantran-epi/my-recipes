export type CookingSessionStatus = "cooking" | "finished" | "cancelled";

export type CookingSessionIngredientStatus = "needed" | "prepared" | "used" | "skipped" | "substituted";

export type CookingSessionIngredientProgress = {
    ingredientId: string;
    status: CookingSessionIngredientStatus;
    substituteNote?: string;
}

export type CookingSessionMemberFeedback = "liked" | "neutral" | "disliked";

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
}
