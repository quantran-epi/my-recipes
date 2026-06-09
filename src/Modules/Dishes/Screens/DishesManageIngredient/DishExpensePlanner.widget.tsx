import { ShoppingCartOutlined } from "@ant-design/icons";
import { CostEstimateHelper, CostEstimateSummary, IngredientAmountCostEstimate, IngredientNeedEstimateRow } from "@common/Helpers/CostEstimateHelper";
import { DishServingHelper } from "@common/Helpers/DishServingHelper";
import { IngredientPriceHelper } from "@common/Helpers/IngredientPriceHelper";
import { IngredientUnitHelper } from "@common/Helpers/IngredientUnitHelper";
import { Button } from "@components/Button";
import { Image } from "@components/Image";
import { Box } from "@components/Layout/Box";
import { Stack } from "@components/Layout/Stack";
import { DeferredModalContent, Modal } from "@components/Modal";
import { ServingSizeInput } from "@components/Form/ServingSizeInput";
import { Typography } from "@components/Typography";
import { ShoppingListAddWidget } from "@modules/ShoppingList/Screens/ShoppingListAdd.widget";
import { RootRoutes } from "@routing/RootRoutes";
import { Dishes } from "@store/Models/Dishes";
import { selectDishes, selectDishesById, selectIngredients, selectInventory } from "@store/Selectors";
import { Empty, Select, Spin } from "antd";
import { useScheduledCalculation } from "@hooks";
import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import BudgetIcon from "../../../../../assets/icons/budget.png";
import ShoppinglistIcon from "../../../../../assets/icons/shoppingList.png";

const LazyDishesReadonlyDetailModal = React.lazy(() => import("./DishReadonlyDetail.widget").then(module => ({
    default: module.DishesReadonlyDetailModal,
})));

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

type DishExpensePlannerWidgetProps = {
    initialDish?: Dishes;
    initialDishes?: Dishes[];
    initialTargetServings?: number;
    allowDishSelection?: boolean;
    onOpenFullPlanner?: () => void;
    maxIngredientListHeight?: number | string;
}

type DishExpensePlannerModalProps = DishExpensePlannerWidgetProps & {
    open: boolean;
    onClose: () => void;
}

type PlannerEstimateMetrics = {
    estimate: IngredientAmountCostEstimate;
    rows: IngredientNeedEstimateRow[];
    missingRows: IngredientNeedEstimateRow[];
    coveredRows: IngredientNeedEstimateRow[];
}

export const formatCostSummary = (summary: CostEstimateSummary, emptyText = "0đ"): string => {
    if (!CostEstimateHelper.hasAny(summary)) return emptyText;
    if (!CostEstimateHelper.hasPrice(summary)) return "Chưa có giá";
    return IngredientPriceHelper.formatRange(summary);
}

