import React, { useState } from "react";
import { Collapse, Flex, Typography } from "antd";
import { CloudDownloadOutlined, CloudUploadOutlined, DatabaseOutlined, GithubOutlined, ReloadOutlined } from "@ant-design/icons";
import { Button } from "@components/Button";
import { useMessage } from "@components/Message";
import { useGistBackup } from "@hooks";
import { Input as AntInput } from "antd";

const PERSIST_PERSONAL_KEY = "persist:personal";
const PERSIST_SHARED_KEY = "persist:shared";

type LocalDataSize = {
    personal: number;
    shared: number;
    total: number;
}

const byteSize = (value: string | null): number => new Blob([value ?? ""]).size;

const readLocalDataSize = (): LocalDataSize => {
    const personal = byteSize(localStorage.getItem(PERSIST_PERSONAL_KEY));
    const shared = byteSize(localStorage.getItem(PERSIST_SHARED_KEY));
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
    const {
        gistId, gistToken,
        setGistId, setGistToken,
        pushPersonalData, pullPersonalData,
        isPushing, isPulling,
        lastBackupAt,
    } = useGistBackup();

    const [localGistId, setLocalGistId] = useState(gistId);
    const [localToken, setLocalToken] = useState(gistToken);
    const [localDataSize, setLocalDataSize] = useState<LocalDataSize>(() => readLocalDataSize());

    const _refreshDataSize = () => {
        setLocalDataSize(readLocalDataSize());
    };

    const _onSave = () => {
        setGistId(localGistId.trim());
        setGistToken(localToken.trim());
        message.success("Đã lưu cấu hình sao lưu");
        _refreshDataSize();
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
                        <Flex gap={8}>
                            <Button
                                size="small"
                                icon={<CloudUploadOutlined />}
                                loading={isPushing}
                                disabled={!gistId || !gistToken}
                                onClick={pushPersonalData}
                                block
                            >
                                Sao lưu
                            </Button>
                            <Button
                                size="small"
                                icon={<CloudDownloadOutlined />}
                                loading={isPulling}
                                disabled={!gistId || !gistToken}
                                onClick={pullPersonalData}
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
