import { CheckCircleOutlined, DollarOutlined, EditOutlined, HistoryOutlined, MinusOutlined, PlusOutlined, QuestionCircleOutlined, ShoppingCartOutlined, WarningOutlined } from "@ant-design/icons";
import { Button } from "@components/Button";
import { Checkbox } from "@components/Form/Checkbox";
import { DatePicker } from "@components/Form/DatePicker";
import { Option, Select } from "@components/Form/Select";
import { Image } from "@components/Image";
import { Box } from "@components/Layout/Box";
import { Stack } from "@components/Layout/Stack";
import { List } from "@components/List";
import { DeferredModalContent, Modal } from "@components/Modal";
import { useMessage } from "@components/Message";
import { Tooltip } from "@components/Tootip";
import { Typography } from "@components/Typography";
import { useScheduledCalculation, useToggle } from "@hooks";
import { Dishes } from "@store/Models/Dishes";
import { INGREDIENT_CATEGORIES, INGREDIENT_PRESERVATION_OPTIONS, Ingredient, IngredientInventory, IngredientPreservationCondition, IngredientUnit, InventoryBatch } from "@store/Models/Ingredient";
import { InventoryHelper } from "@common/Helpers/InventoryHelper";
import { IngredientUnitHelper } from "@common/Helpers/IngredientUnitHelper";
import { IngredientPriceHelper, IngredientPriceRange } from "@common/Helpers/IngredientPriceHelper";
import { CostEstimateHelper, CostEstimateSummary } from "@common/Helpers/CostEstimateHelper";
import { ShoppingList, ShoppingListCompletionImport, ShoppingListIngredientAmount, ShoppingListIngredientGroup } from "@store/Models/ShoppingList";
import { completeShoppingList, setIngredientBoughtAmount, toggleDoneIngredientAmount, toggleDoneIngredientGroup } from "@store/Reducers/ShoppingListReducer";
import { setInventory } from "@store/Reducers/InventoryReducer";
import { IngredientPriceHistoryEntry, IngredientPriceMemory, rememberIngredientPrice } from "@store/Reducers/AppContextReducer";
import { selectDishes, selectDishesById, selectIngredientPriceHistory, selectIngredientPriceMemory, selectIngredients, selectIngredientsById, selectInventory, selectScheduledMealsById } from "@store/Selectors";
import { Divider, InputNumber, Space, Spin, Tabs } from "antd";
import { CheckboxChangeEvent } from "antd/es/checkbox";
import { groupBy } from "lodash";
import moment from "moment";
import { nanoid } from "nanoid";
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import ChecklistIcon from "../../../../assets/icons/done.png";
import BudgetIcon from "../../../../assets/icons/budget.png";
import MealsIcon from "../../../../assets/icons/meals.png";
import CalendarIcon from "../../../../assets/icons/nineteen.png";
import DishesIcon from "../../../../assets/icons/noodles.png";
import IngredientIcon from "../../../../assets/icons/vegetable.png";
import { ShoppingListMealDetailWidget } from "./ShoppingListMealDetail.widget";
import { DishesReadonlyDetailModal } from "@modules/Dishes/Screens/DishesManageIngredient/DishReadonlyDetail.widget";
import { DateHelpers } from "@common/Helpers/DateHelper";
import { Tag } from "@components/Tag";
import { NumberHelpers } from "@common/Helpers/NumberHelpers";

type ShoppingListDetailScreenProps = {
    shoppingList: ShoppingList;
}

type IngredientGroupStatus = {
    unit: IngredientUnit;
    totalRequired: number;
    inStock: number;
    needToBuy: number;
    boughtBaseAmount: number;
    inventoryCovered: boolean;
    isAlwaysAvailable: boolean;
}

type IngredientGroupStatusOptions = {
    requiredOnly?: boolean;
}

type BoughtImportPlan = {
    ingredientId: string;
    ingredient?: Ingredient;
    amount: number;
    unit: IngredientUnit;
    estimatedCost?: {
        min: number;
        max: number;
        currency: "VND";
    };
}

type ShoppingListIngredientPriceEstimate = {
    amount: number;
    unit: IngredientUnit;
    range: IngredientPriceRange | null;
}

type ShoppingListCostSummary = {
    requiredToBuy: CostEstimateSummary;
    recipeTotal: CostEstimateSummary;
    needMore: CostEstimateSummary;
    bought: CostEstimateSummary;
}

type ShoppingListCostMetricProps = {
    label: string;
    description: string;
    summary: CostEstimateSummary;
    primary?: boolean;
    emptyText?: string;
    testId?: string;
}

type CompletionReviewValue = {
    expiresAt?: string;
    preservationCondition?: IngredientPreservationCondition;
}

type CompletionReviewValues = Record<string, CompletionReviewValue>;

type BoughtPriceTarget = {
    amount: number;
    unit: IngredientUnit;
}

const createShoppingListCostSummary = (): ShoppingListCostSummary => ({
    requiredToBuy: CostEstimateHelper.emptySummary(),
    recipeTotal: CostEstimateHelper.emptySummary(),
    needMore: CostEstimateHelper.emptySummary(),
    bought: CostEstimateHelper.emptySummary(),
});

const getCompletionImportsForIngredient = (
    shoppingList: ShoppingList,
    ingredientId: string,
): ShoppingListCompletionImport[] => {
    return (shoppingList.completionImports ?? []).filter(item => item.ingredientId === ingredientId);
}

const getInventoryBeforeCompletionImports = (
    inventory: IngredientInventory | undefined,
    imports: ShoppingListCompletionImport[],
): IngredientInventory | undefined => {
    if (!inventory?.batches || imports.length === 0) return inventory;
    const importBatchIds = new Set(imports.map(item => item.batchId));
    return {
        ...inventory,
        batches: inventory.batches.filter(batch => !importBatchIds.has(batch.id)),
    };
}

const getImportedAmountInUnit = (
    imports: ShoppingListCompletionImport[],
    ingredient: Ingredient | undefined,
    unit: IngredientUnit,
): number => {
    return InventoryHelper.roundAmount(imports.reduce((sum, item) => {
        const converted = IngredientUnitHelper.toBaseAmount(ingredient, item.amount, item.unit, unit);
        return sum + (converted ?? item.amount);
    }, 0));
}

const addCompletionImportCosts = (
    summary: CostEstimateSummary,
    imports: ShoppingListCompletionImport[],
    ingredient: Ingredient | undefined,
): void => {
    imports.forEach(item => {
        if (item.estimatedCost) {
            CostEstimateHelper.addRange(summary, item.estimatedCost);
            return;
        }
        CostEstimateHelper.addAmount(summary, ingredient, item.amount, item.unit);
    });
}

const addActiveBoughtCost = (
    summary: CostEstimateSummary,
    group: ShoppingListIngredientGroup,
    ingredient: Ingredient | undefined,
    recipeStatus: IngredientGroupStatus,
): void => {
    const explicitBoughtAmount = group.boughtAmount ?? 0;
    if (explicitBoughtAmount > 0) {
        if (group.boughtEstimatedCost) {
            CostEstimateHelper.addRange(summary, group.boughtEstimatedCost);
            return;
        }
        CostEstimateHelper.addAmount(summary, ingredient, explicitBoughtAmount, group.boughtUnit ?? recipeStatus.unit);
        return;
    }

    if (group.isDone && recipeStatus.needToBuy > 0) {
        CostEstimateHelper.addAmount(summary, ingredient, recipeStatus.needToBuy, recipeStatus.unit);
    }
}

const buildShoppingListCostSummary = (
    shoppingList: ShoppingList,
    ingredientsById: Map<string, Ingredient>,
    inventoryItems: Record<string, IngredientInventory>,
): ShoppingListCostSummary => {
    const isCompleted = Boolean(shoppingList.completedAt);

    return shoppingList.ingredients.reduce((summary, group) => {
        const ingredient = ingredientsById.get(group.ingredientId);
        const completionImports = isCompleted ? getCompletionImportsForIngredient(shoppingList, group.ingredientId) : [];
        const inventory = isCompleted
            ? getInventoryBeforeCompletionImports(inventoryItems[group.ingredientId], completionImports)
            : inventoryItems[group.ingredientId];
        const recipeStatus = getIngredientGroupStatus(group, ingredient, inventory);
        const requiredStatus = getIngredientGroupStatus(group, ingredient, inventory, { requiredOnly: true });
        CostEstimateHelper.addAmount(summary.recipeTotal, ingredient, recipeStatus.totalRequired, recipeStatus.unit);

        if (requiredStatus.isAlwaysAvailable) return summary;

        CostEstimateHelper.addAmount(summary.requiredToBuy, ingredient, requiredStatus.needToBuy, requiredStatus.unit);

        if (isCompleted && completionImports.length > 0) {
            const importedRequiredUnitAmount = getImportedAmountInUnit(completionImports, ingredient, requiredStatus.unit);
            const needMoreAmount = InventoryHelper.roundAmount(Math.max(0, requiredStatus.needToBuy - importedRequiredUnitAmount));
            CostEstimateHelper.addAmount(summary.needMore, ingredient, needMoreAmount, requiredStatus.unit);
            addCompletionImportCosts(summary.bought, completionImports, ingredient);
            return summary;
        }

        const cartEstimate = getShoppingListIngredientPriceEstimate(group, ingredient, inventory, { requiredOnly: true });
        if (cartEstimate) CostEstimateHelper.addAmount(summary.needMore, ingredient, cartEstimate.amount, cartEstimate.unit);
        addActiveBoughtCost(summary.bought, group, ingredient, recipeStatus);

        return summary;
    }, createShoppingListCostSummary());
}

