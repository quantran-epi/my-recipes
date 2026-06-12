import React from "react";
import { PauseCircleOutlined, PlayCircleOutlined, ForwardOutlined, BellOutlined, NotificationOutlined } from "@ant-design/icons";
import { Progress } from "antd";
import { DishDurationHelper } from "@common/Helpers/DishDurationHelper";
import { Button } from "@components/Button";
import { Box } from "@components/Layout/Box";
import { Stack } from "@components/Layout/Stack";
import { Typography } from "@components/Typography";
import { StepTimerView } from "./useStepTimer";

type Props = {
    timer: StepTimerView;
}

const formatClock = (totalSeconds: number): string => {
    const abs = Math.abs(Math.round(totalSeconds));
    const minutes = Math.floor(abs / 60);
    const seconds = abs % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

export const StepTimerCard: React.FunctionComponent<Props> = ({ timer }) => {
    if (!timer.hasTimer || timer.isFinished) return null;

    const phaseMeta = timer.phaseKey ? DishDurationHelper.getPhase(timer.phaseKey) : null;
    const overtime = timer.isOvertime;
    const accent = phaseMeta?.color ?? "#722ed1";
    const accentBg = phaseMeta?.background ?? "#f9f0ff";
    const accentBorder = phaseMeta?.border ?? "#d3adf7";
    const clockColor = overtime ? "#cf1322" : accent;

    return <Box style={{
        border: `1px solid ${overtime ? "#ffa39e" : accentBorder}`,
        borderRadius: 8,
        padding: "12px 14px",
        background: overtime ? "#fff1f0" : accentBg,
    }}>
        <Stack justify="space-between" align="center" gap={8}>
            <Stack align="center" gap={6} style={{ minWidth: 0, flex: 1 }}>
                <BellOutlined style={{ color: accent, fontSize: 16 }} />
                <Typography.Text strong style={{ color: accent, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {phaseMeta ? `${phaseMeta.label} · ` : ""}Hẹn giờ bước
                </Typography.Text>
            </Stack>
            {timer.unattended && <Typography.Text style={{ fontSize: 11, color: accent, display: "inline-flex", alignItems: "center", gap: 4 }}>
                <NotificationOutlined /> Tự rảnh tay
            </Typography.Text>}
        </Stack>

        <Typography.Text style={{ display: "block", fontSize: 13, marginTop: 4, marginBottom: 6, color: "#262626", overflowWrap: "anywhere" }}>
            {timer.stepContent}
        </Typography.Text>

        <Typography.Text strong style={{
            display: "block",
            textAlign: "center",
            fontSize: 36,
            lineHeight: "44px",
            margin: "2px 0",
            color: clockColor,
            fontVariantNumeric: "tabular-nums",
        }}>
            {overtime ? "+" : ""}{formatClock(timer.remainingSec)}
        </Typography.Text>

        <Progress
            percent={timer.progressPercent}
            showInfo={false}
            strokeColor={clockColor}
            trailColor="rgba(0,0,0,0.06)"
            style={{ marginBottom: 4 }}
        />
        <Typography.Text type="secondary" style={{ display: "block", textAlign: "center", fontSize: 12 }}>
            {overtime
                ? (timer.unattended ? "Đã báo — kiểm tra món của bạn" : "Hết giờ — kiểm tra món của bạn")
                : `Dự kiến ${Math.round(timer.plannedSec / 60)} phút`}
        </Typography.Text>

        <Stack justify="space-between" align="center" gap={6} style={{ marginTop: 10 }}>
            <Button
                icon={timer.isPaused ? <PlayCircleOutlined /> : <PauseCircleOutlined />}
                onClick={timer.isPaused ? timer.resume : timer.pause}
                style={{ flex: 1 }}
            >
                {timer.isPaused ? "Tiếp tục" : "Tạm dừng"}
            </Button>
            <Button
                onClick={() => timer.extend(1)}
                style={{ flex: 1 }}
            >
                +1 phút
            </Button>
            <Button
                icon={<ForwardOutlined />}
                onClick={timer.skip}
                style={{ flex: 1 }}
            >
                Bỏ qua
            </Button>
        </Stack>
    </Box>;
};
