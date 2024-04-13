import { DishesIngredientAmount } from "./Dishes";
import { ScheduledMeal } from "./ScheduledMeal";

export type ShoppingListIngredientGroup = {
    id: string;
    ingredientId: string;
    amounts: DishesIngredientAmount[];
    isDone: boolean;
}

export type ShoppingList = {
    id: string;
    name: string;
    dishes: string[];
    ingredients: ShoppingListIngredientGroup[];
    scheduledMeals: ScheduledMeal[];
    createdDate: Date;
    plannedDate: Date;
}