/**
 * useGistBackup — personal data backup/restore via GitHub Gist.
 * The user provides their own PAT + Gist ID, stored in IndexedDB.
 * Only personal slices are backed up — shared data is never included.
 */
import { message } from "antd";
import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { countCollection, hashString, stableJson } from "@common/Helpers/SyncDataHelper";
import { createPersistRoot, getStorageString, removeStorageItem, setStorageString } from "@common/Storage/AppStorage";
import {
    selectAppContext,
    selectCookingSessions,
    selectInventory,
    selectScheduledMeals,
    selectSelectedMeals,
    selectShoppingLists,
} from "@store/Selectors";

const GIST_ID_KEY = "personal_gist_id";
const GIST_TOKEN_KEY = "personal_gist_token";
const LAST_BACKUP_KEY = "personal_last_backup_at";
const PERSIST_PERSONAL_KEY = "persist:personal";
const PERSONAL_SCHEMA_VERSION = 2;
const PERSONAL_MANIFEST_FILE_NAME = "my-recipes-personal-manifest.json";

const PERSONAL_PART_FILES = {
    appContext: "personal-appContext.json",
    inventory: "personal-inventory.json",
    shoppingList: "personal-shoppingList.json",
    scheduledMeal: "personal-scheduledMeal.json",
    cookingSession: "personal-cookingSession.json",
} as const;

type PersonalPartKey = keyof typeof PERSONAL_PART_FILES;

type PersonalPart = {
    key: PersonalPartKey;
    fileName: string;
    version: string;
    hash: string;
    count: number;
    updatedAt: string;
};
type PersonalManifest = {
    schemaVersion: number;
    updatedAt: string;
    parts: Record<PersonalPartKey, PersonalPart>;
};

type PersonalSlices = Record<PersonalPartKey, unknown>;

const emptyManifest = (): PersonalManifest => ({
    schemaVersion: PERSONAL_SCHEMA_VERSION,
    updatedAt: "",
    parts: {
        appContext: { key: "appContext", fileName: PERSONAL_PART_FILES.appContext, version: "", hash: "", count: 0, updatedAt: "" },
        inventory: { key: "inventory", fileName: PERSONAL_PART_FILES.inventory, version: "", hash: "", count: 0, updatedAt: "" },
        shoppingList: { key: "shoppingList", fileName: PERSONAL_PART_FILES.shoppingList, version: "", hash: "", count: 0, updatedAt: "" },
        scheduledMeal: { key: "scheduledMeal", fileName: PERSONAL_PART_FILES.scheduledMeal, version: "", hash: "", count: 0, updatedAt: "" },
        cookingSession: { key: "cookingSession", fileName: PERSONAL_PART_FILES.cookingSession, version: "", hash: "", count: 0, updatedAt: "" },
    },
});

const normalizeManifest = (manifest: Partial<PersonalManifest> | null | undefined): PersonalManifest => {
    const base = emptyManifest();
    return {
        ...base,
        ...manifest,
        schemaVersion: manifest?.schemaVersion ?? PERSONAL_SCHEMA_VERSION,
        updatedAt: manifest?.updatedAt ?? "",
        parts: {
            appContext: { ...base.parts.appContext, ...manifest?.parts?.appContext },
            inventory: { ...base.parts.inventory, ...manifest?.parts?.inventory },
            shoppingList: { ...base.parts.shoppingList, ...manifest?.parts?.shoppingList },
            scheduledMeal: { ...base.parts.scheduledMeal, ...manifest?.parts?.scheduledMeal },
            cookingSession: { ...base.parts.cookingSession, ...manifest?.parts?.cookingSession },
        },
    };
};

const getGist = async (gistId: string, token: string): Promise<any> => {
    const res = await fetch(`https://api.github.com/gists/${gistId}`, {
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
        },
    });
    if (!res.ok) throw new Error(`Không thể đọc Gist: ${res.status} ${res.statusText}`);
    return res.json();
};