const getIngredientGroupStatus = (
    group: ShoppingListIngredientGroup,
    ingredient: Ingredient | undefined,
    inventory: IngredientInventory | undefined,
    options?: IngredientGroupStatusOptions,
): IngredientGroupStatus => {
    const amounts = options?.requiredOnly
        ? group.amounts.filter(amt => amt.required !== false)
        : group.amounts;
    const unitSourceAmounts = amounts.length > 0 ? amounts : group.amounts;
    const unit = IngredientUnitHelper.getBaseUnit(ingredient, unitSourceAmounts.map(amt => amt.unit));
    const totalRequired = InventoryHelper.roundAmount(amounts.reduce((sum, amt) => {
        const converted = IngredientUnitHelper.toBaseAmount(ingredient, amt.amount, amt.unit, unit);
        return sum + (converted ?? IngredientUnitHelper.parseAmount(amt.amount));
    }, 0));
    const isAlwaysAvailable = InventoryHelper.isAlwaysAvailable(ingredient);
    const inStock = InventoryHelper.roundAmount(InventoryHelper.availableAmount(inventory, ingredient, totalRequired));
    const needToBuy = InventoryHelper.roundAmount(Math.max(0, totalRequired - inStock));
    const boughtUnit = group.boughtUnit ?? unit;
    const boughtAmount = group.boughtAmount ?? 0;
    const boughtBaseAmount = InventoryHelper.roundAmount(boughtAmount > 0
        ? (IngredientUnitHelper.toBaseAmount(ingredient, boughtAmount, boughtUnit, unit) ?? boughtAmount)
        : 0);

    return {
        unit,
        totalRequired,
        inStock,
        needToBuy,
        boughtBaseAmount,
        inventoryCovered: inStock >= totalRequired && totalRequired > 0,
        isAlwaysAvailable,
    };
}

const getExistingBatches = (
    inventory: IngredientInventory | undefined,
    defaultUnit: IngredientUnit,
): InventoryBatch[] => {
    if (!inventory) return [];
    if (inventory.batches) return inventory.batches;

    const legacyAmount = (inventory as any).amount ?? 0;
    return legacyAmount > 0
        ? [{ id: "legacy", amount: legacyAmount, unit: inventory.unit ?? defaultUnit }]
        : [];
}

const getBoughtImportPlans = (
    shoppingList: ShoppingList,
    ingredientsById: Map<string, Ingredient>,
    inventoryItems: Record<string, IngredientInventory>,
): BoughtImportPlan[] => {
    return shoppingList.ingredients.reduce((plans, group) => {
        const ingredient = ingredientsById.get(group.ingredientId);
        if (InventoryHelper.isAlwaysAvailable(ingredient)) return plans;

        const inventory = inventoryItems[group.ingredientId];
        const status = getIngredientGroupStatus(group, ingredient, inventory);
        const inventoryUnits = IngredientUnitHelper.getInventoryUnits(ingredient);
        const defaultUnit = group.boughtUnit ?? IngredientUnitHelper.getBaseUnit(ingredient, inventoryUnits);
        const explicitBoughtAmount = group.boughtAmount ?? 0;

        if (explicitBoughtAmount > 0) {
            plans.push({
                ingredientId: group.ingredientId,
                ingredient,
                amount: explicitBoughtAmount,
                unit: defaultUnit,
                estimatedCost: group.boughtEstimatedCost,
            });
            return plans;
        }

        if (group.isDone && status.needToBuy > 0) {
            const amount = IngredientUnitHelper.fromBaseAmount(ingredient, status.needToBuy, defaultUnit, status.unit) ?? status.needToBuy;
            if (amount > 0) {
                plans.push({
                    ingredientId: group.ingredientId,
                    ingredient,
                    amount,
                    unit: defaultUnit,
                });
            }
        }

        return plans;
    }, [] as BoughtImportPlan[]);
}

const getBoughtPriceTarget = (
    group: ShoppingListIngredientGroup,
    ingredient: Ingredient | undefined,
    status: IngredientGroupStatus,
    boughtUnit: IngredientUnit,
): BoughtPriceTarget => {
    const explicitAmount = group.boughtAmount ?? 0;
    if (explicitAmount > 0) return { amount: explicitAmount, unit: boughtUnit };

    const baseAmount = status.needToBuy > 0 ? status.needToBuy : status.totalRequired;
    if (baseAmount <= 0) return { amount: 0, unit: boughtUnit };

    const amount = IngredientUnitHelper.fromBaseAmount(ingredient, baseAmount, boughtUnit, status.unit) ?? baseAmount;
    return {
        amount: InventoryHelper.roundAmount(amount),
        unit: boughtUnit,
    };
}

const estimateRememberedPriceForTarget = (
    memory: IngredientPriceMemory | undefined,
    ingredient: Ingredient | undefined,
    target: BoughtPriceTarget,
): number | undefined => {
    if (!memory || memory.price <= 0 || memory.amount <= 0 || target.amount <= 0) return undefined;

    const baseUnit = IngredientUnitHelper.getBaseUnit(ingredient, [memory.unit, target.unit]);
    const memoryBaseAmount = IngredientUnitHelper.toBaseAmount(ingredient, memory.amount, memory.unit, baseUnit);
    const targetBaseAmount = IngredientUnitHelper.toBaseAmount(ingredient, target.amount, target.unit, baseUnit);
    if (!memoryBaseAmount || !targetBaseAmount || memoryBaseAmount <= 0) return memory.price;

    return Math.round(memory.price * targetBaseAmount / memoryBaseAmount);
}

const formatPriceMemoryLine = (memory: IngredientPriceMemory): string => {
    const dateLabel = memory.updatedAt ? moment(memory.updatedAt).format("DD/MM") : "gần nhất";
    return `${IngredientPriceHelper.formatCurrency(memory.price)} / ${IngredientUnitHelper.formatAmount(memory.amount)}${memory.unit} · ${dateLabel}`;
}

const compactSmallButtonStyle: React.CSSProperties = {
    height: 30,
    padding: "0 10px",
    lineHeight: "18px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 650,
};

const asHistoryEntry = (memory: IngredientPriceMemory | undefined): IngredientPriceHistoryEntry | undefined => {
    if (!memory) return undefined;
    return {
        ...memory,
        id: `memory-${memory.ingredientId}-${memory.updatedAt}`,
    };
}

const getShoppingListIngredientPriceEstimate = (
    group: ShoppingListIngredientGroup,
    ingredient: Ingredient | undefined,
    inventory: IngredientInventory | undefined,
    options?: IngredientGroupStatusOptions,
): ShoppingListIngredientPriceEstimate | null => {
    if (InventoryHelper.isAlwaysAvailable(ingredient)) return null;

    const status = getIngredientGroupStatus(group, ingredient, inventory, options);
    const explicitBoughtAmount = group.boughtAmount ?? 0;
    const amount = InventoryHelper.roundAmount(explicitBoughtAmount > 0
        ? Math.max(0, status.needToBuy - status.boughtBaseAmount)
        : group.isDone ? 0 : status.needToBuy);
    const unit = status.unit;
    if (amount <= 0) return null;

    return {
        amount,
        unit,
        range: IngredientPriceHelper.estimateForAmount(ingredient, amount, unit),
    };
}

