import { CheckCircleOutlined, MinusOutlined, PlusOutlined, QuestionCircleOutlined, ShoppingCartOutlined } from "@ant-design/icons";
import { Button } from "@components/Button";
import { Checkbox } from "@components/Form/Checkbox";
import { Option, Select } from "@components/Form/Select";
import { Image } from "@components/Image";
import { Box } from "@components/Layout/Box";
import { Stack } from "@components/Layout/Stack";
import { List } from "@components/List";
import { Modal } from "@components/Modal";
import { useModal } from "@components/Modal/ModalProvider";
import { useMessage } from "@components/Message";
import { Tooltip } from "@components/Tootip";
import { Typography } from "@components/Typography";
import { useToggle } from "@hooks";
import { Dishes } from "@store/Models/Dishes";
import { INGREDIENT_CATEGORIES, Ingredient, IngredientInventory, IngredientUnit, InventoryBatch } from "@store/Models/Ingredient";
import { InventoryHelper } from "@common/Helpers/InventoryHelper";
import { IngredientUnitHelper } from "@common/Helpers/IngredientUnitHelper";
import { IngredientPriceHelper, IngredientPriceRange } from "@common/Helpers/IngredientPriceHelper";
import { ShoppingList, ShoppingListIngredientAmount, ShoppingListIngredientGroup } from "@store/Models/ShoppingList";
import { completeShoppingList, setIngredientBoughtAmount, toggleDoneIngredientAmount, toggleDoneIngredientGroup } from "@store/Reducers/ShoppingListReducer";
import { setInventory } from "@store/Reducers/InventoryReducer";
import { selectDishes, selectIngredients, selectInventory } from "@store/Selectors";
import { RootState } from "@store/Store";
import { Divider, InputNumber, Space, Tabs } from "antd";
import { CheckboxChangeEvent } from "antd/es/checkbox";
import { groupBy } from "lodash";
import moment from "moment";
import { nanoid } from "nanoid";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import ChecklistIcon from "../../../../assets/icons/done.png";
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

type BoughtImportPlan = {
    ingredientId: string;
    ingredient?: Ingredient;
    amount: number;
    unit: IngredientUnit;
}

type ShoppingListIngredientPriceEstimate = {
    amount: number;
    unit: IngredientUnit;
    range: IngredientPriceRange | null;
}

