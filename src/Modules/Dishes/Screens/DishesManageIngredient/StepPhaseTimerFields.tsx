import { QuestionCircleOutlined } from "@ant-design/icons";
import { DISH_DURATION_PHASES, DishDurationHelper } from "@common/Helpers/DishDurationHelper";
import { Box } from "@components/Layout/Box";
import { Stack } from "@components/Layout/Stack";
import { Typography } from "@components/Typography";
import { InputNumber } from "antd";
import React, { useState } from "react";
import { Dishes, DishDurationPhaseKey, DishesStep } from "@store/Models/Dishes";

type Props = {
    phaseKey?: DishDurationPhaseKey;
    timerMinutes?: number;
    unattended: boolean;
    onPhaseChange: (key?: DishDurationPhaseKey) => void;
    onTimerChange: (minutes?: number) => void;
    onUnattendedChange: (value: boolean) => void;
    // Used to compute the soft warning when sum of step timers within a phase
    // exceeds the phase total in DishDuration. The current step's content matches by id.
    dish?: Dishes;
    currentStepId?: string;
}

const HINTS: Record<string, string> = {
    phase: "Bước này thuộc giai đoạn nào? Dùng để nhóm và tô màu khi đang nấu.",
    timer: "Khi nào dùng? Bước cần chờ thời gian cụ thể, ví dụ ninh 15 phút.",
    unattended: "Bật để app báo khi xong, ngay cả khi bạn chuyển sang app khác.",
};

export const StepPhaseTimerFields: React.FunctionComponent<Props> = ({
    phaseKey, timerMinutes, unattended, onPhaseChange, onTimerChange, onUnattendedChange, dish, currentStepId,
}) => {
    const [openHelpKey, setOpenHelpKey] = useState<string | null>(null);
    const _toggleHelp = (key: string) => () => setOpenHelpKey(prev => prev === key ? null : key);

    const phaseTotal = phaseKey ? (dish?.duration?.[phaseKey] ?? null) : null;
    const stepsInSamePhase = (dish?.steps ?? []).filter(step => step.phaseKey === phaseKey && step.id !== currentStepId);
    const otherStepMinutes = stepsInSamePhase.reduce((sum, step) => sum + (step.timerMinutes ?? 0), 0);
    const totalStepMinutes = otherStepMinutes + (timerMinutes ?? 0);
    const exceedsPhase = phaseTotal != null && phaseTotal > 0 && totalStepMinutes > phaseTotal;

    return <Box style={{ border: "1px solid #f0f0f0", borderRadius: 8, padding: 10, background: "#fafafa", marginBottom: 12 }}>
        <Stack gap={6} align="center" style={{ marginBottom: 6 }}>
            <Typography.Text strong style={{ fontSize: 13 }}>Giai đoạn</Typography.Text>
            <QuestionCircleOutlined onClick={_toggleHelp("phase")} style={{ cursor: "pointer", color: "#8c8c8c" }} />
        </Stack>
        {openHelpKey === "phase" && <HintLine text={HINTS.phase} />}
        <Stack gap={6} style={{ flexWrap: "wrap", marginBottom: 10 }}>
            <PhaseChip
                label="Chung"
                color="#595959"
                background="#fafafa"
                border="#d9d9d9"
                active={!phaseKey}
                onClick={() => onPhaseChange(undefined)}
            />
            {DISH_DURATION_PHASES.map(p => (
                <PhaseChip
                    key={p.key}
                    label={p.shortLabel}
                    color={p.color}
                    background={p.background}
                    border={p.border}
                    active={phaseKey === p.key}
                    onClick={() => onPhaseChange(p.key)}
                />
            ))}
        </Stack>

        <Stack gap={6} align="center" style={{ marginBottom: 6 }}>
            <Typography.Text strong style={{ fontSize: 13 }}>Hẹn giờ (phút)</Typography.Text>
            <QuestionCircleOutlined onClick={_toggleHelp("timer")} style={{ cursor: "pointer", color: "#8c8c8c" }} />
        </Stack>
        {openHelpKey === "timer" && <HintLine text={HINTS.timer} />}
        <Stack gap={8} align="center" style={{ marginBottom: 10, flexWrap: "wrap" }}>
            <InputNumber
                min={0}
                max={600}
                value={timerMinutes ?? undefined}
                onChange={value => {
                    const numeric = typeof value === "number" && Number.isFinite(value) ? Math.round(value) : undefined;
                    onTimerChange(numeric && numeric > 0 ? numeric : undefined);
                }}
                placeholder="Không hẹn giờ"
                style={{ width: 140 }}
            />
            {timerMinutes && timerMinutes > 0 ? <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                ≈ {DishDurationHelper.formatMinutes(timerMinutes)}
            </Typography.Text> : null}
        </Stack>

        <Stack gap={6} align="center" style={{ marginBottom: 6 }}>
            <Typography.Text strong style={{ fontSize: 13 }}>Không cần đứng bếp</Typography.Text>
            <QuestionCircleOutlined onClick={_toggleHelp("unattended")} style={{ cursor: "pointer", color: "#8c8c8c" }} />
        </Stack>
        {openHelpKey === "unattended" && <HintLine text={HINTS.unattended} />}
        <Stack gap={8} align="center">
            <UnattendedToggle
                disabled={!timerMinutes || timerMinutes < 1}
                value={unattended}
                onChange={onUnattendedChange}
            />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {unattended ? "App sẽ báo khi xong" : timerMinutes ? "Tự đứng bếp, chỉ kêu chuông" : "Cần hẹn giờ trước"}
            </Typography.Text>
        </Stack>

        {exceedsPhase && phaseKey && phaseTotal != null && <Box style={{ marginTop: 8, padding: "6px 10px", border: "1px solid #ffd591", background: "#fff7e6", borderRadius: 6 }}>
            <Typography.Text style={{ fontSize: 12, color: "#d46b08" }}>
                Tổng bước trong giai đoạn “{DishDurationHelper.getPhase(phaseKey).label}” ({totalStepMinutes}') &gt; thời lượng giai đoạn ({phaseTotal}').
            </Typography.Text>
        </Box>}
    </Box>;
};

