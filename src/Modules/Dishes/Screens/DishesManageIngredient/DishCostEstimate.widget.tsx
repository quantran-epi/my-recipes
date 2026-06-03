import { CalculatorOutlined } from "@ant-design/icons";
import { CostEstimateHelper, CostEstimateSummary, IngredientNeedEstimateRow } from "@common/Helpers/CostEstimateHelper";
import { DishServingHelper } from '@common/Helpers/DishServingHelper';
import { IngredientPriceHelper } from "@common/Helpers/IngredientPriceHelper";
import { IngredientUnitHelper } from "@common/Helpers/IngredientUnitHelper";
import { Button } from "@components/Button";
import { Box } from "@components/Layout/Box";
import { Stack } from "@components/Layout/Stack";
import { Modal } from "@components/Modal";
import { Typography } from "@components/Typography";
import { Dishes } from "@store/Models/Dishes";
import { selectDishes, selectIngredients, selectInventory } from "@store/Selectors";
import React, { useMemo, useState } from "react";
import { useSelector } from "react-redux";

type DishCostEstimateWidgetProps = {
    dish: Dishes;
    targetServings?: number;
}

const formatSummary = (summary: CostEstimateSummary, emptyText = "0đ"): string => {
    if (!CostEstimateHelper.hasAny(summary)) return emptyText;
    if (!CostEstimateHelper.hasPrice(summary)) return "Chưa có giá";
    return IngredientPriceHelper.formatRange(summary);
}

const SummaryText: React.FunctionComponent<{ label: string; summary: CostEstimateSummary; primary?: boolean; emptyText?: string }> = ({ label, summary, primary, emptyText }) => {
    return <div style={{ minWidth: 0 }}>
        <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, lineHeight: "16px" }}>
            {label}
        </Typography.Text>
        <Typography.Text strong={primary} style={{ display: "block", color: primary ? "#0958d9" : undefined, fontSize: primary ? 17 : 15, lineHeight: "22px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {formatSummary(summary, emptyText)}
        </Typography.Text>
    </div>
}

const IngredientCoverageRow: React.FunctionComponent<{ row: IngredientNeedEstimateRow }> = ({ row }) => {
    const cost = IngredientPriceHelper.estimateForAmount(row.ingredient, row.missingAmount, row.unit);
    const isAlwaysAvailable = row.ingredient?.alwaysAvailable === true;
    const isCovered = row.missingAmount <= 0;
    const statusColor = isCovered ? "#389e0d" : "#d46b08";
    const statusText = isAlwaysAvailable
        ? "Luôn có"
        : isCovered
            ? "Đủ trong kho"
            : `Thiếu ${IngredientUnitHelper.formatAmount(row.missingAmount)} ${row.unit}`;

    return <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 10, alignItems: "center", width: "100%" }}>
        <div style={{ minWidth: 0 }}>
            <Stack align="center" gap={6} wrap="wrap">
                <Typography.Text strong style={{ lineHeight: "18px" }}>
                    {row.ingredient?.name ?? row.ingredientId}
                </Typography.Text>
                {!row.required && <Typography.Text type="secondary" style={{ fontSize: 11, lineHeight: "16px" }}>Tùy chọn</Typography.Text>}
            </Stack>
            <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, lineHeight: "16px", marginTop: 2 }}>
                Cần {IngredientUnitHelper.formatAmount(row.amount)} {row.unit}
                {!isAlwaysAvailable && ` · Có ${IngredientUnitHelper.formatAmount(row.availableAmount)} ${row.unit}`}
            </Typography.Text>
        </div>
        <div style={{ textAlign: "right", minWidth: 96 }}>
            <Typography.Text strong style={{ display: "block", color: statusColor, fontSize: 12, lineHeight: "16px", whiteSpace: "nowrap" }}>
                {statusText}
            </Typography.Text>
            {!isCovered && <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, lineHeight: "16px", whiteSpace: "nowrap" }}>
                {cost ? IngredientPriceHelper.formatRange(cost) : "Chưa có giá"}
            </Typography.Text>}
        </div>
    </div>
}

type PlannerModalProps = {
    open: boolean;
    onClose: () => void;
    rows: IngredientNeedEstimateRow[];
    missingRequiredSummary: CostEstimateSummary;
    missingOptionalSummary: CostEstimateSummary;
}

