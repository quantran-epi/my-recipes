export type IngredientUnit = "g" | "ml" | "lít" | "kg"  | "lá" | "chiếc" | "thìa" | "củ" | "quả" | "thanh" | "nhánh";
export const INGREDIENT_UNITS: Array<IngredientUnit> = ["g", "kg", "lít", "ml", "lá", "chiếc", "củ", "nhánh", "quả", "thanh", "thìa"];

export const INGREDIENT_CATEGORIES = ["Thịt", "Hải sản", "Rau củ", "Gia vị", "Nước chấm", "Tinh bột", "Đồ hộp", "Sữa & trứng", "Khác"];

export type IngredientInventory = {
    amount: number;
    unit: IngredientUnit;
    lastUpdated: Date;
}

export type Ingredient = {
    id: string;
    name: string;
    category?: string;
    inventory?: IngredientInventory;
}