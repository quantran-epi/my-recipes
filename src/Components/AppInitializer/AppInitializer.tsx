import React from "react";
import { Flex, Spin, Typography } from "antd";
import { useAutoImport, useSharedDataSync } from "@hooks";
import { SharedSyncModal } from "./SharedSyncModal";
import LogoIcon from "../../../assets/icons/logo.png";

type AppInitializerProps = {
    children: React.ReactNode;
}

export const AppInitializer: React.FC<AppInitializerProps> = ({ children }) => {
    const { status, error } = useAutoImport();
    const { pendingSync, dismissSync, markSynced } = useSharedDataSync();

    if (status === "loading") {
        return (
            <Flex
                vertical
                align="center"
                justify="center"
                style={{
                    position: "fixed",
                    inset: 0,
                    backgroundColor: "#fff",
                    zIndex: 9999,
                    gap: 24,
                }}
            >
                <img src={LogoIcon} alt="logo" style={{ width: 120, opacity: 0.85 }} />
                <Spin size="large" />
                <Typography.Text type="secondary" style={{ fontSize: 16 }}>
                    Đang tải dữ liệu...
                </Typography.Text>
            </Flex>
        );
    }

    if (status === "error") {
        return (
            <Flex
                vertical
                align="center"
                justify="center"
                style={{
                    position: "fixed",
                    inset: 0,
                    backgroundColor: "#fff",
                    zIndex: 9999,
                    gap: 16,
                }}
            >
                <img src={LogoIcon} alt="logo" style={{ width: 120, opacity: 0.5 }} />
                <Typography.Text type="danger" style={{ fontSize: 16 }}>
                    Tải dữ liệu thất bại: {error}
                </Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: 14 }}>
                    Vui lòng kiểm tra kết nối và thử lại.
                </Typography.Text>
            </Flex>
        );
    }

    return (
        <>
            {children}
            {pendingSync && (
                <SharedSyncModal
                    open={true}
                    manifest={pendingSync.manifest}
                    hasIngredientChanges={pendingSync.hasIngredientChanges}
                    hasDishChanges={pendingSync.hasDishChanges}
                    onDone={markSynced}
                    onCancel={dismissSync}
                />
            )}
        </>
    );
};

