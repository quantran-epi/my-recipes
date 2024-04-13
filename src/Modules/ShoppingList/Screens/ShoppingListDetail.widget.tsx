import { CheckSquareOutlined, QuestionCircleOutlined, TeamOutlined, OrderedListOutlined, CalendarOutlined } from "@ant-design/icons";
import { Button } from "@components/Button";
import { Collapse } from "@components/Collapse";
import { Checkbox } from "@components/Form/Checkbox";
import { Box } from "@components/Layout/Box";
import { Stack } from "@components/Layout/Stack";
import { List } from "@components/List";
import { Tooltip } from "@components/Tootip";
import { Typography } from "@components/Typography";
import { RootRoutes } from "@routing/RootRoutes";
import { ShoppingList, ShoppingListIngredientGroup } from "@store/Models/ShoppingList";
import { toggleDoneIngredient } from "@store/Reducers/ShoppingListReducer";
import { RootState } from "@store/Store";
import { Space } from "antd";
import { CheckboxChangeEvent } from "antd/es/checkbox";
import moment from "moment";
import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

type ShoppingListDetailScreenProps = {
    shoppingList: ShoppingList;
}

export const ShoppingListDetailWidget: React.FunctionComponent<ShoppingListDetailScreenProps> = (props) => {
    const navigate = useNavigate();
    const dishes = useSelector((state: RootState) => state.dishes.dishes);
    const scheduledMeals = useSelector((state: RootState) => state.scheduledMeal.scheduledMeals);

    const _getDishesByIds = (ids: string[]) => {
        return dishes.filter(e => ids.includes(e.id));
    }

    const _getScheduledMealsByIds = (ids: string[]) => {
        return scheduledMeals.filter(e => ids.includes(e.id));
    }

    return <React.Fragment>
        <Collapse
            defaultActiveKey={"ingredients"}
            size="small"
            items={[
                {
                    key: 'dishes', label: 'Món ăn ' + `(${props.shoppingList.dishes.length})`, children: <List
                        size="small"
                        dataSource={_getDishesByIds(props.shoppingList.dishes)}
                        renderItem={(item) => <List.Item style={{ padding: 0 }}>
                            <Button fullwidth style={{ paddingInline: 0, textAlign: "left", overflowX: "auto" }} type="link" onClick={() => navigate(RootRoutes.AuthorizedRoutes.DishesRoutes.ManageIngredient(item.id))}>
                                <Stack gap={3} justify="space-between" fullwidth>
                                    <Typography.Paragraph style={{ width: 150, marginBottom: 0, color: "blue" }} ellipsis> {item.name}</Typography.Paragraph>
                                    <Box>
                                        (<Space size={2}>
                                            <Typography.Text>{item.ingredients.length} NL</Typography.Text>
                                            <Typography.Text>-</Typography.Text>
                                            <Space size={3}>
                                                <Space size={3}>
                                                    <Typography.Text>{item.servingSize}</Typography.Text>
                                                    <TeamOutlined />
                                                </Space>
                                                <Space size={3}>
                                                    <Typography.Text>{item.includeDishes.length}</Typography.Text>
                                                    <OrderedListOutlined />
                                                </Space>
                                            </Space>
                                        </Space>)
                                    </Box>
                                </Stack>
                            </Button>
                        </List.Item>
                        }
                    />
                },
                {
                    key: 'meals', label: 'Thực đơn ' + `(${props.shoppingList.scheduledMeals.length})`, children: <List
                        size="small"
                        dataSource={_getScheduledMealsByIds(props.shoppingList.scheduledMeals)}
                        renderItem={(item) => <List.Item style={{ padding: 0 }}>
                            <Button fullwidth style={{ paddingInline: 0, textAlign: "left", overflowX: "auto" }} type="text">
                                <Stack gap={3} justify="space-between" fullwidth>
                                    <Typography.Paragraph style={{ width: 150, marginBottom: 0, color: "blue" }} ellipsis> {item.name}</Typography.Paragraph>
                                    <Box>
                                        (<Space size={2}>
                                            <Typography.Text>{Object.values(item.meals).flat().length} món</Typography.Text>
                                            <Typography.Text>-</Typography.Text>
                                            <Space size={3}>
                                                <Space size={3}>
                                                    <CalendarOutlined />
                                                    <Typography.Text>{moment(item.plannedDate).format("DD/MM/YYYY")}</Typography.Text>
                                                </Space>
                                            </Space>
                                        </Space>)
                                    </Box>
                                </Stack>
                            </Button>
                        </List.Item>
                        }
                    />
                },
                {
                    key: 'ingredients', label: <Stack fullwidth justify="space-between">
                        <Typography.Text>Nguyên liệu</Typography.Text>
                        <Space>
                            <CheckSquareOutlined />
                            <Typography.Text strong>{`${props.shoppingList.ingredients.filter(e => e.isDone).length}/${props.shoppingList.ingredients.length}`}</Typography.Text>
                        </Space>
                    </Stack>, children: <List
                        dataSource={props.shoppingList.ingredients}
                        renderItem={(item) => <ShoppingListIngredientItem item={item} shoppingList={props.shoppingList} />}
                    />
                }
            ]}
        />
    </React.Fragment >

}

type ShoppingListIngredientItemProps = {
    item: ShoppingListIngredientGroup;
    shoppingList: ShoppingList;
}

export const ShoppingListIngredientItem: React.FunctionComponent<ShoppingListIngredientItemProps> = (props) => {
    const dispatch = useDispatch();
    const ingredients = useSelector((state: RootState) => state.ingredient.ingredients);
    const dishes = useSelector((state: RootState) => state.dishes.dishes);

    const _getIngredientNameById = (id: string) => {
        return ingredients.find(e => e.id === id)?.name || "";
    }

    const _getDishesNameById = (id: string) => {
        return dishes.find(e => e.id === id)?.name || "";
    }

    const _onCheckedChange = (e: CheckboxChangeEvent) => {
        dispatch(toggleDoneIngredient({
            shoppingListId: props.shoppingList.id,
            ingredientGroupId: props.item.id,
            isDone: e.target.checked
        }));
    }

    return <React.Fragment>
        <List.Item
            actions={
                [
                ]
            } >
            <List.Item.Meta
                avatar={<Checkbox defaultChecked={props.item.isDone} onChange={_onCheckedChange} />}
                title={<Typography.Text type={props.item.isDone ? "secondary" : undefined} style={{ textDecorationLine: props.item.isDone ? "line-through" : "none" }}>{_getIngredientNameById(props.item.ingredientId)}</Typography.Text>}
                description={<List
                    size="small"
                    dataSource={props.item.amounts}
                    renderItem={(item) => <List.Item style={{ padding: 0 }}>
                        <Space>
                            <Typography.Text>{item.amount} {item.unit} ({_getDishesNameById(item.dishesId)})</Typography.Text>
                            {!item.required && <Tooltip title="Tùy chọn"><QuestionCircleOutlined style={{ color: "orange" }} /></Tooltip>}
                        </Space>
                    </List.Item>} />} />
        </List.Item >
    </React.Fragment >
}