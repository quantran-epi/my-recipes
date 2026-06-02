import { DishesIngredientAmount } from "./Dishes";
import { IngredientUnit } from "./Ingredient";

export type ShoppingListIngredientAmount = DishesIngredientAmount & {
    id: string;
    isDone?: boolean;
}

export type ShoppingListIngredientGroup = {
    id: string;
    ingredientId: string;
    amounts: ShoppingListIngredientAmount[];
    isDone: boolean;
    boughtAmount?: number;
    boughtUnit?: IngredientUnit;
}

export type ShoppingList = {
    id: string;
    name: string;
    dishes: string[];
    ingredients: ShoppingListIngredientGroup[];
    scheduledMeals: string[];
    createdDate: Date;
    plannedDate: Date;
    completedAt?: Date;
}
