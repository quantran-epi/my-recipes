export type CookingSessionStatus = "cooking" | "finished" | "cancelled";

export type CookingSession = {
    id: string;
    dishId: string;
    dishName: string;
    startedAt: string; // ISO string
    finishedAt?: string;
    status: CookingSessionStatus;
}
