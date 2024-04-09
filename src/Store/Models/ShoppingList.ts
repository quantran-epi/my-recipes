import { Dishes, DishesIngredientAmount } from "./Dishes";

export type ShoppingList = {
    id: string;
    name: string;
    dishes: string[];
    ingredients: Array<{
        amount: DishesIngredientAmount[];
        isDone: boolean;
    }>;
}