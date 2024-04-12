import { DishesIngredientAmount } from "./Dishes";

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
    createdDate: Date;
    plannedDate: Date;
}