import { IngredientInventory, IngredientShelfLife, InventoryBatch } from "@store/Models/Ingredient";
import dayjs from "dayjs";

// How many days each shelf-life tier lasts
const SHELF_LIFE_DAYS: Record<IngredientShelfLife, number> = {
    very_short: 2,
    short: 5,
    medium: 10,
    long: 21,
    very_long: 90,
};

export const InventoryHelper = {
    /** Total amount across all batches */
    totalAmount(inv: IngredientInventory | undefined): number {
        if (!inv) return 0;
        // Guard against old persisted data that still has flat `amount` field
        if (!inv.batches) return (inv as any).amount ?? 0;
        return inv.batches.reduce((sum, b) => sum + b.amount, 0);
    },

    /** Returns estimated expiry as a dayjs for a single batch, or null if missing data */
    estimatedExpiry(purchasedAt: string | undefined, shelfLife: IngredientShelfLife | undefined): dayjs.Dayjs | null {
        if (!purchasedAt || !shelfLife) return null;
        return dayjs(purchasedAt).add(SHELF_LIFE_DAYS[shelfLife], "day");
    },

    /** Days remaining until expiry for a single batch. Negative = already expired. */
    daysUntilExpiry(purchasedAt: string | undefined, shelfLife: IngredientShelfLife | undefined): number | null {
        const exp = InventoryHelper.estimatedExpiry(purchasedAt, shelfLife);
        if (!exp) return null;
        return exp.diff(dayjs().startOf("day"), "day");
    },

    /** Returns the batch with the fewest days left (most urgent), or null */
    nearestExpiryBatch(inv: IngredientInventory | undefined, shelfLife: IngredientShelfLife | undefined): {
        batch: InventoryBatch; daysLeft: number
    } | null {
        if (!inv || !shelfLife) return null;
        if (!inv.batches) return null; // old persisted data guard
        let best: { batch: InventoryBatch; daysLeft: number } | null = null;
        for (const batch of inv.batches) {
            if (batch.amount <= 0) continue;
            const days = InventoryHelper.daysUntilExpiry(batch.purchasedAt, shelfLife);
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
