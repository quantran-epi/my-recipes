export type ScheduledMealDishServings = Record<string, number>;

export type ScheduledMeal = {
    id: string;
    name: string;
    plannedDate: Date;
    meals: {
        breakfast: string[],
        lunch: string[],
        dinner: string[]
    }
    dishServings?: ScheduledMealDishServings;
    createdDate: Date;
}
