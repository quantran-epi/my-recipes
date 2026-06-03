import { CostEstimateHelper, CostEstimateSummary, IngredientNeedEstimateRow } from "@common/Helpers/CostEstimateHelper";
import { DishServingHelper } from '@common/Helpers/DishServingHelper';
import { IngredientPriceHelper } from "@common/Helpers/IngredientPriceHelper";
import { IngredientUnitHelper } from "@common/Helpers/IngredientUnitHelper";
import { Button } from "@components/Button";
import { Image } from "@components/Image";
import { Box } from "@components/Layout/Box";
import { Stack } from "@components/Layout/Stack";
import { Modal } from "@components/Modal";
import { Typography } from "@components/Typography";
import { Dishes } from "@store/Models/Dishes";
import { Ingredient, IngredientInventory } from "@store/Models/Ingredient";
import { selectDishes, selectIngredients, selectInventory } from "@store/Selectors";
import { Empty, InputNumber, Select } from "antd";
import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import BudgetIcon from "../../../../../assets/icons/budget.png";

const LazyDishesReadonlyDetailModal = React.lazy(() => import("./DishReadonlyDetail.widget").then(module => ({
    default: module.DishesReadonlyDetailModal,
})));

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
    initialDish: Dishes;
    initialTargetServings: number;
    allDishes: Dishes[];
    ingredients: Ingredient[];
    inventoryItems: Record<string, IngredientInventory>;
}

type PlannerDish = {
    dishId: string;
    servings: number;
}

type PlannerDishDetail = {
    dish: Dishes;
    baseServings: number;
    servings: number;
}

type PreviewDish = {
    dish: Dishes;
    servings: number;
}

const createPlannerDish = (dish: Dishes, targetServings?: number): PlannerDish => ({
    dishId: dish.id,
    servings: DishServingHelper.getTargetServings(dish, targetServings),
});

const findPlannerDish = (dishId: string, allDishes: Dishes[], fallbackDish: Dishes): Dishes | undefined => {
    return allDishes.find(item => item.id === dishId) ?? (fallbackDish.id === dishId ? fallbackDish : undefined);
};

const getPlannerRowBackground = (row: IngredientNeedEstimateRow): string => {
    if (!row.required) return "#f9f0ff";
    return row.missingAmount > 0 ? "#fffbe6" : "#fff";
};

