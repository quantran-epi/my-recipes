/**
 * useSharedPublish — admin-only hook.
 * Publishes shared data as split GitHub files:
 *   docs/sync/shared/manifest.json
 *   docs/sync/shared/ingredients.json
 *   docs/sync/shared/dishes.json
 *   docs/sync/shared/config.json
 */
import { message } from "antd";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { countCollection, hashString, stableJson } from "@common/Helpers/SyncDataHelper";
import { getStorageString, removeStorageItem, setStorageString } from "@common/Storage/AppStorage";
import { selectDishes, selectIngredients, selectSharedConfig } from "@store/Selectors";
import { Ingredient } from "@store/Models/Ingredient";
import { Dishes } from "@store/Models/Dishes";
import { normalizeSharedConfig, SharedConfig } from "@store/Models/SharedConfig";
import { saveSyncedVersions } from "./useSharedDataSync";

const REPO_OWNER = "quantran-epi";
const REPO_NAME = "my-recipes";
export const SHARED_SYNC_SCHEMA_VERSION = 2;
export const SHARED_MANIFEST_PATH = "docs/sync/shared/manifest.json";
export const SHARED_PART_PATHS = {
    ingredients: "docs/sync/shared/ingredients.json",
    dishes: "docs/sync/shared/dishes.json",
    config: "docs/sync/shared/config.json",
} as const;
export const SHARED_SYNC_RAW_BASE_URL =
    "https://raw.githubusercontent.com/quantran-epi/my-recipes/refs/heads/main/docs/sync/shared";
export const SHARED_MANIFEST_URL = `${SHARED_SYNC_RAW_BASE_URL}/manifest.json`;
const PUBLISH_TOKEN_KEY = "shared_publish_github_token";
const LAST_PUBLISH_KEY = "shared_last_publish_at";

const _dt = (encoded: string): string => {
    const k = "myrecipes";
    const raw = atob(encoded);
    let out = "";
    for (let i = 0; i < raw.length; i++)
        out += String.fromCharCode(raw.charCodeAt(i) ^ k.charCodeAt(i % k.length));
    return out;
};

const BUILD_GITHUB_TOKEN = _dt(process.env.REACT_APP_GH_TOKEN || "");

export type SharedChangeAction = "added" | "modified" | "removed" | "sync";
export type SharedPartKey = keyof typeof SHARED_PART_PATHS;

export interface SharedItemChange {
    id: string;
    name: string;
    action: SharedChangeAction;
}

export interface SharedManifestPart {
    key: SharedPartKey;
    path: string;
    version: string;
    hash: string;
    count: number;
    updatedAt: string;
    changes: SharedItemChange[];
}

export interface SharedManifest {
    schemaVersion: number;
    updatedAt: string;
    parts: Record<SharedPartKey, SharedManifestPart>;
    ingredientsVersion: string;
    dishesVersion: string;
    configVersion: string;
    ingredientChanges: SharedItemChange[];
    dishChanges: SharedItemChange[];
    configChanges: SharedItemChange[];
}

export interface SharedData {
    ingredients: Ingredient[];
    dishes: Dishes[];
    config: SharedConfig;
}

const getSharedPartUrl = (part: SharedPartKey) => `${SHARED_SYNC_RAW_BASE_URL}/${part}.json`;

export const getSharedIngredientsUrl = () => getSharedPartUrl("ingredients");
export const getSharedDishesUrl = () => getSharedPartUrl("dishes");
export const getSharedConfigUrl = () => getSharedPartUrl("config");

const emptyManifest = (): SharedManifest => ({
    schemaVersion: SHARED_SYNC_SCHEMA_VERSION,
    updatedAt: "",
    parts: {
        ingredients: {
            key: "ingredients",
            path: SHARED_PART_PATHS.ingredients,
            version: "",
            hash: "",
            count: 0,
            updatedAt: "",
            changes: [],
        },
        dishes: {
            key: "dishes",
            path: SHARED_PART_PATHS.dishes,
            version: "",
            hash: "",
            count: 0,
            updatedAt: "",
            changes: [],
        },
        config: {
            key: "config",
            path: SHARED_PART_PATHS.config,
            version: "",
            hash: "",
            count: 0,
            updatedAt: "",
            changes: [],
        },
    },
    ingredientsVersion: "",
    dishesVersion: "",
    configVersion: "",
    ingredientChanges: [],
    dishChanges: [],
    configChanges: [],
});

