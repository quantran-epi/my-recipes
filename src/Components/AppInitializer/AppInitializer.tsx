import React from "react";
import { message } from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import { checkStorageHealth } from "@common/Storage/AppStorage";
import { useGistBackup } from "@hooks";

type AppInitializerProps = {
    children: React.ReactNode;
}

const syncIndicatorStyle: React.CSSProperties = {
    position: "fixed",
    top: "calc(82px + env(safe-area-inset-top))",
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 6200,
    maxWidth: "calc(100vw - 24px)",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 12px",
    borderRadius: 999,
    border: "1px solid rgba(116,54,220,0.20)",
    background: "rgba(255,255,255,0.97)",
    color: "#2f2545",
    boxShadow: "0 12px 30px rgba(74,48,130,0.18)",
    fontSize: 12,
    fontWeight: 760,
    lineHeight: "16px",
    pointerEvents: "none",
    whiteSpace: "nowrap",
};

const PersonalSyncIndicator: React.FC<{ label: string }> = ({ label }) => (
    <div style={syncIndicatorStyle} role="status" aria-live="polite">
        <LoadingOutlined style={{ color: "#7436dc", fontSize: 14 }} />
        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{label || "Đang đồng bộ dữ liệu cá nhân"}</span>
    </div>
);

export const AppInitializer: React.FC<AppInitializerProps> = ({ children }) => {
    const { gistId, gistToken, autoSyncPersonalDataInBackground, personalSyncStatus } = useGistBackup();
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

    return <>
        {children}
        {personalSyncStatus.isSyncing && <PersonalSyncIndicator label={personalSyncStatus.label} />}
    </>;
};
