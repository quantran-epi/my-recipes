export type ScheduledMealDishServings = Record<string, number>;

export type ScheduledMealSlotKey = 'breakfast' | 'lunch' | 'dinner';

export type ScheduledMealSkipReason = 'eatOut' | 'leftover' | 'skip' | 'other';

export type ScheduledMealSkipMarker = {
    reason: ScheduledMealSkipReason;
    note?: string;
    markedAt: string;
};

export type ScheduledMealSkipSlots = Partial<Record<ScheduledMealSlotKey, ScheduledMealSkipMarker>>;

export type ScheduledMeal = {
    id: string;
    name: string;
    plannedDate: Date;
    meals: Record<ScheduledMealSlotKey, string[]>;
    skipMeals?: ScheduledMealSkipSlots;
    dishServings?: ScheduledMealDishServings;
    createdDate: Date;
}
