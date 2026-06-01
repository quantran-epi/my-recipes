import { DeleteOutlined, QuestionCircleOutlined, EditOutlined, ProjectOutlined, FireOutlined } from "@ant-design/icons"
import { IngredientUnitHelper } from "@common/Helpers/IngredientUnitHelper"
import { InventoryHelper } from "@common/Helpers/InventoryHelper"
import { ObjectPropertyHelper } from "@common/Helpers/ObjectProperty"
import { Button } from "@components/Button"
import { Form } from "@components/Form"
import { Space } from "@components/Layout/Space"
import { Stack } from "@components/Layout/Stack"
import { List } from "@components/List"
import { Modal } from "@components/Modal"
import { Popconfirm } from "@components/Popconfirm"
import { useSmartForm } from "@components/SmartForm"
import { Tooltip } from "@components/Tootip"
import { useToggle } from "@hooks"
import { Dishes, DishesIngredientAmount } from "@store/Models/Dishes"
import { DishesIngredientAddParams, removeIngredientsFromDish } from "@store/Reducers/DishesReducer"
import { RootState } from "@store/Store"
import { Typography } from "antd"
import React, { FunctionComponent, useEffect, useMemo } from "react"
import { useDispatch, useSelector } from "react-redux"
import { DishesAddIngredientWidget } from "./DishesAddIngredient.widget"
import { orderBy } from "lodash"
import { DishesEditIngredientWidget } from "./DishesEditIngredient.widget"
import { Image } from "@components/Image"
import IngredientIcon from "../../../../../assets/icons/vegetable.png"
import FoodPrepareIcon from "../../../../../assets/icons/food-preparation.png"
import { Tag } from "@components/Tag"
import { Popover } from "@components/Popover"

type DishIngredientListWidgetProps = {
    currentDist: Dishes;
}

export const DishIngredientListWidget: FunctionComponent<DishIngredientListWidgetProps> = (props) => {
    const toggleAddIngredientToDishes = useToggle({ defaultValue: false });
    const dispatch = useDispatch();

    const addDishesForm = useSmartForm<DishesIngredientAddParams>({
        defaultValues: {
            dishId: "",
            ingres: []
        },
        itemDefinitions: defaultValues => ({
            dishId: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.dishId), noMarkup: true },
            ingres: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.ingres), noMarkup: true },
        })
    })

    const _onAddIngredient = () => {
        toggleAddIngredientToDishes.show();
    }

    const _onDelete = (dish: Dishes, ingredientAmount: DishesIngredientAmount) => {
        dispatch(removeIngredientsFromDish({
            dishId: dish.id,
            ingres: [ingredientAmount]
        }));
    }

    useEffect(() => {
        if (!props.currentDist) return;
        addDishesForm.form.setFieldsValue({
            dishId: props.currentDist.id,
            ingres: props.currentDist.ingredients
        });
    }, [props.currentDist])

    return <Form {...addDishesForm.defaultProps}>
        <Button fullwidth onClick={_onAddIngredient}>Thêm nguyên liệu</Button>
        <List
            dataSource={orderBy(props.currentDist.ingredients, [obj => obj.required], ['desc'])}
            renderItem={(item) => <IngredientItem dish={props.currentDist} ingredientAmount={item} onDelete={_onDelete} />} />

        <Modal open={toggleAddIngredientToDishes.value} title={<Stack gap={0} direction="column" align="flex-start">
            <Space>
                <Image src={IngredientIcon} preview={false} width={24} style={{ marginBottom: 3 }} />
                <Typography.Title level={5} style={{ margin: 0 }}>Thêm nguyên liệu</Typography.Title>
            </Space>
            <Typography.Text type="secondary">{props.currentDist.name}</Typography.Text>
        </Stack>} destroyOnClose={true} onCancel={toggleAddIngredientToDishes.hide} footer={null}>
            <DishesAddIngredientWidget dish={props.currentDist} />
        </Modal>
    </Form>
}

type IngredientItemProps = {
    dish: Dishes;
    ingredientAmount: DishesIngredientAmount;
    onDelete: (dish: Dishes, ingredientAmount: DishesIngredientAmount) => void;
}

