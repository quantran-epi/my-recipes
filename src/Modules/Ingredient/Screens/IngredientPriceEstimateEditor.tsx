import { Option, Select } from "@components/Form/Select";
import { Stack } from "@components/Layout/Stack";
import { Typography } from "@components/Typography";
import { IngredientPriceEstimate, IngredientUnit } from "@store/Models/Ingredient";
import { InputNumber } from "antd";
import React from "react";

type IngredientPriceEstimateEditorProps = {
    value: Partial<IngredientPriceEstimate>;
    unitOptions: IngredientUnit[];
    onChange: (value: Partial<IngredientPriceEstimate>) => void;
}

const uniqueUnits = (units: IngredientUnit[]): IngredientUnit[] => Array.from(new Set(units.filter(Boolean)));

export const IngredientPriceEstimateEditor: React.FC<IngredientPriceEstimateEditorProps> = ({ value, unitOptions, onChange }) => {
    const units = uniqueUnits([...(unitOptions ?? []), value.unit]);
    const _patch = (patch: Partial<IngredientPriceEstimate>) => {
        onChange({
            amount: 1,
            currency: "VND",
            ...value,
            ...patch,
        });
    }

    return <div style={{ padding: 10, border: "1px solid #f0f0f0", borderRadius: 8, background: "#fafafa", marginBottom: 12 }}>
        <Stack direction="column" align="flex-start" gap={8} fullwidth>
            <Typography.Text strong>Khoảng giá tham khảo</Typography.Text>
            <Stack gap={8} wrap="wrap" fullwidth>
                <InputNumber
                    min={0}
                    step={1000}
                    value={value.min}
                    placeholder="Giá thấp"
                    onChange={next => _patch({ min: next ?? undefined })}
                    style={{ width: 120 }}
                />
                <InputNumber
                    min={0}
                    step={1000}
                    value={value.max}
                    placeholder="Giá cao"
                    onChange={next => _patch({ max: next ?? undefined })}
                    style={{ width: 120 }}
                />
                <Typography.Text type="secondary" style={{ alignSelf: "center" }}>cho</Typography.Text>
                <InputNumber
                    min={0}
                    value={value.amount ?? 1}
                    onChange={next => _patch({ amount: next ?? undefined })}
                    style={{ width: 80 }}
                />
                <Select value={value.unit} onChange={(unit: IngredientUnit) => _patch({ unit })} style={{ width: 90 }}>
                    {units.map(unit => <Option key={unit} value={unit}>{unit}</Option>)}
                </Select>
                <Typography.Text type="secondary" style={{ alignSelf: "center" }}>VND</Typography.Text>
            </Stack>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Dùng để ước tính chi phí mua sắm, không phải giá thời gian thực.
            </Typography.Text>
        </Stack>
    </div>
}