const getIngredientGroupStatus = (
    group: ShoppingListIngredientGroup,
    ingredient: Ingredient | undefined,
    inventory: IngredientInventory | undefined,
): IngredientGroupStatus => {
    const unit = IngredientUnitHelper.getBaseUnit(ingredient, group.amounts.map(amt => amt.unit));
    const totalRequired = group.amounts.reduce((sum, amt) => {
        const converted = IngredientUnitHelper.toBaseAmount(ingredient, amt.amount, amt.unit, unit);
        return sum + (converted ?? IngredientUnitHelper.parseAmount(amt.amount));
    }, 0);
    const isAlwaysAvailable = InventoryHelper.isAlwaysAvailable(ingredient);
    const inStock = InventoryHelper.availableAmount(inventory, ingredient, totalRequired);
    const needToBuy = Math.max(0, totalRequired - inStock);
    const boughtUnit = group.boughtUnit ?? unit;
    const boughtAmount = group.boughtAmount ?? 0;
    const boughtBaseAmount = boughtAmount > 0
        ? (IngredientUnitHelper.toBaseAmount(ingredient, boughtAmount, boughtUnit, unit) ?? boughtAmount)
        : 0;

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
    ingredients: Ingredient[],
    inventoryItems: Record<string, IngredientInventory>,
): BoughtImportPlan[] => {
    return shoppingList.ingredients.reduce((plans, group) => {
        const ingredient = ingredients.find(item => item.id === group.ingredientId);
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

const getShoppingListIngredientPriceEstimate = (
    group: ShoppingListIngredientGroup,
    ingredient: Ingredient | undefined,
    inventory: IngredientInventory | undefined,
): ShoppingListIngredientPriceEstimate | null => {
    if (InventoryHelper.isAlwaysAvailable(ingredient)) return null;

    const status = getIngredientGroupStatus(group, ingredient, inventory);
    const explicitBoughtAmount = group.boughtAmount ?? 0;
    const amount = explicitBoughtAmount > 0 ? explicitBoughtAmount : status.needToBuy;
    const unit = explicitBoughtAmount > 0 ? (group.boughtUnit ?? status.unit) : status.unit;
    if (amount <= 0) return null;

    return {
        amount,
        unit,
        range: IngredientPriceHelper.estimateForAmount(ingredient, amount, unit),
    };
}

export const ShoppingListDetailWidget: React.FunctionComponent<ShoppingListDetailScreenProps> = (props) => {
    const dispatch = useDispatch();
    const modal = useModal();
    const message = useMessage();
    const dishes = useSelector(selectDishes);
    const allIngredients = useSelector(selectIngredients);
    const inventoryItems = useSelector(selectInventory);
    const scheduledMeals = useSelector((state: RootState) => state.personal.scheduledMeal.scheduledMeals);
    const toggleMealModal = useToggle();
    const [selectedMeal, setSelectedMeal] = useState<string>();
    const isReadonly = Boolean(props.shoppingList.completedAt);

    const _getDishesByIds = (ids: string[]) => {
        return dishes.filter(e => ids.includes(e.id));
    }

    const _getScheduledMealsByIds = (ids: string[]) => {
        return scheduledMeals.filter(e => ids.includes(e.id));
    }

    const _onShowMeal = (mealId: string) => {
        toggleMealModal.show();
        setSelectedMeal(mealId)
    }

    const groupedIngredients = useMemo(() => {
        const grouped = groupBy(props.shoppingList.ingredients, item => {
            return allIngredients.find(i => i.id === item.ingredientId)?.category ?? "Khác";
        });
        // INGREDIENT_CATEGORIES already includes "Khác"; add any unknown categories at the end
        const baseOrder = [...INGREDIENT_CATEGORIES];
        Object.keys(grouped).forEach(k => { if (!baseOrder.includes(k)) baseOrder.push(k); });
        const orderedKeys = baseOrder.filter(cat => grouped[cat]?.length > 0);
        return orderedKeys.map(cat => ({ category: cat, items: grouped[cat] }));
    }, [props.shoppingList.ingredients, allIngredients]);

    const priceSummary = useMemo(() => {
        return props.shoppingList.ingredients.reduce((summary, group) => {
            const ingredient = allIngredients.find(item => item.id === group.ingredientId);
            const estimate = getShoppingListIngredientPriceEstimate(group, ingredient, inventoryItems[group.ingredientId]);
            if (!estimate) return summary;
            if (!estimate.range) return { ...summary, missingPriceCount: summary.missingPriceCount + 1 };
            return {
                min: summary.min + estimate.range.min,
                max: summary.max + estimate.range.max,
                missingPriceCount: summary.missingPriceCount,
                pricedCount: summary.pricedCount + 1,
            };
        }, { min: 0, max: 0, missingPriceCount: 0, pricedCount: 0 });
    }, [props.shoppingList.ingredients, allIngredients, inventoryItems]);

    const _completeShoppingList = () => {
        if (props.shoppingList.completedAt) return;

        const importPlans = getBoughtImportPlans(props.shoppingList, allIngredients, inventoryItems);
        const purchasedAt = new Date().toISOString();

        importPlans.forEach(plan => {
            const inventory = inventoryItems[plan.ingredientId];
            const baseUnit = IngredientUnitHelper.getBaseUnit(plan.ingredient, [inventory?.unit, plan.unit].filter(Boolean) as IngredientUnit[]);
            dispatch(setInventory({
                ingredientId: plan.ingredientId,
                inventory: {
                    unit: baseUnit,
                    lastUpdated: new Date(),
                    batches: [
                        ...getExistingBatches(inventory, baseUnit),
                        {
                            id: nanoid(10),
                            amount: plan.amount,
                            unit: plan.unit,
                            purchasedAt,
                        },
                    ],
                },
            }));
        });

        dispatch(completeShoppingList(props.shoppingList.id));
        message.success("Đã hoàn tất lịch mua sắm");
    }

    const _onCompleteShoppingList = () => {
        if (props.shoppingList.completedAt) return;

        const importPlans = getBoughtImportPlans(props.shoppingList, allIngredients, inventoryItems);
        modal.confirm({
            title: "Hoàn tất lịch mua sắm?",
            content: `Hệ thống sẽ thêm ${importPlans.length} lô nguyên liệu đã mua vào kho. Hành động này không thể hoàn tác, và lịch mua sắm này sẽ chỉ còn xem được.`,
            okText: "Hoàn tất",
            cancelText: "Hủy",
            okButtonProps: { danger: true },
            onOk: _completeShoppingList,
        });
    }

    return <React.Fragment>
        <Tabs defaultActiveKey="ingredients" items={[
            {
                key: "ingredients", icon: <Image src={IngredientIcon} preview={false} width={22} style={{ marginBottom: 3 }} />, label: "Nguyên liệu " + `(${props.shoppingList.ingredients.length})`,
                children: <React.Fragment>
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
                            : <Button
                                type="primary"
                                icon={<ShoppingCartOutlined />}
                                disabled={props.shoppingList.ingredients.length === 0}
                                onClick={_onCompleteShoppingList}
                            >
                                Hoàn tất mua sắm
                            </Button>}
                    </Stack>
                    {(priceSummary.pricedCount > 0 || priceSummary.missingPriceCount > 0) && (
                        <Box style={{ marginBottom: 10, padding: "8px 10px", borderRadius: 8, background: "#fafafa", border: "1px solid #f0f0f0" }}>
                            <Stack justify="space-between" align="center" gap={8} wrap="wrap" fullwidth>
                                <Typography.Text strong>
                                    Ước tính: {priceSummary.pricedCount > 0
                                        ? IngredientPriceHelper.formatRange({ min: priceSummary.min, max: priceSummary.max, currency: "VND" })
                                        : "Chưa có giá"}
                                </Typography.Text>
                                {priceSummary.missingPriceCount > 0 && (
                                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                        {priceSummary.missingPriceCount} nguyên liệu chưa có giá
                                    </Typography.Text>
                                )}
                            </Stack>
                        </Box>
                    )}
                    <Box style={{ maxHeight: 500, overflowY: "auto" }}>
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
                </React.Fragment>
            },
            {
                key: "dishes", icon: <Image src={DishesIcon} preview={false} width={22} style={{ marginBottom: 3 }} />, label: "Món ăn " + `(${props.shoppingList.dishes.length})`,
                children: <Box style={{ maxHeight: 500, overflowY: "auto" }}>
                    <List
                        size="small"
                        style={{ overflowX: "auto" }}
                        dataSource={_getDishesByIds(props.shoppingList.dishes)}
                        renderItem={(item) => <ShoppingListDishesItem dish={item} />}
                    />
                </Box>
            },
            {
                key: "meals", icon: <Image src={MealsIcon} preview={false} width={22} style={{ marginBottom: 3 }} />, label: "Thực đơn " + `(${props.shoppingList.scheduledMeals.length})`,
                children: <Box style={{ maxHeight: 500, overflowY: "auto" }}>
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
                </Box>
            }
        ]} />
        <Modal style={{ top: 50 }} open={toggleMealModal.value} title={<Space>
            <Image src={MealsIcon} preview={false} width={24} style={{ marginBottom: 3 }} />
            Thực đơn
        </Space>} destroyOnClose={true} onCancel={toggleMealModal.hide} footer={null}>
            <Box style={{ maxHeight: 550, overflowY: "auto" }}>
                <ShoppingListMealDetailWidget mealId={selectedMeal} />
            </Box>
        </Modal>
    </React.Fragment >

}

type ShoppingListIngredientPanelItemProps = {
    item: ShoppingListIngredientGroup;
    shoppingList: ShoppingList;
    readonly?: boolean;
}

const ShoppingListIngredientPanelItem: React.FunctionComponent<ShoppingListIngredientPanelItemProps> = (props) => {
    const dispatch = useDispatch();
    const ingredients = useSelector(selectIngredients);
    const inventoryItems = useSelector(selectInventory);
    const [expanded, setExpanded] = useState(false);

    const ingredient = ingredients.find(e => e.id === props.item.ingredientId);
    const inventory = inventoryItems[props.item.ingredientId];
    const status = getIngredientGroupStatus(props.item, ingredient, inventory);
    const priceEstimate = getShoppingListIngredientPriceEstimate(props.item, ingredient, inventory);
    const effectiveIsDone = props.item.isDone;
    const inventoryUnits = IngredientUnitHelper.getInventoryUnits(ingredient);
    const boughtUnit = props.item.boughtUnit ?? status.unit;
    const boughtUnitOptions = Array.from(new Set([...inventoryUnits, boughtUnit]));

    const _getIngredientNameById = (id: string) => {
        return ingredients.find(e => e.id === id)?.name || "";
    }

    const _onCheckedAllChange = (e: CheckboxChangeEvent) => {
        if (props.readonly) return;
        dispatch(toggleDoneIngredientGroup({
            shoppingListId: props.shoppingList.id,
            ingredientGroupId: props.item.id,
            isDone: e.target.checked,
        }));
        if (e.target.checked && props.item.boughtAmount) {
            dispatch(setIngredientBoughtAmount({
                shoppingListId: props.shoppingList.id,
                ingredientGroupId: props.item.id,
                boughtAmount: undefined,
                boughtUnit,
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
        }));
        _syncDoneWithBoughtAmount(boughtAmount, boughtUnit);
    }

    const _onBoughtUnitChange = (unit: IngredientUnit) => {
        if (props.readonly) return;
        dispatch(setIngredientBoughtAmount({
            shoppingListId: props.shoppingList.id,
            ingredientGroupId: props.item.id,
            boughtAmount: props.item.boughtAmount,
            boughtUnit: unit,
        }));
        _syncDoneWithBoughtAmount(props.item.boughtAmount, unit);
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

    return <List.Item style={{ padding: 0, borderBottom: "none" }} actions={[]}>
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
                            {status.needToBuy > 0 && _statusPill(`Mua ${IngredientUnitHelper.formatAmount(status.needToBuy)}${status.unit}`, "orange")}
                            {props.item.boughtAmount > 0 && _statusPill(`Đã mua ${props.item.boughtAmount}${boughtUnit}`, "purple")}
                            {status.inventoryCovered && !props.item.isDone && !status.isAlwaysAvailable && _statusPill("Đủ hàng", "green")}
                            {priceEstimate?.range && _statusPill(`~ ${IngredientPriceHelper.formatRange(priceEstimate.range)}`, "gray")}
                            {priceEstimate && !priceEstimate.range && _statusPill("Chưa có giá", "gray")}
                        </div>
                    </div>
                </div>
                <div style={{ padding: "4px 6px", color: "#aaa", flexShrink: 0, marginTop: 3 }}>
                    {expanded ? <MinusOutlined /> : <PlusOutlined />}
                </div>
            </div>

            {expanded && <Box style={{ padding: "0 12px 10px 40px", borderTop: "1px solid #f0f0f0" }}>
                {!props.readonly && !status.isAlwaysAvailable && (
                    <Box style={{ marginTop: 8, marginBottom: 8 }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 7px", background: "#fafafa", border: "1px solid #f0f0f0", borderRadius: 18 }}>
                            <Typography.Text type="secondary" style={{ fontSize: 12, whiteSpace: "nowrap" }}>Đã mua</Typography.Text>
                            <InputNumber
                                min={0}
                                size="small"
                                value={props.item.boughtAmount}
                                onChange={_onBoughtAmountChange}
                                style={{ width: 88 }}
                            />
                            <Select size="small" value={boughtUnit} onChange={_onBoughtUnitChange} style={{ width: 76 }}>
                                {boughtUnitOptions.map(unit => <Option key={unit} value={unit}>{unit}</Option>)}
                            </Select>
                        </div>
                    </Box>
                )}
                <List
                    size="small"
                    dataSource={props.item.amounts}
                    renderItem={(item) => <List.Item style={{ padding: "4px 0" }}>
                        <List.Item.Meta
                            description={<Space wrap>
                                <Typography.Text>{item.amount} {item.unit} ({item?.dish.name})</Typography.Text>
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
                    </List.Item>}
                />
            </Box>}
        </div>
    </List.Item>
}

type ShoppingListIngredientItemProps = {
    item: ShoppingListIngredientGroup;
    shoppingList: ShoppingList;
}

export const ShoppingListIngredientItem: React.FunctionComponent<ShoppingListIngredientItemProps> = (props) => {
    const dispatch = useDispatch();
    const ingredients = useSelector(selectIngredients);
    const inventoryItems = useSelector(selectInventory);

    const ingredient = ingredients.find(e => e.id === props.item.ingredientId);
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
        return ingredients.find(e => e.id === id)?.name || "";
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
}

export const ShoppingListDishesItem: React.FunctionComponent<ShoppingListDishesItemProps> = (props) => {
    const toggleDishesDetail = useToggle();

    return <List.Item style={{ padding: 0 }}>
        <Button fullwidth style={{ paddingInline: 0, textAlign: "left" }} type="link" onClick={toggleDishesDetail.show}>
            <Stack gap={3} justify="space-between" fullwidth>
                <Typography.Paragraph style={{ width: 150, marginBottom: 0, color: "blue" }} ellipsis> {props.dish.name}</Typography.Paragraph>
                <Box>
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
            open={toggleDishesDetail.value}
            onClose={toggleDishesDetail.hide}
        />
    </List.Item>
}
