import { Button } from "@components/Button";
import { Divider } from "@components/Layout/Divider";
import { Stack } from "@components/Layout/Stack";
import { List } from "@components/List";
import { Typography } from "@components/Typography";
import { useToggle } from "@hooks";
import { DishesReadonlyDetailModal } from "@modules/Dishes/Screens/DishesManageIngredient/DishReadonlyDetail.widget";
import { ScheduledMealEstimateSummary } from "@modules/ScheduledMeal/Screens/ScheduledMealEstimateSummary.widget";
import { Dishes } from "@store/Models/Dishes";
import { RootState } from "@store/Store";
import moment from "moment";
import React, { FunctionComponent, useMemo } from "react";
import { useSelector } from "react-redux";

type ShoppingListMealDetailWidgetProps = {
    mealId: string;
}

export const ShoppingListMealDetailWidget: FunctionComponent<ShoppingListMealDetailWidgetProps> = ({ mealId }) => {
    const dishes = useSelector((state: RootState) => state.shared.dishes.dishes);
    const scheduledMeals = useSelector((state: RootState) => state.personal.scheduledMeal.scheduledMeals);

    const meal = useMemo(() => {
        return scheduledMeals.find(e => e.id === mealId);
    }, [mealId, scheduledMeals])

    const _getDishesById = (id: string) => {
        return dishes.find(e => e.id === id);
    }

    if (!meal) return <Typography.Text type="secondary">Không tìm thấy thực đơn.</Typography.Text>;

    const selectedDishIds = Object.values(meal.meals).flat();

    return <React.Fragment>
        <Divider orientation="left">Thông tin chung</Divider>
        <Stack gap={0} direction="column" align="flex-start">
            <Typography.Text><Typography.Text strong>Tên gợi nhớ: </Typography.Text> {meal.name}</Typography.Text>
            <Typography.Text><Typography.Text strong>Ngày thực hiện: </Typography.Text> {moment(meal.plannedDate).format("ddd, DD/MM/YYYY")}</Typography.Text>
        </Stack>

        <Divider orientation="left">Chi phí và tồn kho</Divider>
        <ScheduledMealEstimateSummary dishIds={selectedDishIds} title="Ước tính thực đơn" maxRows={8} />

        <Divider orientation="left">Bữa sáng</Divider>
        <List
            dataSource={meal.meals.breakfast}
            renderItem={item => <ShoppingListMealDishesItem dish={_getDishesById(item)} />}
        />
        <Divider orientation="left">Bữa trưa</Divider>
        <List
            dataSource={meal.meals.lunch}
            renderItem={item => <ShoppingListMealDishesItem dish={_getDishesById(item)} />}
        />
        <Divider orientation="left">Bữa tối</Divider>
        <List
            dataSource={meal.meals.dinner}
            renderItem={item => <ShoppingListMealDishesItem dish={_getDishesById(item)} />}
        />
    </React.Fragment>
}

type ShoppingListMealDishesItemProps = {
    dish?: Dishes;
}

export const ShoppingListMealDishesItem: React.FunctionComponent<ShoppingListMealDishesItemProps> = (props) => {
    const toggleDishesDetail = useToggle();

    if (!props.dish) return null;

    return <List.Item>
        <Button onClick={toggleDishesDetail.show} type="link" style={{ color: "blue" }}>{props.dish.name}</Button>
        <DishesReadonlyDetailModal
            dish={props.dish}
            open={toggleDishesDetail.value}
            onClose={toggleDishesDetail.hide}
        />
    </List.Item>

}
