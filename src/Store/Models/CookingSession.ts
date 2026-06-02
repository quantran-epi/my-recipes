export type CookingSessionStatus = "cooking" | "finished" | "cancelled";

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
}