const DishEstimatePlannerModal: React.FunctionComponent<PlannerModalProps> = (props) => {
    const missingRows = props.rows.filter(row => row.missingAmount > 0);
    const coveredRows = props.rows.filter(row => row.missingAmount <= 0);

    return <Modal
        open={props.open}
        onCancel={props.onClose}
        footer={null}
        width={760}
        destroyOnClose={false}
        title={<Stack align="center" gap={8}>
            <CalculatorOutlined style={{ color: "#1677ff" }} />
            <span>Dự tính chi phí cần mua</span>
        </Stack>}
    >
        <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", boxSizing: "border-box" }}>
            <Box style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", border: "1px solid #91caff", borderRadius: 8, background: "#f0f7ff" }}>
                <Stack justify="space-between" align="center" gap={12} wrap="wrap" fullwidth>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, flex: 1, minWidth: 0 }}>
                        <SummaryText label="Cần mua bắt buộc" summary={props.missingRequiredSummary} primary emptyText="0đ" />
                        <SummaryText label="Cần mua tùy chọn" summary={props.missingOptionalSummary} emptyText="0đ" />
                    </div>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {missingRows.length} thiếu · {coveredRows.length} đủ
                    </Typography.Text>
                </Stack>
            </Box>

            <Box style={{ width: "100%", boxSizing: "border-box", padding: "12px", border: "1px solid #f0f0f0", borderRadius: 8, background: "#fff" }}>
                <Stack direction="column" align="flex-start" gap={10} fullwidth>
                    <Box>
                        <Typography.Text strong style={{ display: "block" }}>Tình trạng nguyên liệu</Typography.Text>
                        <Typography.Text type="secondary" style={{ display: "block", fontSize: 12 }}>
                            Tính theo tồn kho khả dụng hiện tại, bỏ qua lô đã hết hạn.
                        </Typography.Text>
                    </Box>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", maxHeight: 420, overflowY: "auto", paddingRight: 4, boxSizing: "border-box" }}>
                        {[...missingRows, ...coveredRows].map(row => <Box key={row.ingredientId} style={{ width: "100%", boxSizing: "border-box", padding: "9px 10px", border: "1px solid #f0f0f0", borderRadius: 8, background: row.required ? (row.missingAmount > 0 ? "#fffbe6" : "#fff") : "#f9f0ff" }}>
                            <IngredientCoverageRow row={row} />
                        </Box>)}
                    </div>
                </Stack>
            </Box>
        </div>
    </Modal>
}

export const DishCostEstimateWidget: React.FunctionComponent<DishCostEstimateWidgetProps> = ({ dish, targetServings }) => {
    const ingredients = useSelector(selectIngredients);
    const dishes = useSelector(selectDishes);
    const inventoryItems = useSelector(selectInventory);
    const [plannerOpen, setPlannerOpen] = useState(false);
    const normalizedTargetServings = DishServingHelper.getTargetServings(dish, targetServings);
    const collectedAmounts = useMemo(() => DishServingHelper.collectIngredientAmounts(dish, dishes, { targetServings: normalizedTargetServings }), [dish, dishes, normalizedTargetServings]);
    const estimate = useMemo(() => CostEstimateHelper.estimateIngredientAmounts(collectedAmounts, ingredients), [collectedAmounts, ingredients]);
    const plannerEstimate = useMemo(() => CostEstimateHelper.estimateIngredientAmounts(collectedAmounts, ingredients, { inventoryItems }), [collectedAmounts, ingredients, inventoryItems]);
    const requiredPerServing = CostEstimateHelper.divideSummary(estimate.required, normalizedTargetServings);
    const missingCount = estimate.total.missingPriceCount;
    const shouldShow = CostEstimateHelper.hasAny(estimate.total);

    if (!shouldShow) return null;

    return <React.Fragment>
        <Box style={{
            marginTop: 12,
            marginBottom: 12,
            padding: "10px 12px",
            border: "1px solid #e6f4ff",
            borderRadius: 8,
            background: "#f7fbff",
        }}>
            <Stack direction="column" align="flex-start" gap={8} fullwidth>
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", alignItems: "center", gap: 8, width: "100%" }}>
                    <Stack align="center" gap={6}>
                        <CalculatorOutlined style={{ color: "#1677ff" }} />
                        <Typography.Text strong>Chi phí ước tính</Typography.Text>
                    </Stack>
                    <Button size="small" type="link" icon={<CalculatorOutlined />} onClick={() => setPlannerOpen(true)} style={{ justifySelf: "end", paddingInline: 0, whiteSpace: "nowrap" }}>
                        Cần mua
                    </Button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(138px, 1fr))", gap: 10, width: "100%" }}>
                    <SummaryText label="Tổng bắt buộc" summary={estimate.required} primary />
                    <SummaryText label="Tổng tùy chọn" summary={estimate.optional} emptyText="0đ" />
                    {requiredPerServing && <SummaryText label="Mỗi phần bắt buộc" summary={requiredPerServing} />}
                </div>

                <Stack justify="space-between" align="center" gap={8} wrap="wrap" fullwidth>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        Giá tham khảo theo khoảng giá nguyên liệu.
                    </Typography.Text>
                    {missingCount > 0 && <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        Chưa có giá cho {missingCount} nguyên liệu.
                    </Typography.Text>}
                </Stack>
            </Stack>
        </Box>

        <DishEstimatePlannerModal
            open={plannerOpen}
            onClose={() => setPlannerOpen(false)}
            rows={plannerEstimate.rows}
            missingRequiredSummary={plannerEstimate.missingRequired}
            missingOptionalSummary={plannerEstimate.missingOptional}
        />
    </React.Fragment>
}
