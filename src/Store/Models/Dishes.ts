import { IngredientUnit } from "./Ingredient";

export const DISH_INGREDIENT_PREPARE_PRESETS = [
    "Băm nhuyễn", "Xay nhỏ", "Thái lát", "Thái múi cau", "Thái sợi", "Thái miếng vuông", "Thái nhỏ", "Đập dập", "Bóc vỏ", "Lấy nước cốt", "Bỏ hạt", "Cắt khúc", "Chần sơ"
]

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
    prepare?: string[];
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

export type DishDuration = {
    unfreeze: number;
    prepare: number;
    cooking: number;
    serve: number;
    cooldown: number;
}

export type Dishes = {
    id: string;
    name: string;
    ingredients: DishesIngredientAmount[];
    note: string;
    includeDishes: string[];
    steps: DishesStep[];
    isCompleted: boolean;
    duration: DishDuration;
    image?: string;
}