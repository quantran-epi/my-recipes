import React, { useEffect, useState } from "react";
import { Collapse, Flex, Typography } from "antd";
import { CloudDownloadOutlined, CloudUploadOutlined, DatabaseOutlined, GithubOutlined, ReloadOutlined } from "@ant-design/icons";
import { Button } from "@components/Button";
import { useMessage } from "@components/Message";
import { useModal } from "@components/Modal/ModalProvider";
import { useGistBackup } from "@hooks";
import { Input as AntInput } from "antd";
import { getStorageString } from "@common/Storage/AppStorage";

const PERSIST_PERSONAL_KEY = "persist:personal";
const PERSIST_SHARED_KEY = "persist:shared";
const APP_CONFIRM_Z_INDEX = 5200;

type LocalDataSize = {
    personal: number;
    shared: number;
    total: number;
}

const byteSize = (value: string | null): number => new Blob([value ?? ""]).size;

const readLocalDataSize = async (): Promise<LocalDataSize> => {
    const [personalRaw, sharedRaw] = await Promise.all([
        getStorageString(PERSIST_PERSONAL_KEY),
        getStorageString(PERSIST_SHARED_KEY),
    ]);
    const personal = byteSize(personalRaw);
    const shared = byteSize(sharedRaw);
    return { personal, shared, total: personal + shared };
};

const formatBytes = (bytes: number): string => {
    if (!bytes) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

export const GistBackupWidget: React.FC = () => {
    const message = useMessage();
    const modal = useModal();
    const {
        gistId, gistToken,
        setGistId, setGistToken,
        pushPersonalData, pullPersonalData,
        testGistConfig,
        isPushing, isPulling, isTesting,
        lastBackupAt,
    } = useGistBackup();

    const [localGistId, setLocalGistId] = useState(gistId);
    const [localToken, setLocalToken] = useState(gistToken);
    const [localDataSize, setLocalDataSize] = useState<LocalDataSize>({ personal: 0, shared: 0, total: 0 });

    useEffect(() => {
        setLocalGistId(gistId);
        setLocalToken(gistToken);
    }, [gistId, gistToken]);

    const _refreshDataSize = async () => {
        setLocalDataSize(await readLocalDataSize());
    };

    useEffect(() => {
        _refreshDataSize();
    }, []);

    const _onSave = async () => {
        await setGistId(localGistId.trim());
        await setGistToken(localToken.trim());
        message.success("Đã lưu cấu hình sao lưu");
        _refreshDataSize();
    };

    const _onTestConfig = () => {
        testGistConfig({ gistId: localGistId.trim(), gistToken: localToken.trim() });
    };

    const _onConfirmPush = () => {
        modal.confirm({
            title: "Xác nhận sao lưu cá nhân",
            content: "Thao tác này sẽ ghi dữ liệu cá nhân hiện tại lên Gist và có thể ghi đè file sao lưu trước đó. Bạn có chắc muốn sao lưu?",
            okText: "Sao lưu",
            cancelText: "Hủy",
            centered: true,
            zIndex: APP_CONFIRM_Z_INDEX,
            onOk: pushPersonalData,
        });
    };

    const _onConfirmPull = () => {
        modal.confirm({
            title: "Xác nhận khôi phục cá nhân",
            content: "Thao tác này sẽ ghi đè dữ liệu cá nhân trên thiết bị này bằng dữ liệu từ Gist và tải lại app. Bạn có chắc muốn khôi phục?",
            okText: "Khôi phục",
            cancelText: "Hủy",
            centered: true,
            zIndex: APP_CONFIRM_Z_INDEX,
            onOk: pullPersonalData,
        });
    };

    const isSaved = localGistId.trim() === gistId && localToken.trim() === gistToken;

    return (
        <Collapse
            ghost
            size="small"
            items={[{
                key: "gist",
                label: (
                    <Flex align="center" gap={6}>
                        <GithubOutlined />
                        <Typography.Text style={{ fontSize: 13 }}>Sao lưu cá nhân (Gist)</Typography.Text>
                    </Flex>
                ),
                children: (
                    <Flex vertical gap={8}>
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                            Sao lưu / khôi phục dữ liệu cá nhân (tồn kho, lịch mua sắm, thực đơn) vào GitHub Gist của bạn.
                        </Typography.Text>
                        <div style={{ border: "1px solid #f0f0f0", borderRadius: 8, padding: "8px 10px", background: "#fafafa" }}>
                            <Flex align="center" justify="space-between" gap={8}>
                                <Flex align="center" gap={6}>
                                    <DatabaseOutlined style={{ color: "#1677ff" }} />
                                    <Typography.Text strong style={{ fontSize: 12 }}>Dung lượng dữ liệu</Typography.Text>
                                </Flex>
                                <Button size="small" type="text" icon={<ReloadOutlined />} onClick={_refreshDataSize} />
                            </Flex>
                            <Flex vertical gap={2} style={{ marginTop: 6 }}>
                                <Typography.Text type="secondary" style={{ fontSize: 11 }}>Cá nhân: {formatBytes(localDataSize.personal)}</Typography.Text>
                                <Typography.Text type="secondary" style={{ fontSize: 11 }}>Dùng chung: {formatBytes(localDataSize.shared)}</Typography.Text>
                                <Typography.Text style={{ fontSize: 12, color: "#0958d9" }}>Tổng cục bộ: {formatBytes(localDataSize.total)}</Typography.Text>
                            </Flex>
                        </div>
                        <AntInput
                            placeholder="Gist ID"
                            size="small"
                            value={localGistId}
                            onChange={e => setLocalGistId(e.target.value)}
                        />
                        <AntInput.Password
                            placeholder="GitHub Personal Access Token"
                            size="small"
                            value={localToken}
                            onChange={e => setLocalToken(e.target.value)}
                        />
                        {!isSaved && (
                            <Button size="small" type="dashed" block onClick={_onSave}>
                                Lưu cấu hình
                            </Button>
                        )}
                        <Button
                            size="small"
                            loading={isTesting}
                            disabled={!localGistId.trim() || !localToken.trim()}
                            onClick={_onTestConfig}
                            block
                        >
                            Kiểm tra cấu hình
                        </Button>
                        <Flex gap={8}>
                            <Button
                                size="small"
                                icon={<CloudUploadOutlined />}
                                loading={isPushing}
                                disabled={!gistId || !gistToken}
                                onClick={_onConfirmPush}
                                block
                            >
                                Sao lưu
                            </Button>
                            <Button
                                size="small"
                                icon={<CloudDownloadOutlined />}
                                loading={isPulling}
                                disabled={!gistId || !gistToken}
                                onClick={_onConfirmPull}
                                block
                            >
                                Khôi phục
                            </Button>
                        </Flex>
                        {lastBackupAt && (
                            <Typography.Text type="secondary" style={{ fontSize: 11, color: "#1677ff" }}>
                                ✅ Sao lưu lần cuối: {new Date(lastBackupAt).toLocaleString("vi-VN")}
                            </Typography.Text>
                        )}
                    </Flex>
                ),
            }]}
        />
    );
};
