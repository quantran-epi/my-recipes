import { DeleteOutlined, QuestionCircleOutlined, EditOutlined, ProjectOutlined } from "@ant-design/icons"
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
    const ingredients = useSelector((state: RootState) => state.ingredient.ingredients);
    const togglEditIngredientToDishes = useToggle();
    const ingredientAmount = useMemo(() => {
        return ingredients.find(e => e.id === props.ingredientAmount.ingredientId);
    }, [ingredients, props.ingredientAmount])

    const _getIngredientName = (id) => {
        return (ingredientAmount?.name.length > 20 ? ingredientAmount?.name?.substring(0, 20) + "..." : ingredientAmount.name);
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
            actions={actions}>
            <List.Item.Meta
                title={<Tooltip title={ingredientAmount?.name}>
                    <Typography.Text style={{ fontWeight: 600 }}>{_getIngredientName(props.ingredientAmount.ingredientId)}</Typography.Text>
                </Tooltip>}
                description={<Space>
                    <Typography.Text type="secondary">{props.ingredientAmount.amount} {props.ingredientAmount.unit}</Typography.Text>
                    {!props.ingredientAmount.required && <Tooltip title="Tùy chọn">
                        <Tag color="gold" icon={<QuestionCircleOutlined />} />
                    </Tooltip>}
                </Space>}
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
