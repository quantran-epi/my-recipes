import React, { useState } from "react";
import { Collapse, Flex, Typography } from "antd";
import { CloudDownloadOutlined, CloudUploadOutlined, GithubOutlined } from "@ant-design/icons";
import { Button } from "@components/Button";
import { useGistBackup } from "@hooks";
import { Input as AntInput } from "antd";

export const GistBackupWidget: React.FC = () => {
    const {
        gistId, gistToken,
        setGistId, setGistToken,
        pushPersonalData, pullPersonalData,
        isPushing, isPulling,
    } = useGistBackup();

    const [localGistId, setLocalGistId] = useState(gistId);
    const [localToken, setLocalToken] = useState(gistToken);

    const _onSave = () => {
        setGistId(localGistId.trim());
        setGistToken(localToken.trim());
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
                    </Flex>
                ),
            }]}
        />
    );
};
