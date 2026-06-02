import { Ingredient, IngredientInventory, IngredientShelfLife, InventoryBatch } from "@store/Models/Ingredient";
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

export const InventoryHelper = {
    isAlwaysAvailable(ingredient?: Ingredient): boolean {
        return ingredient?.alwaysAvailable === true;
    },

    /** Total amount across all batches */
    totalAmount(inv: IngredientInventory | undefined, ingredient?: Ingredient): number {
        return IngredientUnitHelper.totalInventoryAmount(inv, ingredient);
    },

    /** Total amount from batches that are not expired. Batches without expiry data are treated as usable. */
    totalUsableAmount(inv: IngredientInventory | undefined, ingredient?: Ingredient): number {
        if (!inv) return 0;
        if (!inv.batches) {
            const legacyAmount = (inv as any).amount ?? 0;
            const legacyUnit = inv.unit ?? IngredientUnitHelper.getBaseUnit(ingredient);
            return IngredientUnitHelper.toBaseAmount(ingredient, legacyAmount, legacyUnit, IngredientUnitHelper.getBaseUnit(ingredient, [legacyUnit])) ?? legacyAmount;
        }

        const baseUnit = IngredientUnitHelper.getBaseUnit(ingredient, [inv.unit].filter(Boolean) as any);
        return inv.batches.reduce((sum, batch) => {
            if (InventoryHelper.isBatchExpired(batch, ingredient?.shelfLife)) return sum;
            const unit = IngredientUnitHelper.getBatchUnit(inv, batch, ingredient);
            const converted = IngredientUnitHelper.toBaseAmount(ingredient, batch.amount, unit, baseUnit);
            return sum + (converted ?? batch.amount);
        }, 0);
    },

    /** Amount available for coverage checks. Always-available ingredients satisfy their required amount. */
    availableAmount(inv: IngredientInventory | undefined, ingredient: Ingredient | undefined, requiredAmount: number): number {
        if (InventoryHelper.isAlwaysAvailable(ingredient)) return requiredAmount;
        return InventoryHelper.totalUsableAmount(inv, ingredient);
    },

    isCovered(inv: IngredientInventory | undefined, ingredient: Ingredient | undefined, requiredAmount: number): boolean {
        if (InventoryHelper.isAlwaysAvailable(ingredient)) return true;
        return InventoryHelper.availableAmount(inv, ingredient, requiredAmount) >= requiredAmount;
    },

    /** Returns estimated expiry as a dayjs for a single batch, or null if missing data */
    estimatedExpiry(purchasedAt: string | undefined, shelfLife: IngredientShelfLife | undefined): dayjs.Dayjs | null {
        if (!purchasedAt || !shelfLife) return null;
        return dayjs(purchasedAt).add(SHELF_LIFE_DAYS[shelfLife], "day");
    },

    batchExpiry(batch: InventoryBatch, shelfLife: IngredientShelfLife | undefined): dayjs.Dayjs | null {
        if (batch.expiresAt) return dayjs(batch.expiresAt);
        return InventoryHelper.estimatedExpiry(batch.purchasedAt, shelfLife);
    },

    /** Days remaining until expiry for a single batch. Negative = already expired. */
    daysUntilExpiry(purchasedAt: string | undefined, shelfLife: IngredientShelfLife | undefined): number | null {
        const exp = InventoryHelper.estimatedExpiry(purchasedAt, shelfLife);
        if (!exp) return null;
        return exp.startOf("day").diff(dayjs().startOf("day"), "day");
    },

    daysUntilBatchExpiry(batch: InventoryBatch, shelfLife: IngredientShelfLife | undefined): number | null {
        const exp = InventoryHelper.batchExpiry(batch, shelfLife);
        if (!exp) return null;
        return exp.startOf("day").diff(dayjs().startOf("day"), "day");
    },

    isBatchExpired(batch: InventoryBatch, shelfLife: IngredientShelfLife | undefined): boolean {
        const days = InventoryHelper.daysUntilBatchExpiry(batch, shelfLife);
        return days !== null && days < 0;
    },

    sortBatchesForConsumption(inv: IngredientInventory | undefined, ingredient?: Ingredient): InventoryBatch[] {
        if (!inv?.batches) return [];
        return [...inv.batches]
            .filter(batch => batch.amount > 0 && !InventoryHelper.isBatchExpired(batch, ingredient?.shelfLife))
            .sort((a, b) => {
                const aExpiry = InventoryHelper.batchExpiry(a, ingredient?.shelfLife);
                const bExpiry = InventoryHelper.batchExpiry(b, ingredient?.shelfLife);
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
    nearestExpiryBatch(inv: IngredientInventory | undefined, shelfLife: IngredientShelfLife | undefined): {
        batch: InventoryBatch; daysLeft: number
    } | null {
        if (!inv) return null;
        if (!inv.batches) return null; // old persisted data guard
        let best: { batch: InventoryBatch; daysLeft: number } | null = null;
        for (const batch of inv.batches) {
            if (batch.amount <= 0) continue;
            const days = InventoryHelper.daysUntilBatchExpiry(batch, shelfLife);
            if (days === null) continue;
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
