import { Ingredient, IngredientInventory, IngredientPreservationCondition, IngredientShelfLife, InventoryBatch } from "@store/Models/Ingredient";
import { DEFAULT_INVENTORY_HEALTH_CONFIG, InventoryHealthConfig, normalizeInventoryHealthConfig } from "@store/Models/SharedConfig";
import dayjs from "dayjs";
import { IngredientUnitHelper } from "./IngredientUnitHelper";

type ExpiryContext = Ingredient | IngredientShelfLife | undefined;

type InventorySnapshot = {
    usableAmount: number;
    hasInventory: boolean;
    nearestExpiry: { batch: InventoryBatch; daysLeft: number } | null;
};

const getShelfLife = (context: ExpiryContext): IngredientShelfLife | undefined => {
    return typeof context === "string" ? context : context?.shelfLife;
};

const getPreservationCondition = (
    batch: InventoryBatch,
    context: ExpiryContext,
): IngredientPreservationCondition | undefined => {
    if (batch.preservationCondition) return batch.preservationCondition;
    return typeof context === "string" ? undefined : context?.preservationCondition;
};

const getShelfLifeDays = (
    shelfLife: IngredientShelfLife,
    preservationCondition?: IngredientPreservationCondition,
    config?: InventoryHealthConfig,
): number => {
    const normalizedConfig = normalizeInventoryHealthConfig(config ?? DEFAULT_INVENTORY_HEALTH_CONFIG);
    const defaults = normalizedConfig.expirationDefaults[shelfLife];
    const fallback = defaults.fridge ?? Object.values(defaults)[0] ?? 0;
    if (!preservationCondition) return fallback;
    return defaults[preservationCondition] ?? fallback;
};

const roundInventoryAmount = (value: number): number => {
    if (!isFinite(value)) return 0;
    return Math.round(value * 10) / 10;
};

