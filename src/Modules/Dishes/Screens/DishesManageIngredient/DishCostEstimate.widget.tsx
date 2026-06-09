import { CostEstimateHelper, CostEstimateSummary, IngredientAmountCostEstimate } from "@common/Helpers/CostEstimateHelper";
import { DishServingHelper } from "@common/Helpers/DishServingHelper";
import { Button } from "@components/Button";
import { Image } from "@components/Image";
import { Box } from "@components/Layout/Box";
import { Stack } from "@components/Layout/Stack";
import { Typography } from "@components/Typography";
import { useScheduledCalculation } from "@hooks";
import { RootRoutes } from "@routing/RootRoutes";
import { Dishes } from "@store/Models/Dishes";
import { selectDishes, selectIngredients } from "@store/Selectors";
import { Spin } from "antd";
import React, { useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import BudgetIcon from "../../../../../assets/icons/budget.png";
import { CostSummaryText, DishExpensePlannerModal } from "./DishExpensePlanner.widget";

type DishCostEstimateWidgetProps = {
    dish: Dishes;
    targetServings?: number;
}

type DishCostEstimateMetrics = {
    estimate: IngredientAmountCostEstimate;
    requiredPerServing: CostEstimateSummary | null;
    missingCount: number;
    shouldShow: boolean;
}

const createEmptyDishCostEstimateMetrics = (): DishCostEstimateMetrics => {
    return {
        estimate: CostEstimateHelper.emptyIngredientAmountEstimate(),
        requiredPerServing: null,
        missingCount: 0,
        shouldShow: false,
    };
};

const PendingCostEstimate: React.FunctionComponent = () => {
    return <Box style={{ minHeight: 76, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
        <Stack direction="column" align="center" gap={8}>
            <Spin size="small" />
            <Typography.Text type="secondary">Đang tính chi phí...</Typography.Text>
        </Stack>
    </Box>;
};

export const DishCostEstimateWidget: React.FunctionComponent<DishCostEstimateWidgetProps> = ({ dish, targetServings }) => {
    const ingredients = useSelector(selectIngredients);
    const dishes = useSelector(selectDishes);
    const navigate = useNavigate();
    const [plannerOpen, setPlannerOpen] = useState(false);
    const normalizedTargetServings = DishServingHelper.getTargetServings(dish, targetServings);
    const calculateCostEstimate = React.useCallback((): DishCostEstimateMetrics => {
        const collectedAmounts = DishServingHelper.collectIngredientAmounts(dish, dishes, { targetServings: normalizedTargetServings });
        const estimate = CostEstimateHelper.estimateIngredientAmounts(collectedAmounts, ingredients);
        return {
            estimate,
            requiredPerServing: CostEstimateHelper.divideSummary(estimate.required, normalizedTargetServings),
            missingCount: estimate.total.missingPriceCount,
            shouldShow: CostEstimateHelper.hasAny(estimate.total),
        };
    }, [dish, dishes, ingredients, normalizedTargetServings]);
    const { value: costEstimateMetrics, pending: costEstimatePending } = useScheduledCalculation(calculateCostEstimate, {
        initialValue: createEmptyDishCostEstimateMetrics,
    });
    const { estimate, requiredPerServing, missingCount, shouldShow } = costEstimateMetrics;

    const _openFullPlanner = () => {
        setPlannerOpen(false);
        navigate(RootRoutes.AuthorizedRoutes.ExpensePlanner(dish.id, normalizedTargetServings));
    };

    if (!shouldShow && !costEstimatePending) return null;

    return <React.Fragment>
        <Box style={{
            marginTop: 12,
            marginBottom: 12,
            padding: "10px 12px",
            border: "1px solid #e6f4ff",
            borderRadius: 8,
            background: "#f7fbff",
        }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: 8, width: "100%", boxSizing: "border-box" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, flex: 1 }}>
                        <Image src={BudgetIcon} preview={false} width={20} />
                        <Typography.Text strong>Chi phí ước tính</Typography.Text>
                    </div>
                    <Button type="link" onClick={() => setPlannerOpen(true)} style={{ marginLeft: "auto", paddingInline: 0, whiteSpace: "nowrap", flexShrink: 0 }}>
                        Chi tiết
                    </Button>
                </div>

                {costEstimatePending ? <PendingCostEstimate /> : <React.Fragment>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "flex-start", flexWrap: "wrap", gap: 16, width: "100%" }}>
                    <div style={{ flex: "0 1 150px", minWidth: 130 }}>
                        <CostSummaryText label="Tổng bắt buộc" summary={estimate.required} primary />
                    </div>
                    <div style={{ flex: "0 1 150px", minWidth: 130 }}>
                        <CostSummaryText label="Tổng tùy chọn" summary={estimate.optional} emptyText="0đ" />
                    </div>
                    {requiredPerServing && <div style={{ flex: "0 1 170px", minWidth: 150 }}>
                        <CostSummaryText label={`Mỗi phần (${normalizedTargetServings} phần)`} summary={requiredPerServing} />
                    </div>}
                </div>

                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2, width: "100%" }}>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        Giá tham khảo theo khoảng giá nguyên liệu.
                    </Typography.Text>
                    {missingCount > 0 && <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        Chưa có giá cho {missingCount} nguyên liệu.
                    </Typography.Text>}
                </div>
                </React.Fragment>}
            </div>
        </Box>

        <DishExpensePlannerModal
            open={plannerOpen}
            onClose={() => setPlannerOpen(false)}
            initialDish={dish}
            initialTargetServings={normalizedTargetServings}
            allowDishSelection={false}
            onOpenFullPlanner={_openFullPlanner}
        />
    </React.Fragment>
}
