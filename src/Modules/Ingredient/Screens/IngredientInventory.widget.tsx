import { BulbOutlined, DeleteOutlined, PlusOutlined, WarningOutlined } from "@ant-design/icons";
import { Button } from "@components/Button";
import { Box } from "@components/Layout/Box";
import { Option, Select } from "@components/Form/Select";
import { Stack } from "@components/Layout/Stack";
import { Typography } from "@components/Typography";
import { InventoryHelper } from "@common/Helpers/InventoryHelper";
import { Ingredient, IngredientUnit } from "@store/Models/Ingredient";
import { IngredientUnitHelper } from "@common/Helpers/IngredientUnitHelper";
import { setInventory } from "@store/Reducers/InventoryReducer";
import { selectInventoryById } from "@store/Selectors";
import { Alert, DatePicker, Divider, InputNumber } from "antd";
import dayjs, { Dayjs } from "dayjs";
import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { v4 as uuidv4 } from "uuid";

type IngredientInventoryWidgetProps = {
    item: Ingredient;
    onDone?: () => void;
    onSuggest?: (ingredientIds: string[]) => void;
}

type BatchRow = {
    id: string;
    amount: number;
    unit: IngredientUnit;
    purchasedAt: Dayjs | null;
}

const emptyBatch = (unit: IngredientUnit): BatchRow => ({ id: uuidv4(), amount: 0, unit, purchasedAt: null });

