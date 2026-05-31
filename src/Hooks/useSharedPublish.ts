/**
 * useSharedPublish — admin-only hook.
 * Publishes shared data (ingredients + dishes) to GitHub as:
 *   docs/shared-data.json    — full snapshot used for syncing
 *   docs/shared-manifest.json — lightweight manifest with version stamps + per-item change list
 */
import { message } from "antd";
import { useState } from "react";
import { useSelector } from "react-redux";
import { selectDishes, selectIngredients } from "@store/Selectors";
import { Ingredient } from "@store/Models/Ingredient";
import { Dishes } from "@store/Models/Dishes";
import { saveSyncedVersions } from "./useSharedDataSync";

const REPO_OWNER = "quantran-epi";
const REPO_NAME = "my-recipes";
const SHARED_DATA_PATH = "docs/shared-data.json";
const SHARED_MANIFEST_PATH = "docs/shared-manifest.json";

const _dt = (encoded: string): string => {
    const k = "myrecipes";
    const raw = atob(encoded);
    let out = "";
    for (let i = 0; i < raw.length; i++)
        out += String.fromCharCode(raw.charCodeAt(i) ^ k.charCodeAt(i % k.length));
    return out;
};

const GITHUB_TOKEN = _dt(process.env.REACT_APP_GH_TOKEN || "");

// ── Types ────────────────────────────────────────────────────────────────────

export type SharedChangeAction = "added" | "modified" | "removed";

export interface SharedItemChange {
    id: string;
    name: string;
    action: SharedChangeAction;
}

export interface SharedManifest {
    ingredientsVersion: string;
    dishesVersion: string;
    ingredientChanges: SharedItemChange[];
    dishChanges: SharedItemChange[];
}

export interface SharedData {
    ingredients: Ingredient[];
    dishes: Dishes[];
}

// ── GitHub helpers ────────────────────────────────────────────────────────────

const getFileSha = async (path: string, token: string): Promise<{ sha: string; content: string } | null> => {
    const res = await fetch(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`,
        { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" } }
    );
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Failed to read ${path}: ${res.status} ${res.statusText}`);
    const json = await res.json();
    const decoded = decodeURIComponent(escape(atob(json.content.replace(/\n/g, ""))));
    return { sha: json.sha, content: decoded };
};

const pushFile = async (path: string, token: string, sha: string | null, content: string, commitMessage: string): Promise<void> => {
    const encoded = btoa(unescape(encodeURIComponent(content)));
    const body: Record<string, unknown> = { message: commitMessage, content: encoded };
    if (sha) body.sha = sha;

    const res = await fetch(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`,
        {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/vnd.github+json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        }
    );
    if (!res.ok) throw new Error(`Failed to push ${path}: ${res.status} ${res.statusText}`);
};

// ── Diff helpers ──────────────────────────────────────────────────────────────

const diffItems = <T extends { id: string; name: string }>(
    prev: T[],
    next: T[]
): SharedItemChange[] => {
    const changes: SharedItemChange[] = [];
    const prevMap = new Map(prev.map(i => [i.id, i]));
    const nextMap = new Map(next.map(i => [i.id, i]));

    next.forEach(item => {
        if (!prevMap.has(item.id)) {
            changes.push({ id: item.id, name: item.name, action: "added" });
        } else if (JSON.stringify(prevMap.get(item.id)) !== JSON.stringify(item)) {
            changes.push({ id: item.id, name: item.name, action: "modified" });
        }
    });
    prev.forEach(item => {
        if (!nextMap.has(item.id)) {
            changes.push({ id: item.id, name: item.name, action: "removed" });
        }
    });
    return changes;
};

const LAST_PUBLISH_KEY = "shared_last_publish_at";

// ── Hook ──────────────────────────────────────────────────────────────────────

export interface UseSharedPublishResult {
    publishSharedData: () => Promise<void>;
    isPublishing: boolean;
    lastPublishAt: string | null;
}

export const useSharedPublish = (): UseSharedPublishResult => {
    const [isPublishing, setIsPublishing] = useState(false);
    const [lastPublishAt, setLastPublishAt] = useState<string | null>(
        () => localStorage.getItem(LAST_PUBLISH_KEY)
    );
    const ingredients = useSelector(selectIngredients);
    const dishes = useSelector(selectDishes);

    const publishSharedData = async (): Promise<void> => {
        if (!navigator.onLine) {
            message.warning({ content: "Không có mạng — Không thể xuất bản", duration: 3 });
            return;
        }
        if (!GITHUB_TOKEN) {
            message.error("GitHub token chưa được cấu hình");
            return;
        }

        setIsPublishing(true);
        const key = "publish-message";
        message.loading({ content: "Đang xuất bản dữ liệu dùng chung...", key, duration: 0 });

        try {
            // 1. Fetch existing shared data to compute diffs
            const [existingDataFile, existingManifestFile] = await Promise.all([
                getFileSha(SHARED_DATA_PATH, GITHUB_TOKEN),
                getFileSha(SHARED_MANIFEST_PATH, GITHUB_TOKEN),
            ]);

            const prevData: SharedData = existingDataFile
                ? JSON.parse(existingDataFile.content)
                : { ingredients: [], dishes: [] };

            const prevManifest: SharedManifest = existingManifestFile
                ? JSON.parse(existingManifestFile.content)
                : { ingredientsVersion: "", dishesVersion: "", ingredientChanges: [], dishChanges: [] };

            // 2. Compute diffs
            const ingredientChanges = diffItems(prevData.ingredients, ingredients);
            const dishChanges = diffItems(prevData.dishes, dishes);

            const now = new Date().toISOString();
            const newIngredientsVersion = ingredientChanges.length > 0 ? now : prevManifest.ingredientsVersion || now;
            const newDishesVersion = dishChanges.length > 0 ? now : prevManifest.dishesVersion || now;

            // 3. Build payloads
            const newData: SharedData = { ingredients, dishes };
            const newManifest: SharedManifest = {
                ingredientsVersion: newIngredientsVersion,
                dishesVersion: newDishesVersion,
                ingredientChanges,
                dishChanges,
            };

            // 4. Push both files
            const commitMsg = `Publish shared data ${now}`;
            await pushFile(
                SHARED_DATA_PATH,
                GITHUB_TOKEN,
                existingDataFile?.sha ?? null,
                JSON.stringify(newData, null, 2),
                commitMsg
            );
            await pushFile(
                SHARED_MANIFEST_PATH,
                GITHUB_TOKEN,
                existingManifestFile?.sha ?? null,
                JSON.stringify(newManifest, null, 2),
                commitMsg
            );

            const totalChanges = ingredientChanges.length + dishChanges.length;

            // Mark admin's local versions as synced so the sync modal doesn't appear on reload
            saveSyncedVersions({
                ingredientsVersion: newIngredientsVersion,
                dishesVersion: newDishesVersion,
            });

            const publishedAt = now;
            localStorage.setItem(LAST_PUBLISH_KEY, publishedAt);
            setLastPublishAt(publishedAt);

            message.success({
                content: totalChanges === 0
                    ? "Xuất bản thành công (không có thay đổi mới)"
                    : `Xuất bản thành công — ${totalChanges} thay đổi`,
                key,
                duration: 4,
            });
        } catch (err: any) {
            message.error({ content: "Xuất bản thất bại: " + err?.message, key, duration: 5 });
        } finally {
            setIsPublishing(false);
        }
    };

    return { publishSharedData, isPublishing, lastPublishAt };
};
