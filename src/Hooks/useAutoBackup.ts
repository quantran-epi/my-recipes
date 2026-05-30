import { useEffect, useRef } from "react";

const GITHUB_TOKEN = process.env.REACT_APP_GITHUB_TOKEN;
const REPO_OWNER = "quantran-epi";
const REPO_NAME = "my-recipes";
const FILE_PATH = "docs/data.txt";
const INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const LAST_BACKUP_KEY = "last_auto_backup_time";

const pushBackupToGithub = async (): Promise<void> => {
    if (!GITHUB_TOKEN) {
        console.warn("Auto backup skipped: REACT_APP_GITHUB_TOKEN not set");
        return;
    }

    const data = localStorage.getItem("persist:root");
    if (!data) {
        console.warn("Auto backup skipped: no persist:root data found");
        return;
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
    console.log("[AutoBackup] Backup pushed successfully at", new Date().toLocaleString());
};

export const useAutoBackup = () => {
    const intervalRef = useRef<ReturnType<typeof setInterval>>();

    useEffect(() => {
        const runBackupIfDue = () => {
            const lastBackup = localStorage.getItem(LAST_BACKUP_KEY);
            const now = Date.now();

            // Skip if last backup was less than 4 hours ago
            if (lastBackup && now - parseInt(lastBackup) < INTERVAL_MS) {
                const nextIn = Math.round((INTERVAL_MS - (now - parseInt(lastBackup))) / 60000);
                console.log(`[AutoBackup] Skipped — next backup in ~${nextIn} min`);
                return;
            }

            pushBackupToGithub().catch(err =>
                console.error("[AutoBackup] Failed:", err)
            );
        };

        // Run once on app open
        runBackupIfDue();

        // Schedule every 4 hours
        intervalRef.current = setInterval(() => {
            pushBackupToGithub().catch(err =>
                console.error("[AutoBackup] Failed:", err)
            );
        }, INTERVAL_MS);

        return () => clearInterval(intervalRef.current);
    }, []);
};
