import React from "react";
import { message } from "antd";
import { checkStorageHealth } from "@common/Storage/AppStorage";
import { useGistBackup } from "@hooks";

type AppInitializerProps = {
    children: React.ReactNode;
}

export const AppInitializer: React.FC<AppInitializerProps> = ({ children }) => {
    const { gistId, gistToken, autoSyncPersonalDataInBackground } = useGistBackup();
    const personalAutoSyncStartedRef = React.useRef(false);

    React.useEffect(() => {
        let cancelled = false;

        checkStorageHealth().then(health => {
            if (cancelled || !health.usage || !health.quota) return;
            const ratio = health.usage / health.quota;
            if (ratio >= 0.8) {
                message.warning("Dung lượng lưu trữ trình duyệt sắp đầy. Hãy sao lưu dữ liệu lên GitHub.");
            }
        }).catch(() => { });

        return () => {
            cancelled = true;
        };
    }, []);

    React.useEffect(() => {
        if (personalAutoSyncStartedRef.current) return;
        if (!gistId.trim() || !gistToken.trim() || !navigator.onLine) return;

        const idleWindow = window as typeof window & {
            requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number;
            cancelIdleCallback?: (handle: number) => void;
        };
        const run = () => {
            if (personalAutoSyncStartedRef.current) return;
            personalAutoSyncStartedRef.current = true;
            autoSyncPersonalDataInBackground().catch(() => { });
        };

        if (idleWindow.requestIdleCallback) {
            const idleId = idleWindow.requestIdleCallback(run, { timeout: 2600 });
            return () => idleWindow.cancelIdleCallback?.(idleId);
        }

        const timerId = window.setTimeout(run, 1800);
        return () => window.clearTimeout(timerId);
    }, [autoSyncPersonalDataInBackground, gistId, gistToken]);

    return <>{children}</>;
};