export const ShoppingListDetailWidget: React.FunctionComponent<ShoppingListDetailScreenProps> = (props) => {
    const dispatch = useDispatch();
    const message = useMessage();
    const dishesById = useSelector(selectDishesById);
    const ingredientsById = useSelector(selectIngredientsById);
    const inventoryItems = useSelector(selectInventory);
    const scheduledMealsById = useSelector(selectScheduledMealsById);
    const toggleMealModal = useToggle();
    const toggleCompletionReview = useToggle();
    const [selectedMeal, setSelectedMeal] = useState<string>();
    const [completionReviewValues, setCompletionReviewValues] = useState<CompletionReviewValues>({});
    const [activeTab, setActiveTab] = useState("ingredients");
    const isReadonly = Boolean(props.shoppingList.completedAt);

    const boughtImportPlans = useMemo(() => {
        return getBoughtImportPlans(props.shoppingList, ingredientsById, inventoryItems);
    }, [props.shoppingList, ingredientsById, inventoryItems]);

    const _getDishesByIds = (ids: string[]) => {
        return ids.map(id => dishesById.get(id)).filter(Boolean) as Dishes[];
    }

    const _getScheduledMealsByIds = (ids: string[]) => {
        return ids.map(id => scheduledMealsById.get(id)).filter(Boolean);
    }

    const _onShowMeal = (mealId: string) => {
        toggleMealModal.show();
        setSelectedMeal(mealId)
    }

    const groupedIngredients = useMemo(() => {
        if (activeTab !== "ingredients") return [];
        const grouped = groupBy(props.shoppingList.ingredients, item => {
            return ingredientsById.get(item.ingredientId)?.category ?? "Khác";
        });
        // INGREDIENT_CATEGORIES already includes "Khác"; add any unknown categories at the end
        const baseOrder = [...INGREDIENT_CATEGORIES];
        Object.keys(grouped).forEach(k => { if (!baseOrder.includes(k)) baseOrder.push(k); });
        const orderedKeys = baseOrder.filter(cat => grouped[cat]?.length > 0);
        return orderedKeys.map(cat => ({ category: cat, items: grouped[cat] }));
    }, [activeTab, props.shoppingList.ingredients, ingredientsById]);

    const calculateCostSummary = React.useCallback(() => {
        return buildShoppingListCostSummary(props.shoppingList, ingredientsById, inventoryItems);
    }, [props.shoppingList, ingredientsById, inventoryItems]);
    const { value: costSummary, pending: costSummaryPending } = useScheduledCalculation(calculateCostSummary, {
        enabled: activeTab === "cost",
        initialValue: createShoppingListCostSummary,
    });

    const _completeShoppingList = () => {
        if (props.shoppingList.completedAt) return;

        const importedAt = new Date().toISOString();
        const completionImports: ShoppingListCompletionImport[] = [];

        boughtImportPlans.forEach(plan => {
            const inventory = inventoryItems[plan.ingredientId];
            const baseUnit = IngredientUnitHelper.getBaseUnit(plan.ingredient, [inventory?.unit, plan.unit].filter(Boolean) as IngredientUnit[]);
            const batchId = nanoid(10);
            const review = completionReviewValues[plan.ingredientId] ?? {};
            const hasReviewStorage = Object.prototype.hasOwnProperty.call(review, "preservationCondition");
            const preservationCondition = hasReviewStorage ? review.preservationCondition : plan.ingredient?.preservationCondition;
            const estimatedCost = plan.estimatedCost ?? IngredientPriceHelper.estimateForAmount(plan.ingredient, plan.amount, plan.unit);
            dispatch(setInventory({
                ingredientId: plan.ingredientId,
                inventory: {
                    unit: baseUnit,
                    lastUpdated: new Date(),
                    discardedBatches: inventory?.discardedBatches,
                    batches: [
                        ...getExistingBatches(inventory, baseUnit),
                        {
                            id: batchId,
                            amount: plan.amount,
                            unit: plan.unit,
                            purchasedAt: importedAt,
                            expiresAt: review.expiresAt,
                            preservationCondition,
                        },
                    ],
                },
            }));
            completionImports.push({
                id: nanoid(10),
                batchId,
                ingredientId: plan.ingredientId,
                ingredientName: plan.ingredient?.name ?? plan.ingredientId,
                amount: plan.amount,
                unit: plan.unit,
                importedAt,
                expiresAt: review.expiresAt,
                preservationCondition,
                estimatedCost: estimatedCost
                    ? { min: estimatedCost.min, max: estimatedCost.max, currency: estimatedCost.currency }
                    : undefined,
            });
        });

        dispatch(completeShoppingList({ shoppingListId: props.shoppingList.id, imports: completionImports }));
        toggleCompletionReview.hide();
        message.success("Đã hoàn tất lịch mua sắm");
    }

    const _onCompleteShoppingList = () => {
        if (props.shoppingList.completedAt) return;
        toggleCompletionReview.show();
    }

    const _patchCompletionReviewValue = (ingredientId: string, patch: CompletionReviewValue) => {
        setCompletionReviewValues(prev => ({
            ...prev,
            [ingredientId]: {
                ...prev[ingredientId],
                ...patch,
            },
        }));
    }

    return <React.Fragment>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
            {
                key: "ingredients", icon: <Image src={IngredientIcon} preview={false} width={22} style={{ marginBottom: 3 }} />, label: `Nguyên liệu (${props.shoppingList.ingredients.length})`,
                children: activeTab === "ingredients" ? <div data-testid="shopping-list-ingredients-tab">
                    <Stack fullwidth justify="space-between" style={{ marginBottom: 10 }}>
                        <Space>
                            <Image src={ChecklistIcon} preview={false} width={18} style={{ marginBottom: 3 }} />
                            <Typography.Text strong>{`${props.shoppingList.ingredients.filter(e => e.isDone).length}/${props.shoppingList.ingredients.length}`}</Typography.Text>
                        </Space>
                        {isReadonly
                            ? <Space>
                                <CheckCircleOutlined style={{ color: "#52c41a" }} />
                                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                    Đã hoàn tất {moment(props.shoppingList.completedAt).format("DD/MM/YYYY HH:mm")}
                                </Typography.Text>
                            </Space>
                            : <Space wrap size={6} style={{ justifyContent: "flex-end" }}>
                                <Button
                                    type="primary"
                                    icon={<ShoppingCartOutlined />}
                                    disabled={props.shoppingList.ingredients.length === 0}
                                    onClick={_onCompleteShoppingList}
                                >
                                    Hoàn tất
                                </Button>
                            </Space>}
                    </Stack>
                    <Box>
                        {groupedIngredients.length > 1
                            ? groupedIngredients.map(group => <React.Fragment key={group.category}>
                                <Divider orientation="left" style={{ marginBlock: 6 }}>
                                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>{group.category}</Typography.Text>
                                </Divider>
                                <List
                                    dataSource={group.items}
                                    renderItem={(item) => <ShoppingListIngredientPanelItem item={item} shoppingList={props.shoppingList} readonly={isReadonly} />}
                                />
                            </React.Fragment>)
                            : <List
                                dataSource={props.shoppingList.ingredients}
                                renderItem={(item) => <ShoppingListIngredientPanelItem item={item} shoppingList={props.shoppingList} readonly={isReadonly} />}
                            />
                        }
                    </Box>
                </div> : null
            },
            {
                key: "cost", icon: <Image src={BudgetIcon} preview={false} width={22} style={{ marginBottom: 3 }} />, label: "Chi phí",
                children: activeTab === "cost" ? <Box data-testid="shopping-list-cost-tab">
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", boxSizing: "border-box" }}>
                        <ShoppingListCostSummaryWidget summary={costSummary} pending={costSummaryPending} />
                        <ShoppingListCompletionAuditWidget shoppingList={props.shoppingList} />
                    </div>
                </Box> : null
            },
            {
                key: "dishes", icon: <Image src={DishesIcon} preview={false} width={22} style={{ marginBottom: 3 }} />, label: `Món ăn (${props.shoppingList.dishes.length})`,
                children: activeTab === "dishes" ? <Box data-testid="shopping-list-dishes-tab">
                    <List
                        size="small"
                        style={{ overflowX: "auto" }}
                        dataSource={_getDishesByIds(props.shoppingList.dishes)}
                        renderItem={(item) => <ShoppingListDishesItem dish={item} targetServings={props.shoppingList.dishServings?.[item.id]} />}
                    />
                </Box> : null
            },
            {
                key: "meals", icon: <Image src={MealsIcon} preview={false} width={22} style={{ marginBottom: 3 }} />, label: `Thực đơn (${props.shoppingList.scheduledMeals.length})`,
                children: activeTab === "meals" ? <Box data-testid="shopping-list-meals-tab">
                    <List
                        size="small"
                        style={{ overflowX: "auto" }}
                        dataSource={_getScheduledMealsByIds(props.shoppingList.scheduledMeals)}
                        renderItem={(item) => <List.Item style={{ padding: 0 }}>
                            <Button fullwidth style={{ paddingInline: 0, textAlign: "left" }} type="text" onClick={() => _onShowMeal(item.id)}>
                                <Stack gap={3} justify="space-between" fullwidth>
                                    <Typography.Paragraph style={{ width: 150, marginBottom: 0, color: "blue" }} ellipsis> {item.name}</Typography.Paragraph>
                                    <Box>
                                        (<Space size={5}>
                                            <Space size={3}>
                                                <Typography.Text>{Object.values(item.meals).flat().length}</Typography.Text>
                                                <Image preview={false} src={DishesIcon} width={16} style={{ marginBottom: 5 }} />
                                            </Space>
                                            <Typography.Text>-</Typography.Text>
                                            <Space size={3}>
                                                <Space size={3}>
                                                    <Image preview={false} src={CalendarIcon} width={16} style={{ marginBottom: 5 }} />
                                                    <Typography.Text>{moment(item.plannedDate).format("DD/MM/YY")}</Typography.Text>
                                                </Space>
                                            </Space>
                                        </Space>)
                                    </Box>
                                </Stack>
                            </Button>
                        </List.Item>
                        }
                    />
                </Box> : null
            }
        ]} />
        <Modal style={{ top: 50 }} open={toggleMealModal.value} title={<Space>
            <Image src={MealsIcon} preview={false} width={24} style={{ marginBottom: 3 }} />
            Thực đơn
        </Space>} destroyOnClose={true} onCancel={toggleMealModal.hide} footer={null}>
            <Box style={{ maxHeight: 550, overflowY: "auto" }}>
                <DeferredModalContent active={toggleMealModal.value} minHeight={220}>
                    <ShoppingListMealDetailWidget mealId={selectedMeal} />
                </DeferredModalContent>
            </Box>
        </Modal>
        <Modal
            style={{ top: 40 }}
            width={760}
            open={toggleCompletionReview.value}
            title={<Space size={8}>
                <ShoppingCartOutlined />
                <span>Xác nhận hoàn tất mua sắm</span>
            </Space>}
            destroyOnClose
            onCancel={toggleCompletionReview.hide}
            footer={<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap", width: "100%", boxSizing: "border-box" }}>
                <Typography.Text type="secondary" style={{ fontSize: 12, lineHeight: "18px" }}>
                    Kiểm tra hạn dùng và nơi bảo quản trước khi nhập kho.
                </Typography.Text>
                <Space>
                    <Button onClick={toggleCompletionReview.hide}>Hủy</Button>
                    <Button type="primary" danger onClick={_completeShoppingList}>Hoàn tất và nhập kho</Button>
                </Space>
            </div>}
        >
            <div data-testid="purchase-completion-review">
                <DeferredModalContent active={toggleCompletionReview.value} minHeight={220}>
                    <PurchaseCompletionReviewWidget
                        plans={boughtImportPlans}
                        values={completionReviewValues}
                        onPatch={_patchCompletionReviewValue}
                    />
                </DeferredModalContent>
            </div>
        </Modal>
    </React.Fragment >

}

