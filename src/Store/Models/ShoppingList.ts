import { DishesIngredientAmount } from "./Dishes";

export type ShoppingListIngredientAmount = DishesIngredientAmount & {
    id: string;
    isDone?: boolean;
}

export type ShoppingListIngredientGroup = {
    id: string;
    ingredientId: string;
    amounts: ShoppingListIngredientAmount[];
    isDone: boolean;
}

export type ShoppingList = {
    id: string;
    name: string;
    dishes: string[];
    ingredients: ShoppingListIngredientGroup[];
    scheduledMeals: string[];
    createdDate: Date;
    plannedDate: Date;
}