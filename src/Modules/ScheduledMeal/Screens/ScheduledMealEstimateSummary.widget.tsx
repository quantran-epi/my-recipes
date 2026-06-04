import { CostEstimateHelper, CostEstimateSummary, IngredientNeedEstimateRow } from "@common/Helpers/CostEstimateHelper";
import { DishServingHelper } from "@common/Helpers/DishServingHelper";
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

type ScheduledMealEstimateSummaryProps = {
    dishIds: string[];
    title?: string;
    maxRows?: number;
    defaultExpanded?: boolean;
}

const formatCost = (summary: CostEstimateSummary, emptyText = "0đ"): string => {
    if (!CostEstimateHelper.hasAny(summary)) return emptyText;
    if (!CostEstimateHelper.hasPrice(summary)) return "Chưa có giá";
    return IngredientPriceHelper.formatRange(summary);
}

const rowStatus = (row: IngredientNeedEstimateRow): { label: string; color: string } => {
    if (row.ingredient?.alwaysAvailable) return { label: "Luôn có", color: "#389e0d" };
    if (row.missingAmount <= 0) return { label: "Đủ trong kho", color: "#389e0d" };
    return { label: `Thiếu ${IngredientUnitHelper.formatAmount(row.missingAmount)} ${row.unit}`, color: "#d46b08" };
}

export const ScheduledMealEstimateSummary: React.FunctionComponent<ScheduledMealEstimateSummaryProps> = ({ dishIds, title = "Ước tính cho thực đơn", defaultExpanded = false }) => {
    const dishes = useSelector(selectDishes);
    const ingredients = useSelector(selectIngredients);
    const inventoryItems = useSelector(selectInventory);
    const [detailOpen, setDetailOpen] = useState(defaultExpanded);

    const selectedDishes = useMemo<Dishes[]>(() => {
        return dishIds
            .map(id => dishes.find(item => item.id === id))
            .filter((item): item is Dishes => Boolean(item));
    }, [dishIds, dishes]);

    const estimate = useMemo(() => {
        const amounts = selectedDishes.flatMap(dish => DishServingHelper.collectIngredientAmounts(dish, dishes));
        return CostEstimateHelper.estimateIngredientAmounts(amounts, ingredients, { inventoryItems });
    }, [selectedDishes, dishes, ingredients, inventoryItems]);

    const rows = useMemo(() => estimate.rows.slice().sort((a, b) => {
        if ((a.missingAmount > 0) !== (b.missingAmount > 0)) return a.missingAmount > 0 ? -1 : 1;
        if (a.required !== b.required) return a.required ? -1 : 1;
        return (a.ingredient?.name ?? a.ingredientId).localeCompare(b.ingredient?.name ?? b.ingredientId);
    }), [estimate.rows]);

    if (selectedDishes.length === 0) return null;

    const missingRows = rows.filter(row => row.missingAmount > 0);
    const coveredRows = rows.filter(row => row.missingAmount <= 0);

    const summaryRows = <div style={{ display: "flex", flexDirection: "column", gap: 5, paddingTop: 2 }}>
        <div style={{ display: "grid", gridTemplateColumns: "76px minmax(0, 1fr)", gap: 8, alignItems: "start" }}>
            <Typography.Text type="secondary" style={{ fontSize: 12, lineHeight: "18px", whiteSpace: "nowrap" }}>Tổng</Typography.Text>
            <Typography.Text style={{ display: "block", fontSize: 12, lineHeight: "18px", overflowWrap: "anywhere" }}>{formatCost(estimate.total)}</Typography.Text>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "76px minmax(0, 1fr)", gap: 8, alignItems: "start" }}>
            <Typography.Text type="secondary" style={{ fontSize: 12, lineHeight: "18px", whiteSpace: "nowrap" }}>Bắt buộc</Typography.Text>
            <Typography.Text style={{ display: "block", color: "#0958d9", fontSize: 12, lineHeight: "18px", overflowWrap: "anywhere" }}>{formatCost(estimate.missingRequired)}</Typography.Text>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "76px minmax(0, 1fr)", gap: 8, alignItems: "start" }}>
            <Typography.Text type="secondary" style={{ fontSize: 12, lineHeight: "18px", whiteSpace: "nowrap" }}>Tùy chọn</Typography.Text>
            <Typography.Text style={{ display: "block", fontSize: 12, lineHeight: "18px", overflowWrap: "anywhere" }}>{formatCost(estimate.missingOptional)}</Typography.Text>
        </div>
    </div>;

    return <React.Fragment>
        <Box style={{ border: "1px solid #e6f4ff", borderRadius: 8, background: "#f7fbff", padding: "8px 10px" }}>
        <Stack justify="space-between" align="center" gap={10}>
            <div style={{ minWidth: 0 }}>
                <Typography.Text strong style={{ display: "block", lineHeight: "20px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</Typography.Text>
                <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, lineHeight: "16px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {selectedDishes.length} món · {coveredRows.length} đủ · {missingRows.length} thiếu
                </Typography.Text>
            </div>
            <Button type="link" onClick={() => setDetailOpen(true)} style={{ paddingInline: 0, flexShrink: 0 }}>
                Chi tiết
            </Button>
        </Stack>
        </Box>

        <Modal open={detailOpen} onCancel={() => setDetailOpen(false)} footer={null} title={title} destroyOnClose width={640}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 620, overflowY: "auto", paddingRight: 4 }}>
                {summaryRows}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {rows.map(row => {
                const status = rowStatus(row);
                return <div key={row.ingredientId} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 8, alignItems: "center", borderTop: "1px solid #e6f4ff", paddingTop: 6 }}>
                    <div style={{ minWidth: 0 }}>
                        <Typography.Text strong style={{ display: "block", fontSize: 12, lineHeight: "16px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {row.ingredient?.name ?? row.ingredientId}
                        </Typography.Text>
                        <Typography.Text type="secondary" style={{ display: "block", fontSize: 11, lineHeight: "15px" }}>
                            {row.ingredient?.alwaysAvailable
                                ? `Cần ${IngredientUnitHelper.formatAmount(row.amount)} ${row.unit} · Luôn có`
                                : `Cần ${IngredientUnitHelper.formatAmount(row.amount)} ${row.unit} · Có ${IngredientUnitHelper.formatAmount(row.availableAmount)} ${row.unit}`}
                        </Typography.Text>
                    </div>
                    <Typography.Text strong style={{ color: status.color, fontSize: 12, lineHeight: "16px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 118 }}>
                        {status.label}
                    </Typography.Text>
                </div>
            })}
                </div>
        </div>
        </Modal>
    </React.Fragment>;
}