const PurchaseCompletionReviewWidget: React.FunctionComponent<{
    plans: BoughtImportPlan[];
    values: CompletionReviewValues;
    onPatch: (ingredientId: string, patch: CompletionReviewValue) => void;
}> = ({ plans, values, onPatch }) => {
    const total = plans.reduce((summary, plan) => {
        if (plan.estimatedCost) CostEstimateHelper.addRange(summary, plan.estimatedCost);
        else CostEstimateHelper.addAmount(summary, plan.ingredient, plan.amount, plan.unit);
        return summary;
    }, CostEstimateHelper.emptySummary());

    return <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", boxSizing: "border-box" }}>
        <Box style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", border: "1px solid #ffd591", borderRadius: 8, background: "#fff7e6" }}>
            <div style={{ display: "grid", gridTemplateColumns: "18px minmax(0, 1fr)", gap: 8, alignItems: "start" }}>
                <WarningOutlined style={{ color: "#d46b08", marginTop: 2 }} />
                <div style={{ minWidth: 0 }}>
                    <Typography.Text strong style={{ display: "block", color: "#ad4e00", fontSize: 13, lineHeight: "18px" }}>
                        Hành động này không thể hoàn tác
                    </Typography.Text>
                    <Typography.Text style={{ display: "block", color: "#ad4e00", fontSize: 12, lineHeight: "18px" }}>
                        Sau khi hoàn tất, danh sách mua sắm sẽ chuyển sang chỉ xem và các lô bên dưới sẽ được thêm vào kho.
                    </Typography.Text>
                </div>
            </div>
        </Box>

        <Box style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 8, background: "#fafafa", border: "1px solid #f0f0f0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap", width: "100%", boxSizing: "border-box" }}>
                <Box>
                    <Typography.Text strong style={{ display: "block", lineHeight: "20px" }}>{plans.length} lô sẽ được nhập kho</Typography.Text>
                    <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, lineHeight: "18px" }}>
                        Hạn dùng để trống sẽ dùng quy tắc bảo quản của nguyên liệu.
                    </Typography.Text>
                </Box>
                <Typography.Text strong style={{ color: "#0958d9" }}>
                    {CostEstimateHelper.hasPrice(total) ? IngredientPriceHelper.formatRange(total) : "0đ"}
                </Typography.Text>
            </div>
        </Box>

        {plans.length === 0 && <Box style={{ width: "100%", boxSizing: "border-box", padding: "12px", borderRadius: 8, background: "#fafafa", border: "1px dashed #d9d9d9" }}>
            <Typography.Text type="secondary">
                Không có nguyên liệu nào cần thêm vào kho. Danh sách vẫn sẽ được đánh dấu hoàn tất.
            </Typography.Text>
        </Box>}

        <List
            style={{ width: "100%" }}
            dataSource={plans}
            renderItem={(plan) => {
                const value = values[plan.ingredientId] ?? {};
                const hasReviewStorage = Object.prototype.hasOwnProperty.call(value, "preservationCondition");
                const preservationValue = hasReviewStorage ? value.preservationCondition : plan.ingredient?.preservationCondition;
                const cost = plan.estimatedCost ?? IngredientPriceHelper.estimateForAmount(plan.ingredient, plan.amount, plan.unit);

                return <List.Item style={{ padding: "6px 0", display: "block", borderBottom: "none" }}>
                    <div style={{
                        width: "100%",
                        boxSizing: "border-box",
                        minWidth: 0,
                        padding: "12px",
                        border: "1px solid #f0f0f0",
                        borderRadius: 8,
                        background: "#fff",
                    }}>
                        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 10, alignItems: "start", marginBottom: 10 }}>
                            <div style={{ minWidth: 0 }}>
                                <Typography.Text strong style={{ display: "block", overflowWrap: "break-word", lineHeight: "20px" }}>
                                    {plan.ingredient?.name ?? plan.ingredientId}
                                </Typography.Text>
                                <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, lineHeight: "18px" }}>
                                    {IngredientUnitHelper.formatAmount(plan.amount)} {plan.unit}
                                </Typography.Text>
                            </div>
                            <Typography.Text type="secondary" style={{ fontSize: 12, lineHeight: "18px", whiteSpace: "nowrap" }}>
                                {cost ? IngredientPriceHelper.formatRange(cost) : "Chưa có giá"}
                            </Typography.Text>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8, width: "100%" }}>
                            <DatePicker
                                size="small"
                                allowClear
                                placeholder="Hạn dùng"
                                value={value.expiresAt ? moment(value.expiresAt) : undefined}
                                onChange={(date) => onPatch(plan.ingredientId, { expiresAt: date ? date.endOf("day").toISOString() : undefined })}
                                style={{ width: "100%" }}
                            />
                            <Select
                                size="small"
                                allowClear
                                placeholder="Bảo quản"
                                value={preservationValue}
                                onChange={(next: IngredientPreservationCondition) => onPatch(plan.ingredientId, { preservationCondition: next })}
                                style={{ width: "100%" }}
                            >
                                {INGREDIENT_PRESERVATION_OPTIONS.map(opt => <Option key={opt.value} value={opt.value}>{opt.label}</Option>)}
                            </Select>
                        </div>
                    </div>
                </List.Item>
            }}
        />
    </div>
}

const ShoppingListCompletionAuditWidget: React.FunctionComponent<{ shoppingList: ShoppingList }> = ({ shoppingList }) => {
    if (!shoppingList.completedAt) return null;
    const imports = shoppingList.completionImports ?? [];
    const storageLabel = (value?: IngredientPreservationCondition) => INGREDIENT_PRESERVATION_OPTIONS.find(opt => opt.value === value)?.label;

    return <Box style={{ width: "100%", boxSizing: "border-box", padding: "12px", borderRadius: 8, background: "#fff", border: "1px solid #f0f0f0" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", boxSizing: "border-box" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap", width: "100%", boxSizing: "border-box" }}>
                <Box>
                    <Typography.Text strong style={{ display: "block", lineHeight: "20px" }}>Lịch sử nhập kho</Typography.Text>
                    <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, lineHeight: "18px" }}>
                        Hoàn tất {moment(shoppingList.completedAt).format("DD/MM/YYYY HH:mm")}
                    </Typography.Text>
                </Box>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>{imports.length} lô</Typography.Text>
            </div>

            {imports.length === 0
                ? <Typography.Text type="secondary" style={{ fontSize: 12 }}>Không có lô nguyên liệu nào được nhập khi hoàn tất.</Typography.Text>
                : <List
                    size="small"
                    style={{ width: "100%" }}
                    dataSource={imports}
                    renderItem={(item) => <List.Item style={{ padding: "6px 0", display: "block", borderBottom: "none" }}>
                        <div style={{
                            width: "100%",
                            boxSizing: "border-box",
                            minWidth: 0,
                            padding: "10px 12px",
                            border: "1px solid #f0f0f0",
                            borderRadius: 8,
                            background: "#fff",
                        }}>
                            <Typography.Text strong style={{ display: "block", overflowWrap: "break-word", lineHeight: "20px" }}>
                                {item.ingredientName}
                            </Typography.Text>
                            <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, lineHeight: "18px" }}>
                                {IngredientUnitHelper.formatAmount(item.amount)} {item.unit}
                                {item.estimatedCost ? ` · ${IngredientPriceHelper.formatRange(item.estimatedCost)}` : ""}
                            </Typography.Text>
                            <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, lineHeight: "18px", marginTop: 2 }}>
                                Lô {item.batchId}
                            </Typography.Text>
                            {(item.expiresAt || item.preservationCondition) && <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, lineHeight: "18px", marginTop: 2 }}>
                                {item.expiresAt ? `Hạn dùng ${moment(item.expiresAt).format("DD/MM/YYYY")}` : ""}
                                {item.expiresAt && item.preservationCondition ? " · " : ""}
                                {storageLabel(item.preservationCondition) ?? ""}
                            </Typography.Text>}
                        </div>
                    </List.Item>}
                />}
        </div>
    </Box>
}

