/**
 * useSharedDataSync — manual shared data update checks.
 * Fetches the split shared manifest only when the user asks to sync, compares
 * per-part version stamps stored locally, and surfaces pending changes.
 */
import { useState } from "react";
import { getStorageJson, getStorageString, setStorageJson, setStorageString } from "@common/Storage/AppStorage";
import { normalizeSharedManifest, SHARED_MANIFEST_URL, SharedManifest } from "./useSharedPublish";

const LAST_CHECK_KEY = "shared_last_checked";
const SYNCED_VERSIONS_KEY = "shared_synced_versions";

export type SharedSyncHealth = {
    lastCheckedAt: string | null;
    syncedVersions: SyncedVersions;
}

export interface SyncedVersions {
    ingredientsVersion: string;
    dishesVersion: string;
}

export interface PendingSync {
    manifest: SharedManifest;
    hasIngredientChanges: boolean;
    hasDishChanges: boolean;
    force?: boolean;
}

export type CheckSharedDataUpdatesOptions = {
    force?: boolean;
}

export interface UseSharedDataSyncResult {
    pendingSync: PendingSync | null;
    isSyncChecking: boolean;
    checkNow: (options?: CheckSharedDataUpdatesOptions) => Promise<PendingSync | null>;
    dismissSync: () => void;
    markSynced: (versions: SyncedVersions) => Promise<void>;
}

export const getSyncedVersions = (): Promise<SyncedVersions> => {
    return getStorageJson<SyncedVersions>(SYNCED_VERSIONS_KEY, { ingredientsVersion: "", dishesVersion: "" });
};

export const saveSyncedVersions = (v: SyncedVersions): Promise<void> => {
    return setStorageJson(SYNCED_VERSIONS_KEY, v);
};

export const getSharedSyncHealth = async (): Promise<SharedSyncHealth> => {
    const [lastCheckedRaw, syncedVersions] = await Promise.all([
        getStorageString(LAST_CHECK_KEY),
        getSyncedVersions(),
    ]);
    const lastCheckedMs = lastCheckedRaw ? Number(lastCheckedRaw) : NaN;
    return {
        lastCheckedAt: Number.isFinite(lastCheckedMs) ? new Date(lastCheckedMs).toISOString() : null,
        syncedVersions,
    };
};

export const checkSharedDataUpdates = async (options?: CheckSharedDataUpdatesOptions): Promise<PendingSync | null> => {
    if (!navigator.onLine) {
        throw new Error("Không có mạng");
    }

    const res = await fetch(SHARED_MANIFEST_URL + "?t=" + Date.now());
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const text = await res.text();
    if (!text || !text.trim()) throw new Error("Manifest dữ liệu chia sẻ trống");

    const manifest = normalizeSharedManifest(JSON.parse(text));
    if (!manifest.parts.ingredients.version && !manifest.parts.dishes.version) {
        throw new Error("Manifest dữ liệu chia sẻ không hợp lệ");
    }

    await setStorageString(LAST_CHECK_KEY, Date.now().toString());

    const synced = await getSyncedVersions();
    const ingredientChanges = manifest.ingredientChanges ?? manifest.parts.ingredients.changes ?? [];
    const dishChanges = manifest.dishChanges ?? manifest.parts.dishes.changes ?? [];

    const hasIngredientChanges = Boolean(
        !!manifest.ingredientsVersion &&
        manifest.ingredientsVersion !== synced.ingredientsVersion &&
        (ingredientChanges.length > 0 || options?.force)
    );

    const hasDishChanges = Boolean(
        !!manifest.dishesVersion &&
        manifest.dishesVersion !== synced.dishesVersion &&
        (dishChanges.length > 0 || options?.force)
    );

    if (!hasIngredientChanges && !hasDishChanges && !options?.force) return null;

    return {
        manifest: {
            ...manifest,
            ingredientChanges,
            dishChanges,
        },
        hasIngredientChanges,
        hasDishChanges,
        force: options?.force,
    };
};

export const useSharedDataSync = (): UseSharedDataSyncResult => {
    const [pendingSync, setPendingSync] = useState<PendingSync | null>(null);
    const [isSyncChecking, setIsSyncChecking] = useState(false);

    const checkNow = async (options?: CheckSharedDataUpdatesOptions) => {
        setIsSyncChecking(true);
        try {
            const nextPendingSync = await checkSharedDataUpdates(options);
            setPendingSync(nextPendingSync);
            return nextPendingSync;
        } finally {
            setIsSyncChecking(false);
        }
    };

    const dismissSync = () => setPendingSync(null);

    const markSynced = async (versions: SyncedVersions) => {
        const current = await getSyncedVersions();
        await saveSyncedVersions({
            ingredientsVersion: versions.ingredientsVersion || current.ingredientsVersion,
            dishesVersion: versions.dishesVersion || current.dishesVersion,
        });
        setPendingSync(null);
    };

    return { pendingSync, isSyncChecking, checkNow, dismissSync, markSynced };
};