export const normalizeSharedManifest = (manifest: Partial<SharedManifest> | null | undefined): SharedManifest => {
    const base = emptyManifest();
    return {
        ...base,
        ...manifest,
        schemaVersion: manifest?.schemaVersion ?? SHARED_SYNC_SCHEMA_VERSION,
        updatedAt: manifest?.updatedAt ?? "",
        parts: {
            ingredients: {
                ...base.parts.ingredients,
                ...manifest?.parts?.ingredients,
                version: manifest?.parts?.ingredients?.version ?? manifest?.ingredientsVersion ?? "",
                changes: manifest?.parts?.ingredients?.changes ?? manifest?.ingredientChanges ?? [],
            },
            dishes: {
                ...base.parts.dishes,
                ...manifest?.parts?.dishes,
                version: manifest?.parts?.dishes?.version ?? manifest?.dishesVersion ?? "",
                changes: manifest?.parts?.dishes?.changes ?? manifest?.dishChanges ?? [],
            },
            config: {
                ...base.parts.config,
                ...manifest?.parts?.config,
                version: manifest?.parts?.config?.version ?? manifest?.configVersion ?? "",
                changes: manifest?.parts?.config?.changes ?? manifest?.configChanges ?? [],
            },
        },
        ingredientsVersion: manifest?.ingredientsVersion ?? manifest?.parts?.ingredients?.version ?? "",
        dishesVersion: manifest?.dishesVersion ?? manifest?.parts?.dishes?.version ?? "",
        configVersion: manifest?.configVersion ?? manifest?.parts?.config?.version ?? "",
        ingredientChanges: manifest?.ingredientChanges ?? manifest?.parts?.ingredients?.changes ?? [],
        dishChanges: manifest?.dishChanges ?? manifest?.parts?.dishes?.changes ?? [],
        configChanges: manifest?.configChanges ?? manifest?.parts?.config?.changes ?? [],
    };
};

