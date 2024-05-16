import { QuestionCircleOutlined, ClockCircleOutlined } from "@ant-design/icons";
import { Button } from "@components/Button";
import { Checkbox } from "@components/Form/Checkbox";
import { Image } from "@components/Image";
import { Box } from "@components/Layout/Box";
import { Stack } from "@components/Layout/Stack";
import { List } from "@components/List";
import { Modal } from "@components/Modal";
import { Tooltip } from "@components/Tootip";
import { Typography } from "@components/Typography";
import { useToggle } from "@hooks";
import { Dishes } from "@store/Models/Dishes";
import { ShoppingList, ShoppingListIngredientAmount, ShoppingListIngredientGroup } from "@store/Models/ShoppingList";
import { toggleDoneIngredientAmount, toggleDoneIngredientGroup } from "@store/Reducers/ShoppingListReducer";
import { RootState } from "@store/Store";
import { Space, Tabs } from "antd";
import { CheckboxChangeEvent } from "antd/es/checkbox";
import moment from "moment";
import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import ChecklistIcon from "../../../../assets/icons/done.png";
import MealsIcon from "../../../../assets/icons/meals.png";
import CalendarIcon from "../../../../assets/icons/nineteen.png";
import DishesIcon from "../../../../assets/icons/noodles.png";
import IngredientIcon from "../../../../assets/icons/vegetable.png";
import { ShoppingListMealDetailWidget } from "./ShoppingListMealDetail.widget";
import { DishesDetailWidget } from "@modules/Dishes/Screens/DishesManageIngredient/DishDetail.widget";
import { DateHelpers } from "@common/Helpers/DateHelper";
import { Tag } from "@components/Tag";
import { NumberHelpers } from "@common/Helpers/NumberHelpers";

type ShoppingListDetailScreenProps = {
    shoppingList: ShoppingList;
}

export const ShoppingListDetailWidget: React.FunctionComponent<ShoppingListDetailScreenProps> = (props) => {
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
        <Tabs defaultActiveKey="ingredients" items={[
            {
                key: "ingredients", icon: <Image src={IngredientIcon} preview={false} width={22} style={{ marginBottom: 3 }} />, label: "Nguyên liệu " + `(${props.shoppingList.ingredients.length})`,
                children: <React.Fragment>
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

type ShoppingListIngredientItemProps = {
    item: ShoppingListIngredientGroup;
    shoppingList: ShoppingList;
}

export const ShoppingListIngredientItem: React.FunctionComponent<ShoppingListIngredientItemProps> = (props) => {
    const dispatch = useDispatch();
    const ingredients = useSelector((state: RootState) => state.ingredient.ingredients);

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

    const indeterminate = NumberHelpers.isBetween(props.item.amounts.filter(e => e.isDone).length, 0.1, props.item.amounts.length, false);

    return <React.Fragment>
        <List.Item
            style={{ backgroundColor: props.item.isDone ? "#f5f5f5" : undefined }}
            actions={[]} >
            <List.Item.Meta
                avatar={<Checkbox indeterminate={indeterminate} checked={props.item.isDone} onChange={_onCheckedAllChange} />}
                title={<Typography.Text type={props.item.isDone ? "secondary" : undefined} style={{ textDecorationLine: props.item.isDone ? "line-through" : "none" }}>{_getIngredientNameById(props.item.ingredientId)}</Typography.Text>}
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
        <Modal style={{ top: 50 }} open={toggleDishesDetail.value} title={
            <Space>
                <Image src={DishesIcon} preview={false} width={24} style={{ marginBottom: 3 }} />
                {props.dish.name}
            </Space>
        } destroyOnClose={true} onCancel={toggleDishesDetail.hide} footer={null}>
            <Box style={{ maxHeight: 550, overflowY: "auto" }}>
                <DishesDetailWidget dish={props.dish} />
            </Box>
        </Modal>
    </List.Item>
}