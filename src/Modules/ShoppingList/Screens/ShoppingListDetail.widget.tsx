import { CheckSquareOutlined, QuestionCircleOutlined, TeamOutlined, OrderedListOutlined, CalendarOutlined } from "@ant-design/icons";
import { Button } from "@components/Button";
import { Collapse } from "@components/Collapse";
import { Checkbox } from "@components/Form/Checkbox";
import { Box } from "@components/Layout/Box";
import { Stack } from "@components/Layout/Stack";
import { List } from "@components/List";
import { Modal } from "@components/Modal";
import { Tooltip } from "@components/Tootip";
import { Typography } from "@components/Typography";
import { useToggle } from "@hooks";
import { RootRoutes } from "@routing/RootRoutes";
import { ShoppingList, ShoppingListIngredientGroup } from "@store/Models/ShoppingList";
import { toggleDoneIngredient } from "@store/Reducers/ShoppingListReducer";
import { RootState } from "@store/Store";
import { Space, Tabs } from "antd";
import { CheckboxChangeEvent } from "antd/es/checkbox";
import moment from "moment";
import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { ShoppingListMealDetailWidget } from "./ShoppingListMealDetail.widget";
import IngredientIcon from "../../../../assets/icons/vegetable.png";
import DishesIcon from "../../../../assets/icons/noodles.png";
import MealsIcon from "../../../../assets/icons/meals.png";
import CalendarIcon from "../../../../assets/icons/nineteen.png";
import ChecklistIcon from "../../../../assets/icons/done.png";
import { Image } from "@components/Image";

type ShoppingListDetailScreenProps = {
    shoppingList: ShoppingList;
}

export const ShoppingListDetailWidget: React.FunctionComponent<ShoppingListDetailScreenProps> = (props) => {
    const navigate = useNavigate();
    const dishes = useSelector((state: RootState) => state.dishes.dishes);
    const scheduledMeals = useSelector((state: RootState) => state.scheduledMeal.scheduledMeals);
    const toggleMealModal = useToggle();
    const [selectedMeal, setSelectedMeal] = useState<string>();

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

    return <React.Fragment>
        <Tabs defaultActiveKey="ingredients">
            <Tabs.TabPane icon={<Image src={IngredientIcon} preview={false} width={22} style={{ marginBottom: 3 }} />} tab={"Nguyên liệu " + `(${props.shoppingList.ingredients.length})`} key="ingredients">
                <Stack fullwidth justify="flex-start" style={{ marginBottom: 10 }}>
                    <Space>
                        <Image src={ChecklistIcon} preview={false} width={18} style={{ marginBottom: 3 }} />
                        <Typography.Text strong>{`${props.shoppingList.ingredients.filter(e => e.isDone).length}/${props.shoppingList.ingredients.length}`}</Typography.Text>
                    </Space>
                </Stack>
                <Box style={{ maxHeight: 500, overflowY: "auto" }}>
                    <List
                        dataSource={props.shoppingList.ingredients}
                        renderItem={(item) => <ShoppingListIngredientItem item={item} shoppingList={props.shoppingList} />}
                    />
                </Box>
            </Tabs.TabPane>
            <Tabs.TabPane icon={<Image src={DishesIcon} preview={false} width={22} style={{ marginBottom: 3 }} />} tab={"Món ăn " + `(${props.shoppingList.dishes.length})`} key="dishes">
                <Box style={{ maxHeight: 500, overflowY: "auto" }}>
                    <List
                        size="small"
                        style={{ overflowX: "auto" }}
                        dataSource={_getDishesByIds(props.shoppingList.dishes)}
                        renderItem={(item) => <List.Item style={{ padding: 0 }}>
                            <Button fullwidth style={{ paddingInline: 0, textAlign: "left" }} type="link" onClick={() => navigate(RootRoutes.AuthorizedRoutes.DishesRoutes.ManageIngredient(item.id))}>
                                <Stack gap={3} justify="space-between" fullwidth>
                                    <Typography.Paragraph style={{ width: 150, marginBottom: 0, color: "blue" }} ellipsis> {item.name}</Typography.Paragraph>
                                    <Box>
                                        (<Space size={2}>
                                            <Space size={3}>
                                                <Typography.Text>{item.ingredients.length}</Typography.Text>
                                                <Image preview={false} src={IngredientIcon} width={16} style={{ marginBottom: 5 }} />
                                            </Space>
                                            <Typography.Text>-</Typography.Text>
                                            <Space size={3}>
                                                <Space size={3}>
                                                    <Typography.Text>{item.servingSize}</Typography.Text>
                                                    <TeamOutlined />
                                                </Space>
                                                <Space size={3}>
                                                    <Typography.Text>{item.includeDishes.length}</Typography.Text>
                                                    <Image preview={false} src={DishesIcon} width={16} style={{ marginBottom: 5 }} />
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
            </Tabs.TabPane>
            <Tabs.TabPane icon={<Image src={MealsIcon} preview={false} width={22} style={{ marginBottom: 3 }} />} tab={"Thực đơn " + `(${props.shoppingList.scheduledMeals.length})`} key="meals">
                <Box style={{ maxHeight: 500, overflowY: "auto" }}>
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
            </Tabs.TabPane>
        </Tabs>
        <Modal style={{ top: 50 }} open={toggleMealModal.value} title={"Thực đơn"} destroyOnClose={true} onCancel={toggleMealModal.hide} footer={null}>
            <Box style={{ maxHeight: 600, overflowY: "auto" }}>
                <ShoppingListMealDetailWidget mealId={selectedMeal} />
            </Box>
        </Modal>
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