import { IngredientUnit } from "./Ingredient";

export type DishIngredientAmountMealMeta = {
    id: string;
    plannedDate: Date;
}

export type DishIngredientAmountDishMeta = {
    id: string;
    name: string;
}

export type DishesIngredientAmount = {
    ingredientId: string;
    unit: IngredientUnit;
    amount: string;
    dishesId: string;
    required: boolean;
    meal?: DishIngredientAmountMealMeta;
    dish?: DishIngredientAmountDishMeta;
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
    includeDishes: string[];
    steps: DishesStep[];
    isCompleted: boolean;
    image?: string;
}