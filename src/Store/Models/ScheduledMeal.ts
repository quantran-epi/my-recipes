export type ScheduledMealDishServings = Record<string, number>;

export type ScheduledMealSlotKey = 'breakfast' | 'lunch' | 'dinner';

export type ScheduledMealSkipReason = 'eatOut' | 'leftover';

export type ScheduledMealSkipMarker = {
    reason: ScheduledMealSkipReason;
    note?: string;
    markedAt: string;
};

export type ScheduledMealSkipSlots = Partial<Record<ScheduledMealSlotKey, ScheduledMealSkipMarker>>;

// What was actually eaten for a slot, which may differ from the planned dishes (planned-vs-reality).
export type ScheduledMealActualRecord = {
    dishIds: string[];
    leftoverItemIds?: string[];
    note?: string;
    recordedAt: string;
};

export type ScheduledMeal = {
    id: string;
    name: string;
    plannedDate: Date;
    meals: Record<ScheduledMealSlotKey, string[]>;
    skipMeals?: ScheduledMealSkipSlots;
    cookedSlots?: Partial<Record<ScheduledMealSlotKey, boolean>>;
    actualMeals?: Partial<Record<ScheduledMealSlotKey, ScheduledMealActualRecord>>;
    dishServings?: ScheduledMealDishServings;
    createdDate: Date;
}
