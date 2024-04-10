import { Checkbox } from "@components/Form/Checkbox";
import { List } from "@components/List"
import { Typography } from "@components/Typography";
import { ShoppingList, ShoppingListIngredientGroup } from "@store/Models/ShoppingList"
import { toggleDoneIngredient } from "@store/Reducers/ShoppingListReducer";
import { RootState } from "@store/Store";
import { CheckboxChangeEvent } from "antd/es/checkbox";
import React from "react";
import { useDispatch, useSelector } from "react-redux";

type ShoppingListDetailScreenProps = {
    shoppingList: ShoppingList;
}

export const ShoppingListDetailScreen: React.FunctionComponent<ShoppingListDetailScreenProps> = (props) => {

    return <List
        itemLayout="horizontal"
        dataSource={props.shoppingList.ingredients}
        renderItem={(item) => <ShoppingListIngredientItem item={item} shoppingList={props.shoppingList} />}
    />
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
            }>
            <List.Item.Meta
                avatar={<Checkbox defaultChecked={props.item.isDone} onChange={_onCheckedChange} />}
                title={<Typography.Text type={props.item.isDone ? "secondary" : undefined} style={{ textDecorationLine: props.item.isDone ? "line-through" : "none" }}>{_getIngredientNameById(props.item.ingredientId)}</Typography.Text>}
                description={<List
                    dataSource={props.item.amounts}
                    renderItem={(item) => <List.Item>
                        <Typography.Text>{item.amount} {item.unit} ({_getDishesNameById(item.dishesId)})</Typography.Text>
                    </List.Item>} />} />
        </List.Item >
    </React.Fragment>
}