const DishEstimatePlannerModal: React.FunctionComponent<PlannerModalProps> = (props) => {
    const [plannerDishes, setPlannerDishes] = useState<PlannerDish[]>(() => [createPlannerDish(props.initialDish, props.initialTargetServings)]);
    const [dishToAdd, setDishToAdd] = useState<string>();
    const [previewDish, setPreviewDish] = useState<PreviewDish>();

    useEffect(() => {
        if (!props.open) return;
        setPlannerDishes([createPlannerDish(props.initialDish, props.initialTargetServings)]);
        setDishToAdd(undefined);
        setPreviewDish(undefined);
    }, [props.open, props.initialDish, props.initialTargetServings]);

    const selectedDishIds = useMemo(() => new Set(plannerDishes.map(item => item.dishId)), [plannerDishes]);

    const selectedDishDetails = useMemo<PlannerDishDetail[]>(() => {
        return plannerDishes
            .map(item => {
                const selectedDish = findPlannerDish(item.dishId, props.allDishes, props.initialDish);
                if (!selectedDish) return null;
                const baseServings = DishServingHelper.getBaseServings(selectedDish);
                return {
                    dish: selectedDish,
                    baseServings,
                    servings: DishServingHelper.normalizeTargetServings(item.servings, baseServings),
                };
            })
            .filter(Boolean) as PlannerDishDetail[];
    }, [plannerDishes, props.allDishes, props.initialDish]);

    const dishOptions = useMemo(() => {
        return props.allDishes
            .filter(item => !selectedDishIds.has(item.id))
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(item => ({ label: item.name, value: item.id }));
    }, [props.allDishes, selectedDishIds]);

    const plannerAmounts = useMemo(() => {
        return selectedDishDetails.flatMap(item => DishServingHelper.collectIngredientAmounts(item.dish, props.allDishes, {
            targetServings: item.servings,
        }));
    }, [selectedDishDetails, props.allDishes]);

    const estimate = useMemo(() => CostEstimateHelper.estimateIngredientAmounts(plannerAmounts, props.ingredients, {
        inventoryItems: props.inventoryItems,
    }), [plannerAmounts, props.ingredients, props.inventoryItems]);

    const rows = useMemo(() => estimate.rows.slice().sort((a, b) => {
        if ((a.missingAmount > 0) !== (b.missingAmount > 0)) return a.missingAmount > 0 ? -1 : 1;
        if (a.required !== b.required) return a.required ? -1 : 1;
        return (a.ingredient?.name ?? a.ingredientId).localeCompare(b.ingredient?.name ?? b.ingredientId);
    }), [estimate.rows]);

    const missingRows = rows.filter(row => row.missingAmount > 0);
    const coveredRows = rows.filter(row => row.missingAmount <= 0);

    const _onAddDish = (dishId: string) => {
        const nextDish = props.allDishes.find(item => item.id === dishId);
        if (!nextDish) return;
        setPlannerDishes(current => current.some(item => item.dishId === dishId) ? current : [...current, createPlannerDish(nextDish)]);
        setDishToAdd(undefined);
    };

    const _onRemoveDish = (dishId: string) => {
        setPlannerDishes(current => current.length <= 1 ? current : current.filter(item => item.dishId !== dishId));
    };

    const _onServingChange = (dishId: string, value: number | string | null) => {
        const selectedDish = findPlannerDish(dishId, props.allDishes, props.initialDish);
        const baseServings = DishServingHelper.getBaseServings(selectedDish);
        setPlannerDishes(current => current.map(item => item.dishId === dishId
            ? { ...item, servings: DishServingHelper.normalizeTargetServings(value, baseServings) }
            : item));
    };

    return <Modal
        open={props.open}
        onCancel={props.onClose}
        footer={null}
        width={840}
        destroyOnClose={false}
        title={<Stack align="center" gap={8}>
            <Image src={BudgetIcon} preview={false} width={20} />
            <span>Lập kế hoạch chi phí</span>
        </Stack>}
    >
        <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", boxSizing: "border-box" }}>
            <Box style={{ width: "100%", boxSizing: "border-box", padding: "12px", border: "1px solid #f0f0f0", borderRadius: 8, background: "#fff" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
                    <div>
                        <Typography.Text strong style={{ display: "block" }}>Món cần tính</Typography.Text>
                        <Typography.Text type="secondary" style={{ display: "block", fontSize: 12 }}>
                            Chọn nhiều món và chỉnh khẩu phần để ước tính chi phí còn thiếu theo tồn kho hiện tại.
                        </Typography.Text>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
                        {selectedDishDetails.map(item => <div key={item.dish.id} style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            flexWrap: "wrap",
                            width: "100%",
                            boxSizing: "border-box",
                            padding: "9px 10px",
                            border: "1px solid #f0f0f0",
                            borderRadius: 8,
                            background: "#fafafa",
                        }}>
                            <button
                                type="button"
                                onClick={() => setPreviewDish({ dish: item.dish, servings: item.servings })}
                                style={{
                                    border: 0,
                                    background: "transparent",
                                    padding: 0,
                                    minWidth: 0,
                                    flex: "1 1 220px",
                                    textAlign: "left",
                                    cursor: "pointer",
                                }}
                            >
                                <Typography.Text strong style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: "18px" }}>
                                    {item.dish.name}
                                </Typography.Text>
                                <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, lineHeight: "16px" }}>
                                    Gốc {item.baseServings} phần
                                </Typography.Text>
                            </button>
                            <InputNumber
                                min={1}
                                precision={0}
                                value={item.servings}
                                onChange={(value) => _onServingChange(item.dish.id, value)}
                                addonAfter="phần"
                                style={{ width: 118, flex: "0 0 auto" }}
                            />
                            <Button size="small" type="link" onClick={() => setPreviewDish({ dish: item.dish, servings: item.servings })} style={{ paddingInline: 0 }}>
                                Chi tiết
                            </Button>
                            <Button size="small" type="text" danger disabled={selectedDishDetails.length <= 1} onClick={() => _onRemoveDish(item.dish.id)}>
                                Gỡ
                            </Button>
                        </div>)}
                    </div>

                    <Select
                        showSearch
                        allowClear
                        placeholder="Thêm món vào kế hoạch"
                        optionFilterProp="label"
                        value={dishToAdd}
                        options={dishOptions}
                        disabled={dishOptions.length === 0}
                        onChange={_onAddDish}
                        onClear={() => setDishToAdd(undefined)}
                        style={{ width: "100%" }}
                    />
                </div>
            </Box>

            <Box style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", border: "1px solid #91caff", borderRadius: 8, background: "#f0f7ff" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap", width: "100%" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "flex-start", flexWrap: "wrap", gap: 18, minWidth: 0 }}>
                        <SummaryText label="Cần mua bắt buộc" summary={estimate.missingRequired} primary emptyText="0đ" />
                        <SummaryText label="Cần mua tùy chọn" summary={estimate.missingOptional} emptyText="0đ" />
                    </div>
                    <Typography.Text type="secondary" style={{ fontSize: 12, lineHeight: "18px", flexShrink: 0 }}>
                        {selectedDishDetails.length} món · {missingRows.length} thiếu · {coveredRows.length} đủ
                    </Typography.Text>
                </div>
            </Box>

            <Box style={{ width: "100%", boxSizing: "border-box", padding: "12px", border: "1px solid #f0f0f0", borderRadius: 8, background: "#fff" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: 10, width: "100%", boxSizing: "border-box" }}>
                    <div style={{ width: "100%", boxSizing: "border-box" }}>
                        <Typography.Text strong style={{ display: "block" }}>Tình trạng nguyên liệu</Typography.Text>
                        <Typography.Text type="secondary" style={{ display: "block", fontSize: 12 }}>
                            Tính theo tồn kho khả dụng hiện tại, bỏ qua lô đã hết hạn.
                        </Typography.Text>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", maxHeight: 420, overflowY: "auto", paddingRight: 4, boxSizing: "border-box" }}>
                        {rows.length === 0 && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />}
                        {rows.map(row => <Box key={row.ingredientId} style={{ width: "100%", boxSizing: "border-box", padding: "9px 10px", border: "1px solid #f0f0f0", borderRadius: 8, background: getPlannerRowBackground(row) }}>
                            <IngredientCoverageRow row={row} />
                        </Box>)}
                    </div>
                </div>
            </Box>
        </div>

        {previewDish && <React.Suspense fallback={null}>
            <LazyDishesReadonlyDetailModal
                dish={previewDish.dish}
                open={Boolean(previewDish)}
                onClose={() => setPreviewDish(undefined)}
                targetServings={previewDish.servings}
                zIndex={2600}
            />
        </React.Suspense>}
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
            <div style={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: 8, width: "100%", boxSizing: "border-box" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, flex: 1 }}>
                        <Image src={BudgetIcon} preview={false} width={20} />
                        <Typography.Text strong>Chi phí ước tính</Typography.Text>
                    </div>
                    <Button size="small" type="link" onClick={() => setPlannerOpen(true)} style={{ marginLeft: "auto", paddingInline: 0, whiteSpace: "nowrap", flexShrink: 0 }}>
                        Cần mua
                    </Button>
                </div>

                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "flex-start", flexWrap: "wrap", gap: 16, width: "100%" }}>
                    <div style={{ flex: "0 1 150px", minWidth: 130 }}>
                        <SummaryText label="Tổng bắt buộc" summary={estimate.required} primary />
                    </div>
                    <div style={{ flex: "0 1 150px", minWidth: 130 }}>
                        <SummaryText label="Tổng tùy chọn" summary={estimate.optional} emptyText="0đ" />
                    </div>
                    {requiredPerServing && <div style={{ flex: "0 1 170px", minWidth: 150 }}>
                        <SummaryText label="Mỗi phần bắt buộc" summary={requiredPerServing} />
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
            </div>
        </Box>

        <DishEstimatePlannerModal
            open={plannerOpen}
            onClose={() => setPlannerOpen(false)}
            initialDish={dish}
            initialTargetServings={normalizedTargetServings}
            allDishes={dishes}
            ingredients={ingredients}
            inventoryItems={inventoryItems}
        />
    </React.Fragment>
}
