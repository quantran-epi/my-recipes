import { Button } from "@components/Button";
import { Divider } from "@components/Layout/Divider";
import { Stack } from "@components/Layout/Stack";
import { List } from "@components/List";
import { Typography } from "@components/Typography";
import { RootRoutes } from "@routing/RootRoutes";
import { ScheduledMeal } from "@store/Models/ScheduledMeal";
import { ShoppingList } from "@store/Models/ShoppingList"
import { RootState } from "@store/Store";
import moment from "moment";
import React, { FunctionComponent, useMemo } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

type ShoppingListMealDetailWidgetProps = {
    mealId: string;
}

export const ShoppingListMealDetailWidget: FunctionComponent<ShoppingListMealDetailWidgetProps> = ({ mealId }) => {
    const dishes = useSelector((state: RootState) => state.dishes.dishes);
    const scheduledMeals = useSelector((state: RootState) => state.scheduledMeal.scheduledMeals);
    const navigate = useNavigate();

    const meal = useMemo(() => {
        return scheduledMeals.find(e => e.id === mealId);
    }, [mealId, scheduledMeals])

    return <React.Fragment>
        <Divider orientation="left">Thông tin chung</Divider>
        <Stack gap={0} direction="column" align="flex-start">
            <Typography.Text><Typography.Text strong>Tên gợi nhớ: </Typography.Text> {meal.name}</Typography.Text>
            <Typography.Text><Typography.Text strong>Ngày thực hiện: </Typography.Text> {moment(meal.plannedDate).format("ddd, DD/MM/YYYY")}</Typography.Text>
        </Stack>

        <Divider orientation="left">Bữa sáng</Divider>
        <List
            dataSource={meal.meals.breakfast}
            renderItem={item => <List.Item>
                <Button onClick={() => navigate(RootRoutes.AuthorizedRoutes.DishesRoutes.ManageIngredient(item))} type="link" style={{ color: "blue" }}>{dishes.find(e => e.id === item).name}</Button>
            </List.Item>}
        />
        <Divider orientation="left">Bữa trưa</Divider>
        <List
            dataSource={meal.meals.lunch}
            renderItem={item => <List.Item>
                <Button onClick={() => navigate(RootRoutes.AuthorizedRoutes.DishesRoutes.ManageIngredient(item))} type="link" style={{ color: "blue" }}>{dishes.find(e => e.id === item).name}</Button>
            </List.Item>}
        />
        <Divider orientation="left">Bữa tối</Divider>
        <List
            dataSource={meal.meals.dinner}
            renderItem={item => <List.Item>
                <Button onClick={() => navigate(RootRoutes.AuthorizedRoutes.DishesRoutes.ManageIngredient(item))} type="link" style={{ color: "blue" }}>{dishes.find(e => e.id === item).name}</Button>
            </List.Item>}
        />
    </React.Fragment>
}