const formatCostSummary = (summary: CostEstimateSummary, emptyText = "0đ"): string => {
    if (!CostEstimateHelper.hasAny(summary)) return emptyText;
    if (!CostEstimateHelper.hasPrice(summary)) return "Chưa có giá";
    return IngredientPriceHelper.formatRange(summary);
}

const ShoppingListCostMetric: React.FunctionComponent<ShoppingListCostMetricProps> = ({ label, description, summary, primary, emptyText, testId }) => {
    return <div data-testid={testId} style={{
        minWidth: 0,
        minHeight: 62,
        padding: "12px",
        borderRadius: 8,
        border: primary ? "1px solid #91caff" : "1px solid #eeeeee",
        background: primary ? "#f0f7ff" : "#fff",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
    }}>
        <div>
            <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, lineHeight: "18px" }}>
                {label}
            </Typography.Text>
            <Typography.Text strong style={{ display: "block", color: primary ? "#0958d9" : undefined, fontSize: primary ? 18 : 15, lineHeight: primary ? "24px" : "22px" }}>
                {formatCostSummary(summary, emptyText)}
            </Typography.Text>
        </div>
        <div>
            <Typography.Text type="secondary" style={{ display: "block", fontSize: 11, lineHeight: "16px" }}>
                {description}
            </Typography.Text>
            {summary.missingPriceCount > 0 && <Typography.Text type="secondary" style={{ display: "block", fontSize: 11, lineHeight: "16px" }}>
                {summary.missingPriceCount} mục chưa có giá
            </Typography.Text>}
        </div>
    </div>
}

const ShoppingListCostSummaryWidget: React.FunctionComponent<{ summary: ShoppingListCostSummary; pending?: boolean }> = ({ summary, pending }) => {
    const hasSummary = CostEstimateHelper.hasAny(summary.requiredToBuy)
        || CostEstimateHelper.hasAny(summary.recipeTotal)
        || CostEstimateHelper.hasAny(summary.needMore)
        || CostEstimateHelper.hasAny(summary.bought);

    if (!hasSummary && !pending) return null;

    return <Box style={{ width: "100%", boxSizing: "border-box", padding: "12px", borderRadius: 8, background: "#fafafa", border: "1px solid #f0f0f0" }}>
        {pending ? <div style={{ minHeight: 92, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
            <Stack direction="column" align="center" gap={8}>
                <Spin size="small" />
                <Typography.Text type="secondary">Đang tính chi phí mua sắm...</Typography.Text>
            </Stack>
        </div> :
        <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", boxSizing: "border-box" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap", width: "100%", boxSizing: "border-box" }}>
                <Box>
                    <Typography.Text strong style={{ display: "block", lineHeight: "20px" }}>Ước tính mua sắm</Typography.Text>
                    <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, lineHeight: "18px" }}>Giá tham khảo theo khoảng giá nguyên liệu</Typography.Text>
                </Box>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>Tổng quan chi phí</Typography.Text>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, width: "100%" }}>
                <ShoppingListCostMetric
                    testId="shopping-cost-required-buy"
                    label="Cần mua ban đầu"
                    description="Bắt buộc còn thiếu theo kho"
                    summary={summary.requiredToBuy}
                    emptyText="0đ"
                />
                <ShoppingListCostMetric
                    testId="shopping-cost-recipe-total"
                    label="Tổng công thức"
                    description="Bao gồm bắt buộc và tùy chọn"
                    summary={summary.recipeTotal}
                    emptyText="Chưa có giá"
                />
                <ShoppingListCostMetric
                    testId="shopping-cost-need-more"
                    label="Cần mua thêm"
                    description="Sau khi trừ phần đã mua"
                    summary={summary.needMore}
                    primary
                    emptyText="0đ"
                />
                {CostEstimateHelper.hasAny(summary.bought) && <ShoppingListCostMetric
                    testId="shopping-cost-bought"
                    label="Đã mua"
                    description="Theo lượng đã đánh dấu"
                    summary={summary.bought}
                    emptyText="0đ"
                />}
            </div>
        </div>}
    </Box>
}

type ShoppingListIngredientPanelItemProps = {
    item: ShoppingListIngredientGroup;
    shoppingList: ShoppingList;
    readonly?: boolean;
}

