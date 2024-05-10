import { Button } from "@components/Button";
import { Image } from "@components/Image";
import { Box } from "@components/Layout/Box";
import { Divider } from "@components/Layout/Divider";
import { Space } from "@components/Layout/Space";
import { Stack } from "@components/Layout/Stack";
import { List } from "@components/List";
import { Modal } from "@components/Modal";
import { Typography } from "@components/Typography";
import { useToggle } from "@hooks";
import { DishesDetailWidget } from "@modules/Dishes/Screens/DishesManageIngredient/DishDetail.widget";
import { RootRoutes } from "@routing/RootRoutes";
import { Dishes } from "@store/Models/Dishes";
import { ScheduledMeal } from "@store/Models/ScheduledMeal";
import { ShoppingList } from "@store/Models/ShoppingList"
import { RootState } from "@store/Store";
import moment from "moment";
import React, { FunctionComponent, useMemo } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import DishesIcon from "../../../../assets/icons/noodles.png";

type ShoppingListMealDetailWidgetProps = {
    mealId: string;
}

export const ShoppingListMealDetailWidget: FunctionComponent<ShoppingListMealDetailWidgetProps> = ({ mealId }) => {
    const dishes = useSelector((state: RootState) => state.dishes.dishes);
    const scheduledMeals = useSelector((state: RootState) => state.scheduledMeal.scheduledMeals);

    const meal = useMemo(() => {
        return scheduledMeals.find(e => e.id === mealId);
    }, [mealId, scheduledMeals])

    const _getDishesById = (id: string) => {
        return dishes.find(e => e.id === id);
    }

    return <React.Fragment>
        <Divider orientation="left">Thông tin chung</Divider>
        <Stack gap={0} direction="column" align="flex-start">
            <Typography.Text><Typography.Text strong>Tên gợi nhớ: </Typography.Text> {meal.name}</Typography.Text>
            <Typography.Text><Typography.Text strong>Ngày thực hiện: </Typography.Text> {moment(meal.plannedDate).format("ddd, DD/MM/YYYY")}</Typography.Text>
        </Stack>

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
    dish: Dishes;
}

export const ShoppingListMealDishesItem: React.FunctionComponent<ShoppingListMealDishesItemProps> = (props) => {
    const toggleDishesDetail = useToggle();

    return <List.Item>
        <Button onClick={toggleDishesDetail.show} type="link" style={{ color: "blue" }}>{props.dish.name}</Button>
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