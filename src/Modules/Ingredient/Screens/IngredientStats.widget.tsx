import { BarChartOutlined } from "@ant-design/icons";
import { Box } from "@components/Layout/Box";
import { Stack } from "@components/Layout/Stack";
import { Modal } from "@components/Modal";
import { Typography } from "@components/Typography";
import { IngredientUnitHelper } from "@common/Helpers/IngredientUnitHelper";
import { selectCookingSessions, selectDishesById, selectIngredientsById, selectShoppingLists } from "@store/Selectors";
import { DatePicker, Divider, Empty, Progress, Table } from "antd";
import dayjs, { Dayjs } from "dayjs";
import React, { useMemo, useState } from "react";
import { useSelector } from "react-redux";

type IngredientStatsWidgetProps = {
    open: boolean;
    onClose: () => void;
}

type StatRow = {
    id: string;
    name: string;
    category?: string;
    bought: number;
    cooked: number;
    unit: string;
}

export const IngredientStatsWidget: React.FC<IngredientStatsWidgetProps> = ({ open, onClose }) => {
    const [range, setRange] = useState<[Dayjs, Dayjs] | null>([
        dayjs().subtract(29, "day"),
        dayjs(),
    ]);

    const ingredientsById = useSelector(selectIngredientsById);
    const dishesById = useSelector(selectDishesById);
    const shoppingLists = useSelector(selectShoppingLists);
    const cookingSessions = useSelector(selectCookingSessions);

    const stats = useMemo<StatRow[]>(() => {
        if (!range) return [];
        const [start, end] = range;

        // ── BOUGHT: sum ingredient amounts from shopping lists where the relevant date is in range
        // Uses plannedDate if set, falls back to createdDate.
        // Counts any group with isDone=true (individual items checked off),
        // OR if the entire list has all groups done.
        const boughtMap: Record<string, { amount: number; unit: string }> = {};
        shoppingLists
            .filter(sl => {
                const d = dayjs(sl.plannedDate ?? sl.createdDate);
                return (d.isAfter(start, "day") || d.isSame(start, "day"))
                    && (d.isBefore(end, "day") || d.isSame(end, "day"));
            })
            .forEach(sl => {
                sl.ingredients.forEach(group => {
                    if (!group.isDone) return; // only count checked-off groups
                    const ingredient = ingredientsById.get(group.ingredientId);
                    if (ingredient?.alwaysAvailable) return;
                    const existing = boughtMap[group.ingredientId];
                    const amounts = group.amounts;
                    const unit = IngredientUnitHelper.getBaseUnit(ingredient, amounts.map(a => a.unit));
                    const totalAmt = amounts.reduce((sum, a) => {
                        const converted = IngredientUnitHelper.toBaseAmount(ingredient, a.amount, a.unit, unit);
                        return sum + (converted ?? IngredientUnitHelper.parseAmount(a.amount));
                    }, 0);
                    if (existing) {
                        boughtMap[group.ingredientId] = {
                            amount: existing.amount + totalAmt,
                            unit: existing.unit || unit,
                        };
                    } else {
                        boughtMap[group.ingredientId] = { amount: totalAmt, unit };
                    }
                });
            });

        // ── COOKED: sum ingredients from finished cooking sessions in range
        const cookedMap: Record<string, { amount: number; unit: string }> = {};
        cookingSessions
            .filter(s => {
                if (s.status !== "finished" || !s.finishedAt) return false;
                const d = dayjs(s.finishedAt);
                return (d.isAfter(start, "day") || d.isSame(start, "day"))
                    && (d.isBefore(end, "day") || d.isSame(end, "day"));
            })
            .forEach(session => {
                const dish = dishesById.get(session.dishId);
                if (!dish) return;
                dish.ingredients.forEach(ingr => {
                    const ingredient = ingredientsById.get(ingr.ingredientId);
                    const unit = IngredientUnitHelper.getBaseUnit(ingredient, [ingr.unit]);
                    const amt = IngredientUnitHelper.toBaseAmount(ingredient, ingr.amount, ingr.unit, unit) ?? IngredientUnitHelper.parseAmount(ingr.amount);
                    const existing = cookedMap[ingr.ingredientId];
                    if (existing) {
                        cookedMap[ingr.ingredientId] = {
                            amount: existing.amount + amt,
                            unit: existing.unit || unit,
                        };
                    } else {
                        cookedMap[ingr.ingredientId] = { amount: amt, unit };
                    }
                });
            });

        // ── Merge into rows
        const allIds = new Set([...Object.keys(boughtMap), ...Object.keys(cookedMap)]);
        return Array.from(allIds)
            .map(id => {
                const ingr = ingredientsById.get(id);
                const bought = boughtMap[id]?.amount ?? 0;
                const cooked = cookedMap[id]?.amount ?? 0;
                const unit = boughtMap[id]?.unit || cookedMap[id]?.unit || "";
                return {
                    id,
                    name: ingr?.name ?? id,
                    category: ingr?.category,
                    bought,
                    cooked,
                    unit,
                };
            })
            .filter(r => r.bought > 0 || r.cooked > 0)
            .sort((a, b) => b.bought - a.bought);
    }, [range, shoppingLists, cookingSessions, dishesById, ingredientsById]);

    const columns = [
        {
            title: "Nguyên liệu",
            dataIndex: "name",
            key: "name",
            render: (name: string, row: StatRow) => (
                <Box>
                    <Typography.Text strong style={{ fontSize: 13 }}>{name}</Typography.Text>
                    {row.category && (
                        <Typography.Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                            {row.category}
                        </Typography.Text>
                    )}
                </Box>
            ),
        },
        {
            title: "Đã mua",
            dataIndex: "bought",
            key: "bought",
            align: "right" as const,
            render: (v: number, row: StatRow) => (
                <Typography.Text style={{ color: "#1677ff", fontWeight: 600 }}>
                    {v > 0 ? `${v} ${row.unit}` : "—"}
                </Typography.Text>
            ),
        },
        {
            title: "Đã nấu",
            dataIndex: "cooked",
            key: "cooked",
            align: "right" as const,
            render: (v: number, row: StatRow) => (
                <Typography.Text style={{ color: "#52c41a", fontWeight: 600 }}>
                    {v > 0 ? `${v} ${row.unit}` : "—"}
                </Typography.Text>
            ),
        },
    ];

    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={null}
            destroyOnClose
            title={
                <Stack gap={8} align="center">
                    <BarChartOutlined style={{ color: "#1677ff" }} />
                    <span>Thống kê nguyên liệu</span>
                </Stack>
            }
            style={{ top: 20 }}
        >
            {/* Date range picker */}
            <DatePicker.RangePicker
                value={range}
                onChange={v => setRange(v as [Dayjs, Dayjs] | null)}
                format="DD/MM/YYYY"
                style={{ width: "100%", marginBottom: 14 }}
                presets={[
                    { label: "Tháng này", value: [dayjs().startOf("month"), dayjs().endOf("month")] },
                    { label: "Tháng trước", value: [dayjs().subtract(1, "month").startOf("month"), dayjs().subtract(1, "month").endOf("month")] },
                    { label: "7 ngày qua", value: [dayjs().subtract(6, "day"), dayjs()] },
                    { label: "30 ngày qua", value: [dayjs().subtract(29, "day"), dayjs()] },
                ]}
            />

            {stats.length === 0 ? (
                <Empty
                    description="Không có dữ liệu trong khoảng thời gian này"
                    style={{ padding: "24px 0" }}
                />
            ) : (
                <>
                    {/* Summary bar */}
                    <Stack gap={16} style={{ marginBottom: 14, padding: "10px 14px", background: "#f5f5f5", borderRadius: 8 }}>
                        <Box style={{ textAlign: "center" }}>
                            <Typography.Text style={{ fontSize: 20, fontWeight: 700, color: "#1677ff", display: "block" }}>
                                {stats.filter(r => r.bought > 0).length}
                            </Typography.Text>
                            <Typography.Text type="secondary" style={{ fontSize: 11 }}>Loại đã mua</Typography.Text>
                        </Box>
                        <Box style={{ textAlign: "center" }}>
                            <Typography.Text style={{ fontSize: 20, fontWeight: 700, color: "#52c41a", display: "block" }}>
                                {stats.filter(r => r.cooked > 0).length}
                            </Typography.Text>
                            <Typography.Text type="secondary" style={{ fontSize: 11 }}>Loại đã nấu</Typography.Text>
                        </Box>
                        <Box style={{ textAlign: "center" }}>
                            <Typography.Text style={{ fontSize: 20, fontWeight: 700, color: "#faad14", display: "block" }}>
                                {stats.filter(r => r.bought > 0 && r.cooked === 0).length}
                            </Typography.Text>
                            <Typography.Text type="secondary" style={{ fontSize: 11 }}>Mua chưa nấu</Typography.Text>
                        </Box>
                    </Stack>

                    <Box style={{ maxHeight: 380, overflowY: "auto" }}>
                        <Table
                            dataSource={stats}
                            columns={columns}
                            rowKey="id"
                            size="small"
                            pagination={false}
                            style={{ fontSize: 12 }}
                        />
                    </Box>
                </>
            )}
        </Modal>
    );
};
