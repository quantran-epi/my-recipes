/**
 * useSharedDataSync — manual shared data update checks.
 * Fetches shared-manifest.json only when the user asks to sync, compares
 * per-item version stamps stored locally, and surfaces pending changes.
 */
import { useState } from "react";
import { SharedManifest } from "./useSharedPublish";

const MANIFEST_URL =
    "https://raw.githubusercontent.com/quantran-epi/my-recipes/refs/heads/main/docs/shared-manifest.json";
const LAST_CHECK_KEY = "shared_last_checked";
const SYNCED_VERSIONS_KEY = "shared_synced_versions";

export interface SyncedVersions {
    ingredientsVersion: string;
    dishesVersion: string;
}

export interface PendingSync {
    manifest: SharedManifest;
    hasIngredientChanges: boolean;
    hasDishChanges: boolean;
}

export interface UseSharedDataSyncResult {
    pendingSync: PendingSync | null;
    isSyncChecking: boolean;
    checkNow: () => Promise<PendingSync | null>;
    dismissSync: () => void;
    markSynced: (versions: SyncedVersions) => void;
}

export const getSyncedVersions = (): SyncedVersions => {
    try {
        const raw = localStorage.getItem(SYNCED_VERSIONS_KEY);
        if (raw) return JSON.parse(raw);
    } catch { }
    return { ingredientsVersion: "", dishesVersion: "" };
};

export const saveSyncedVersions = (v: SyncedVersions) => {
    localStorage.setItem(SYNCED_VERSIONS_KEY, JSON.stringify(v));
};

export const checkSharedDataUpdates = async (): Promise<PendingSync | null> => {
    if (!navigator.onLine) {
        throw new Error("Không có mạng");
    }

    const res = await fetch(MANIFEST_URL + "?t=" + Date.now());
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const text = await res.text();
    if (!text || !text.trim()) throw new Error("Manifest dữ liệu chia sẻ trống");

    const manifest: SharedManifest = JSON.parse(text);
    if (!manifest || (!manifest.ingredientsVersion && !manifest.dishesVersion)) {
        throw new Error("Manifest dữ liệu chia sẻ không hợp lệ");
    }

    localStorage.setItem(LAST_CHECK_KEY, Date.now().toString());

    const synced = getSyncedVersions();
    const ingredientChanges = manifest.ingredientChanges ?? [];
    const dishChanges = manifest.dishChanges ?? [];

    const hasIngredientChanges =
        !!manifest.ingredientsVersion &&
        manifest.ingredientsVersion !== synced.ingredientsVersion &&
        ingredientChanges.length > 0;

    const hasDishChanges =
        !!manifest.dishesVersion &&
        manifest.dishesVersion !== synced.dishesVersion &&
        dishChanges.length > 0;

    if (!hasIngredientChanges && !hasDishChanges) return null;

    return {
        manifest: {
            ...manifest,
            ingredientChanges,
            dishChanges,
        },
        hasIngredientChanges,
        hasDishChanges,
    };
};

export const useSharedDataSync = (): UseSharedDataSyncResult => {
    const [pendingSync, setPendingSync] = useState<PendingSync | null>(null);
    const [isSyncChecking, setIsSyncChecking] = useState(false);

    const checkNow = async () => {
        setIsSyncChecking(true);
        try {
            const nextPendingSync = await checkSharedDataUpdates();
            setPendingSync(nextPendingSync);
            return nextPendingSync;
        } finally {
            setIsSyncChecking(false);
        }
    };

    const dismissSync = () => setPendingSync(null);

    const markSynced = (versions: SyncedVersions) => {
        const current = getSyncedVersions();
        saveSyncedVersions({
            ingredientsVersion: versions.ingredientsVersion || current.ingredientsVersion,
            dishesVersion: versions.dishesVersion || current.dishesVersion,
        });
        setPendingSync(null);
    };

    return { pendingSync, isSyncChecking, checkNow, dismissSync, markSynced };
};
