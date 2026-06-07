import { IngredientNutritionInfo, IngredientUnit } from "@store/Models/Ingredient";
import { Option, Select } from "@components/Form/Select";
import { Stack } from "@components/Layout/Stack";
import { Typography } from "@components/Typography";
import { InputNumber } from "antd";
import React from "react";

type IngredientNutritionEditorProps = {
    value: Partial<IngredientNutritionInfo>;
    unitOptions: IngredientUnit[];
    onChange: (value: Partial<IngredientNutritionInfo>) => void;
}

const uniqueUnits = (units: Array<IngredientUnit | undefined>): IngredientUnit[] => Array.from(new Set(units.filter(Boolean) as IngredientUnit[]));

const fieldStyle: React.CSSProperties = {
    minWidth: 0,
};

const labelStyle: React.CSSProperties = {
    display: "block",
    marginBottom: 4,
    color: "#6b7280",
    fontSize: 11,
    lineHeight: "14px",
};

const gridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(118px, 1fr))",
    gap: 8,
    width: "100%",
};

const metricInputStyle: React.CSSProperties = {
    width: "100%",
};

export const IngredientNutritionEditor: React.FC<IngredientNutritionEditorProps> = ({ value, unitOptions, onChange }) => {
    const units = uniqueUnits([...(unitOptions ?? []), value.unit, "g", "ml"]);

    const _patch = (patch: Partial<IngredientNutritionInfo>) => {
        onChange({
            amount: 100,
            unit: "g",
            ...value,
            ...patch,
        });
    };

    const _renderMetric = (label: string, key: keyof IngredientNutritionInfo, suffix: string, step = 0.1) => (
        <div style={fieldStyle}>
            <Typography.Text style={labelStyle}>{label}</Typography.Text>
            <InputNumber
                min={0}
                step={step}
                value={value[key] as number | undefined}
                addonAfter={suffix}
                onChange={next => _patch({ [key]: next ?? undefined } as Partial<IngredientNutritionInfo>)}
                style={metricInputStyle}
            />
        </div>
    );

    return <div style={{ padding: 10, border: "1px solid rgba(116,54,220,0.12)", borderRadius: 8, background: "linear-gradient(135deg, #fbf9ff 0%, #ffffff 70%)", marginBottom: 12 }}>
        <Stack direction="column" align="flex-start" gap={9} fullwidth>
            <Stack justify="space-between" align="center" fullwidth gap={8} wrap="wrap">
                <div>
                    <Typography.Text strong>Dinh dưỡng tham khảo</Typography.Text>
                    <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, lineHeight: "16px" }}>Nhập giá trị theo lượng quy đổi bên dưới.</Typography.Text>
                </div>
                <Stack gap={6} align="center">
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>Mỗi</Typography.Text>
                    <InputNumber
                        min={0.01}
                        step={10}
                        value={value.amount ?? 100}
                        onChange={next => _patch({ amount: next ?? undefined })}
                        style={{ width: 82 }}
                    />
                    <Select value={value.unit ?? "g"} onChange={(unit: IngredientUnit) => _patch({ unit })} style={{ width: 82 }}>
                        {units.map(unit => <Option key={unit} value={unit}>{unit}</Option>)}
                    </Select>
                </Stack>
            </Stack>
            <div style={gridStyle}>
                {_renderMetric("Năng lượng", "calories", "kcal", 1)}
                {_renderMetric("Đạm", "protein", "g")}
                {_renderMetric("Tinh bột", "carbs", "g")}
                {_renderMetric("Chất béo", "fat", "g")}
                {_renderMetric("Chất xơ", "fiber", "g")}
                {_renderMetric("Đường", "sugar", "g")}
                {_renderMetric("Natri", "sodium", "mg", 1)}
            </div>
        </Stack>
    </div>;
};
