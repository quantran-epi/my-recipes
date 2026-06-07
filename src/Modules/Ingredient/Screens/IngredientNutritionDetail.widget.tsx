import { Ingredient } from "@store/Models/Ingredient";
import { IngredientNutritionHelper } from "@common/Helpers/IngredientNutritionHelper";
import { Button } from "@components/Button";
import { Box } from "@components/Layout/Box";
import { Stack } from "@components/Layout/Stack";
import { Typography } from "@components/Typography";
import { LinkOutlined } from "@ant-design/icons";
import React from "react";

type IngredientNutritionDetailProps = {
    ingredient: Ingredient;
}

const metricCardStyle: React.CSSProperties = {
    border: "1px solid #f0f0f0",
    borderRadius: 8,
    background: "#fafafa",
    padding: "8px 9px",
    minWidth: 0,
};

const metricLabelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 11,
    lineHeight: "14px",
};

const metricValueStyle: React.CSSProperties = {
    display: "block",
    fontSize: 14,
    lineHeight: "19px",
};

export const IngredientNutritionDetail: React.FC<IngredientNutritionDetailProps> = ({ ingredient }) => {
    const nutrition = IngredientNutritionHelper.getNutrition(ingredient);
    if (!nutrition) {
        return <Typography.Text type="secondary">Chưa có dữ liệu dinh dưỡng cho nguyên liệu này.</Typography.Text>;
    }

    const metrics = [
        { label: "Năng lượng", value: IngredientNutritionHelper.formatCalories(nutrition.calories), highlight: true },
        { label: "Đạm", value: IngredientNutritionHelper.formatMacro(nutrition.protein) },
        { label: "Tinh bột", value: IngredientNutritionHelper.formatMacro(nutrition.carbs) },
        { label: "Chất béo", value: IngredientNutritionHelper.formatMacro(nutrition.fat) },
        { label: "Béo bão hòa", value: IngredientNutritionHelper.formatMacro(nutrition.saturatedFat) },
        { label: "Cholesterol", value: IngredientNutritionHelper.formatMacro(nutrition.cholesterol, "mg") },
        { label: "Chất xơ", value: IngredientNutritionHelper.formatMacro(nutrition.fiber) },
        { label: "Đường", value: IngredientNutritionHelper.formatMacro(nutrition.sugar) },
        { label: "Natri", value: IngredientNutritionHelper.formatMacro(nutrition.sodium, "mg") },
        { label: "Kali", value: IngredientNutritionHelper.formatMacro(nutrition.potassium, "mg") },
        { label: "Canxi", value: IngredientNutritionHelper.formatMacro(nutrition.calcium, "mg") },
        { label: "Sắt", value: IngredientNutritionHelper.formatMacro(nutrition.iron, "mg") },
        { label: "Vitamin A", value: IngredientNutritionHelper.formatMacro(nutrition.vitaminA, "µg") },
        { label: "Vitamin C", value: IngredientNutritionHelper.formatMacro(nutrition.vitaminC, "mg") },
    ];

    return <Stack direction="column" align="stretch" gap={12} fullwidth>
        <Box style={{ border: "1px solid rgba(116,54,220,0.12)", borderRadius: 8, padding: 12, background: "linear-gradient(135deg, #fbf9ff 0%, #ffffff 72%)" }}>
            <Stack justify="space-between" align="center" gap={8} wrap="wrap">
                <div>
                    <Typography.Text strong>Dinh dưỡng</Typography.Text>
                    <Typography.Text type="secondary" style={{ display: "block", fontSize: 12 }}>Mỗi {IngredientNutritionHelper.formatBasis(nutrition)}</Typography.Text>
                </div>
                <Typography.Text strong style={{ color: "#7436dc", fontSize: 18 }}>{IngredientNutritionHelper.formatCalories(nutrition.calories)}</Typography.Text>
            </Stack>
        </Box>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(98px, 1fr))", gap: 8 }}>
            {metrics.map(item => <div key={item.label} style={{ ...metricCardStyle, background: item.highlight ? "#fbf9ff" : metricCardStyle.background, borderColor: item.highlight ? "rgba(116,54,220,0.16)" : "#f0f0f0" }}>
                <Typography.Text type="secondary" style={metricLabelStyle}>{item.label}</Typography.Text>
                <Typography.Text strong style={{ ...metricValueStyle, color: item.highlight ? "#7436dc" : undefined }}>{item.value}</Typography.Text>
            </div>)}
        </div>

        <Box style={{ border: "1px solid #f0f0f0", borderRadius: 8, background: "#fff", padding: 10 }}>
            <Typography.Text strong>Nguồn dữ liệu</Typography.Text>
            <Stack direction="column" align="stretch" gap={8} style={{ marginTop: 8 }}>
                {(nutrition.sources ?? []).length === 0 && <Typography.Text type="secondary" style={{ fontSize: 12 }}>Chưa lưu nguồn dữ liệu.</Typography.Text>}
                {(nutrition.sources ?? []).map((source, index) => <div key={`${source.name}-${index}`} style={{ border: "1px solid #f5f5f5", borderRadius: 8, background: "#fafafa", padding: "8px 9px" }}>
                    <Stack justify="space-between" align="flex-start" gap={8} wrap="wrap">
                        <div style={{ minWidth: 0 }}>
                            <Typography.Text strong style={{ display: "block", fontSize: 13 }}>{source.name}</Typography.Text>
                            {source.matchedName && <Typography.Text type="secondary" style={{ display: "block", fontSize: 12 }}>Khớp: {source.matchedName}</Typography.Text>}
                            {source.sourceFoodId && <Typography.Text type="secondary" style={{ display: "block", fontSize: 12 }}>Mã nguồn: {source.sourceFoodId}</Typography.Text>}
                            <Typography.Text type="secondary" style={{ display: "block", fontSize: 12 }}>{IngredientNutritionHelper.confidenceLabel(source.confidence)}</Typography.Text>
                            {source.note && <Typography.Text type="secondary" style={{ display: "block", fontSize: 12 }}>{source.note}</Typography.Text>}
                        </div>
                        <Button type="text" icon={<LinkOutlined />} onClick={() => window.open(source.url, "_blank", "noopener,noreferrer")} />
                    </Stack>
                </div>)}
            </Stack>
        </Box>
    </Stack>;
};
