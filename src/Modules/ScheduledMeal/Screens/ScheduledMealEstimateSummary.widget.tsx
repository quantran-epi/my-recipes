import { CostEstimateHelper, CostEstimateSummary, IngredientNeedEstimateRow } from "@common/Helpers/CostEstimateHelper";
import { DishServingHelper } from "@common/Helpers/DishServingHelper";
import { IngredientPriceHelper } from "@common/Helpers/IngredientPriceHelper";
import { IngredientUnitHelper } from "@common/Helpers/IngredientUnitHelper";
import { Box } from "@components/Layout/Box";
import { Stack } from "@components/Layout/Stack";
import { Typography } from "@components/Typography";
import { Dishes } from "@store/Models/Dishes";
import { selectDishes, selectIngredients, selectInventory } from "@store/Selectors";
import React, { useMemo } from "react";
import { useSelector } from "react-redux";

type ScheduledMealEstimateSummaryProps = {
    dishIds: string[];
    title?: string;
    maxRows?: number;
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

export const ScheduledMealEstimateSummary: React.FunctionComponent<ScheduledMealEstimateSummaryProps> = ({ dishIds, title = "Ước tính cho thực đơn", maxRows = 5 }) => {
    const dishes = useSelector(selectDishes);
    const ingredients = useSelector(selectIngredients);
    const inventoryItems = useSelector(selectInventory);

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
    const visibleRows = rows.slice(0, maxRows);

    return <Box style={{ border: "1px solid #e6f4ff", borderRadius: 8, background: "#f7fbff", padding: 10 }}>
        <Stack justify="space-between" align="flex-start" gap={10} style={{ marginBottom: 8 }}>
            <div style={{ minWidth: 0 }}>
                <Typography.Text strong style={{ display: "block", lineHeight: "20px" }}>{title}</Typography.Text>
                <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, lineHeight: "16px" }}>
                    {selectedDishes.length} món · {coveredRows.length} đủ · {missingRows.length} thiếu
                </Typography.Text>
            </div>
        </Stack>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(135px, 1fr))", gap: 8, marginBottom: 8 }}>
            <div>
                <Typography.Text type="secondary" style={{ display: "block", fontSize: 11, lineHeight: "15px" }}>Tổng món</Typography.Text>
                <Typography.Text strong style={{ display: "block", lineHeight: "19px" }}>{formatCost(estimate.total)}</Typography.Text>
            </div>
            <div>
                <Typography.Text type="secondary" style={{ display: "block", fontSize: 11, lineHeight: "15px" }}>Cần mua bắt buộc</Typography.Text>
                <Typography.Text strong style={{ display: "block", color: "#0958d9", lineHeight: "19px" }}>{formatCost(estimate.missingRequired)}</Typography.Text>
            </div>
            <div>
                <Typography.Text type="secondary" style={{ display: "block", fontSize: 11, lineHeight: "15px" }}>Cần mua tùy chọn</Typography.Text>
                <Typography.Text strong style={{ display: "block", lineHeight: "19px" }}>{formatCost(estimate.missingOptional)}</Typography.Text>
            </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {visibleRows.map(row => {
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
                    <Typography.Text strong style={{ color: status.color, fontSize: 12, lineHeight: "16px", whiteSpace: "nowrap" }}>
                        {status.label}
                    </Typography.Text>
                </div>
            })}
            {rows.length > visibleRows.length && <Typography.Text type="secondary" style={{ fontSize: 12, lineHeight: "16px", paddingTop: 2 }}>
                +{rows.length - visibleRows.length} nguyên liệu khác
            </Typography.Text>}
        </div>
    </Box>;
}
