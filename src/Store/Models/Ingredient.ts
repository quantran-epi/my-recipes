export type IngredientUnit = "g" | "ml" | "lít" | "kg" | "lá" | "chiếc" | "thìa" | "củ" | "quả" | "thanh" | "nhánh" | "bó";
export const INGREDIENT_UNITS: Array<IngredientUnit> = ["g", "kg", "lít", "ml", "lá", "chiếc", "củ", "nhánh", "quả", "thanh", "thìa", "bó"];

export const INGREDIENT_CATEGORIES = ["Thịt", "Hải sản", "Rau củ", "Gia vị", "Nước chấm", "Tinh bột", "Đồ hộp", "Sữa & trứng", "Khác"];

export type IngredientShelfLife = "very_short" | "short" | "medium" | "long" | "very_long";
export type IngredientPreservationCondition = "room_temperature" | "cool_dry" | "fridge" | "freezer";
export type IngredientPriceCurrency = "VND";

export type IngredientPriceEstimate = {
    min: number;
    max: number;
    amount: number;
    unit: IngredientUnit;
    currency: IngredientPriceCurrency;
}

export type IngredientNutritionInfo = {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    saturatedFat?: number;
    cholesterol?: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
    potassium?: number;
    calcium?: number;
    iron?: number;
    vitaminA?: number;
    vitaminC?: number;
    amount: number;
    unit: IngredientUnit;
    sources?: IngredientNutritionSource[];
}

export type IngredientNutritionSource = {
    name: string;
    url: string;
    matchedName?: string;
    sourceFoodId?: string;
    confidence?: "exact" | "similar" | "category";
    note?: string;
}

export const INGREDIENT_SHELF_LIFE_OPTIONS: { value: IngredientShelfLife; label: string; description: string; color: string; emoji: string }[] = [
    { value: "very_short", label: "Rất ngắn",  description: "1–3 ngày (rau thơm, hải sản tươi)",        color: "#ff4d4f", emoji: "🔴" },
    { value: "short",      label: "Ngắn",       description: "3–7 ngày (thịt tươi, rau củ lá)",          color: "#fa8c16", emoji: "🟠" },
    { value: "medium",     label: "Trung bình", description: "1–2 tuần (trứng, rau củ quả)",             color: "#faad14", emoji: "🟡" },
    { value: "long",       label: "Dài",        description: "2–4 tuần (củ quả khô, bơ, phô mai)",      color: "#52c41a", emoji: "🟢" },
    { value: "very_long",  label: "Rất dài",    description: "Vài tháng trở lên (đồ hộp, gia vị khô)", color: "#1677ff", emoji: "🔵" },
];

export const INGREDIENT_PRESERVATION_OPTIONS: { value: IngredientPreservationCondition; label: string; description: string }[] = [
    { value: "room_temperature", label: "Nhiệt độ phòng", description: "Có thể để ngoài ở nhiệt độ phòng" },
    { value: "cool_dry", label: "Khô mát", description: "Bảo quản nơi khô, mát, tránh nắng" },
    { value: "fridge", label: "Tủ lạnh", description: "Bảo quản ngăn mát tủ lạnh" },
    { value: "freezer", label: "Tủ đông", description: "Bảo quản đông lạnh" },
];

export type IngredientInventory = {
    /** Legacy/default unit. New inventory batches store their own unit. */
    unit?: IngredientUnit;
    lastUpdated: Date;
    batches: InventoryBatch[];
    discardedBatches?: InventoryBatchDiscard[];
}

export type InventoryBatch = {
    id: string;         // uuid for keying / removal
    amount: number;
    unit?: IngredientUnit;
    purchasedAt?: string; // ISO date string
    expiresAt?: string; // ISO date string, overrides estimated shelf-life expiry
    preservationCondition?: IngredientPreservationCondition;
}

export type InventoryBatchDiscard = InventoryBatch & {
    batchId: string;
    discardedAt: string;
    reason: "expired";
}

export type Ingredient = {
    id: string;
    name: string;
    category?: string;
    shelfLife?: IngredientShelfLife;
    preservationCondition?: IngredientPreservationCondition;
    alwaysAvailable?: boolean;
    baseUnit?: IngredientUnit;
    inventoryUnits?: IngredientUnit[];
    recipeUnitConversions?: Partial<Record<IngredientUnit, number>>;
    priceEstimate?: IngredientPriceEstimate;
    nutrition?: IngredientNutritionInfo;
}
