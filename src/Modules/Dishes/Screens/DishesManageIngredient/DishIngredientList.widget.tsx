import { DeleteOutlined, QuestionCircleOutlined } from "@ant-design/icons"
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
import { useScreenTitle, useToggle } from "@hooks"
import { Dishes, DishesIngredientAmount, DishesStep } from "@store/Models/Dishes"
import { DishesIngredientAddParams, removeIngredientsFromDish } from "@store/Reducers/DishesReducer"
import { RootState } from "@store/Store"
import { Typography } from "antd"
import React, { FunctionComponent, useEffect, useMemo } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate, useSearchParams } from "react-router-dom"
import { DishesAddIngredientWidget } from "./DishesAddIngredient.widget"
import { Divider } from "@components/Layout/Divider"
import { RootRoutes } from "@routing/RootRoutes"

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
            dataSource={props.currentDist.ingredients}
            renderItem={(item) => <IngredientItem dish={props.currentDist} ingredientAmount={item} onDelete={_onDelete} />} />

        <Modal open={toggleAddIngredientToDishes.value} title={<Stack gap={0} direction="column" align="flex-start">
            <Typography.Title level={5} style={{ margin: 0 }}>Thêm nguyên liệu</Typography.Title>
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

    const _getIngredientName = (id) => {
        return ingredients.find(e => e.id === id)?.name || "N/A";
    }

    return <React.Fragment>
        <List.Item
            actions={[
                <Popconfirm title="Xóa?" onConfirm={() => props.onDelete(props.dish, props.ingredientAmount)}>
                    <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
            ]}>
            <Space>
                <Typography.Text>{_getIngredientName(props.ingredientAmount.ingredientId)} - {props.ingredientAmount.amount} {props.ingredientAmount.unit}</Typography.Text>
                {!props.ingredientAmount.required && <Tooltip title="Tùy chọn">
                    <QuestionCircleOutlined style={{ color: "orange" }} />
                </Tooltip>}
            </Space>
        </List.Item>
    </React.Fragment>
}
