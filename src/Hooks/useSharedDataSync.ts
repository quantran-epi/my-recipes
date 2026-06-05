/**
 * useSharedDataSync — checks for shared data updates on app open (throttled once/day).
 * Fetches shared-manifest.json, compares per-item version stamps stored locally,
 * and surfaces a list of pending changes the user can selectively sync.
 */
import { useEffect, useRef, useState } from "react";
import { SharedManifest } from "./useSharedPublish";

const MANIFEST_URL =
    "https://raw.githubusercontent.com/quantran-epi/my-recipes/refs/heads/main/docs/shared-manifest.json";
const LAST_CHECK_KEY = "shared_last_checked";
const SYNCED_VERSIONS_KEY = "shared_synced_versions";
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 1 day
const DEFERRED_SYNC_DELAY_MS = 1500;
const SYNC_INTERACTION_QUIET_MS = 800;

type IdleHandle = number;

const interactionEvents = ["pointerdown", "keydown", "input", "scroll", "visibilitychange"] as const;

const requestIdle = (callback: () => void): IdleHandle => {
    const requestIdleCallback = (window as any).requestIdleCallback;
    if (typeof requestIdleCallback === "function") {
        return requestIdleCallback(callback, { timeout: SYNC_INTERACTION_QUIET_MS });
    }
    return window.setTimeout(callback, 0);
};

const cancelIdle = (handle: IdleHandle | null) => {
    if (handle == null) return;
    const cancelIdleCallback = (window as any).cancelIdleCallback;
    if (typeof cancelIdleCallback === "function") {
        cancelIdleCallback(handle);
        return;
    }
    window.clearTimeout(handle);
};

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

export const saveSyncedVersions = (v: SyncedVersions) => {
    localStorage.setItem(SYNCED_VERSIONS_KEY, JSON.stringify(v));
};

const isCheckDue = (): boolean => {
    const last = localStorage.getItem(LAST_CHECK_KEY);
    if (!last) return true;
    return Date.now() - parseInt(last, 10) > CHECK_INTERVAL_MS;
};

export const useSharedDataSync = (): UseSharedDataSyncResult => {
    const [pendingSync, setPendingSync] = useState<PendingSync | null>(null);
    const isSyncCheckingRef = useRef(false);
    const lastInteractionAtRef = useRef(Date.now());

    useEffect(() => {
        if (!navigator.onLine) return;
        if (!isCheckDue()) return;

        let cancelled = false;
        let timerHandle: number | null = null;
        let idleHandle: IdleHandle | null = null;

        const recordInteraction = () => {
            lastInteractionAtRef.current = Date.now();
        };

        interactionEvents.forEach(eventName => {
            window.addEventListener(eventName, recordInteraction, { passive: true, capture: true });
        });

        const runManifestCheck = async () => {
            if (cancelled) return;
            isSyncCheckingRef.current = true;
            try {
                const res = await fetch(MANIFEST_URL + "?t=" + Date.now());
                if (!res.ok) return;
                const text = await res.text();
                if (!text || !text.trim()) return; // empty file — nothing to sync
                const manifest: SharedManifest = JSON.parse(text);
                if (!manifest || !manifest.ingredientsVersion) return;
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
                if (!cancelled) isSyncCheckingRef.current = false;
            }

        };

        const scheduleWhenQuiet = (delayMs: number) => {
            timerHandle = window.setTimeout(() => {
                timerHandle = null;
                if (cancelled) return;

                const quietForMs = Date.now() - lastInteractionAtRef.current;
                if (quietForMs < SYNC_INTERACTION_QUIET_MS) {
                    scheduleWhenQuiet(SYNC_INTERACTION_QUIET_MS - quietForMs);
                    return;
                }

                idleHandle = requestIdle(() => {
                    idleHandle = null;
                    void runManifestCheck();
                });
            }, delayMs);
        };

        scheduleWhenQuiet(DEFERRED_SYNC_DELAY_MS);

        return () => {
            cancelled = true;
            if (timerHandle !== null) window.clearTimeout(timerHandle);
            cancelIdle(idleHandle);
            interactionEvents.forEach(eventName => {
                window.removeEventListener(eventName, recordInteraction, { capture: true });
            });
        };
    }, []);

    const dismissSync = () => setPendingSync(null);

    const markSynced = (versions: SyncedVersions) => {
        const current = getSyncedVersions();
        saveSyncedVersions({
            ingredientsVersion: versions.ingredientsVersion || current.ingredientsVersion,
            dishesVersion: versions.dishesVersion || current.dishesVersion,
        });
        setPendingSync(null);
    };

    return { pendingSync, isSyncChecking: isSyncCheckingRef.current, dismissSync, markSynced };
};