type PhaseChipProps = {
    label: string;
    color: string;
    background: string;
    border: string;
    active: boolean;
    onClick: () => void;
};

const PhaseChip: React.FunctionComponent<PhaseChipProps> = ({ label, color, background, border, active, onClick }) => {
    return <button
        type="button"
        onClick={onClick}
        style={{
            cursor: "pointer",
            padding: "4px 10px",
            borderRadius: 999,
            border: `1px solid ${active ? color : border}`,
            background: active ? color : background,
            color: active ? "#fff" : color,
            fontSize: 12,
            lineHeight: "18px",
            fontWeight: active ? 600 : 500,
            transition: "all 120ms ease",
        }}
    >
        {active ? "● " : ""}{label}
    </button>;
};

type UnattendedToggleProps = {
    value: boolean;
    onChange: (next: boolean) => void;
    disabled?: boolean;
}

const UnattendedToggle: React.FunctionComponent<UnattendedToggleProps> = ({ value, onChange, disabled }) => {
    return <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(!value)}
        style={{
            cursor: disabled ? "not-allowed" : "pointer",
            padding: "4px 12px",
            borderRadius: 999,
            border: `1px solid ${value ? "#722ed1" : "#d9d9d9"}`,
            background: value ? "#722ed1" : disabled ? "#f5f5f5" : "#fff",
            color: value ? "#fff" : disabled ? "#bfbfbf" : "#595959",
            fontSize: 12,
            lineHeight: "18px",
            fontWeight: value ? 600 : 500,
            opacity: disabled ? 0.7 : 1,
        }}
    >
        {value ? "Đang bật 🔔" : "Tắt"}
    </button>;
};

const HintLine: React.FunctionComponent<{ text: string }> = ({ text }) => {
    return <Box style={{ marginBottom: 8, padding: "6px 10px", background: "#f6ffed", border: "1px solid #b7eb8f", borderRadius: 6 }}>
        <Typography.Text type="secondary" style={{ fontSize: 12, color: "#389e0d" }}>{text}</Typography.Text>
    </Box>;
};

export const StepPhaseTimerFieldsHelper = {
    normalizeStep<T extends Partial<DishesStep>>(step: T): T {
        const next = { ...step };
        if (!next.phaseKey) delete next.phaseKey;
        if (!next.timerMinutes || next.timerMinutes < 1) {
            delete next.timerMinutes;
            delete next.unattended;
        } else {
            next.timerMinutes = Math.min(600, Math.round(next.timerMinutes));
            if (!next.unattended) delete next.unattended;
        }
        return next;
    },
};
