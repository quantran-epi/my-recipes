import { message } from "antd";
import { useState } from "react";

const _dt = (encoded: string): string => {
    const k = "myrecipes";
    const raw = atob(encoded);
    let out = "";
    for (let i = 0; i < raw.length; i++)
        out += String.fromCharCode(raw.charCodeAt(i) ^ k.charCodeAt(i % k.length));
    return out;
};

const GITHUB_TOKEN = _dt(process.env.REACT_APP_GH_TOKEN || "");
const REPO_OWNER = "quantran-epi";
const REPO_NAME = "my-recipes";
const FILE_PATH = "docs/data.txt";
const LAST_BACKUP_KEY = "last_auto_backup_time";

const pushBackupToGithub = async (): Promise<void> => {
    if (!GITHUB_TOKEN) {
        throw new Error("GitHub token not set");
    }

    const data = localStorage.getItem("persist:root");
    if (!data) {
        throw new Error("No persist:root data found in localStorage");
    }

    // 1. Get current file SHA (required for update)
    const getRes = await fetch(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`,
        {
            headers: {
                Authorization: `Bearer ${GITHUB_TOKEN}`,
                Accept: "application/vnd.github+json",
            },
        }
    );

    if (!getRes.ok) {
        throw new Error(`Failed to fetch file info: ${getRes.status} ${getRes.statusText}`);
    }

    const fileInfo = await getRes.json();
    const sha: string = fileInfo.sha;

    // 2. Base64 encode the content
    const content = btoa(unescape(encodeURIComponent(data)));

    // 3. Push updated content
    const putRes = await fetch(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`,
        {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${GITHUB_TOKEN}`,
                Accept: "application/vnd.github+json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                message: `Backup ${new Date().toISOString()}`,
                content,
                sha,
            }),
        }
    );

    if (!putRes.ok) {
        throw new Error(`Failed to push backup: ${putRes.status} ${putRes.statusText}`);
    }

    localStorage.setItem(LAST_BACKUP_KEY, Date.now().toString());
};

export interface UseAutoBackupResult {
    triggerBackup: () => Promise<void>;
    isBackingUp: boolean;
    lastBackupTime: Date | null;
}

export const useAutoBackup = (): UseAutoBackupResult => {
    const [isBackingUp, setIsBackingUp] = useState(false);
    const lastBackupRaw = localStorage.getItem(LAST_BACKUP_KEY);
    const [lastBackupTime, setLastBackupTime] = useState<Date | null>(
        lastBackupRaw ? new Date(parseInt(lastBackupRaw)) : null
    );

    const triggerBackup = async (): Promise<void> => {
        if (!navigator.onLine) {
            message.warning({ content: "Không có mạng — Sao lưu sẽ tiếp tục khi có kết nối", duration: 3 });
            return;
        }
        setIsBackingUp(true);
        const key = "backup-message";
        message.loading({ content: "Đang sao lưu dữ liệu...", key, duration: 0 });
        try {
            await pushBackupToGithub();
            setLastBackupTime(new Date());
            message.success({ content: "Sao lưu thành công!", key, duration: 3 });
        } catch (err: any) {
            console.error("[AutoBackup] Failed:", err);
            message.error({ content: `Sao lưu thất bại: ${err?.message}`, key, duration: 4 });
        } finally {
            setIsBackingUp(false);
        }
    };

    return { triggerBackup, isBackingUp, lastBackupTime };
};
