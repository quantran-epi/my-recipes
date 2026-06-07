import { IngredientPreservationCondition, IngredientShelfLife } from "./Ingredient";

export type InventoryExpirationDefaults = Record<IngredientShelfLife, Record<IngredientPreservationCondition, number>>;

export type InventoryHealthConfig = {
    lowStockAmount: number;
    urgentExpiryDays: number;
    expirationDefaults: InventoryExpirationDefaults;
}

export type SharedConfig = {
    inventory: InventoryHealthConfig;
}

export const DEFAULT_INVENTORY_EXPIRATION_DEFAULTS: InventoryExpirationDefaults = {
    very_short: { room_temperature: 1, cool_dry: 1, fridge: 2, freezer: 14 },
    short: { room_temperature: 2, cool_dry: 3, fridge: 5, freezer: 30 },
    medium: { room_temperature: 5, cool_dry: 7, fridge: 10, freezer: 60 },
    long: { room_temperature: 14, cool_dry: 21, fridge: 21, freezer: 90 },
    very_long: { room_temperature: 60, cool_dry: 90, fridge: 90, freezer: 180 },
};

export const DEFAULT_INVENTORY_HEALTH_CONFIG: InventoryHealthConfig = {
    lowStockAmount: 2,
    urgentExpiryDays: 3,
    expirationDefaults: DEFAULT_INVENTORY_EXPIRATION_DEFAULTS,
};

export const DEFAULT_SHARED_CONFIG: SharedConfig = {
    inventory: DEFAULT_INVENTORY_HEALTH_CONFIG,
};

export const normalizeInventoryHealthConfig = (config?: Partial<InventoryHealthConfig> | null): InventoryHealthConfig => ({
    lowStockAmount: typeof config?.lowStockAmount === "number" && config.lowStockAmount >= 0
        ? config.lowStockAmount
        : DEFAULT_INVENTORY_HEALTH_CONFIG.lowStockAmount,
    urgentExpiryDays: typeof config?.urgentExpiryDays === "number" && config.urgentExpiryDays >= 0
        ? config.urgentExpiryDays
        : DEFAULT_INVENTORY_HEALTH_CONFIG.urgentExpiryDays,
    expirationDefaults: {
        very_short: { ...DEFAULT_INVENTORY_EXPIRATION_DEFAULTS.very_short, ...config?.expirationDefaults?.very_short },
        short: { ...DEFAULT_INVENTORY_EXPIRATION_DEFAULTS.short, ...config?.expirationDefaults?.short },
        medium: { ...DEFAULT_INVENTORY_EXPIRATION_DEFAULTS.medium, ...config?.expirationDefaults?.medium },
        long: { ...DEFAULT_INVENTORY_EXPIRATION_DEFAULTS.long, ...config?.expirationDefaults?.long },
        very_long: { ...DEFAULT_INVENTORY_EXPIRATION_DEFAULTS.very_long, ...config?.expirationDefaults?.very_long },
    },
});

export const normalizeSharedConfig = (config?: Partial<SharedConfig> | null): SharedConfig => ({
    inventory: normalizeInventoryHealthConfig(config?.inventory),
});