export const IngredientInventoryWidget: React.FC<IngredientInventoryWidgetProps> = ({ item, onDone, onSuggest }) => {
    const dispatch = useDispatch();
    const inventory = useSelector(selectInventoryById(item.id));
    const inventoryUnits = IngredientUnitHelper.getInventoryUnits(item);
    const baseUnit = IngredientUnitHelper.getBaseUnit(item, inventoryUnits);
    const defaultUnit = inventory?.unit ?? baseUnit;
    const unit = baseUnit;

    const [batches, setBatches] = useState<BatchRow[]>(() => {
        if (!inventory || !inventory.batches || inventory.batches.length === 0) {
            // Migrate old flat data: { amount, unit } → single batch
            const legacyAmount = (inventory as any)?.amount;
            return [{ ...emptyBatch(defaultUnit), amount: legacyAmount ?? 0 }];
        }
        return inventory.batches.map(b => ({
            id: b.id,
            amount: b.amount,
            unit: b.unit ?? inventory.unit ?? defaultUnit,
            purchasedAt: b.purchasedAt ? dayjs(b.purchasedAt) : null,
        }));
    });

    if (item.alwaysAvailable) {
        return <Alert
            type="success"
            showIcon
            message="Luôn có sẵn"
            description="Nguyên liệu này được tính là đủ trong gợi ý món, phiên nấu và lịch mua sắm mà không cần nhập tồn kho."
        />;
    }

    const _updateBatch = (id: string, patch: Partial<BatchRow>) => {
        setBatches(prev => prev.map(b => b.id === id ? { ...b, ...patch } : b));
    };

    const _addBatch = () => setBatches(prev => [...prev, emptyBatch(defaultUnit)]);

    const _removeBatch = (id: string) => {
        setBatches(prev => prev.length > 1 ? prev.filter(b => b.id !== id) : prev);
    };

    const _onSave = () => {
        dispatch(setInventory({
            ingredientId: item.id,
            inventory: {
                unit: baseUnit,
                lastUpdated: new Date(),
                batches: batches
                    .filter(b => b.amount > 0)
                    .map(b => ({
                        id: b.id,
                        amount: b.amount,
                        unit: b.unit,
                        purchasedAt: b.purchasedAt ? b.purchasedAt.toISOString() : undefined,
                    })),
            }
        }));
        onDone?.();
    };

    const totalAmount = IngredientUnitHelper.totalInventoryAmount({
        unit: baseUnit,
        lastUpdated: new Date(),
        batches: batches.map(b => ({ id: b.id, amount: b.amount, unit: b.unit, purchasedAt: b.purchasedAt?.toISOString() })),
    }, item);

    // Find the most urgent batch for the warning banner
    const nearestBatch = item.shelfLife ? (() => {
        let best: { row: BatchRow; daysLeft: number } | null = null;
        batches.forEach(row => {
            if (row.amount <= 0 || !row.purchasedAt) return;
            const days = InventoryHelper.daysUntilExpiry(row.purchasedAt.toISOString(), item.shelfLife);
            if (days === null) return;
            if (best === null || days < best.daysLeft) best = { row, daysLeft: days };
        });
        return best;
    })() : null;

    const nearestBadge = nearestBatch ? InventoryHelper.expiryBadge(nearestBatch.daysLeft) : null;
    const isExpiringSoon = nearestBatch !== null && nearestBatch.daysLeft <= 1;

    return (
        <div>
            <Stack justify="space-between" align="center" style={{ marginBottom: 10 }}>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    Tồn kho: <Typography.Text strong>{item.name}</Typography.Text>
                </Typography.Text>
                <Stack gap={6} align="center">
                    <Typography.Text style={{ fontSize: 12, color: "#666" }}>Đơn vị:</Typography.Text>
                    <Typography.Text style={{ fontSize: 12, color: "#666" }}>Base: {baseUnit}</Typography.Text>
                </Stack>
            </Stack>

            {/* Batch rows */}
            {batches.map((batch, idx) => (
                <Box
                    key={batch.id}
                    style={{
                        padding: "10px 12px",
                        marginBottom: 8,
                        borderRadius: 8,
                        background: "#fafafa",
                        border: "1px solid #f0f0f0",
                    }}
                >
                    <Stack justify="space-between" align="center" style={{ marginBottom: 8 }}>
                        <Typography.Text style={{ fontSize: 12, color: "#888" }}>
                            Lô #{idx + 1}
                        </Typography.Text>
                        {batches.length > 1 && (
                            <Button
                                size="small"
                                danger
                                type="text"
                                icon={<DeleteOutlined />}
                                onClick={() => _removeBatch(batch.id)}
                            />
                        )}
                    </Stack>

                    <Stack gap={8} align="center">
                        <InputNumber
                            min={0}
                            value={batch.amount}
                            onChange={v => _updateBatch(batch.id, { amount: v ?? 0 })}
                            style={{ flex: 1 }}
                            size="middle"
                        />
                        <Select value={batch.unit} onChange={v => _updateBatch(batch.id, { unit: v })} style={{ width: 90 }}>
                            {inventoryUnits.map(u => <Option key={u} value={u}>{u}</Option>)}
                        </Select>
                        {item.shelfLife && (
                            <DatePicker
                                value={batch.purchasedAt}
                                onChange={v => _updateBatch(batch.id, { purchasedAt: v })}
                                format="DD/MM/YYYY"
                                placeholder="Ngày mua"
                                style={{ flex: 1 }}
                                allowClear
                                disabledDate={d => d.isAfter(dayjs())}
                            />
                        )}
                    </Stack>

                    {/* Per-batch expiry hint */}
                    {item.shelfLife && batch.purchasedAt && (() => {
                        const days = InventoryHelper.daysUntilExpiry(batch.purchasedAt!.toISOString(), item.shelfLife);
                        const bdg = InventoryHelper.expiryBadge(days);
                        if (!bdg) return null;
                        return (
                            <Typography.Text style={{ fontSize: 11, color: bdg.color, marginTop: 4, display: "block" }}>
                                ⏰ {bdg.label}
                                {days !== null && days >= 0 && (
                                    <span style={{ color: "#aaa", marginLeft: 6 }}>
                                        (hết {InventoryHelper.estimatedExpiry(batch.purchasedAt!.toISOString(), item.shelfLife)?.format("DD/MM/YYYY")})
                                    </span>
                                )}
                            </Typography.Text>
                        );
                    })()}
                </Box>
            ))}

            <Button
                type="dashed"
                block
                icon={<PlusOutlined />}
                onClick={_addBatch}
                style={{ marginBottom: 12 }}
            >
                Thêm lô hàng
            </Button>

            {/* Nearest-expiry warning banner */}
            {nearestBadge && item.shelfLife && (
                <Box style={{ marginBottom: 12 }}>
                    <Alert
                        type={isExpiringSoon ? "error" : nearestBatch!.daysLeft <= 3 ? "warning" : "success"}
                        showIcon
                        icon={isExpiringSoon ? <WarningOutlined /> : undefined}
                        message={
                            <Stack justify="space-between" align="center">
                                <Typography.Text style={{ fontSize: 13 }}>
                                    Lô gần hết hạn nhất:{" "}
                                    <strong style={{ color: nearestBadge.color }}>{nearestBadge.label}</strong>
                                </Typography.Text>
                                {isExpiringSoon && onSuggest && totalAmount > 0 && (
                                    <Button
                                        size="small"
                                        type="primary"
                                        danger
                                        icon={<BulbOutlined />}
                                        onClick={() => onSuggest([item.id])}
                                        style={{ flexShrink: 0 }}
                                    >
                                        Gợi ý món
                                    </Button>
                                )}
                            </Stack>
                        }
                    />
                </Box>
            )}

            <Divider style={{ margin: "8px 0" }} />
            <Stack justify="space-between" align="center" style={{ marginBottom: 10 }}>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    Tổng: <Typography.Text strong>{totalAmount} {unit}</Typography.Text>
                    {batches.filter(b => b.amount > 0).length > 1 && (
                        <Typography.Text type="secondary" style={{ fontSize: 11, marginLeft: 6 }}>
                            ({batches.filter(b => b.amount > 0).length} lô)
                        </Typography.Text>
                    )}
                </Typography.Text>
            </Stack>

            <Button type="primary" fullwidth onClick={_onSave}>Lưu</Button>
        </div>
    );
};