const getFileSha = async (path: string, token: string): Promise<{ sha: string; content: string } | null> => {
    // Use the "object" media type so the sha is always returned, even for files
    // over 1MB (the default media type omits/refuses content past 1MB).
    const res = await fetch(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`,
        { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.object+json" } }
    );
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Failed to read ${path}: ${res.status} ${res.statusText}`);
    const json = await res.json();
    // Files <=1MB include inline base64 content; larger files come back with
    // empty content, so fetch the raw blob (git blobs API supports up to 100MB).
    if (json.content && json.encoding === "base64") {
        const decoded = decodeURIComponent(escape(atob(json.content.replace(/\n/g, ""))));
        return { sha: json.sha, content: decoded };
    }
    const blobRes = await fetch(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/blobs/${json.sha}`,
        { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.raw" } }
    );
    if (!blobRes.ok) throw new Error(`Failed to read blob for ${path}: ${blobRes.status} ${blobRes.statusText}`);
    return { sha: json.sha, content: await blobRes.text() };
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

const parseJson = <T,>(content: string | null | undefined, fallback: T): T => {
    if (!content) return fallback;
    try {
        return JSON.parse(content);
    } catch {
        return fallback;
    }
};

const diffItems = <T extends { id: string; name: string }>(prev: T[], next: T[]): SharedItemChange[] => {
    const changes: SharedItemChange[] = [];
    const prevMap = new Map(prev.map(i => [i.id, i]));
    const nextMap = new Map(next.map(i => [i.id, i]));

    next.forEach(item => {
        if (!prevMap.has(item.id)) {
            changes.push({ id: item.id, name: item.name, action: "added" });
        } else if (stableJson(prevMap.get(item.id)) !== stableJson(item)) {
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

const diffSharedConfig = (prev: SharedConfig | null | undefined, next: SharedConfig, hadExistingFile: boolean): SharedItemChange[] => {
    const normalizedPrev = prev ? normalizeSharedConfig(prev) : null;
    const normalizedNext = normalizeSharedConfig(next);
    if (!hadExistingFile) return [{ id: "shared-config", name: "Cấu hình dùng chung", action: "added" }];
    if (stableJson(normalizedPrev) !== stableJson(normalizedNext)) {
        return [{ id: "shared-config", name: "Cấu hình dùng chung", action: "modified" }];
    }
    return [];
};

export interface UseSharedPublishResult {
    publishSharedData: () => Promise<void>;
    isPublishing: boolean;
    lastPublishAt: string | null;
    githubToken: string;
    setGithubToken: (token: string) => Promise<void>;
    clearGithubToken: () => Promise<void>;
    hasGithubToken: boolean;
    githubTokenSource: "local" | "build" | "none";
    testGithubToken: (token?: string) => Promise<void>;
    isTestingGithubToken: boolean;
}

export const useSharedPublish = (): UseSharedPublishResult => {
    const [isPublishing, setIsPublishing] = useState(false);
    const [lastPublishAt, setLastPublishAt] = useState<string | null>(null);
    const [isTestingGithubToken, setIsTestingGithubToken] = useState(false);
    const [githubToken, setGithubTokenState] = useState<string>("");
    const ingredients = useSelector(selectIngredients);
    const dishes = useSelector(selectDishes);
    const sharedConfig = useSelector(selectSharedConfig);
    const localGithubToken = githubToken.trim();
    const publishGithubToken = localGithubToken || BUILD_GITHUB_TOKEN;
    const githubTokenSource = localGithubToken ? "local" : BUILD_GITHUB_TOKEN ? "build" : "none";
    const hasGithubToken = githubTokenSource !== "none";

    useEffect(() => {
        let cancelled = false;
        Promise.all([
            getStorageString(PUBLISH_TOKEN_KEY),
            getStorageString(LAST_PUBLISH_KEY),
        ]).then(([token, lastPublish]) => {
            if (cancelled) return;
            setGithubTokenState(token ?? "");
            setLastPublishAt(lastPublish);
        });
        return () => {
            cancelled = true;
        };
    }, []);

    const setGithubToken = async (token: string) => {
        const normalizedToken = token.trim();
        if (normalizedToken) {
            await setStorageString(PUBLISH_TOKEN_KEY, normalizedToken);
        } else {
            await removeStorageItem(PUBLISH_TOKEN_KEY);
        }
        setGithubTokenState(normalizedToken);
    };

    const clearGithubToken = () => setGithubToken("");

    const testGithubToken = async (token?: string): Promise<void> => {
        const tokenToTest = token?.trim() || publishGithubToken;
        if (!navigator.onLine) {
            message.warning("Không có mạng");
            return;
        }
        if (!tokenToTest) {
            message.warning("Vui lòng nhập GitHub token");
            return;
        }

        setIsTestingGithubToken(true);
        const key = "publish-token-test";
        message.loading({ content: "Đang kiểm tra GitHub token...", key, duration: 0 });
        const headers = { Authorization: `Bearer ${tokenToTest}`, Accept: "application/vnd.github+json" };

        try {
            const [userRes, repoRes] = await Promise.all([
                fetch("https://api.github.com/user", { headers }),
                fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`, { headers }),
            ]);
            if (!userRes.ok) throw new Error(`Token không hợp lệ hoặc không đăng nhập được GitHub: HTTP ${userRes.status}`);
            if (!repoRes.ok) throw new Error(`Token không đọc được repo ${REPO_OWNER}/${REPO_NAME}: HTTP ${repoRes.status}`);

            const repoJson = await repoRes.json();
            const permissions = repoJson.permissions ?? {};
            const canPush = Boolean(permissions.push || permissions.admin || permissions.maintain);
            if (!canPush) throw new Error("Tài khoản/token không có quyền ghi repo này");

            await Promise.all([
                getFileSha(SHARED_MANIFEST_PATH, tokenToTest),
                getFileSha(SHARED_PART_PATHS.ingredients, tokenToTest),
                getFileSha(SHARED_PART_PATHS.dishes, tokenToTest),
                getFileSha(SHARED_PART_PATHS.config, tokenToTest),
            ]);

            message.success({ content: "GitHub token hợp lệ cho repo và có quyền ghi", key, duration: 4 });
        } catch (err: any) {
            message.error({ content: "Kiểm tra token thất bại: " + err?.message, key, duration: 6 });
        } finally {
            setIsTestingGithubToken(false);
        }
    };

    const publishSharedData = async (): Promise<void> => {
        if (!navigator.onLine) {
            message.warning({ content: "Không có mạng — Không thể xuất bản", duration: 3 });
            return;
        }
        if (!publishGithubToken) {
            message.error("GitHub token chưa được cấu hình");
            return;
        }

        setIsPublishing(true);
        const key = "publish-message";
        message.loading({ content: "Đang xuất bản dữ liệu dùng chung...", key, duration: 0 });

        try {
            const [existingManifestFile, existingIngredientsFile, existingDishesFile, existingConfigFile] = await Promise.all([
                getFileSha(SHARED_MANIFEST_PATH, publishGithubToken),
                getFileSha(SHARED_PART_PATHS.ingredients, publishGithubToken),
                getFileSha(SHARED_PART_PATHS.dishes, publishGithubToken),
                getFileSha(SHARED_PART_PATHS.config, publishGithubToken),
            ]);

            const prevManifest = normalizeSharedManifest(parseJson<SharedManifest | null>(existingManifestFile?.content, null));
            const prevIngredients = parseJson<Ingredient[]>(existingIngredientsFile?.content, []);
            const prevDishes = parseJson<Dishes[]>(existingDishesFile?.content, []);
            const prevConfig = normalizeSharedConfig(parseJson<Partial<SharedConfig> | null>(existingConfigFile?.content, null));
            const now = new Date().toISOString();

            const ingredientChanges = diffItems(prevIngredients, ingredients);
            const dishChanges = diffItems(prevDishes, dishes);
            const configChanges = diffSharedConfig(prevConfig, sharedConfig, Boolean(existingConfigFile));
            const ingredientsContent = stableJson(ingredients);
            const dishesContent = stableJson(dishes);
            const configContent = stableJson(normalizeSharedConfig(sharedConfig));
            const [ingredientsHash, dishesHash, configHash, existingIngredientsHash, existingDishesHash, existingConfigHash] = await Promise.all([
                hashString(ingredientsContent),
                hashString(dishesContent),
                hashString(configContent),
                existingIngredientsFile ? hashString(existingIngredientsFile.content) : Promise.resolve(""),
                existingDishesFile ? hashString(existingDishesFile.content) : Promise.resolve(""),
                existingConfigFile ? hashString(existingConfigFile.content) : Promise.resolve(""),
            ]);

            const previousIngredientsHash = prevManifest.parts.ingredients.hash || existingIngredientsHash;
            const previousDishesHash = prevManifest.parts.dishes.hash || existingDishesHash;
            const previousConfigHash = prevManifest.parts.config.hash || existingConfigHash;
            const ingredientsChanged = ingredientsHash !== previousIngredientsHash || !existingIngredientsFile;
            const dishesChanged = dishesHash !== previousDishesHash || !existingDishesFile;
            const configChanged = configHash !== previousConfigHash || !existingConfigFile;
            const anyPartChanged = ingredientsChanged || dishesChanged || configChanged;

            const newManifest = normalizeSharedManifest({
                schemaVersion: SHARED_SYNC_SCHEMA_VERSION,
                updatedAt: anyPartChanged ? now : prevManifest.updatedAt || now,
                parts: {
                    ingredients: {
                        key: "ingredients",
                        path: SHARED_PART_PATHS.ingredients,
                        version: ingredientsChanged ? now : prevManifest.parts.ingredients.version || now,
                        hash: ingredientsHash,
                        count: countCollection(ingredients),
                        updatedAt: ingredientsChanged ? now : prevManifest.parts.ingredients.updatedAt || now,
                        changes: ingredientChanges,
                    },
                    dishes: {
                        key: "dishes",
                        path: SHARED_PART_PATHS.dishes,
                        version: dishesChanged ? now : prevManifest.parts.dishes.version || now,
                        hash: dishesHash,
                        count: countCollection(dishes),
                        updatedAt: dishesChanged ? now : prevManifest.parts.dishes.updatedAt || now,
                        changes: dishChanges,
                    },
                    config: {
                        key: "config",
                        path: SHARED_PART_PATHS.config,
                        version: configChanged ? now : prevManifest.parts.config.version || now,
                        hash: configHash,
                        count: 1,
                        updatedAt: configChanged ? now : prevManifest.parts.config.updatedAt || now,
                        changes: configChanges,
                    },
                },
                ingredientsVersion: ingredientsChanged ? now : prevManifest.ingredientsVersion || now,
                dishesVersion: dishesChanged ? now : prevManifest.dishesVersion || now,
                configVersion: configChanged ? now : prevManifest.configVersion || now,
                ingredientChanges,
                dishChanges,
                configChanges,
            });

            const manifestContent = stableJson(newManifest);
            const commitMsg = `Publish split shared data ${now}`;
            if (ingredientsChanged) {
                await pushFile(SHARED_PART_PATHS.ingredients, publishGithubToken, existingIngredientsFile?.sha ?? null, ingredientsContent, commitMsg);
            }
            if (dishesChanged) {
                await pushFile(SHARED_PART_PATHS.dishes, publishGithubToken, existingDishesFile?.sha ?? null, dishesContent, commitMsg);
            }
            if (configChanged) {
                await pushFile(SHARED_PART_PATHS.config, publishGithubToken, existingConfigFile?.sha ?? null, configContent, commitMsg);
            }
            if (!existingManifestFile || manifestContent !== existingManifestFile.content) {
                await pushFile(SHARED_MANIFEST_PATH, publishGithubToken, existingManifestFile?.sha ?? null, manifestContent, commitMsg);
            }

            const totalChanges = ingredientChanges.length + dishChanges.length + configChanges.length;
            await saveSyncedVersions({
                ingredientsVersion: newManifest.ingredientsVersion,
                dishesVersion: newManifest.dishesVersion,
                configVersion: newManifest.configVersion,
            });

            const publishedAt = now;
            await setStorageString(LAST_PUBLISH_KEY, publishedAt);
            setLastPublishAt(publishedAt);

            message.success({
                content: totalChanges === 0 && !anyPartChanged
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

    return {
        publishSharedData,
        isPublishing,
        lastPublishAt,
        githubToken,
        setGithubToken,
        clearGithubToken,
        hasGithubToken,
        githubTokenSource,
        testGithubToken,
        isTestingGithubToken,
    };
};
