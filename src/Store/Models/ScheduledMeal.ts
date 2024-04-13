export type ScheduledMeal = {
    id: string;
    name: string;
    plannedDate: Date;
    meals: {
        breakfast: string[],
        lunch: string[],
        dinner: string[]
    }
    createdDate: Date;
}