import { Ingredient, IngredientInventory, IngredientPreservationCondition, IngredientShelfLife, InventoryBatch } from "@store/Models/Ingredient";
import dayjs from "dayjs";
import { IngredientUnitHelper } from "./IngredientUnitHelper";

// How many days each shelf-life tier lasts
const SHELF_LIFE_DAYS: Record<IngredientShelfLife, number> = {
    very_short: 2,
    short: 5,
    medium: 10,
    long: 21,
    very_long: 90,
};

const PRESERVATION_SHELF_LIFE_DAYS: Record<IngredientShelfLife, Record<IngredientPreservationCondition, number>> = {
    very_short: { room_temperature: 1, cool_dry: 1, fridge: 2, freezer: 14 },
    short: { room_temperature: 2, cool_dry: 3, fridge: 5, freezer: 30 },
    medium: { room_temperature: 5, cool_dry: 7, fridge: 10, freezer: 60 },
    long: { room_temperature: 14, cool_dry: 21, fridge: 21, freezer: 90 },
    very_long: { room_temperature: 60, cool_dry: 90, fridge: 90, freezer: 180 },
};

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
): number => {
    if (!preservationCondition) return SHELF_LIFE_DAYS[shelfLife];
    return PRESERVATION_SHELF_LIFE_DAYS[shelfLife]?.[preservationCondition] ?? SHELF_LIFE_DAYS[shelfLife];
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
    totalUsableAmount(inv: IngredientInventory | undefined, ingredient?: Ingredient): number {
        return InventoryHelper.inventorySnapshot(inv, ingredient).usableAmount;
    },

    /** Single-pass stock snapshot for list/detail screens that need usable amount and nearest expiry together. */
    inventorySnapshot(inv: IngredientInventory | undefined, ingredient?: Ingredient): InventorySnapshot {
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
            const expiry = InventoryHelper.batchExpiry(batch, ingredient);
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
    availableAmount(inv: IngredientInventory | undefined, ingredient: Ingredient | undefined, requiredAmount: number): number {
        if (InventoryHelper.isAlwaysAvailable(ingredient)) return roundInventoryAmount(requiredAmount);
        return InventoryHelper.totalUsableAmount(inv, ingredient);
    },

    isCovered(inv: IngredientInventory | undefined, ingredient: Ingredient | undefined, requiredAmount: number): boolean {
        if (InventoryHelper.isAlwaysAvailable(ingredient)) return true;
        return InventoryHelper.availableAmount(inv, ingredient, requiredAmount) >= roundInventoryAmount(requiredAmount);
    },

    /** Returns estimated expiry as a dayjs for a single batch, or null if missing data */
    estimatedExpiry(
        purchasedAt: string | undefined,
        shelfLife: IngredientShelfLife | undefined,
        preservationCondition?: IngredientPreservationCondition,
    ): dayjs.Dayjs | null {
        if (!purchasedAt || !shelfLife) return null;
        return dayjs(purchasedAt).add(getShelfLifeDays(shelfLife, preservationCondition), "day");
    },

    estimatedExpiryForBatch(batch: InventoryBatch, context: ExpiryContext): dayjs.Dayjs | null {
        const shelfLife = getShelfLife(context);
        const preservationCondition = getPreservationCondition(batch, context);
        return InventoryHelper.estimatedExpiry(batch.purchasedAt, shelfLife, preservationCondition);
    },

    batchExpiry(batch: InventoryBatch, context: ExpiryContext): dayjs.Dayjs | null {
        if (batch.expiresAt) return dayjs(batch.expiresAt);
        return InventoryHelper.estimatedExpiryForBatch(batch, context);
    },

    /** Days remaining until expiry for a single batch. Negative = already expired. */
    daysUntilExpiry(purchasedAt: string | undefined, shelfLife: IngredientShelfLife | undefined): number | null {
        const exp = InventoryHelper.estimatedExpiry(purchasedAt, shelfLife);
        if (!exp) return null;
        return exp.startOf("day").diff(dayjs().startOf("day"), "day");
    },

    daysUntilBatchExpiry(batch: InventoryBatch, context: ExpiryContext): number | null {
        const exp = InventoryHelper.batchExpiry(batch, context);
        if (!exp) return null;
        return exp.startOf("day").diff(dayjs().startOf("day"), "day");
    },

    isBatchExpired(batch: InventoryBatch, context: ExpiryContext): boolean {
        const days = InventoryHelper.daysUntilBatchExpiry(batch, context);
        return days !== null && days < 0;
    },

    sortBatchesForConsumption(inv: IngredientInventory | undefined, ingredient?: Ingredient): InventoryBatch[] {
        if (!inv?.batches) return [];
        return [...inv.batches]
            .filter(batch => batch.amount > 0 && !InventoryHelper.isBatchExpired(batch, ingredient))
            .sort((a, b) => {
                const aExpiry = InventoryHelper.batchExpiry(a, ingredient);
                const bExpiry = InventoryHelper.batchExpiry(b, ingredient);
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
    nearestExpiryBatch(inv: IngredientInventory | undefined, context: ExpiryContext): {
        batch: InventoryBatch; daysLeft: number
    } | null {
        if (!inv?.batches) return null;
        let best: { batch: InventoryBatch; daysLeft: number } | null = null;
        const today = dayjs().startOf("day");
        for (const batch of inv.batches) {
            if (batch.amount <= 0) continue;
            const expiry = InventoryHelper.batchExpiry(batch, context);
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
