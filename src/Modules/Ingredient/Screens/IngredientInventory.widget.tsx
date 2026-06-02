import { BulbOutlined, DeleteOutlined, PlusOutlined, WarningOutlined } from "@ant-design/icons";
import { Button } from "@components/Button";
import { Box } from "@components/Layout/Box";
import { Option, Select } from "@components/Form/Select";
import { Stack } from "@components/Layout/Stack";
import { Popconfirm } from "@components/Popconfirm";
import { Typography } from "@components/Typography";
import { InventoryHelper } from "@common/Helpers/InventoryHelper";
import { Ingredient, IngredientPreservationCondition, IngredientUnit, InventoryBatch, InventoryBatchDiscard } from "@store/Models/Ingredient";
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
    expiresAt: Dayjs | null;
    preservationCondition?: IngredientPreservationCondition;
}

const emptyBatch = (unit: IngredientUnit): BatchRow => ({ id: uuidv4(), amount: 0, unit, purchasedAt: null, expiresAt: null });

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
            expiresAt: b.expiresAt ? dayjs(b.expiresAt) : null,
            preservationCondition: b.preservationCondition,
        }));
    });
    const [discardHistory, setDiscardHistory] = useState<InventoryBatchDiscard[]>(() => inventory?.discardedBatches ?? []);

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

    const _toInventoryBatch = (row: BatchRow): InventoryBatch => ({
        id: row.id,
        amount: row.amount,
        unit: row.unit,
        purchasedAt: row.purchasedAt ? row.purchasedAt.toISOString() : undefined,
        expiresAt: row.expiresAt ? row.expiresAt.toISOString() : undefined,
        preservationCondition: row.preservationCondition,
    });

    const _isExpiredBatch = (row: BatchRow) => {
        return InventoryHelper.isBatchExpired(_toInventoryBatch(row), item.shelfLife);
    };

    const _discardExpiredBatch = (row: BatchRow) => {
        const batch = _toInventoryBatch(row);
        const effectiveExpiry = InventoryHelper.batchExpiry(batch, item.shelfLife)?.toISOString();

        setBatches(prev => prev.filter(b => b.id !== row.id));
        setDiscardHistory(prev => [{
            ...batch,
            id: uuidv4(),
            batchId: batch.id,
            expiresAt: batch.expiresAt ?? effectiveExpiry,
            discardedAt: new Date().toISOString(),
            reason: "expired",
        }, ...prev]);
    };

    const _onSave = () => {
        dispatch(setInventory({
            ingredientId: item.id,
            inventory: {
                unit: baseUnit,
                lastUpdated: new Date(),
                discardedBatches: discardHistory,
                batches: batches
                    .filter(b => b.amount > 0)
                    .map(b => ({
                        id: b.id,
                        amount: b.amount,
                        unit: b.unit,
                        purchasedAt: b.purchasedAt ? b.purchasedAt.toISOString() : undefined,
                        expiresAt: b.expiresAt ? b.expiresAt.toISOString() : undefined,
                        preservationCondition: b.preservationCondition,
                    })),
            }
        }));
        onDone?.();
    };

    const totalAmount = IngredientUnitHelper.totalInventoryAmount({
        unit: baseUnit,
        lastUpdated: new Date(),
        batches: batches.map(_toInventoryBatch),
    }, item);

    // Find the most urgent batch for the warning banner
    const nearestBatch = (() => {
        let best: { row: BatchRow; daysLeft: number } | null = null;
        batches.forEach(row => {
            if (row.amount <= 0) return;
            const days = InventoryHelper.daysUntilBatchExpiry(_toInventoryBatch(row), item.shelfLife);
            if (days === null || days < 0) return;
            if (best === null || days < best.daysLeft) best = { row, daysLeft: days };
        });
        return best;
    })();

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
                        <Stack gap={4} align="center">
                            {_isExpiredBatch(batch) && (
                                <Popconfirm
                                    title="Bỏ lô hết hạn?"
                                    description="Lô này sẽ được xóa khỏi tồn kho và ghi vào lịch sử bỏ lô sau khi lưu."
                                    okText="Bỏ lô"
                                    okButtonProps={{ danger: true }}
                                    onConfirm={() => _discardExpiredBatch(batch)}
                                >
                                    <Button size="small" danger type="primary">
                                        Bỏ lô hết hạn
                                    </Button>
                                </Popconfirm>
                            )}
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
                    </Stack>

                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
                            gap: 8,
                            alignItems: "center",
                        }}
                    >
                        <InputNumber
                            min={0}
                            value={batch.amount}
                            onChange={v => _updateBatch(batch.id, { amount: v ?? 0 })}
                            style={{ width: "100%" }}
                            size="middle"
                        />
                        <Select value={batch.unit} onChange={v => _updateBatch(batch.id, { unit: v })} style={{ width: "100%" }}>
                            {inventoryUnits.map(u => <Option key={u} value={u}>{u}</Option>)}
                        </Select>
                        <DatePicker
                            value={batch.purchasedAt}
                            onChange={v => _updateBatch(batch.id, { purchasedAt: v })}
                            format="DD/MM/YYYY"
                            placeholder="Ngày mua"
                            style={{ width: "100%" }}
                            allowClear
                            disabledDate={d => d.isAfter(dayjs())}
                        />
                        <DatePicker
                            value={batch.expiresAt}
                            onChange={v => _updateBatch(batch.id, { expiresAt: v ? v.endOf("day") : null })}
                            format="DD/MM/YYYY"
                            placeholder="Hạn dùng"
                            style={{ width: "100%" }}
                            allowClear
                        />
                    </div>

                    {/* Per-batch expiry hint */}
                    {(batch.expiresAt || (item.shelfLife && batch.purchasedAt)) && (() => {
                        const inventoryBatch = _toInventoryBatch(batch);
                        const days = InventoryHelper.daysUntilBatchExpiry(inventoryBatch, item.shelfLife);
                        const expiry = InventoryHelper.batchExpiry(inventoryBatch, item.shelfLife);
                        const bdg = InventoryHelper.expiryBadge(days);
                        if (!bdg) return null;
                        return (
                            <Typography.Text style={{ fontSize: 11, color: bdg.color, marginTop: 4, display: "block" }}>
                                ⏰ {bdg.label}
                                {expiry && (
                                    <span style={{ color: "#aaa", marginLeft: 6 }}>
                                        (hết {expiry.format("DD/MM/YYYY")})
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

            {discardHistory.length > 0 && (
                <Box
                    style={{
                        marginBottom: 12,
                        padding: "8px 10px",
                        borderRadius: 8,
                        border: "1px solid #ffe1e1",
                        background: "#fffafa",
                    }}
                >
                    <Typography.Text strong style={{ display: "block", fontSize: 12, marginBottom: 4 }}>
                        Lịch sử bỏ lô
                    </Typography.Text>
                    {discardHistory.slice(0, 5).map(discard => (
                        <Stack key={discard.id} justify="space-between" align="center" wrap="wrap" gap={6} style={{ paddingBlock: 2 }}>
                            <Typography.Text style={{ fontSize: 12 }}>
                                {IngredientUnitHelper.formatAmount(discard.amount)} {discard.unit ?? baseUnit}
                            </Typography.Text>
                            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                Bỏ {dayjs(discard.discardedAt).format("DD/MM/YYYY")}
                                {discard.expiresAt ? ` · Hết hạn ${dayjs(discard.expiresAt).format("DD/MM/YYYY")}` : ""}
                            </Typography.Text>
                        </Stack>
                    ))}
                </Box>
            )}

            {/* Nearest-expiry warning banner */}
            {nearestBadge && (
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
