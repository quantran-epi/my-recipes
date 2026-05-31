/**
 * useGistBackup — personal data backup/restore via GitHub Gist.
 * The user provides their own PAT + Gist ID (stored in localStorage).
 * Only the `persist:personal` key is backed up — shared data is never included.
 */
import { message } from "antd";
import { useState } from "react";

const GIST_ID_KEY = "personal_gist_id";
const GIST_TOKEN_KEY = "personal_gist_token";
const GIST_FILE_NAME = "my-recipes-personal.json";
const PERSIST_PERSONAL_KEY = "persist:personal";
const LAST_BACKUP_KEY = "personal_last_backup_at";

// ── Helpers ───────────────────────────────────────────────────────────────────

const getGistFile = async (gistId: string, token: string): Promise<{ content: string; } | null> => {
    const res = await fetch(`https://api.github.com/gists/${gistId}`, {
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
        },
    });
    if (!res.ok) throw new Error(`Không thể đọc Gist: ${res.status} ${res.statusText}`);
    const json = await res.json();
    const file = json.files?.[GIST_FILE_NAME];
    if (!file) return null;
    // Gist API may truncate large files — use raw_url if needed
    if (file.truncated) {
        const rawRes = await fetch(file.raw_url);
        if (!rawRes.ok) throw new Error("Không thể đọc nội dung đầy đủ của Gist");
        return { content: await rawRes.text() };
    }
    return { content: file.content };
};

const patchGist = async (gistId: string, token: string, content: string): Promise<void> => {
    const res = await fetch(`https://api.github.com/gists/${gistId}`, {
        method: "PATCH",
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            description: `My Recipes personal backup — ${new Date().toISOString()}`,
            files: {
                [GIST_FILE_NAME]: { content },
            },
        }),
    });
    if (!res.ok) throw new Error(`Không thể ghi Gist: ${res.status} ${res.statusText}`);
};

// ── Hook ──────────────────────────────────────────────────────────────────────

export interface UseGistBackupResult {
    gistId: string;
    gistToken: string;
    setGistId: (id: string) => void;
    setGistToken: (token: string) => void;
    pushPersonalData: () => Promise<void>;
    pullPersonalData: () => Promise<void>;
    isPushing: boolean;
    isPulling: boolean;
    lastBackupAt: string | null;
}

export const useGistBackup = (): UseGistBackupResult => {
    const [gistId, setGistIdState] = useState(() => localStorage.getItem(GIST_ID_KEY) ?? "");
    const [gistToken, setGistTokenState] = useState(() => localStorage.getItem(GIST_TOKEN_KEY) ?? "");
    const [isPushing, setIsPushing] = useState(false);
    const [isPulling, setIsPulling] = useState(false);
    const [lastBackupAt, setLastBackupAt] = useState<string | null>(
        () => localStorage.getItem(LAST_BACKUP_KEY)
    );

    const setGistId = (id: string) => {
        localStorage.setItem(GIST_ID_KEY, id);
        setGistIdState(id);
    };

    const setGistToken = (token: string) => {
        localStorage.setItem(GIST_TOKEN_KEY, token);
        setGistTokenState(token);
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
        const data = localStorage.getItem(PERSIST_PERSONAL_KEY);
        if (!data) {
            message.warning("Không có dữ liệu cá nhân để sao lưu");
            return;
        }
        setIsPushing(true);
        const key = "gist-push";
        message.loading({ content: "Đang sao lưu dữ liệu cá nhân lên Gist...", key, duration: 0 });
        try {
            await patchGist(gistId.trim(), gistToken.trim(), data);
            const now = new Date().toISOString();
            localStorage.setItem(LAST_BACKUP_KEY, now);
            setLastBackupAt(now);
            message.success({ content: "Sao lưu thành công!", key, duration: 3 });
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
            const file = await getGistFile(gistId.trim(), gistToken.trim());
            if (!file) throw new Error(`File "${GIST_FILE_NAME}" không tìm thấy trong Gist`);
            // Validate JSON before writing
            JSON.parse(file.content);
            localStorage.setItem(PERSIST_PERSONAL_KEY, file.content);
            message.success({ content: "Khôi phục thành công! Đang tải lại...", key, duration: 2 });
            setTimeout(() => window.location.reload(), 1500);
        } catch (err: any) {
            message.error({ content: "Khôi phục thất bại: " + err?.message, key, duration: 5 });
        } finally {
            setIsPulling(false);
        }
    };

    return {
        gistId, gistToken,
        setGistId, setGistToken,
        pushPersonalData, pullPersonalData,
        isPushing, isPulling,
        lastBackupAt,
    };
};
