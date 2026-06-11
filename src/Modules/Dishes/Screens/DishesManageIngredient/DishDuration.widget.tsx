import { ClockCircleOutlined, CoffeeOutlined, FireOutlined, HourglassOutlined, PauseCircleOutlined, ToolOutlined } from "@ant-design/icons";
import { DishDurationHelper } from "@common/Helpers/DishDurationHelper";
import { Button } from "@components/Button";
import { InputNumber } from "@components/Form/InputNumber";
import { Switch } from "@components/Form/Switch";
import { Box } from "@components/Layout/Box";
import { Space } from "@components/Layout/Space";
import { Stack } from "@components/Layout/Stack";
import { Typography } from "@components/Typography";
import { DishDuration, DishDurationPhaseKey, Dishes } from "@store/Models/Dishes";
import { DishesDurationEditParams } from "@store/Reducers/DishesReducer";
import { Progress } from "antd";
import React, { FunctionComponent, useEffect, useMemo, useState } from "react";

type DishDurationEditorProps = {
    value?: Partial<DishDuration> | null;
    onChange: (value: DishDuration) => void;
}

type DishDurationWidgetProps = {
    dish: Dishes;
    onSave: (value: DishesDurationEditParams) => void;
}

export const durationIcon = (key: DishDurationPhaseKey, color: string) => {
    const style: React.CSSProperties = { color, fontSize: 16 };
    switch (key) {
        case "unfreeze": return <HourglassOutlined style={style} />;
        case "prepare": return <ToolOutlined style={style} />;
        case "cooking": return <FireOutlined style={style} />;
        case "serve": return <CoffeeOutlined style={style} />;
        case "cooldown": return <PauseCircleOutlined style={style} />;
        default: return <ClockCircleOutlined style={style} />;
    }
};

const quickMinuteOptions = [5, 10, 15, 20, 30, 45];

const getActivePhaseKeys = (duration: DishDuration): Set<DishDurationPhaseKey> => {
    return new Set(DishDurationHelper.getActiveItems(duration).map(item => item.phase.key));
};