export const CostSummaryText: React.FunctionComponent<{ label: string; summary: CostEstimateSummary; primary?: boolean; emptyText?: string }> = ({ label, summary, primary, emptyText }) => {
    return <div style={{ minWidth: 0 }}>
        <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, lineHeight: "16px" }}>
            {label}
        </Typography.Text>
        <Typography.Text strong={primary} style={{ display: "block", color: primary ? "#0958d9" : undefined, fontSize: primary ? 17 : 15, lineHeight: "22px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {formatCostSummary(summary, emptyText)}
        </Typography.Text>
    </div>
}

const createPlannerDish = (dish: Dishes, targetServings?: number): PlannerDish => ({
    dishId: dish.id,
    servings: DishServingHelper.getTargetServings(dish, targetServings),
});

const createPlannerDishes = (dishes: Dishes[], targetServings?: number): PlannerDish[] => {
    const seen = new Set<string>();
    const applyTargetServings = dishes.length === 1;
    return dishes.reduce((result, dish) => {
        if (seen.has(dish.id)) return result;
        seen.add(dish.id);
        result.push(createPlannerDish(dish, applyTargetServings ? targetServings : undefined));
        return result;
    }, [] as PlannerDish[]);
};

const findPlannerDish = (dishId: string, dishById: Map<string, Dishes>, fallbackDishes: Dishes[] = []): Dishes | undefined => {
    return dishById.get(dishId) ?? fallbackDishes.find(dish => dish.id === dishId);
};

const getSeedKey = (dishes: Dishes[], targetServings?: number): string => {
    if (dishes.length === 0) return "";
    const applyTargetServings = dishes.length === 1;
    return dishes.map(dish => `${dish.id}:${DishServingHelper.getTargetServings(dish, applyTargetServings ? targetServings : undefined)}`).join("|");
};

const getPlannerRowBackground = (row: IngredientNeedEstimateRow): string => {
    if (!row.required) return "#f9f0ff";
    return row.missingAmount > 0 ? "#fffbe6" : "#fff";
};

const createEmptyPlannerEstimateMetrics = (): PlannerEstimateMetrics => {
    return {
        estimate: CostEstimateHelper.emptyIngredientAmountEstimate(),
        rows: [],
        missingRows: [],
        coveredRows: [],
    };
};

const PendingCalculationBox: React.FunctionComponent<{ text: string }> = ({ text }) => {
    return <Box style={{ minHeight: 120, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
        <Stack direction="column" align="center" gap={8}>
            <Spin size="small" />
            <Typography.Text type="secondary">{text}</Typography.Text>
        </Stack>
    </Box>;
};

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

export const DishExpensePlannerWidget: React.FunctionComponent<DishExpensePlannerWidgetProps> = ({
    initialDish,
    initialDishes,
    initialTargetServings,
    allowDishSelection = true,
    onOpenFullPlanner,
    maxIngredientListHeight,
}) => {
    const allDishes = useSelector(selectDishes);
    const dishById = useSelector(selectDishesById);
    const ingredients = useSelector(selectIngredients);
    const inventoryItems = useSelector(selectInventory);
    const seedDishes = useMemo(() => {
        if (initialDishes && initialDishes.length > 0) return initialDishes;
        return initialDish ? [initialDish] : [];
    }, [initialDish, initialDishes]);
    const [plannerDishes, setPlannerDishes] = useState<PlannerDish[]>(() => createPlannerDishes(seedDishes, initialTargetServings));
    const [appliedSeedKey, setAppliedSeedKey] = useState(() => getSeedKey(seedDishes, initialTargetServings));
    const [dishToAdd, setDishToAdd] = useState<string>();
    const [dishSearch, setDishSearch] = useState("");
    const [dishSelectKey, setDishSelectKey] = useState(0);
    const [previewDish, setPreviewDish] = useState<PreviewDish>();
    const [createShoppingListOpen, setCreateShoppingListOpen] = useState(false);
    const navigate = useNavigate();
    useEffect(() => {
        const nextSeedKey = getSeedKey(seedDishes, initialTargetServings);
        if (!nextSeedKey || appliedSeedKey === nextSeedKey) return;
        setPlannerDishes(createPlannerDishes(seedDishes, initialTargetServings));
        setAppliedSeedKey(nextSeedKey);
    }, [seedDishes, initialTargetServings, appliedSeedKey]);

    const selectedDishIds = useMemo(() => new Set(plannerDishes.map(item => item.dishId)), [plannerDishes]);

    const selectedDishDetails = useMemo<PlannerDishDetail[]>(() => {
        return plannerDishes
            .map(item => {
                const selectedDish = findPlannerDish(item.dishId, dishById, seedDishes);
                if (!selectedDish) return null;
                const baseServings = DishServingHelper.getBaseServings(selectedDish);
                return {
                    dish: selectedDish,
                    baseServings,
                    servings: DishServingHelper.normalizeTargetServings(item.servings, baseServings),
                };
            })
            .filter(Boolean) as PlannerDishDetail[];
    }, [plannerDishes, dishById, seedDishes]);

    const shoppingListDishIds = useMemo(() => selectedDishDetails.map(item => item.dish.id), [selectedDishDetails]);
    const shoppingListDishServings = useMemo(() => selectedDishDetails.reduce((result, item) => {
        result[item.dish.id] = item.servings;
        return result;
    }, {} as Record<string, number>), [selectedDishDetails]);

    const dishOptions = useMemo(() => {
        return allDishes
            .filter(item => !selectedDishIds.has(item.id))
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(item => ({ label: item.name, value: item.id }));
    }, [allDishes, selectedDishIds]);

    const calculatePlannerEstimate = React.useCallback((): PlannerEstimateMetrics => {
        const plannerAmounts = selectedDishDetails.flatMap(item => DishServingHelper.collectIngredientAmounts(item.dish, allDishes, {
            targetServings: item.servings,
        }));
        const estimate = CostEstimateHelper.estimateIngredientAmounts(plannerAmounts, ingredients, {
            inventoryItems,
        });
        const rows = estimate.rows.slice().sort((a, b) => {
            if ((a.missingAmount > 0) !== (b.missingAmount > 0)) return a.missingAmount > 0 ? -1 : 1;
            if (a.required !== b.required) return a.required ? -1 : 1;
            return (a.ingredient?.name ?? a.ingredientId).localeCompare(b.ingredient?.name ?? b.ingredientId);
        });

        return {
            estimate,
            rows,
            missingRows: rows.filter(row => row.missingAmount > 0),
            coveredRows: rows.filter(row => row.missingAmount <= 0),
        };
    }, [allDishes, ingredients, inventoryItems, selectedDishDetails]);
    const { value: plannerEstimateMetrics, pending: plannerEstimatePending } = useScheduledCalculation(calculatePlannerEstimate, {
        enabled: selectedDishDetails.length > 0,
        initialValue: createEmptyPlannerEstimateMetrics,
    });
    const { estimate, rows, missingRows, coveredRows } = plannerEstimateMetrics;

    const listScrollStyle: React.CSSProperties = maxIngredientListHeight
        ? { maxHeight: maxIngredientListHeight, overflowY: "auto", paddingRight: 4 }
        : {};

    const _onAddDish = (dishId: string) => {
        const nextDish = dishById.get(dishId);
        if (!nextDish) return;
        setPlannerDishes(current => current.some(item => item.dishId === dishId) ? current : [...current, createPlannerDish(nextDish)]);
        setDishToAdd(undefined);
        setDishSearch("");
        setDishSelectKey(value => value + 1);
    };

    const _onRemoveDish = (dishId: string) => {
        if (!allowDishSelection) return;
        setPlannerDishes(current => current.filter(item => item.dishId !== dishId));
    };

    const _onServingChange = (dishId: string, value: number) => {
        const selectedDish = findPlannerDish(dishId, dishById, seedDishes);
        const baseServings = DishServingHelper.getBaseServings(selectedDish);
        setPlannerDishes(current => current.map(item => item.dishId === dishId
            ? { ...item, servings: DishServingHelper.normalizeTargetServings(value, baseServings) }
            : item));
    };

    return <React.Fragment>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", boxSizing: "border-box" }}>
            <Box style={{ width: "100%", boxSizing: "border-box", padding: "12px", border: "1px solid #f0f0f0", borderRadius: 8, background: "#fff" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
                    <div>
                        <Typography.Text strong style={{ display: "block" }}>Món cần tính</Typography.Text>
                        <Typography.Text type="secondary" style={{ display: "block", fontSize: 12 }}>
                            {allowDishSelection
                                ? "Chọn nhiều món và chỉnh khẩu phần để ước tính chi phí còn thiếu theo tồn kho hiện tại."
                                : "Chỉnh khẩu phần cho món này. Nếu muốn tính nhiều món cùng lúc, mở trang kế hoạch chi phí."}
                        </Typography.Text>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
                        {selectedDishDetails.length === 0 && <Box style={{ padding: 14, border: "1px dashed #d9d9d9", borderRadius: 8, background: "#fafafa", textAlign: "center" }}>
                            <Typography.Text type="secondary">Chọn món để bắt đầu lập kế hoạch.</Typography.Text>
                        </Box>}
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
                            <ServingSizeInput
                                value={item.servings}
                                onChange={(value) => _onServingChange(item.dish.id, value)}
                                style={{ width: 178, flex: "0 0 auto" }}
                            />
                            {allowDishSelection && <Button type="link" onClick={() => setPreviewDish({ dish: item.dish, servings: item.servings })} style={{ paddingInline: 0 }}>
                                Chi tiết
                            </Button>}
                            {allowDishSelection && <Button type="text" danger onClick={() => _onRemoveDish(item.dish.id)}>
                                Gỡ
                            </Button>}
                        </div>)}
                    </div>

                    {allowDishSelection ? <Select
                        key={dishSelectKey}
                        showSearch
                        allowClear
                        placeholder="Thêm món vào kế hoạch"
                        optionFilterProp="label"
                        searchValue={dishSearch}
                        onSearch={setDishSearch}
                        value={dishToAdd}
                        options={dishOptions}
                        disabled={dishOptions.length === 0}
                        onChange={(value) => value ? _onAddDish(value) : setDishToAdd(undefined)}
                        onClear={() => { setDishToAdd(undefined); setDishSearch(""); }}
                        style={{ width: "100%" }}
                    /> : onOpenFullPlanner && <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <Button type="link" onClick={onOpenFullPlanner} style={{ paddingInline: 0 }}>
                            Mở trang kế hoạch
                        </Button>
                    </div>}
                </div>
            </Box>

            <Box style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", border: "1px solid #91caff", borderRadius: 8, background: "#f0f7ff" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap", width: "100%" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "flex-start", flexWrap: "wrap", gap: 18, minWidth: 0 }}>
                        <CostSummaryText label="Tổng món chưa trừ kho" summary={estimate.total} emptyText="0đ" />
                        <CostSummaryText label="Cần mua bắt buộc" summary={estimate.missingRequired} primary emptyText="0đ" />
                        <CostSummaryText label="Cần mua tùy chọn" summary={estimate.missingOptional} emptyText="0đ" />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                        <Typography.Text type="secondary" style={{ fontSize: 12, lineHeight: "18px", whiteSpace: "nowrap" }}>
                            {plannerEstimatePending ? "Đang tính..." : `${selectedDishDetails.length} món · ${missingRows.length} thiếu · ${coveredRows.length} đủ`}
                        </Typography.Text>
                        <Button icon={<ShoppingCartOutlined />} disabled={shoppingListDishIds.length === 0} onClick={() => setCreateShoppingListOpen(true)}>
                            Tạo lịch mua
                        </Button>
                    </div>
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
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", boxSizing: "border-box", ...listScrollStyle }}>
                        {plannerEstimatePending && <PendingCalculationBox text="Đang tính tình trạng nguyên liệu..." />}
                        {!plannerEstimatePending && rows.length === 0 && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />}
                        {!plannerEstimatePending && rows.map(row => <Box key={row.ingredientId} style={{ width: "100%", boxSizing: "border-box", padding: "9px 10px", border: "1px solid #f0f0f0", borderRadius: 8, background: getPlannerRowBackground(row) }}>
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

        <Modal open={createShoppingListOpen} title={<Stack align="center" gap={8}>
            <Image src={ShoppinglistIcon} preview={false} width={22} />
            <span>Tạo lịch mua sắm</span>
        </Stack>} destroyOnClose onCancel={() => setCreateShoppingListOpen(false)} footer={null}>
            <DeferredModalContent active={createShoppingListOpen}>
                <ShoppingListAddWidget
                    date={null}
                    dishIds={shoppingListDishIds}
                    initialDishServings={shoppingListDishServings}
                    onDone={() => setCreateShoppingListOpen(false)}
                    onCreated={(shoppingList) => navigate(RootRoutes.AuthorizedRoutes.ShoppingListRoutes.Detail(shoppingList.id))}
                />
            </DeferredModalContent>
        </Modal>
    </React.Fragment>
}

export const DishExpensePlannerModal: React.FunctionComponent<DishExpensePlannerModalProps> = ({ open, onClose, ...plannerProps }) => {
    return <Modal
        open={open}
        onCancel={onClose}
        footer={null}
        width={840}
        destroyOnClose
        title={<Stack align="center" gap={8}>
            <Image src={BudgetIcon} preview={false} width={20} />
            <span>Lập kế hoạch chi phí</span>
        </Stack>}
    >
        <DeferredModalContent active={open} minHeight={240}>
            <DishExpensePlannerWidget {...plannerProps} maxIngredientListHeight={plannerProps.maxIngredientListHeight ?? 420} />
        </DeferredModalContent>
    </Modal>
}
