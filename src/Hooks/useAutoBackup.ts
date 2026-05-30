import { message } from "antd";
import { useEffect, useRef, useState } from "react";

const GITHUB_TOKEN = process.env.REACT_APP_GITHUB_TOKEN;
const REPO_OWNER = "quantran-epi";
const REPO_NAME = "my-recipes";
const FILE_PATH = "docs/data.txt";
const INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const LAST_BACKUP_KEY = "last_auto_backup_time";

const pushBackupToGithub = async (): Promise<void> => {
    if (!GITHUB_TOKEN) {
        throw new Error("REACT_APP_GITHUB_TOKEN not set");
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
                message: `Auto backup ${new Date().toISOString()}`,
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
    const intervalRef = useRef<ReturnType<typeof setInterval>>();
    const [isBackingUp, setIsBackingUp] = useState(false);
    const lastBackupRaw = localStorage.getItem(LAST_BACKUP_KEY);
    const [lastBackupTime, setLastBackupTime] = useState<Date | null>(
        lastBackupRaw ? new Date(parseInt(lastBackupRaw)) : null
    );

    const triggerBackup = async (): Promise<void> => {
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

    useEffect(() => {
        const runBackupIfDue = () => {
            const lastBackup = localStorage.getItem(LAST_BACKUP_KEY);
            const now = Date.now();

            if (lastBackup && now - parseInt(lastBackup) < INTERVAL_MS) {
                const nextIn = Math.round((INTERVAL_MS - (now - parseInt(lastBackup))) / 60000);
                console.log(`[AutoBackup] Skipped — next backup in ~${nextIn} min`);
                return;
            }

            triggerBackup();
        };

        // Run once on app open
        runBackupIfDue();

        // Schedule every 24 hours
        intervalRef.current = setInterval(() => {
            triggerBackup();
        }, INTERVAL_MS);

        return () => clearInterval(intervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return { triggerBackup, isBackingUp, lastBackupTime };
};
