import { IngredientUnit } from "./Ingredient";

export type DishesIngredientAmount = {
    ingredientId: string;
    unit: IngredientUnit;
    amount: string;
}

export type Dishes = {
    id: string;
    name: string;
    ingredients: DishesIngredientAmount[];
}