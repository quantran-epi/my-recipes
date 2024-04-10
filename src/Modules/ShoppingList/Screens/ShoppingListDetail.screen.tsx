import { List } from "@components/List"
import { Typography } from "@components/Typography";
import { ShoppingList, ShoppingListIngredientGroup } from "@store/Models/ShoppingList"
import { RootState } from "@store/Store";
import React from "react";
import { useDispatch, useSelector } from "react-redux";

type ShoppingListDetailScreenProps = {
    shoppingList: ShoppingList;
}

export const ShoppingListDetailScreen: React.FunctionComponent<ShoppingListDetailScreenProps> = (props) => {

    return <List
        itemLayout="horizontal"
        dataSource={Object.keys(props.shoppingList.ingredients)}
        renderItem={(item) => <ShoppingListIngredientItem item={props.shoppingList.ingredients[item]} />}
    />
}

type ShoppingListIngredientItemProps = {
    item: ShoppingListIngredientGroup;
}

export const ShoppingListIngredientItem: React.FunctionComponent<ShoppingListIngredientItemProps> = (props) => {
    const dispatch = useDispatch();
    const ingredients = useSelector((state: RootState) => state.ingredient.ingredients);

    const _getIngredientNameById = (id: string) => {
        return ingredients.find(e => e.id === id)?.name || "";
    }

    return <React.Fragment>
        <List.Item
            actions={
                [
                ]
            }>
            <Typography.Text>{_getIngredientNameById(props.item.id)}</Typography.Text >
        </List.Item >
    </React.Fragment>
}