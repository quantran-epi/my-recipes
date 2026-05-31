import { CheckCircleOutlined, CloseCircleOutlined, DeleteOutlined, HistoryOutlined } from "@ant-design/icons";
import { Button } from "@components/Button";
import { Box } from "@components/Layout/Box";
import { Stack } from "@components/Layout/Stack";
import { Modal } from "@components/Modal";
import { Typography } from "@components/Typography";
import { clearCookingHistory } from "@store/Reducers/CookingSessionReducer";
import { RootState } from "@store/Store";
import { DatePicker, Divider, Empty, Popconfirm, Tag } from "antd";
import dayjs, { Dayjs } from "dayjs";
import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";

type CookingHistoryWidgetProps = {
    open: boolean;
    onClose: () => void;
}

const _formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })
        + " " + d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
};

const _duration = (startedAt: string, finishedAt?: string) => {
    if (!finishedAt) return null;
    const ms = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
    const mins = Math.round(ms / 60000);
    if (mins < 60) return `${mins} phút`;
    return `${Math.floor(mins / 60)} giờ ${mins % 60} phút`;
};

// Group sessions by date (dd/mm/yyyy)
const _groupByDate = (sessions: any[]) => {
    const map: Record<string, any[]> = {};
    for (const s of sessions) {
        const key = new Date(s.startedAt).toLocaleDateString("vi-VN");
        if (!map[key]) map[key] = [];
        map[key].push(s);
    }
    return Object.entries(map).sort((a, b) =>
        new Date(b[1][0].startedAt).getTime() - new Date(a[1][0].startedAt).getTime()
    );
};

export const CookingHistoryWidget: React.FC<CookingHistoryWidgetProps> = ({ open, onClose }) => {
    const dispatch = useDispatch();
    const sessions = useSelector((state: RootState) => state.personal.cookingSession?.sessions ?? []);
    const [filterDate, setFilterDate] = useState<Dayjs | null>(null);

    const history = sessions
        .filter(s => s.status === "finished" || s.status === "cancelled")
        .filter(s => {
            if (!filterDate) return true;
            const d = dayjs(s.startedAt);
            return d.year() === filterDate.year()
                && d.month() === filterDate.month()
                && d.date() === filterDate.date();
        })
        .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

    const groups = _groupByDate(history);

    const allHistory = sessions.filter(s => s.status === "finished" || s.status === "cancelled");

    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={null}
            destroyOnClose
            title={
                <Stack gap={8} align="center">
                    <HistoryOutlined style={{ color: "#1677ff" }} />
                    <span>Lịch sử nấu ăn</span>
                </Stack>
            }
            style={{ top: 24 }}
        >
            {allHistory.length === 0 ? (
                <Empty description="Chưa có lịch sử nấu ăn" style={{ padding: "32px 0" }} />
            ) : (
                <>
                    <Stack justify="space-between" align="center" style={{ marginBottom: 10 }}>
                        <DatePicker
                            value={filterDate}
                            onChange={setFilterDate}
                            placeholder="Lọc theo ngày"
                            format="DD/MM/YYYY"
                            allowClear
                            style={{ width: 160 }}
                        />
                        <Popconfirm
                            title="Xoá toàn bộ lịch sử?"
                            okText="Xoá"
                            cancelText="Huỷ"
                            onConfirm={() => dispatch(clearCookingHistory())}
                        >
                            <Button danger icon={<DeleteOutlined />}>Xoá lịch sử</Button>
                        </Popconfirm>
                    </Stack>

                    {groups.length === 0 ? (
                        <Empty
                            description={`Không có lịch sử vào ngày ${filterDate?.format("DD/MM/YYYY")}`}
                            style={{ padding: "24px 0" }}
                        />
                    ) : (
                    <Box style={{ maxHeight: 460, overflowY: "auto" }}>
                        {groups.map(([date, items]) => (
                            <Box key={date}>
                                <Typography.Text type="secondary" style={{ fontSize: 12, fontWeight: 600 }}>
                                    📅 {date}
                                </Typography.Text>
                                <Divider style={{ margin: "6px 0 10px" }} />
                                {items.map(s => {
                                    const isFinished = s.status === "finished";
                                    const dur = _duration(s.startedAt, s.finishedAt);
                                    return (
                                        <Box
                                            key={s.id}
                                            style={{
                                                padding: "10px 12px",
                                                marginBottom: 8,
                                                borderRadius: 10,
                                                background: isFinished ? "#f6ffed" : "#fff1f0",
                                                border: `1px solid ${isFinished ? "#b7eb8f" : "#ffccc7"}`,
                                            }}
                                        >
                                            <Stack justify="space-between" align="flex-start">
                                                <Stack gap={6} align="center">
                                                    {isFinished
                                                        ? <CheckCircleOutlined style={{ color: "#52c41a" }} />
                                                        : <CloseCircleOutlined style={{ color: "#ff4d4f" }} />
                                                    }
                                                    <Typography.Text strong style={{ fontSize: 14 }}>
                                                        {s.dishName}
                                                    </Typography.Text>
                                                </Stack>
                                                <Tag color={isFinished ? "success" : "error"} style={{ marginRight: 0 }}>
                                                    {isFinished ? "Hoàn thành" : "Huỷ"}
                                                </Tag>
                                            </Stack>
                                            <Stack gap={12} style={{ marginTop: 6, paddingLeft: 22 }}>
                                                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                                    🕐 {_formatDate(s.startedAt)}
                                                </Typography.Text>
                                                {dur && (
                                                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                                        ⏱ {dur}
                                                    </Typography.Text>
                                                )}
                                            </Stack>
                                        </Box>
                                    );
                                })}
                            </Box>
                        ))}
                    </Box>
                    )}
                </>
            )}
        </Modal>
    );
};
