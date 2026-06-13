import {
    SmartPlannerMealSlotDishRanges,
    SmartPlannerMealSlotTagRequirements,
} from "@modules/ScheduledMeal/Helpers/SmartPlannerEngine";

// A saved snapshot of the two dishes-per-meal modal configs (per-slot dish-count ranges + per-slot
// tag requirements) so the user can reapply a preferred planning setup. Persisted under the
// personal IndexedDB root via the smartPlannerTemplate slice.
export type SmartPlannerTemplate = {
    id: string;
    name: string;
    createdAt: string;
    mealSlotDishRanges: SmartPlannerMealSlotDishRanges;
    mealSlotTagRequirements: SmartPlannerMealSlotTagRequirements;
}

export interface SmartPlannerTemplateState {
    templates: SmartPlannerTemplate[];
}
