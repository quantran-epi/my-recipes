import { DishesIngredientAmount } from "./Dishes";
import { IngredientPreservationCondition, IngredientPriceCurrency, IngredientUnit } from "./Ingredient";

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

export type ShoppingListCompletionImport = {
    id: string;
    batchId: string;
    ingredientId: string;
    ingredientName: string;
    amount: number;
    unit: IngredientUnit;
    importedAt: string;
    expiresAt?: string;
    preservationCondition?: IngredientPreservationCondition;
    estimatedCost?: {
        min: number;
        max: number;
        currency: IngredientPriceCurrency;
    };
}

export type ShoppingList = {
    id: string;
    name: string;
    dishes: string[];
    dishServings?: Record<string, number>;
    ingredients: ShoppingListIngredientGroup[];
    scheduledMeals: string[];
    createdDate: Date;
    plannedDate: Date;
    completedAt?: Date;
    completionImports?: ShoppingListCompletionImport[];
}
