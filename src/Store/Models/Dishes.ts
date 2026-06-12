import { IngredientUnit } from "./Ingredient";

export const DISH_INGREDIENT_PREPARE_PRESETS = [
    "Băm nhuyễn", "Xay nhỏ", "Thái lát", "Thái múi cau", "Thái sợi", "Thái miếng vuông", "Thái nhỏ", "Đập dập", "Bóc vỏ", "Lấy nước cốt", "Bỏ hạt", "Cắt khúc", "Chần sơ"
]

export const DISH_TAGS = [
    "Canh", "Món chính", "Món phụ", "Tráng miệng", "Khai vị", "Đồ uống", "Ăn sáng", "Ăn vặt", "Nướng", "Chiên", "Hấp", "Luộc", "Xào", "Salad"
]

export type DishIngredientAmountMealMeta = {
    id: string;
    plannedDate: Date;
}

export type DishIngredientAmountDishMeta = {
    id: string;
    name: string;
    baseServings?: number;
    targetServings?: number;
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
    // Optional binding to a duration phase so the cooking session can color/group steps.
    phaseKey?: DishDurationPhaseKey;
    // If set (>= 1), step has its own countdown timer in minutes.
    timerMinutes?: number;
    // Only meaningful when timerMinutes is set; fires a system notification + vibration when done.
    unattended?: boolean;
}

export type DishDurationPhaseKey = "unfreeze" | "prepare" | "cooking" | "serve" | "cooldown";

export type DishDuration = Record<DishDurationPhaseKey, number | null>;

export type Dishes = {
    id: string;
    name: string;
    baseServings?: number;
    ingredients: DishesIngredientAmount[];
    note: string;
    includeDishes: string[];
    steps: DishesStep[];
    isCompleted: boolean;
    duration: DishDuration;
    image?: string;
    tags?: string[];
    isAccompaniment?: boolean;
}
