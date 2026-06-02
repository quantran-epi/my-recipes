import { CalculatorOutlined } from "@ant-design/icons";
import { CostEstimateHelper, CostEstimateSummary } from "@common/Helpers/CostEstimateHelper";
import { IngredientPriceHelper } from "@common/Helpers/IngredientPriceHelper";
import { Box } from "@components/Layout/Box";
import { Stack } from "@components/Layout/Stack";
import { Typography } from "@components/Typography";
import { Dishes } from "@store/Models/Dishes";
import { selectDishes, selectIngredients } from "@store/Selectors";
import React, { useMemo } from "react";
import { useSelector } from "react-redux";

import { DishServingHelper } from '@common/Helpers/DishServingHelper';

type DishCostEstimateWidgetProps = {
    dish: Dishes;
    targetServings?: number;
}

const formatSummary = (summary: CostEstimateSummary): string => {
    if (!CostEstimateHelper.hasPrice(summary)) return "Chưa có giá";
    return IngredientPriceHelper.formatRange(summary);
}

const Metric: React.FunctionComponent<{ label: string; summary: CostEstimateSummary; tone: "primary" | "muted" }> = ({ label, summary, tone }) => {
    const isPrimary = tone === "primary";

    return <div style={{ minWidth: 0 }}>
        <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, marginBottom: 2 }}>
            {label}
        </Typography.Text>
        <Typography.Text strong={isPrimary} style={{ color: isPrimary ? "#0958d9" : undefined, fontSize: isPrimary ? 15 : 14 }}>
            {formatSummary(summary)}
        </Typography.Text>
    </div>
}

export const DishCostEstimateWidget: React.FunctionComponent<DishCostEstimateWidgetProps> = ({ dish, targetServings }) => {
    const ingredients = useSelector(selectIngredients);
    const dishes = useSelector(selectDishes);
    const normalizedTargetServings = DishServingHelper.getTargetServings(dish, targetServings);
    const estimate = useMemo(() => CostEstimateHelper.estimateDish(dish, ingredients, dishes, normalizedTargetServings), [dish, ingredients, dishes, normalizedTargetServings]);
    const requiredPerServing = normalizedTargetServings > 0 && CostEstimateHelper.hasPrice(estimate.required)
        ? {
            min: estimate.required.min / normalizedTargetServings,
            max: estimate.required.max / normalizedTargetServings,
            currency: estimate.required.currency,
            itemCount: estimate.required.itemCount,
            pricedCount: estimate.required.pricedCount,
            missingPriceCount: estimate.required.missingPriceCount,
        }
        : null;
    const missingCount = estimate.total.missingPriceCount;
    const shouldShow = CostEstimateHelper.hasAny(estimate.total);

    if (!shouldShow) return null;

    return <Box style={{
        marginTop: 12,
        marginBottom: 12,
        padding: "10px 12px",
        border: "1px solid #e6f4ff",
        borderRadius: 8,
        background: "#f7fbff",
    }}>
        <Stack direction="column" align="flex-start" gap={8} fullwidth>
            <Stack justify="space-between" align="center" gap={8} wrap="wrap" fullwidth>
                <Stack align="center" gap={6}>
                    <CalculatorOutlined style={{ color: "#1677ff" }} />
                    <Typography.Text strong>Chi phí ước tính</Typography.Text>
                </Stack>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    Giá tham khảo
                </Typography.Text>
            </Stack>

            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                gap: 10,
                width: "100%",
            }}>
                <Metric label="Bắt buộc" summary={estimate.required} tone="primary" />
                {CostEstimateHelper.hasAny(estimate.optional) && <Metric label="Tùy chọn" summary={estimate.optional} tone="muted" />}
                {requiredPerServing && <Metric label="Mỗi phần" summary={requiredPerServing} tone="muted" />}
            </div>

            {missingCount > 0 && <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Chưa có giá cho {missingCount} nguyên liệu.
            </Typography.Text>}
        </Stack>
    </Box>
}