export const DishDurationEditor: FunctionComponent<DishDurationEditorProps> = ({ value, onChange }) => {
    const duration = useMemo(() => DishDurationHelper.normalize(value), [value]);
    const [activePhaseKeys, setActivePhaseKeys] = useState<Set<DishDurationPhaseKey>>(() => getActivePhaseKeys(duration));
    const activeItems = useMemo(() => DishDurationHelper.getActiveItems(duration), [duration]);
    const totalMinutes = useMemo(() => DishDurationHelper.getTotalMinutes(duration), [duration]);
    const tempo = DishDurationHelper.getTempo(totalMinutes);
    const activeCount = activeItems.length;

    const _updateDuration = (next: Partial<DishDuration>) => {
        onChange(DishDurationHelper.normalize({ ...duration, ...next }));
    };

    const _setPhaseActive = (key: DishDurationPhaseKey, active: boolean) => {
        const phase = DishDurationHelper.getPhase(key);
        setActivePhaseKeys(previous => {
            const next = new Set(previous);
            active ? next.add(key) : next.delete(key);
            return next;
        });
        _updateDuration({ [key]: active ? (duration[key] ?? phase.defaultMinutes) : null });
    };

    const _setPhaseMinutes = (key: DishDurationPhaseKey, minutes: number | null) => {
        setActivePhaseKeys(previous => {
            const next = new Set(previous);
            next.add(key);
            return next;
        });
        _updateDuration({ [key]: minutes && minutes > 0 ? Math.round(minutes) : null });
    };

    const _applyPreset = (nextDuration: DishDuration) => {
        setActivePhaseKeys(getActivePhaseKeys(nextDuration));
        onChange(nextDuration);
    };

    return <Stack direction="column" gap={10} style={{ width: "100%" }}>
        <Box style={{
            border: `1px solid ${tempo.border}`,
            borderRadius: 8,
            padding: 12,
            background: `linear-gradient(135deg, ${tempo.background} 0%, #fff 72%)`,
        }}>
            <Stack justify="space-between" align="flex-start" gap={10}>
                <Stack align="center" gap={9} style={{ minWidth: 0 }}>
                    <span style={{ width: 36, height: 36, borderRadius: 8, background: "#fff", border: `1px solid ${tempo.border}`, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <ClockCircleOutlined style={{ color: tempo.color, fontSize: 18 }} />
                    </span>
                    <div style={{ minWidth: 0 }}>
                        <Typography.Text strong style={{ display: "block", color: tempo.color, lineHeight: "19px" }}>Tổng thời lượng</Typography.Text>
                        <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, lineHeight: "16px" }}>
                            {activeCount > 0 ? `${activeCount} giai đoạn đang dùng` : "Chưa nhập thời gian cho món này"}
                        </Typography.Text>
                    </div>
                </Stack>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <Typography.Text strong style={{ display: "block", color: tempo.color, fontSize: 20, lineHeight: "24px" }}>{DishDurationHelper.formatMinutes(totalMinutes)}</Typography.Text>
                    <Typography.Text type="secondary" style={{ display: "block", fontSize: 12 }}>{tempo.label}</Typography.Text>
                </div>
            </Stack>
            <Progress
                percent={Math.min(100, Math.round(totalMinutes / 120 * 100))}
                showInfo={false}
                strokeColor={tempo.color}
                trailColor="rgba(0,0,0,0.06)"
                style={{ marginTop: 8 }}
            />
        </Box>

        <Box style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "stretch" }}>
            {DishDurationHelper.presets.map(preset => {
                const presetTotal = DishDurationHelper.getTotalMinutes(preset.duration);
                return <button
                    key={preset.label}
                    type="button"
                    onClick={() => _applyPreset(preset.duration)}
                    style={{
                        flex: "1 1 118px",
                        minWidth: 118,
                        padding: "9px 10px",
                        borderRadius: 8,
                        border: "1px solid #e8ddff",
                        background: "#fbf9ff",
                        cursor: "pointer",
                        textAlign: "left",
                    }}
                >
                    <Typography.Text strong style={{ display: "block", color: "#7436dc", fontSize: 12.5, lineHeight: "17px" }}>{preset.label}</Typography.Text>
                    <Typography.Text type="secondary" style={{ display: "block", fontSize: 11, lineHeight: "15px" }}>{DishDurationHelper.formatMinutes(presetTotal)}</Typography.Text>
                </button>;
            })}
            <button
                type="button"
                onClick={() => _applyPreset(DishDurationHelper.createEmpty())}
                style={{
                    flex: "1 1 118px",
                    minWidth: 118,
                    padding: "9px 10px",
                    borderRadius: 8,
                    border: "1px dashed #d9d9d9",
                    background: "#fff",
                    cursor: "pointer",
                    textAlign: "left",
                }}
            >
                <Typography.Text strong style={{ display: "block", color: "#595959", fontSize: 12.5, lineHeight: "17px" }}>Xóa thời lượng</Typography.Text>
                <Typography.Text type="secondary" style={{ display: "block", fontSize: 11, lineHeight: "15px" }}>Đặt lại về trống</Typography.Text>
            </button>
        </Box>

        <Stack direction="column" gap={8}>
            {DishDurationHelper.phases.map(phase => {
                const minutes = duration[phase.key];
                const active = activePhaseKeys.has(phase.key);
                return <Box key={phase.key} style={{
                    border: `1px solid ${active ? phase.border : "#f0f0f0"}`,
                    borderRadius: 8,
                    padding: 10,
                    background: active ? phase.background : "#fff",
                }}>
                    <Stack align="flex-start" justify="space-between" gap={10} style={{ width: "100%" }}>
                        <Stack align="flex-start" gap={9} style={{ minWidth: 0 }}>
                            <span style={{ width: 32, height: 32, borderRadius: 8, background: "#fff", border: `1px solid ${active ? phase.border : "#f0f0f0"}`, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                {durationIcon(phase.key, active ? phase.color : "#8c8c8c")}
                            </span>
                            <div style={{ minWidth: 0 }}>
                                <Typography.Text strong style={{ display: "block", color: active ? phase.color : "#262626", lineHeight: "18px" }}>{phase.label}</Typography.Text>
                                <Typography.Text type="secondary" style={{ display: "block", fontSize: 11, lineHeight: "15px" }}>{phase.description}</Typography.Text>
                            </div>
                        </Stack>
                        <Switch checked={active} onChange={(checked) => _setPhaseActive(phase.key, checked)} />
                    </Stack>

                    {active && <Box style={{ marginTop: 9, paddingLeft: 41 }}>
                        <Stack align="center" gap={8} wrap="wrap">
                            <InputNumber
                                min={1}
                                max={480}
                                step={5}
                                value={minutes ?? undefined}
                                addonAfter="phút"
                                onChange={(nextValue) => _setPhaseMinutes(phase.key, typeof nextValue === "number" ? nextValue : null)}
                                style={{ width: 132 }}
                            />
                            <Space size={[5, 5]} wrap>
                                {quickMinuteOptions.map(option => <Button
                                    key={option}
                                    type={minutes === option ? "primary" : "default"}
                                    onClick={() => _setPhaseMinutes(phase.key, option)}
                                    style={{ height: 30, borderRadius: 999, paddingInline: 10, fontSize: 12 }}
                                >
                                    {option}'
                                </Button>)}
                            </Space>
                        </Stack>
                    </Box>}
                </Box>;
            })}
        </Stack>
    </Stack>;
};

export const DishDurationWidget: FunctionComponent<DishDurationWidgetProps> = (props) => {
    const [duration, setDuration] = useState<DishDuration>(() => DishDurationHelper.normalize(props.dish.duration));

    useEffect(() => {
        setDuration(DishDurationHelper.normalize(props.dish.duration));
    }, [props.dish]);

    const _onSave = () => {
        props.onSave({ dishId: props.dish.id, duration: DishDurationHelper.normalize(duration) });
    };

    return <Stack direction="column" gap={12} style={{ width: "100%" }}>
        <DishDurationEditor key={props.dish.id} value={duration} onChange={setDuration} />
        <Stack justify="flex-end">
            <Button type="primary" onClick={_onSave}>Lưu thời lượng</Button>
        </Stack>
    </Stack>;
};