const getGithubUser = async (token: string): Promise<any> => {
    const res = await fetch("https://api.github.com/user", {
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
        },
    });
    if (!res.ok) throw new Error(`Token GitHub không hợp lệ: ${res.status} ${res.statusText}`);
    return res.json();
};

const readGistFile = async (gistJson: any, fileName: string, token?: string): Promise<{ content: string; } | null> => {
    const file = gistJson.files?.[fileName];
    if (!file) return null;
    if (file.truncated) {
        const rawRes = await fetch(file.raw_url, token ? {
            headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
        } : undefined);
        if (!rawRes.ok) throw new Error(`Không thể đọc nội dung đầy đủ của ${fileName}`);
        return { content: await rawRes.text() };
    }
    return { content: file.content };
};

const patchGistFiles = async (gistId: string, token: string, files: Record<string, { content: string }>): Promise<void> => {
    const res = await fetch(`https://api.github.com/gists/${gistId}`, {
        method: "PATCH",
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            description: `My Recipes personal backup — ${new Date().toISOString()}`,
            files,
        }),
    });
    if (!res.ok) throw new Error(`Không thể ghi Gist: ${res.status} ${res.statusText}`);
};

const parseJson = <T,>(content: string | null | undefined, fallback: T): T => {
    if (!content) return fallback;
    try {
        return JSON.parse(content);
    } catch {
        return fallback;
    }
};

const buildSliceHashes = async (slices: PersonalSlices): Promise<Record<PersonalPartKey, string>> => {
    const entries = await Promise.all(
        (Object.keys(PERSONAL_PART_FILES) as PersonalPartKey[]).map(async key => [key, await hashString(stableJson(slices[key]))] as const)
    );
    return Object.fromEntries(entries) as Record<PersonalPartKey, string>;
};

export interface UseGistBackupResult {
    gistId: string;
    gistToken: string;
    setGistId: (id: string) => Promise<void>;
    setGistToken: (token: string) => Promise<void>;
    pushPersonalData: () => Promise<void>;
    pullPersonalData: () => Promise<void>;
    testGistConfig: (config?: { gistId?: string; gistToken?: string }) => Promise<void>;
    isPushing: boolean;
    isPulling: boolean;
    isTesting: boolean;
    lastBackupAt: string | null;
}

