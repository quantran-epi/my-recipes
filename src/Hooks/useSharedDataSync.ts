/**
 * useSharedDataSync — checks for shared data updates on app open (throttled once/day).
 * Fetches shared-manifest.json, compares per-item version stamps stored locally,
 * and surfaces a list of pending changes the user can selectively sync.
 */
import { useEffect, useState } from "react";
import { SharedItemChange, SharedManifest } from "./useSharedPublish";

const MANIFEST_URL =
    "https://raw.githubusercontent.com/quantran-epi/my-recipes/refs/heads/main/docs/shared-manifest.json";
const LAST_CHECK_KEY = "shared_last_checked";
const SYNCED_VERSIONS_KEY = "shared_synced_versions";
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 1 day

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

const saveSyncedVersions = (v: SyncedVersions) => {
    localStorage.setItem(SYNCED_VERSIONS_KEY, JSON.stringify(v));
};

const isCheckDue = (): boolean => {
    const last = localStorage.getItem(LAST_CHECK_KEY);
    if (!last) return true;
    return Date.now() - parseInt(last, 10) > CHECK_INTERVAL_MS;
};

export const useSharedDataSync = (): UseSharedDataSyncResult => {
    const [pendingSync, setPendingSync] = useState<PendingSync | null>(null);
    const [isSyncChecking, setIsSyncChecking] = useState(false);

    useEffect(() => {
        if (!navigator.onLine) return;
        if (!isCheckDue()) return;

        let cancelled = false;
        setIsSyncChecking(true);

        (async () => {
            try {
                const res = await fetch(MANIFEST_URL + "?t=" + Date.now());
                if (!res.ok) return;
                const manifest: SharedManifest = await res.json();
                localStorage.setItem(LAST_CHECK_KEY, Date.now().toString());

                if (cancelled) return;

                const synced = getSyncedVersions();

                const hasIngredientChanges =
                    !!manifest.ingredientsVersion &&
                    manifest.ingredientsVersion !== synced.ingredientsVersion &&
                    manifest.ingredientChanges.length > 0;

                const hasDishChanges =
                    !!manifest.dishesVersion &&
                    manifest.dishesVersion !== synced.dishesVersion &&
                    manifest.dishChanges.length > 0;

                if (hasIngredientChanges || hasDishChanges) {
                    setPendingSync({ manifest, hasIngredientChanges, hasDishChanges });
                }
            } catch {
                // silently ignore network errors
            } finally {
                if (!cancelled) setIsSyncChecking(false);
            }
        })();

        return () => { cancelled = true; };
    }, []);

    const dismissSync = () => setPendingSync(null);

    const markSynced = (versions: SyncedVersions) => {
        saveSyncedVersions(versions);
        setPendingSync(null);
    };

    return { pendingSync, isSyncChecking, dismissSync, markSynced };
};
