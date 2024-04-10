import { Dishes, DishesIngredientAmount } from "./Dishes";

export type ShoppingListIngredientGroup = {
    id: string;
    amounts: DishesIngredientAmount[];
    isDone: boolean;
}

export type ShoppingList = {
    id: string;
    name: string;
    dishes: string[];
    ingredients: ShoppingListIngredientGroup[];
}