export const useGistBackup = (): UseGistBackupResult => {
    const [gistId, setGistIdState] = useState("");
    const [gistToken, setGistTokenState] = useState("");
    const [isPushing, setIsPushing] = useState(false);
    const [isPulling, setIsPulling] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [lastBackupAt, setLastBackupAt] = useState<string | null>(null);

    const appContext = useSelector(selectAppContext);
    const inventory = useSelector(selectInventory);
    const shoppingLists = useSelector(selectShoppingLists);
    const scheduledMeals = useSelector(selectScheduledMeals);
    const selectedMeals = useSelector(selectSelectedMeals);
    const cookingSessions = useSelector(selectCookingSessions);

    const personalSlices: PersonalSlices = useMemo(() => ({
        appContext,
        inventory: { items: inventory },
        shoppingList: { shoppingLists },
        scheduledMeal: { scheduledMeals, selectedMeals: Array.from(selectedMeals) },
        cookingSession: { sessions: cookingSessions },
    }), [appContext, inventory, shoppingLists, scheduledMeals, selectedMeals, cookingSessions]);

    useEffect(() => {
        let cancelled = false;
        Promise.all([
            getStorageString(GIST_ID_KEY),
            getStorageString(GIST_TOKEN_KEY),
            getStorageString(LAST_BACKUP_KEY),
        ]).then(([storedGistId, storedToken, storedLastBackup]) => {
            if (cancelled) return;
            setGistIdState(storedGistId ?? "");
            setGistTokenState(storedToken ?? "");
            setLastBackupAt(storedLastBackup);
        });
        return () => {
            cancelled = true;
        };
    }, []);

    const setGistId = async (id: string) => {
        const normalizedId = id.trim();
        if (normalizedId) await setStorageString(GIST_ID_KEY, normalizedId);
        else await removeStorageItem(GIST_ID_KEY);
        setGistIdState(normalizedId);
    };

    const setGistToken = async (token: string) => {
        const normalizedToken = token.trim();
        if (normalizedToken) await setStorageString(GIST_TOKEN_KEY, normalizedToken);
        else await removeStorageItem(GIST_TOKEN_KEY);
        setGistTokenState(normalizedToken);
    };

    const pushPersonalData = async (): Promise<void> => {
        if (!gistId.trim() || !gistToken.trim()) {
            message.warning("Vui lòng nhập Gist ID và GitHub Token");
            return;
        }
        if (!navigator.onLine) {
            message.warning("Không có mạng");
            return;
        }

        setIsPushing(true);
        const key = "gist-push";
        message.loading({ content: "Đang sao lưu dữ liệu cá nhân lên Gist...", key, duration: 0 });
        try {
            const gistJson = await getGist(gistId.trim(), gistToken.trim());
            const existingManifestFile = await readGistFile(gistJson, PERSONAL_MANIFEST_FILE_NAME, gistToken.trim());
            const previousManifest = normalizeManifest(parseJson<PersonalManifest | null>(existingManifestFile?.content, null));
            const hashes = await buildSliceHashes(personalSlices);
            const now = new Date().toISOString();
            const files: Record<string, { content: string }> = {};

            const parts = {} as Record<PersonalPartKey, PersonalPart>;
            (Object.keys(PERSONAL_PART_FILES) as PersonalPartKey[]).forEach(partKey => {
                const previousPart = previousManifest.parts[partKey];
                const changed = hashes[partKey] !== previousPart.hash;
                const fileName = PERSONAL_PART_FILES[partKey];
                if (changed) files[fileName] = { content: stableJson(personalSlices[partKey]) };
                parts[partKey] = {
                    key: partKey,
                    fileName,
                    version: changed ? now : previousPart.version || now,
                    hash: hashes[partKey],
                    count: countCollection(personalSlices[partKey]),
                    updatedAt: changed ? now : previousPart.updatedAt || now,
                };
            });

            const changedFileCount = Object.keys(files).length;
            const nextManifest: PersonalManifest = {
                schemaVersion: PERSONAL_SCHEMA_VERSION,
                updatedAt: changedFileCount > 0 ? now : previousManifest.updatedAt || now,
                parts,
            };
            const manifestContent = stableJson(nextManifest);
            if (!existingManifestFile || manifestContent !== existingManifestFile.content) {
                files[PERSONAL_MANIFEST_FILE_NAME] = { content: manifestContent };
            }

            if (Object.keys(files).length > 0) {
                await patchGistFiles(gistId.trim(), gistToken.trim(), files);
            }

            await setStorageString(LAST_BACKUP_KEY, now);
            setLastBackupAt(now);
            message.success({
                content: changedFileCount === 0 ? "Sao lưu thành công (không có thay đổi mới)" : `Sao lưu thành công — ${changedFileCount} phần dữ liệu`,
                key,
                duration: 3,
            });
        } catch (err: any) {
            message.error({ content: "Sao lưu thất bại: " + err?.message, key, duration: 5 });
        } finally {
            setIsPushing(false);
        }
    };

    const pullPersonalData = async (): Promise<void> => {
        if (!gistId.trim() || !gistToken.trim()) {
            message.warning("Vui lòng nhập Gist ID và GitHub Token");
            return;
        }
        if (!navigator.onLine) {
            message.warning("Không có mạng");
            return;
        }
        setIsPulling(true);
        const key = "gist-pull";
        message.loading({ content: "Đang khôi phục dữ liệu từ Gist...", key, duration: 0 });
        try {
            const gistJson = await getGist(gistId.trim(), gistToken.trim());
            const manifestFile = await readGistFile(gistJson, PERSONAL_MANIFEST_FILE_NAME, gistToken.trim());
            if (!manifestFile) throw new Error(`File "${PERSONAL_MANIFEST_FILE_NAME}" không tìm thấy trong Gist`);
            const manifest = normalizeManifest(JSON.parse(manifestFile.content));
            const localHashes = await buildSliceHashes(personalSlices);
            const restoredSlices = { ...personalSlices } as PersonalSlices;
            let fetchedCount = 0;

            for (const partKey of Object.keys(PERSONAL_PART_FILES) as PersonalPartKey[]) {
                const part = manifest.parts[partKey];
                if (!part?.fileName) continue;
                if (part.hash && part.hash === localHashes[partKey]) continue;
                const file = await readGistFile(gistJson, part.fileName, gistToken.trim());
                if (!file) throw new Error(`File "${part.fileName}" không tìm thấy trong Gist`);
                restoredSlices[partKey] = JSON.parse(file.content);
                fetchedCount += 1;
            }

            await setStorageString(PERSIST_PERSONAL_KEY, createPersistRoot(restoredSlices));
            message.success({ content: `Khôi phục thành công — tải ${fetchedCount} phần dữ liệu. Đang tải lại...`, key, duration: 2 });
            setTimeout(() => window.location.reload(), 1500);
        } catch (err: any) {
            message.error({ content: "Khôi phục thất bại: " + err?.message, key, duration: 5 });
        } finally {
            setIsPulling(false);
        }
    };

    const testGistConfig = async (config?: { gistId?: string; gistToken?: string }): Promise<void> => {
        const targetGistId = (config?.gistId ?? gistId).trim();
        const targetToken = (config?.gistToken ?? gistToken).trim();
        if (!targetGistId || !targetToken) {
            message.warning("Vui lòng nhập Gist ID và GitHub Token");
            return;
        }
        if (!navigator.onLine) {
            message.warning("Không có mạng");
            return;
        }

        setIsTesting(true);
        const key = "gist-config-test";
        message.loading({ content: "Đang kiểm tra cấu hình Gist...", key, duration: 0 });

        try {
            const [gistJson, userJson] = await Promise.all([
                getGist(targetGistId, targetToken),
                getGithubUser(targetToken),
            ]);
            const ownerLogin = gistJson.owner?.login;
            if (ownerLogin && userJson.login && ownerLogin !== userJson.login) {
                throw new Error(`Gist thuộc tài khoản ${ownerLogin}, không phải ${userJson.login}`);
            }

            const manifestFile = await readGistFile(gistJson, PERSONAL_MANIFEST_FILE_NAME, targetToken);
            if (!manifestFile) {
                message.success({
                    content: "Cấu hình Gist hợp lệ. Chưa có file sao lưu tách nhỏ, lần sao lưu đầu tiên sẽ tạo file mới.",
                    key,
                    duration: 4,
                });
                return;
            }

            const manifest = normalizeManifest(JSON.parse(manifestFile.content));
            for (const partKey of Object.keys(PERSONAL_PART_FILES) as PersonalPartKey[]) {
                const fileName = manifest.parts[partKey]?.fileName;
                if (!fileName) continue;
                const file = await readGistFile(gistJson, fileName, targetToken);
                if (file) JSON.parse(file.content);
            }

            message.success({ content: "Cấu hình Gist hợp lệ và các file sao lưu đọc được", key, duration: 4 });
        } catch (err: any) {
            message.error({ content: "Kiểm tra Gist thất bại: " + err?.message, key, duration: 6 });
        } finally {
            setIsTesting(false);
        }
    };

    return {
        gistId, gistToken,
        setGistId, setGistToken,
        pushPersonalData, pullPersonalData,
        testGistConfig,
        isPushing, isPulling, isTesting,
        lastBackupAt,
    };
};
