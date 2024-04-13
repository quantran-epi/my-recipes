import { IngredientUnit } from "./Ingredient";

export type DishesIngredientAmount = {
    ingredientId: string;
    unit: IngredientUnit;
    amount: string;
    dishesId: string;
    required: boolean;
}

export type DishesStep = {
    id: string;
    content: string;
    order: number;
    isDone: boolean;
    required: boolean;
}

export type Dishes = {
    id: string;
    name: string;
    ingredients: DishesIngredientAmount[];
    note: string;
    servingSize: number;
    includeDishes: string[];
    steps: DishesStep[];
}