export const IngredientItem: React.FunctionComponent<IngredientItemProps> = (props) => {
    const ingredients = useSelector((state: RootState) => state.shared.ingredient.ingredients);
    const inventory = useSelector((state: RootState) => state.personal.inventory.items[props.ingredientAmount.ingredientId]);
    const togglEditIngredientToDishes = useToggle();
    const ingredientAmount = useMemo(() => {
        return ingredients.find(e => e.id === props.ingredientAmount.ingredientId);
    }, [ingredients, props.ingredientAmount])

    const baseUnit = IngredientUnitHelper.getBaseUnit(ingredientAmount, [props.ingredientAmount.unit]);
    const requiredAmount = IngredientUnitHelper.toBaseAmount(ingredientAmount, props.ingredientAmount.amount, props.ingredientAmount.unit, baseUnit)
        ?? IngredientUnitHelper.parseAmount(props.ingredientAmount.amount);
    const isAlwaysAvailable = InventoryHelper.isAlwaysAvailable(ingredientAmount);
    const stockAmount = InventoryHelper.availableAmount(inventory, ingredientAmount, requiredAmount);
    const hasStock = isAlwaysAvailable || stockAmount > 0;
    const enoughStock = isAlwaysAvailable || (requiredAmount > 0 ? stockAmount >= requiredAmount : hasStock);
    const nearestExpiry = InventoryHelper.nearestExpiryBatch(inventory, ingredientAmount?.shelfLife);
    const expiryBadge = nearestExpiry && nearestExpiry.daysLeft <= 3 ? InventoryHelper.expiryBadge(nearestExpiry.daysLeft) : null;
    const inventoryStatus = isAlwaysAvailable
        ? { color: "#52c41a", label: "✓ Luôn có" }
        : enoughStock
        ? { color: "#52c41a", label: `✓ Đủ ${_formatAmount(stockAmount)}${baseUnit}` }
        : hasStock
        ? { color: "#d46b08", label: `◐ Còn ${_formatAmount(stockAmount)}/${_formatAmount(requiredAmount)}${baseUnit}` }
        : { color: "#ff4d4f", label: "✗ Chưa có" };

    const _getIngredientName = (id) => {
        if (!ingredientAmount?.name) return id;
        return ingredientAmount.name;
    }

    function _formatAmount(value: number) {
        return IngredientUnitHelper.formatAmount(value);
    }

    const _onEdit = () => {
        togglEditIngredientToDishes.show();
    }

    const actions = [
        <Button size="small" icon={<EditOutlined />} onClick={_onEdit} />,
        <Popconfirm title="Xóa?" onConfirm={() => props.onDelete(props.dish, props.ingredientAmount)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
    ]

    if (props.ingredientAmount.prepare?.length > 0) actions.unshift(<Popover title={<Space>
        <Image src={FoodPrepareIcon} preview={false} width={18} style={{ marginBottom: 3 }} />
        <Typography.Text>Sơ chế nguyên liệu</Typography.Text>
    </Space>} content={<List dataSource={props.ingredientAmount.prepare} size="small" renderItem={(item) => <List.Item>{item}</List.Item>} />}>
        <Button size="small" icon={<ProjectOutlined />} />
    </Popover>);

    return <React.Fragment>
        <List.Item
            style={{ padding: "8px 0", alignItems: "flex-start" }}
            actions={actions}>
            <List.Item.Meta
                title={<Tooltip title={ingredientAmount?.name}>
                    <Typography.Text style={{ fontWeight: 600, lineHeight: "18px", overflowWrap: "anywhere" }}>{_getIngredientName(props.ingredientAmount.ingredientId)}</Typography.Text>
                </Tooltip>}
                description={<div style={{ display: "flex", flexWrap: "wrap", gap: "3px 8px", alignItems: "center", marginTop: 2 }}>
                    <Typography.Text type="secondary">{props.ingredientAmount.amount} {props.ingredientAmount.unit}</Typography.Text>
                    <Typography.Text style={{ fontSize: 12, color: inventoryStatus.color, whiteSpace: "nowrap" }}>
                        {inventoryStatus.label}
                    </Typography.Text>
                    {hasStock && !enoughStock && (
                        <Typography.Text style={{ fontSize: 12, color: "#d46b08", whiteSpace: "nowrap" }}>
                            Thiếu {_formatAmount(Math.max(0, requiredAmount - stockAmount))}{baseUnit}
                        </Typography.Text>
                    )}
                    {expiryBadge && (
                        <Typography.Text style={{ fontSize: 12, color: expiryBadge.color, whiteSpace: "nowrap" }}>
                            <FireOutlined style={{ fontSize: 10 }} /> {expiryBadge.label}
                        </Typography.Text>
                    )}
                    {!props.ingredientAmount.required && <Tooltip title="Tùy chọn">
                        <Tag color="gold" icon={<QuestionCircleOutlined />} style={{ marginRight: 0 }} />
                    </Tooltip>}
                </div>}
            />
            {/* <Space>
                <Typography.Text>
                    <Typography.Text>{_getIngredientName(props.ingredientAmount.ingredientId)}</Typography.Text> -
                </Typography.Text>

            </Space> */}
        </List.Item>
        <Modal open={togglEditIngredientToDishes.value} title={<Stack gap={0} direction="column" align="flex-start">
            <Space>
                <Image src={IngredientIcon} preview={false} width={24} style={{ marginBottom: 3 }} />
                <Typography.Title level={5} style={{ margin: 0 }}>Sửa nguyên liệu</Typography.Title>
            </Space>
            <Typography.Text type="secondary">{props.dish.name}</Typography.Text>
        </Stack>} destroyOnClose={true} onCancel={togglEditIngredientToDishes.hide} footer={null}>
            <DishesEditIngredientWidget item={props.ingredientAmount} dish={props.dish} onDone={togglEditIngredientToDishes.hide} />
        </Modal>
    </React.Fragment>
}
