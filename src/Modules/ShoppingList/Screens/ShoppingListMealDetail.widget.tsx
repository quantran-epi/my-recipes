import { Divider } from "@components/Layout/Divider";
import { List } from "@components/List";
import { ScheduledMeal } from "@store/Models/ScheduledMeal";
import { ShoppingList } from "@store/Models/ShoppingList"
import { RootState } from "@store/Store";
import React, { FunctionComponent, useMemo } from "react";
import { useSelector } from "react-redux";

type ShoppingListMealDetailWidgetProps = {
    mealId: string;
}

export const ShoppingListMealDetailWidget: FunctionComponent<ShoppingListMealDetailWidgetProps> = ({ mealId }) => {
    const dishes = useSelector((state: RootState) => state.dishes.dishes);
    const scheduledMeals = useSelector((state: RootState) => state.scheduledMeal.scheduledMeals);

    const meal = useMemo(() => {
        return scheduledMeals.find(e => e.id === mealId);
    }, [mealId, scheduledMeals])

    return <React.Fragment>
        <Divider orientation="left">Bữa sáng</Divider>
        <List
            dataSource={meal.meals.breakfast}
            renderItem={item => <List.Item>
                {dishes.find(e => e.id === item).name}
            </List.Item>}
        />
        <Divider orientation="left">Bữa trưa</Divider>
        <List
            dataSource={meal.meals.lunch}
            renderItem={item => <List.Item>
                {dishes.find(e => e.id === item).name}
            </List.Item>}
        />
        <Divider orientation="left">Bữa tối</Divider>
        <List
            dataSource={meal.meals.dinner}
            renderItem={item => <List.Item>
                {dishes.find(e => e.id === item).name}
            </List.Item>}
        />
    </React.Fragment>
}