const ShoppingListIngredientPanelItem: React.FunctionComponent<ShoppingListIngredientPanelItemProps> = (props) => {
    const dispatch = useDispatch();
    const message = useMessage();
    const ingredientsById = useSelector(selectIngredientsById);
    const inventoryItems = useSelector(selectInventory);
    const ingredientPriceMemory = useSelector(selectIngredientPriceMemory);
    const ingredientPriceHistory = useSelector(selectIngredientPriceHistory);
    const [expanded, setExpanded] = useState(false);
    const toggleBoughtModal = useToggle();
    const [priceEditorOpen, setPriceEditorOpen] = useState(false);

    const ingredient = ingredientsById.get(props.item.ingredientId);
    const inventory = inventoryItems[props.item.ingredientId];
    const status = getIngredientGroupStatus(props.item, ingredient, inventory);
    const priceEstimate = getShoppingListIngredientPriceEstimate(props.item, ingredient, inventory);
    const remainingToBuy = priceEstimate?.amount ?? 0;
    const effectiveIsDone = props.item.isDone;
    const inventoryUnits = IngredientUnitHelper.getInventoryUnits(ingredient);
    const boughtUnit = props.item.boughtUnit ?? status.unit;
    const boughtUnitOptions = Array.from(new Set([...inventoryUnits, boughtUnit]));
    const boughtPriceTarget = getBoughtPriceTarget(props.item, ingredient, status, boughtUnit);
    const priceMemory = ingredientPriceMemory[props.item.ingredientId];
    const priceHistory = ingredientPriceHistory[props.item.ingredientId] ?? [];
    const displayPriceHistory = priceHistory.length > 0 ? priceHistory : [asHistoryEntry(priceMemory)].filter(Boolean) as IngredientPriceHistoryEntry[];
    const rememberedPriceForTarget = estimateRememberedPriceForTarget(priceMemory, ingredient, boughtPriceTarget);
    const targetPriceEstimate = boughtPriceTarget.amount > 0
        ? IngredientPriceHelper.estimateForAmount(ingredient, boughtPriceTarget.amount, boughtPriceTarget.unit)
        : null;
    const [draftPrice, setDraftPrice] = useState<number | undefined>(props.item.boughtEstimatedCost?.min);

    useEffect(() => {
        setDraftPrice(props.item.boughtEstimatedCost?.min);
    }, [props.item.boughtEstimatedCost?.min, props.item.id]);

    const _getIngredientNameById = (id: string) => {
        return ingredientsById.get(id)?.name || "";
    }

    const _onCheckedAllChange = (e: CheckboxChangeEvent) => {
        if (props.readonly) return;
        const isChecked = e.target.checked;
        dispatch(toggleDoneIngredientGroup({
            shoppingListId: props.shoppingList.id,
            ingredientGroupId: props.item.id,
            isDone: isChecked,
        }));

        if (isChecked) {
            setPriceEditorOpen(!props.item.boughtEstimatedCost);
            toggleBoughtModal.show();
        }

        if (isChecked && !props.item.boughtAmount && status.needToBuy > 0) {
            dispatch(setIngredientBoughtAmount({
                shoppingListId: props.shoppingList.id,
                ingredientGroupId: props.item.id,
                boughtAmount: status.needToBuy,
                boughtUnit: status.unit,
                boughtEstimatedCost: props.item.boughtEstimatedCost,
            }));
        }
    }

    const _isBoughtAmountEnough = (amount: number | undefined, unit: IngredientUnit) => {
        if (!amount || amount <= 0) return false;
        const boughtBaseAmount = IngredientUnitHelper.toBaseAmount(ingredient, amount, unit, status.unit) ?? amount;
        return status.needToBuy > 0
            ? boughtBaseAmount >= status.needToBuy
            : boughtBaseAmount > 0;
    }

    const _syncDoneWithBoughtAmount = (amount: number | undefined, unit: IngredientUnit) => {
        const isEnough = _isBoughtAmountEnough(amount, unit);
        const hadBoughtAmount = (props.item.boughtAmount ?? 0) > 0;

        if (isEnough && !props.item.isDone) {
            dispatch(toggleDoneIngredientGroup({
                shoppingListId: props.shoppingList.id,
                ingredientGroupId: props.item.id,
                isDone: true,
            }));
        }

        if (!isEnough && hadBoughtAmount && props.item.isDone && status.needToBuy > 0) {
            dispatch(toggleDoneIngredientGroup({
                shoppingListId: props.shoppingList.id,
                ingredientGroupId: props.item.id,
                isDone: false,
            }));
        }
    }

    const _onBoughtAmountChange = (value: number | string | null) => {
        if (props.readonly) return;
        const parsed = typeof value === "number" ? value : parseFloat(value ?? "");
        const boughtAmount = isFinite(parsed) && parsed > 0 ? parsed : undefined;
        dispatch(setIngredientBoughtAmount({
            shoppingListId: props.shoppingList.id,
            ingredientGroupId: props.item.id,
            boughtAmount,
            boughtUnit,
            boughtEstimatedCost: undefined,
        }));
        setPriceEditorOpen(true);
        _syncDoneWithBoughtAmount(boughtAmount, boughtUnit);
    }

    const _onBoughtUnitChange = (unit: IngredientUnit) => {
        if (props.readonly) return;
        dispatch(setIngredientBoughtAmount({
            shoppingListId: props.shoppingList.id,
            ingredientGroupId: props.item.id,
            boughtAmount: props.item.boughtAmount,
            boughtUnit: unit,
            boughtEstimatedCost: undefined,
        }));
        setPriceEditorOpen(true);
        _syncDoneWithBoughtAmount(props.item.boughtAmount, unit);
    }

    const _setBoughtAmount = (amount: number | undefined, unit: IngredientUnit = boughtUnit) => {
        if (props.readonly) return;
        dispatch(setIngredientBoughtAmount({
            shoppingListId: props.shoppingList.id,
            ingredientGroupId: props.item.id,
            boughtAmount: amount,
            boughtUnit: unit,
            boughtEstimatedCost: undefined,
        }));
        setPriceEditorOpen(true);
        _syncDoneWithBoughtAmount(amount, unit);
    }

    const _applyPaidPrice = (price: number | undefined) => {
        if (props.readonly || !price || price <= 0 || boughtPriceTarget.amount <= 0) {
            message.warning("Nhập giá và lượng đã mua trước khi lưu.");
            return;
        }

        const normalizedPrice = Math.round(price);
        dispatch(setIngredientBoughtAmount({
            shoppingListId: props.shoppingList.id,
            ingredientGroupId: props.item.id,
            boughtAmount: props.item.boughtAmount ?? boughtPriceTarget.amount,
            boughtUnit: boughtPriceTarget.unit,
            boughtEstimatedCost: { min: normalizedPrice, max: normalizedPrice, currency: "VND" },
        }));
        dispatch(rememberIngredientPrice({
            id: nanoid(10),
            ingredientId: props.item.ingredientId,
            price: normalizedPrice,
            amount: boughtPriceTarget.amount,
            unit: boughtPriceTarget.unit,
            currency: "VND",
            updatedAt: new Date().toISOString(),
            shoppingListId: props.shoppingList.id,
            shoppingListName: props.shoppingList.name,
        }));
        setDraftPrice(normalizedPrice);
        setPriceEditorOpen(false);
        message.success("Đã lưu giá mua gần nhất");
    }

    const _clearPaidPrice = () => {
        if (props.readonly) return;
        dispatch(setIngredientBoughtAmount({
            shoppingListId: props.shoppingList.id,
            ingredientGroupId: props.item.id,
            boughtAmount: props.item.boughtAmount,
            boughtUnit,
            boughtEstimatedCost: undefined,
        }));
        setDraftPrice(undefined);
    }

    const _getDateFromNow = (item: ShoppingListIngredientAmount) => {
        return DateHelpers.calculateDaysBetween(new Date(), item.meal.plannedDate);
    }

    const _getDateFromNowDisplayText = (item: ShoppingListIngredientAmount) => {
        return moment(item.meal.plannedDate).startOf("day").from(moment().startOf("day"));
    }

    const indeterminate = !effectiveIsDone && status.boughtBaseAmount > 0;
    const _statusPill = (label: string, tone: "blue" | "green" | "orange" | "purple" | "gray") => {
        const colors = {
            blue: { background: "#e6f4ff", border: "#91caff", color: "#0958d9" },
            green: { background: "#f6ffed", border: "#b7eb8f", color: "#389e0d" },
            orange: { background: "#fff7e6", border: "#ffd591", color: "#d46b08" },
            purple: { background: "#f9f0ff", border: "#d3adf7", color: "#722ed1" },
            gray: { background: "#fafafa", border: "#d9d9d9", color: "#595959" },
        }[tone];

        return <div
            key={label}
            style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "3px 10px",
                borderRadius: 16,
                fontSize: 12,
                lineHeight: "16px",
                background: colors.background,
                border: `1px solid ${colors.border}`,
                color: colors.color,
                whiteSpace: "nowrap",
            }}
        >
            {label}
        </div>;
    }

    const hasSavedPrice = Boolean(props.item.boughtEstimatedCost);
    const rememberedPriceMatchesTarget = Boolean(priceMemory
        && priceMemory.amount === boughtPriceTarget.amount
        && priceMemory.unit === boughtPriceTarget.unit);
    const estimatedPriceButtons = targetPriceEstimate
        ? Array.from(new Set([targetPriceEstimate.min, targetPriceEstimate.max].filter(value => value > 0)))
        : [];
    const canEditBoughtInfo = !props.readonly && !status.isAlwaysAvailable;
    const currentPriceLabel = props.item.boughtEstimatedCost ? IngredientPriceHelper.formatRange(props.item.boughtEstimatedCost) : "Chưa lưu giá";

    const _openBoughtModal = (event?: React.MouseEvent<HTMLElement>) => {
        event?.stopPropagation();
        setPriceEditorOpen(!hasSavedPrice);
        toggleBoughtModal.show();
    }

    const boughtInfoModal = <Modal
        style={{ top: 35 }}
        width={620}
        open={toggleBoughtModal.value}
        title={<Space size={8}><DollarOutlined /><span>Mua thực tế</span></Space>}
        destroyOnClose={false}
        onCancel={toggleBoughtModal.hide}
        footer={<div style={{ display: "flex", justifyContent: "flex-end", width: "100%" }}>
            <Button size="small" onClick={toggleBoughtModal.hide} style={compactSmallButtonStyle}>Đóng</Button>
        </div>}
    >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }} data-testid={`shopping-list-bought-modal-${props.item.ingredientId}`}>
            <Box style={{ padding: "11px 12px", border: "1px solid #efe7ff", borderRadius: 8, background: "linear-gradient(135deg, #fff 0%, #fbf8ff 100%)" }}>
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 10, alignItems: "start" }}>
                    <div style={{ minWidth: 0 }}>
                        <Typography.Text strong style={{ display: "block", fontSize: 16, lineHeight: "21px", color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {_getIngredientNameById(props.item.ingredientId)}
                        </Typography.Text>
                        <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, lineHeight: "18px", marginTop: 2 }}>
                            Cần {IngredientUnitHelper.formatAmount(status.totalRequired)}{status.unit}
                            {status.inStock > 0 ? ` · có ${IngredientUnitHelper.formatAmount(status.inStock)}${status.unit}` : ""}
                        </Typography.Text>
                    </div>
                    <span style={{ borderRadius: 999, padding: "3px 9px", border: "1px solid #d3adf7", background: "#f9f0ff", color: "#722ed1", fontSize: 12, lineHeight: "18px", fontWeight: 800, whiteSpace: "nowrap" }}>
                        {currentPriceLabel}
                    </span>
                </div>
            </Box>

            <Box style={{ padding: "11px 12px", border: "1px solid #f0f0f0", borderRadius: 8, background: "#fff" }}>
                <Stack justify="space-between" align="flex-start" gap={8} style={{ marginBottom: 10 }}>
                    <Box>
                        <Typography.Text strong style={{ display: "block", fontSize: 13, lineHeight: "18px" }}>Lượng đã mua</Typography.Text>
                        <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, lineHeight: "17px" }}>Nhập đúng lượng thực tế để nhập kho và tính chi phí.</Typography.Text>
                    </Box>
                    {props.item.boughtAmount && <Tag color="purple" style={{ marginInlineEnd: 0 }}>{IngredientUnitHelper.formatAmount(props.item.boughtAmount)}{boughtUnit}</Tag>}
                </Stack>
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 92px", gap: 8, alignItems: "center", marginBottom: 8 }}>
                    <InputNumber
                        min={0}
                        size="small"
                        value={props.item.boughtAmount}
                        disabled={!canEditBoughtInfo}
                        onChange={_onBoughtAmountChange}
                        style={{ width: "100%" }}
                    />
                    <Select size="small" value={boughtUnit} disabled={!canEditBoughtInfo} onChange={_onBoughtUnitChange} style={{ width: "100%" }}>
                        {boughtUnitOptions.map(unit => <Option key={unit} value={unit}>{unit}</Option>)}
                    </Select>
                </div>
                {canEditBoughtInfo && <Space wrap size={6}>
                    {status.needToBuy > 0 && <Button size="small" style={compactSmallButtonStyle} onClick={() => _setBoughtAmount(status.needToBuy, status.unit)}>Đủ cần {IngredientUnitHelper.formatAmount(status.needToBuy)}{status.unit}</Button>}
                    {status.totalRequired > 0 && <Button size="small" style={compactSmallButtonStyle} onClick={() => _setBoughtAmount(status.totalRequired, status.unit)}>Tổng công thức</Button>}
                    <Button size="small" style={compactSmallButtonStyle} onClick={() => _setBoughtAmount(undefined, boughtUnit)}>Xóa lượng</Button>
                </Space>}
            </Box>

            <Box style={{ padding: "11px 12px", border: "1px solid #efe7ff", borderRadius: 8, background: "#fff" }}>
                <Stack justify="space-between" align="flex-start" gap={8} style={{ marginBottom: 10 }}>
                    <Box style={{ minWidth: 0 }}>
                        <Space size={6} align="center">
                            <DollarOutlined style={{ color: "#722ed1" }} />
                            <Typography.Text strong style={{ fontSize: 13 }}>Giá hôm nay</Typography.Text>
                        </Space>
                        <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, lineHeight: "17px", marginTop: 2 }}>
                            {boughtPriceTarget.amount > 0 ? `${IngredientUnitHelper.formatAmount(boughtPriceTarget.amount)}${boughtPriceTarget.unit} đã mua` : "Nhập lượng đã mua trước khi lưu giá."}
                        </Typography.Text>
                    </Box>
                    {hasSavedPrice && !priceEditorOpen && canEditBoughtInfo && <Button size="small" icon={<EditOutlined />} style={compactSmallButtonStyle} onClick={() => setPriceEditorOpen(true)}>Sửa giá</Button>}
                </Stack>

                {hasSavedPrice && !priceEditorOpen && <Box style={{ padding: "9px 10px", borderRadius: 8, border: "1px solid #d3adf7", background: "#f9f0ff", marginBottom: displayPriceHistory.length > 0 ? 10 : 0 }}>
                    <Typography.Text strong style={{ display: "block", color: "#722ed1", fontSize: 14, lineHeight: "19px" }}>{currentPriceLabel}</Typography.Text>
                    <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, lineHeight: "17px", marginTop: 2 }}>
                        Đã lưu cho {IngredientUnitHelper.formatAmount(boughtPriceTarget.amount)}{boughtPriceTarget.unit}. Lần sau có thể chọn cùng giá hoặc cùng đơn giá.
                    </Typography.Text>
                </Box>}

                {priceEditorOpen && canEditBoughtInfo && <Box style={{ marginBottom: displayPriceHistory.length > 0 ? 10 : 0 }}>
                    {priceMemory && <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, lineHeight: "17px", marginBottom: 7 }}>
                        Lần trước: {formatPriceMemoryLine(priceMemory)}
                    </Typography.Text>}
                    <Space wrap size={6} style={{ marginBottom: 8 }}>
                        {rememberedPriceForTarget && <Button size="small" icon={<DollarOutlined />} style={compactSmallButtonStyle} onClick={() => _applyPaidPrice(rememberedPriceForTarget)}>
                            {rememberedPriceMatchesTarget ? "Cùng giá" : "Cùng đơn giá"}
                        </Button>}
                        {estimatedPriceButtons.map((value, index) => <Button key={value} size="small" style={compactSmallButtonStyle} onClick={() => setDraftPrice(value)}>
                            {index === 0 ? "Giá thấp" : "Giá cao"} {IngredientPriceHelper.formatCurrency(value)}
                        </Button>)}
                    </Space>
                    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto auto", gap: 6, alignItems: "center" }}>
                        <InputNumber
                            min={0}
                            size="small"
                            placeholder="Giá đã trả"
                            value={draftPrice}
                            onChange={(value) => setDraftPrice(typeof value === "number" ? value : undefined)}
                            style={{ width: "100%" }}
                        />
                        <Button size="small" type="primary" style={compactSmallButtonStyle} onClick={() => _applyPaidPrice(draftPrice)}>Lưu</Button>
                        {props.item.boughtEstimatedCost && <Button size="small" style={compactSmallButtonStyle} onClick={_clearPaidPrice}>Xóa</Button>}
                    </div>
                </Box>}

                {displayPriceHistory.length > 0 && <Box>
                    <Space size={6} align="center" style={{ marginBottom: 7 }}>
                        <HistoryOutlined style={{ color: "#8c8c8c" }} />
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>Lịch sử giá gần đây</Typography.Text>
                    </Space>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {displayPriceHistory.slice(0, 5).map(entry => <div key={entry.id} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 8, alignItems: "center", padding: "8px 9px", border: "1px solid #f0f0f0", borderRadius: 8, background: "#fafafa" }}>
                            <div style={{ minWidth: 0 }}>
                                <Typography.Text strong style={{ display: "block", fontSize: 12, lineHeight: "16px", color: "#111827" }}>{IngredientPriceHelper.formatCurrency(entry.price)}</Typography.Text>
                                <Typography.Text type="secondary" style={{ display: "block", fontSize: 11, lineHeight: "15px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {IngredientUnitHelper.formatAmount(entry.amount)}{entry.unit}{entry.shoppingListName ? ` · ${entry.shoppingListName}` : ""}
                                </Typography.Text>
                            </div>
                            <Typography.Text type="secondary" style={{ fontSize: 11, lineHeight: "15px", whiteSpace: "nowrap" }}>{moment(entry.updatedAt).format("DD/MM/YY")}</Typography.Text>
                        </div>)}
                    </div>
                </Box>}
            </Box>
        </div>
    </Modal>;

    return <React.Fragment>
    <List.Item data-testid={`shopping-list-ingredient-${props.item.ingredientId}`} style={{ padding: 0, borderBottom: "none" }} actions={[]}>
        <div
            style={{
                width: "100%",
                borderRadius: 0,
                border: "1px solid #f0f0f0",
                marginTop: -1,
                backgroundColor: effectiveIsDone ? "#f5f5f5" : "#fff",
                overflow: "hidden",
            }}
        >
            <div
                onClick={() => setExpanded(value => !value)}
                style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1fr) auto",
                    alignItems: "start",
                    gap: 8,
                    padding: "10px 12px",
                    cursor: "pointer",
                }}
            >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8, minWidth: 0 }}>
                    <span onClick={(event) => event.stopPropagation()} style={{ flexShrink: 0, marginTop: 1 }}>
                        <Checkbox indeterminate={indeterminate} checked={effectiveIsDone} disabled={props.readonly} onChange={_onCheckedAllChange} />
                    </span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                        <Typography.Text
                            title={_getIngredientNameById(props.item.ingredientId)}
                            type={effectiveIsDone ? "secondary" : undefined}
                            strong
                            style={{
                                display: "block",
                                width: "100%",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                textDecorationLine: effectiveIsDone ? "line-through" : "none",
                            }}
                        >
                            {_getIngredientNameById(props.item.ingredientId)}
                        </Typography.Text>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 6 }}>
                            {_statusPill(`Cần ${IngredientUnitHelper.formatAmount(status.totalRequired)}${status.unit}`, "blue")}
                            {status.isAlwaysAvailable
                                ? _statusPill("Luôn có", "green")
                                : status.inStock > 0 && _statusPill(`Có ${IngredientUnitHelper.formatAmount(status.inStock)}${status.unit}`, "green")}
                            {remainingToBuy > 0 && priceEstimate && _statusPill(`Mua ${IngredientUnitHelper.formatAmount(remainingToBuy)}${priceEstimate.unit}`, "orange")}
                            {props.item.boughtAmount > 0 && _statusPill(`Đã mua ${props.item.boughtAmount}${boughtUnit}`, "purple")}
                            {props.item.boughtEstimatedCost && _statusPill(`Giá ${IngredientPriceHelper.formatRange(props.item.boughtEstimatedCost)}`, "gray")}
                            {status.inventoryCovered && !props.item.isDone && !status.isAlwaysAvailable && _statusPill("Đủ hàng", "green")}
                            {priceEstimate?.range && _statusPill(`~ ${IngredientPriceHelper.formatRange(priceEstimate.range)}`, "gray")}
                            {priceEstimate && !priceEstimate.range && _statusPill("Chưa có giá", "gray")}
                        </div>
                    </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                    {canEditBoughtInfo && <Button size="small" icon={<DollarOutlined />} onClick={_openBoughtModal} style={{ ...compactSmallButtonStyle, color: hasSavedPrice ? "#722ed1" : "#595959", borderColor: hasSavedPrice ? "#d3adf7" : "#d9d9d9" }}>
                        {hasSavedPrice ? "Giá" : "Mua"}
                    </Button>}
                    <div style={{ padding: "4px 4px", color: "#aaa", flexShrink: 0 }}>
                        {expanded ? <MinusOutlined /> : <PlusOutlined />}
                    </div>
                </div>
            </div>

            {expanded && <Box style={{ padding: "0 12px 10px 40px", borderTop: "1px solid #f0f0f0" }}>
                <Stack justify="space-between" align="center" gap={8} style={{ marginTop: 8, marginBottom: 7 }}>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>Cần cho từng món</Typography.Text>
                    {canEditBoughtInfo && <Button size="small" icon={<DollarOutlined />} onClick={_openBoughtModal} style={compactSmallButtonStyle}>Cập nhật mua</Button>}
                </Stack>
                <List
                    size="small"
                    dataSource={props.item.amounts}
                    renderItem={(item) => <List.Item style={{ padding: "4px 0", borderBottom: "none" }}>
                        <div style={{ width: "100%", boxSizing: "border-box", padding: "8px 9px", border: "1px solid #f0f0f0", borderRadius: 8, background: "#fff" }}>
                            <Stack justify="space-between" align="flex-start" gap={8}>
                                <div style={{ minWidth: 0 }}>
                                    <Typography.Text strong style={{ display: "block", fontSize: 12, lineHeight: "17px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item?.dish.name}</Typography.Text>
                                    <Typography.Text type="secondary" style={{ display: "block", fontSize: 11, lineHeight: "15px", marginTop: 2 }}>{item.amount} {item.unit}</Typography.Text>
                                </div>
                                <Stack.Compact>
                                    {!item.required && <Tooltip title="Tùy chọn"><Tag color="gold" icon={<QuestionCircleOutlined />} /></Tooltip>}
                                    {item.meal && _getDateFromNow(item) > 0 && <Tooltip title={_getDateFromNowDisplayText(item)}><Tag color="blue">{`${_getDateFromNow(item)}d`}</Tag></Tooltip>}
                                    {item.meal && _getDateFromNow(item) < 0 && <Tooltip title={_getDateFromNowDisplayText(item)}><Tag color="volcano">{`${Math.abs(_getDateFromNow(item))}d`}</Tag></Tooltip>}
                                </Stack.Compact>
                            </Stack>
                        </div>
                    </List.Item>}
                />
            </Box>}
        </div>
    </List.Item>
    {boughtInfoModal}
    </React.Fragment>
}

type ShoppingListIngredientItemProps = {
    item: ShoppingListIngredientGroup;
    shoppingList: ShoppingList;
}

export const ShoppingListIngredientItem: React.FunctionComponent<ShoppingListIngredientItemProps> = (props) => {
    const dispatch = useDispatch();
    const ingredientsById = useSelector(selectIngredientsById);
    const inventoryItems = useSelector(selectInventory);

    const ingredient = ingredientsById.get(props.item.ingredientId);
    const inventory = inventoryItems[props.item.ingredientId];

    // Sum total required (numeric prefix, e.g. "200g" → 200)
    const unit = IngredientUnitHelper.getBaseUnit(ingredient, props.item.amounts.map(amt => amt.unit));
    const totalRequired = props.item.amounts.reduce((sum, amt) => {
        const converted = IngredientUnitHelper.toBaseAmount(ingredient, amt.amount, amt.unit, unit);
        return sum + (converted ?? IngredientUnitHelper.parseAmount(amt.amount));
    }, 0);
    const isAlwaysAvailable = InventoryHelper.isAlwaysAvailable(ingredient);
    const inStock = InventoryHelper.availableAmount(inventory, ingredient, totalRequired);

    // Realtime inventory only affects status badges. Done state stays persisted/manual.
    const inventoryCovered = inStock >= totalRequired && totalRequired > 0;
    const effectiveIsDone = props.item.isDone;
    const needToBuy = Math.max(0, totalRequired - inStock);

    const _getIngredientNameById = (id: string) => {
        return ingredientsById.get(id)?.name || "";
    }

    const _onCheckedAllChange = (e: CheckboxChangeEvent) => {
        dispatch(toggleDoneIngredientGroup({
            shoppingListId: props.shoppingList.id,
            ingredientGroupId: props.item.id,
            isDone: e.target.checked
        }));
    }

    const _onCheckedChange = (e: CheckboxChangeEvent, id: string) => {
        dispatch(toggleDoneIngredientAmount({
            shoppingListId: props.shoppingList.id,
            ingredientGroupId: props.item.id,
            ingredientAmoutId: id,
            isDone: e.target.checked
        }));
    }

    const _getDateFromNow = (item: ShoppingListIngredientAmount) => {
        return DateHelpers.calculateDaysBetween(new Date(), item.meal.plannedDate);
    }

    const _getDateFromNowDisplayText = (item: ShoppingListIngredientAmount) => {
        return moment(item.meal.plannedDate).startOf("day").from(moment().startOf("day"));
    }

    const indeterminate = !props.item.isDone && NumberHelpers.isBetween(props.item.amounts.filter(e => e.isDone).length, 0.1, props.item.amounts.length, false);

    return <React.Fragment>
        <List.Item
            style={{ backgroundColor: effectiveIsDone ? "#f5f5f5" : undefined }}
            actions={[]} >
            <List.Item.Meta
                avatar={<Checkbox indeterminate={indeterminate} checked={effectiveIsDone} onChange={_onCheckedAllChange} />}
                title={<Stack justify="space-between" fullwidth>
                    <Typography.Text type={effectiveIsDone ? "secondary" : undefined} style={{ textDecorationLine: effectiveIsDone ? "line-through" : "none" }}>
                        {_getIngredientNameById(props.item.ingredientId)}
                    </Typography.Text>
                    <Space size={4}>
                        {isAlwaysAvailable ? (
                            <Tag color="green" style={{ fontSize: 11, marginInlineEnd: 0 }}>
                                Luôn có
                            </Tag>
                        ) : inStock > 0 && (
                            <Tag color="green" style={{ fontSize: 11, marginInlineEnd: 0 }}>
                                Còn {inStock}{unit}
                            </Tag>
                        )}
                        {needToBuy > 0 && (
                            <Tag color="orange" style={{ fontSize: 11, marginInlineEnd: 0 }}>
                                Mua {needToBuy}{unit}
                            </Tag>
                        )}
                        {inventoryCovered && !props.item.isDone && !isAlwaysAvailable && (
                            <Tag color="green" style={{ fontSize: 11, marginInlineEnd: 0 }}>
                                Đủ hàng
                            </Tag>
                        )}
                    </Space>
                </Stack>}
                description={<List
                    dataSource={props.item.amounts}
                    renderItem={(item) => <List.Item style={{ padding: 0 }}>
                        <List.Item.Meta
                            avatar={<Checkbox checked={item.isDone} onChange={(e) => _onCheckedChange(e, item.id)} />}
                            description={<Space>
                                <Typography.Text type={item.isDone ? "secondary" : undefined} style={{ textDecorationLine: item.isDone ? "line-through" : "none" }}>{item.amount} {item.unit} ({item?.dish.name})</Typography.Text>
                                <Stack.Compact>
                                    {!item.required && <Tooltip title="Tùy chọn"><Tag color="gold" icon={<QuestionCircleOutlined />} /></Tooltip>}
                                    {item.meal && _getDateFromNow(item) > 0 && <Tooltip
                                        title={_getDateFromNowDisplayText(item)}>
                                        <Tag color="blue">{`${_getDateFromNow(item)}d`}</Tag>
                                    </Tooltip>}
                                    {item.meal && _getDateFromNow(item) < 0 && <Tooltip
                                        title={_getDateFromNowDisplayText(item)}>
                                        <Tag color="volcano">{`${Math.abs(_getDateFromNow(item))}d`}</Tag>
                                    </Tooltip>}
                                </Stack.Compact>
                            </Space>} />
                    </List.Item>} />} />
        </List.Item >
    </React.Fragment >
}


type ShoppingListDishesItemProps = {
    dish: Dishes;
    targetServings?: number;
}

export const ShoppingListDishesItem: React.FunctionComponent<ShoppingListDishesItemProps> = (props) => {
    const toggleDishesDetail = useToggle();
    const ingredients = useSelector(selectIngredients);
    const dishes = useSelector(selectDishes);
    const costEstimate = useMemo(() => CostEstimateHelper.estimateDish(props.dish, ingredients, dishes, props.targetServings), [props.dish, ingredients, dishes, props.targetServings]);
    const costLabel = CostEstimateHelper.hasPrice(costEstimate.required)
        ? IngredientPriceHelper.formatRange(costEstimate.required)
        : null;

    return <List.Item data-testid={`shopping-list-dish-${props.dish.id}`} style={{ padding: "6px 0" }}>
        <Button
            fullwidth
            style={{
                height: "auto",
                minHeight: 48,
                padding: "8px 0",
                textAlign: "left",
                whiteSpace: "normal",
                lineHeight: 1.3,
            }}
            type="link"
            onClick={toggleDishesDetail.show}
        >
            <Stack gap={8} justify="space-between" align="flex-start" fullwidth>
                <div style={{ minWidth: 0, flex: 1 }}>
                    <Typography.Paragraph style={{ width: "100%", marginBottom: 2, color: "blue" }} ellipsis={{ rows: 2 }}> {props.dish.name}</Typography.Paragraph>
                    {costLabel && <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, lineHeight: "16px" }}>
                        {costLabel}
                    </Typography.Text>}
                </div>
                <Box style={{ flexShrink: 0, paddingTop: 1 }}>
                    (<Space size={2}>
                        <Space size={3}>
                            <Typography.Text>{props.dish.ingredients.length}</Typography.Text>
                            <Image preview={false} src={IngredientIcon} width={16} style={{ marginBottom: 5 }} />
                        </Space>
                        <Typography.Text>-</Typography.Text>
                        <Space size={3}>
                            <Typography.Text>{props.dish.includeDishes.length}</Typography.Text>
                            <Image preview={false} src={DishesIcon} width={16} style={{ marginBottom: 5 }} />
                        </Space>
                    </Space>)
                </Box>
            </Stack>
        </Button>
        <DishesReadonlyDetailModal
            dish={props.dish}
            targetServings={props.targetServings}
            open={toggleDishesDetail.value}
            onClose={toggleDishesDetail.hide}
        />
    </List.Item>
}