export const InventoryHelper = {
    roundAmount(value: number): number {
        return roundInventoryAmount(value);
    },

    isAlwaysAvailable(ingredient?: Ingredient): boolean {
        return ingredient?.alwaysAvailable === true;
    },

    /** Total amount across all batches */
    totalAmount(inv: IngredientInventory | undefined, ingredient?: Ingredient): number {
        return roundInventoryAmount(IngredientUnitHelper.totalInventoryAmount(inv, ingredient));
    },

    /** Total amount from batches that are not expired. Batches without expiry data are treated as usable. */
    totalUsableAmount(inv: IngredientInventory | undefined, ingredient?: Ingredient, config?: InventoryHealthConfig): number {
        return InventoryHelper.inventorySnapshot(inv, ingredient, config).usableAmount;
    },

    /** Single-pass stock snapshot for list/detail screens that need usable amount and nearest expiry together. */
    inventorySnapshot(inv: IngredientInventory | undefined, ingredient?: Ingredient, config?: InventoryHealthConfig): InventorySnapshot {
        if (!inv) return { usableAmount: 0, hasInventory: false, nearestExpiry: null };
        if (!inv.batches) {
            const legacyAmount = (inv as any).amount ?? 0;
            const legacyUnit = inv.unit ?? IngredientUnitHelper.getBaseUnit(ingredient);
            const baseUnit = IngredientUnitHelper.getBaseUnit(ingredient, [legacyUnit]);
            const usableAmount = roundInventoryAmount(IngredientUnitHelper.toBaseAmount(ingredient, legacyAmount, legacyUnit, baseUnit) ?? legacyAmount);
            return { usableAmount, hasInventory: true, nearestExpiry: null };
        }

        const baseUnit = IngredientUnitHelper.getBaseUnit(ingredient, [inv.unit].filter(Boolean) as any);
        const today = dayjs().startOf("day");
        let total = 0;
        let nearestExpiry: InventorySnapshot["nearestExpiry"] = null;

        for (const batch of inv.batches) {
            const expiry = InventoryHelper.batchExpiry(batch, ingredient, config);
            const daysLeft = expiry ? expiry.startOf("day").diff(today, "day") : null;
            if (daysLeft !== null && daysLeft < 0) continue;

            const unit = IngredientUnitHelper.getBatchUnit(inv, batch, ingredient);
            const converted = IngredientUnitHelper.toBaseAmount(ingredient, batch.amount, unit, baseUnit);
            total += converted ?? batch.amount;

            if (batch.amount <= 0 || daysLeft === null) continue;
            if (nearestExpiry === null || daysLeft < nearestExpiry.daysLeft) {
                nearestExpiry = { batch, daysLeft };
            }
        }

        return {
            usableAmount: roundInventoryAmount(total),
            hasInventory: true,
            nearestExpiry,
        };
    },

    /** Amount available for coverage checks. Always-available ingredients satisfy their required amount. */
    availableAmount(inv: IngredientInventory | undefined, ingredient: Ingredient | undefined, requiredAmount: number, config?: InventoryHealthConfig): number {
        if (InventoryHelper.isAlwaysAvailable(ingredient)) return roundInventoryAmount(requiredAmount);
        return InventoryHelper.totalUsableAmount(inv, ingredient, config);
    },

    isCovered(inv: IngredientInventory | undefined, ingredient: Ingredient | undefined, requiredAmount: number, config?: InventoryHealthConfig): boolean {
        if (InventoryHelper.isAlwaysAvailable(ingredient)) return true;
        return InventoryHelper.availableAmount(inv, ingredient, requiredAmount, config) >= roundInventoryAmount(requiredAmount);
    },

    isLowStock(amount: number, config?: InventoryHealthConfig): boolean {
        const threshold = normalizeInventoryHealthConfig(config ?? DEFAULT_INVENTORY_HEALTH_CONFIG).lowStockAmount;
        return amount > 0 && amount <= threshold;
    },

    isUrgentExpiry(daysLeft: number | null | undefined, config?: InventoryHealthConfig): boolean {
        if (daysLeft === null || daysLeft === undefined) return false;
        const threshold = normalizeInventoryHealthConfig(config ?? DEFAULT_INVENTORY_HEALTH_CONFIG).urgentExpiryDays;
        return daysLeft <= threshold;
    },

    /** Returns estimated expiry as a dayjs for a single batch, or null if missing data */
    estimatedExpiry(
        purchasedAt: string | undefined,
        shelfLife: IngredientShelfLife | undefined,
        preservationCondition?: IngredientPreservationCondition,
        config?: InventoryHealthConfig,
    ): dayjs.Dayjs | null {
        if (!purchasedAt || !shelfLife) return null;
        return dayjs(purchasedAt).add(getShelfLifeDays(shelfLife, preservationCondition, config), "day");
    },

    estimatedExpiryForBatch(batch: InventoryBatch, context: ExpiryContext, config?: InventoryHealthConfig): dayjs.Dayjs | null {
        const shelfLife = getShelfLife(context);
        const preservationCondition = getPreservationCondition(batch, context);
        return InventoryHelper.estimatedExpiry(batch.purchasedAt, shelfLife, preservationCondition, config);
    },

    batchExpiry(batch: InventoryBatch, context: ExpiryContext, config?: InventoryHealthConfig): dayjs.Dayjs | null {
        if (batch.expiresAt) return dayjs(batch.expiresAt);
        return InventoryHelper.estimatedExpiryForBatch(batch, context, config);
    },

    /** Days remaining until expiry for a single batch. Negative = already expired. */
    daysUntilExpiry(purchasedAt: string | undefined, shelfLife: IngredientShelfLife | undefined, config?: InventoryHealthConfig): number | null {
        const exp = InventoryHelper.estimatedExpiry(purchasedAt, shelfLife, undefined, config);
        if (!exp) return null;
        return exp.startOf("day").diff(dayjs().startOf("day"), "day");
    },

    daysUntilBatchExpiry(batch: InventoryBatch, context: ExpiryContext, config?: InventoryHealthConfig): number | null {
        const exp = InventoryHelper.batchExpiry(batch, context, config);
        if (!exp) return null;
        return exp.startOf("day").diff(dayjs().startOf("day"), "day");
    },

    isBatchExpired(batch: InventoryBatch, context: ExpiryContext, config?: InventoryHealthConfig): boolean {
        const days = InventoryHelper.daysUntilBatchExpiry(batch, context, config);
        return days !== null && days < 0;
    },

    sortBatchesForConsumption(inv: IngredientInventory | undefined, ingredient?: Ingredient, config?: InventoryHealthConfig): InventoryBatch[] {
        if (!inv?.batches) return [];
        return [...inv.batches]
            .filter(batch => batch.amount > 0 && !InventoryHelper.isBatchExpired(batch, ingredient, config))
            .sort((a, b) => {
                const aExpiry = InventoryHelper.batchExpiry(a, ingredient, config);
                const bExpiry = InventoryHelper.batchExpiry(b, ingredient, config);
                if (aExpiry && bExpiry && !aExpiry.isSame(bExpiry)) return aExpiry.valueOf() - bExpiry.valueOf();
                if (aExpiry && !bExpiry) return -1;
                if (!aExpiry && bExpiry) return 1;
                if (!a.purchasedAt && !b.purchasedAt) return 0;
                if (!a.purchasedAt) return -1;
                if (!b.purchasedAt) return 1;
                return a.purchasedAt < b.purchasedAt ? -1 : 1;
            });
    },

    /** Returns the batch with the fewest days left (most urgent), or null */
    nearestExpiryBatch(inv: IngredientInventory | undefined, context: ExpiryContext, config?: InventoryHealthConfig): {
        batch: InventoryBatch; daysLeft: number
    } | null {
        if (!inv?.batches) return null;
        let best: { batch: InventoryBatch; daysLeft: number } | null = null;
        const today = dayjs().startOf("day");
        for (const batch of inv.batches) {
            if (batch.amount <= 0) continue;
            const expiry = InventoryHelper.batchExpiry(batch, context, config);
            const daysLeft = expiry ? expiry.startOf("day").diff(today, "day") : null;
            if (daysLeft === null || daysLeft < 0) continue;
            if (best === null || daysLeft < best.daysLeft) {
                best = { batch, daysLeft };
            }
        }
        return best;
    },

    expiryBadge(days: number | null): { label: string; color: string } | null {
        if (days === null) return null;
        if (days < 0)   return { label: "Đã hết hạn",       color: "#ff4d4f" };
        if (days === 0) return { label: "Hết hạn hôm nay",  color: "#ff4d4f" };
        if (days === 1) return { label: "Còn 1 ngày",        color: "#ff4d4f" };
        if (days <= 3)  return { label: `Còn ${days} ngày`, color: "#fa8c16" };
        if (days <= 7)  return { label: `Còn ${days} ngày`, color: "#faad14" };
        return           { label: `Còn ${days} ngày`,        color: "#52c41a" };
    }
};
