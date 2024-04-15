export type IngredientUnit = "g" | "ml" | "lít" | "kg"  | "lá" | "chiếc" | "thìa" | "củ" | "quả" | "thanh" | "nhánh";
export const INGREDIENT_UNITS: Array<IngredientUnit> = ["g", "kg", "lít", "ml", "lá", "chiếc", "củ", "nhánh", "quả", "thanh", "thìa"];

export type Ingredient = {
    id: string;
    name: string;
}