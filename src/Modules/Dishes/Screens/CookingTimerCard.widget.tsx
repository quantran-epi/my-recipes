import React from "react";
import { SoundOutlined, MutedOutlined, PauseCircleOutlined, PlayCircleOutlined, ArrowRightOutlined, CheckCircleOutlined } from "@ant-design/icons";
import { Progress } from "antd";
import { DishDurationHelper } from "@common/Helpers/DishDurationHelper";
import { Button } from "@components/Button";
import { Box } from "@components/Layout/Box";
import { Stack } from "@components/Layout/Stack";
import { Typography } from "@components/Typography";
import { CookingTimerView } from "./useCookingTimer";
import { durationIcon } from "./DishesManageIngredient/DishDuration.widget";

type CookingTimerCardProps = {
    timer: CookingTimerView;
    onAdvanceLast: () => void; // called when the last phase is completed → move to finish
}

const formatClock = (totalSeconds: number): string => {
    const abs = Math.abs(Math.round(totalSeconds));
    const minutes = Math.floor(abs / 60);
    const seconds = abs % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

export const CookingTimerCard: React.FunctionComponent<CookingTimerCardProps> = ({ timer, onAdvanceLast }) => {
    if (!timer.hasTimer || timer.isFinished || !timer.activePhaseKey) return null;

    const activePhase = DishDurationHelper.getPhase(timer.activePhaseKey);
    const completedSet = new Set(timer.completedPhaseKeys);
    const overtime = timer.isOvertime;
    const clockColor = overtime ? "#cf1322" : activePhase.color;

    const _onAdvance = () => {
        if (timer.isLastPhase) onAdvanceLast();
        else timer.advance();
    };

    return <Box style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {/* Phase strip */}
        <Box style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
            {timer.phases.map(p => {
                const phaseMeta = DishDurationHelper.getPhase(p.phaseKey);
                const isActive = p.phaseKey === timer.activePhaseKey;
                const isDone = completedSet.has(p.phaseKey);
                return <span key={p.phaseKey} style={{
                    flexShrink: 0,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "4px 9px",
                    borderRadius: 999,
                    fontSize: 12,
                    lineHeight: "16px",
                    border: `1px solid ${isActive ? phaseMeta.border : isDone ? "#d9d9d9" : "#f0f0f0"}`,
                    background: isActive ? phaseMeta.background : "#fff",
                    color: isActive ? phaseMeta.color : isDone ? "#8c8c8c" : "#595959",
                    fontWeight: isActive ? 600 : 400,
                }}>
                    {isDone && <CheckCircleOutlined style={{ fontSize: 11 }} />}
                    {phaseMeta.shortLabel} {p.plannedMinutes}'
                </span>;
            })}
        </Box>

        {/* Active phase card */}
        <Box style={{
            border: `1px solid ${overtime ? "#ffa39e" : activePhase.border}`,
            borderRadius: 8,
            padding: "14px 14px 12px",
            background: overtime ? "#fff1f0" : activePhase.background,
        }}>
            <Stack justify="space-between" align="center" gap={8}>
                <Stack align="center" gap={8} style={{ minWidth: 0 }}>
                    <span style={{ width: 32, height: 32, borderRadius: 8, background: "#fff", border: `1px solid ${activePhase.border}`, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {durationIcon(activePhase.key, activePhase.color)}
                    </span>
                    <Typography.Text strong style={{ color: activePhase.color, fontSize: 15 }}>{activePhase.label}</Typography.Text>
                </Stack>
                <Button
                    aria-label={timer.soundEnabled ? "Tắt âm" : "Bật âm"}
                    icon={timer.soundEnabled ? <SoundOutlined /> : <MutedOutlined />}
                    onClick={timer.toggleSound}
                    style={{ width: 34, paddingInline: 0, flexShrink: 0 }}
                />
            </Stack>

            <Typography.Text strong style={{
                display: "block",
                textAlign: "center",
                fontSize: 40,
                lineHeight: "48px",
                margin: "6px 0 2px",
                color: clockColor,
                fontVariantNumeric: "tabular-nums",
            }}>
                {overtime ? "+" : ""}{formatClock(timer.remainingSec)}
            </Typography.Text>

            <Progress
                percent={timer.phasePercent}
                showInfo={false}
                strokeColor={clockColor}
                trailColor="rgba(0,0,0,0.06)"
                style={{ marginBottom: 6 }}
            />
            <Typography.Text type="secondary" style={{ display: "block", textAlign: "center", fontSize: 12 }}>
                {overtime
                    ? "Quá giờ dự kiến — nấu theo cảm nhận của bạn"
                    : `Dự kiến ${activePhase.label.toLowerCase()} ${Math.round(timer.activePlannedSec / 60)} phút`}
            </Typography.Text>

            <Stack justify="space-between" align="center" gap={8} style={{ marginTop: 12 }}>
                <Button
                    icon={timer.isPaused ? <PlayCircleOutlined /> : <PauseCircleOutlined />}
                    onClick={timer.isPaused ? timer.resume : timer.pause}
                    style={{ flex: 1 }}
                >
                    {timer.isPaused ? "Tiếp tục" : "Tạm dừng"}
                </Button>
                <Button
                    type="primary"
                    icon={timer.isLastPhase ? <CheckCircleOutlined /> : <ArrowRightOutlined />}
                    onClick={_onAdvance}
                    style={{ flex: 1, background: activePhase.color, borderColor: activePhase.color }}
                >
                    {timer.isLastPhase ? "Xong, hoàn thành" : "Xong giai đoạn"}
                </Button>
            </Stack>
        </Box>
    </Box>;
};
