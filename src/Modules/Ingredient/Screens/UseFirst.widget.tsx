import { BulbOutlined, WarningOutlined } from "@ant-design/icons";
import { Button } from "@components/Button";
import { Box } from "@components/Layout/Box";
import { Stack } from "@components/Layout/Stack";
import { Modal } from "@components/Modal";
import { Typography } from "@components/Typography";
import { InventoryHelper } from "@common/Helpers/InventoryHelper";
import { IngredientUnitHelper } from "@common/Helpers/IngredientUnitHelper";
import { INGREDIENT_SHELF_LIFE_OPTIONS } from "@store/Models/Ingredient";
import { RootState } from "@store/Store";
import { Checkbox, Empty } from "antd";
import React, { useState } from "react";
import { useSelector } from "react-redux";

type UseFirstWidgetProps = {
    open: boolean;
    onClose: () => void;
    onSuggest: (ingredientIds: string[]) => void;
}

const URGENT_DAYS_THRESHOLD = 3;

export const UseFirstWidget: React.FC<UseFirstWidgetProps> = ({ open, onClose, onSuggest }) => {
    const inventory = useSelector((state: RootState) => state.personal.inventory?.items ?? {});
    const ingredients = useSelector((state: RootState) => state.shared.ingredient.ingredients);

    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // Items with a usable batch that is actually close to expiring after preservation rules.
    const urgentItems = Object.entries(inventory)
        .filter(([id, inv]) => {
            const ingr = ingredients.find(i => i.id === id);
            const totalAmt = InventoryHelper.totalUsableAmount(inv as any, ingr);
            if (totalAmt <= 0) return false;
            if (!ingr?.shelfLife) return false;
            const nearest = InventoryHelper.nearestExpiryBatch(inv as any, ingr);
            return nearest !== null && nearest.daysLeft <= URGENT_DAYS_THRESHOLD;
        })
        .map(([id, inv]) => {
            const ingr = ingredients.find(i => i.id === id)!;
            const nearest = InventoryHelper.nearestExpiryBatch(inv as any, ingr);
            const daysLeft = nearest?.daysLeft ?? null;
            const badge = InventoryHelper.expiryBadge(daysLeft);
            const opt = INGREDIENT_SHELF_LIFE_OPTIONS.find(o => o.value === ingr.shelfLife);
            const totalAmt = InventoryHelper.totalUsableAmount(inv as any, ingr);
            const urgentAmt = nearest?.batch.amount ?? totalAmt; // amount of the near-expiry batch
            const unit = IngredientUnitHelper.getBatchUnit(inv as any, nearest?.batch, ingr);
            const urgentBaseAmt = nearest?.batch
                ? IngredientUnitHelper.toBaseAmount(ingr, nearest.batch.amount, unit) ?? nearest.batch.amount
                : totalAmt;
            const hasOtherBatches = totalAmt > urgentBaseAmt; // extra stock beyond the urgent batch
            return { id, ingr, totalAmt, urgentAmt, hasOtherBatches, unit, daysLeft, badge, opt };
        })
        .sort((a, b) => {
            // Sort by days left ascending (most urgent first), nulls last
            if (a.daysLeft === null && b.daysLeft === null) return 0;
            if (a.daysLeft === null) return 1;
            if (b.daysLeft === null) return -1;
            return a.daysLeft - b.daysLeft;
        });

    const urgentIds = urgentItems.map(i => i.id);
    const allSelected = urgentIds.length > 0 && urgentIds.every(id => selectedIds.includes(id));

    const _toggleId = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const _toggleAll = () => {
        setSelectedIds(allSelected ? [] : urgentIds);
    };

    const _onSuggestSelected = () => {
        const ids = selectedIds.length > 0 ? selectedIds : urgentIds;
        onSuggest(ids);
        onClose();
    };

    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={null}
            destroyOnClose
            title={
                <Stack gap={8} align="center">
                    <WarningOutlined style={{ color: "#fa8c16" }} />
                    <span>Dùng trước khi hết hạn</span>
                </Stack>
            }
            style={{ top: 24 }}
        >
            {urgentItems.length === 0 ? (
                <Empty
                    description="Không có nguyên liệu dễ hỏng nào trong tủ"
                    style={{ padding: "32px 0" }}
                />
            ) : (
                <>
                    {/* Header row: select-all */}
                    <Stack justify="space-between" align="center" style={{ marginBottom: 12 }}>
                        <Checkbox
                            checked={allSelected}
                            indeterminate={selectedIds.length > 0 && !allSelected}
                            onChange={_toggleAll}
                        >
                            <Typography.Text style={{ fontSize: 12 }}>
                                {selectedIds.length > 0
                                    ? `Đã chọn ${selectedIds.length} / ${urgentItems.length}`
                                    : `Chọn tất cả (${urgentItems.length})`}
                            </Typography.Text>
                        </Checkbox>
                    </Stack>

                    <Box style={{ maxHeight: 420, overflowY: "auto" }}>
                        {urgentItems.map(({ id, ingr, urgentAmt, hasOtherBatches, unit, daysLeft, badge, opt }) => (
                            <Box
                                key={id}
                                onClick={() => _toggleId(id)}
                                style={{
                                    padding: "10px 12px",
                                    marginBottom: 8,
                                    borderRadius: 10,
                                    cursor: "pointer",
                                    background: selectedIds.includes(id)
                                        ? "#e6f4ff"
                                        : daysLeft !== null && daysLeft <= 1 ? "#fff1f0" : "#fff7e6",
                                    border: `1px solid ${selectedIds.includes(id)
                                        ? "#1677ff"
                                        : daysLeft !== null && daysLeft <= 1 ? "#ffccc7" : "#ffe7ba"}`,
                                    transition: "all 0.15s",
                                }}
                            >
                                <Stack justify="space-between" align="center">
                                    <Stack gap={10} align="center" style={{ flex: 1, minWidth: 0 }}>
                                        <Checkbox
                                            checked={selectedIds.includes(id)}
                                            onChange={() => _toggleId(id)}
                                            onClick={e => e.stopPropagation()}
                                        />
                                        <Box style={{ minWidth: 0 }}>
                                            <Stack gap={6} align="center">
                                                <Typography.Text strong style={{ fontSize: 14 }}>
                                                    {ingr.name}
                                                </Typography.Text>
                                                {opt && (
                                                    <Typography.Text style={{ fontSize: 11, color: opt.color }}>
                                                        {opt.emoji} {opt.label}
                                                    </Typography.Text>
                                                )}
                                            </Stack>
                                            <Stack gap={10} style={{ marginTop: 3 }}>
                                                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                                    🥡 {urgentAmt} {unit}
                                                    {hasOtherBatches && (
                                                        <Typography.Text type="secondary" style={{ fontSize: 11, marginLeft: 4 }}>
                                                            (+ còn lô khác)
                                                        </Typography.Text>
                                                    )}
                                                </Typography.Text>
                                                {badge && (
                                                    <Typography.Text style={{ fontSize: 12, color: badge.color, fontWeight: 600 }}>
                                                        ⏰ {badge.label}
                                                    </Typography.Text>
                                                )}
                                                {!badge && (
                                                    <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                                                        (chưa nhập ngày mua)
                                                    </Typography.Text>
                                                )}
                                            </Stack>
                                        </Box>
                                    </Stack>
                                </Stack>
                            </Box>
                        ))}
                    </Box>

                    {/* Bottom action bar */}
                    <Button
                        type="primary"
                        block
                        icon={<BulbOutlined />}
                        disabled={selectedIds.length === 0}
                        onClick={_onSuggestSelected}
                        style={{ marginTop: 12, borderRadius: 20 }}
                    >
                        {selectedIds.length > 0
                            ? `Gợi ý món từ ${selectedIds.length} nguyên liệu đã chọn`
                            : "Chọn nguyên liệu để gợi ý món"}
                    </Button>
                </>
            )}
        </Modal>
    );
};
