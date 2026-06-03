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
    return Math.round(value);
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
        if (!inv) return 0;
        if (!inv.batches) {
            const legacyAmount = (inv as any).amount ?? 0;
            const legacyUnit = inv.unit ?? IngredientUnitHelper.getBaseUnit(ingredient);
            return roundInventoryAmount(IngredientUnitHelper.toBaseAmount(ingredient, legacyAmount, legacyUnit, IngredientUnitHelper.getBaseUnit(ingredient, [legacyUnit])) ?? legacyAmount);
        }

        const baseUnit = IngredientUnitHelper.getBaseUnit(ingredient, [inv.unit].filter(Boolean) as any);
        const total = inv.batches.reduce((sum, batch) => {
            if (InventoryHelper.isBatchExpired(batch, ingredient)) return sum;
            const unit = IngredientUnitHelper.getBatchUnit(inv, batch, ingredient);
            const converted = IngredientUnitHelper.toBaseAmount(ingredient, batch.amount, unit, baseUnit);
            return sum + (converted ?? batch.amount);
        }, 0);
        return roundInventoryAmount(total);
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
        if (!inv) return null;
        if (!inv.batches) return null; // old persisted data guard
        let best: { batch: InventoryBatch; daysLeft: number } | null = null;
        for (const batch of inv.batches) {
            if (batch.amount <= 0) continue;
            const days = InventoryHelper.daysUntilBatchExpiry(batch, context);
            if (days === null || days < 0) continue;
            if (best === null || days < best.daysLeft) {
                best = { batch, daysLeft: days };
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
