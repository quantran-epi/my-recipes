import { DeleteOutlined, FormOutlined } from "@ant-design/icons";
import { Button } from "@components/Button";
import { List } from "@components/List";
import { Modal } from "@components/Modal";
import { Popconfirm } from "@components/Popconfirm";
import { Typography } from "@components/Typography";
import { useScreenTitle, useToggle } from "@hooks";
import { ShoppingList } from "@store/Models/ShoppingList";
import { generateIngredient, removeShoppingList } from "@store/Reducers/ShoppingListReducer";
import { RootState } from "@store/Store";
import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { ShoppingListAddWidget } from "./ShoppingListAdd.widget";
import { groupBy } from "lodash";
import { ShoppingListDetailScreen } from "./ShoppingListDetail.screen";

export const ShoppingListScreen = () => {
    const shoppingLists = useSelector((state: RootState) => state.shoppingList.shoppingLists);
    const toggleAddModal = useToggle({ defaultValue: false });
    const dispatch = useDispatch();
    const { } = useScreenTitle({ value: "Shopping List" });

    const _onAdd = () => {
        toggleAddModal.show();
    }

    const _onDelete = (item) => {
        dispatch(removeShoppingList([item.id]));
    }

    return <React.Fragment>
        <Button onClick={_onAdd}>Add</Button>
        <List
            itemLayout="horizontal"
            dataSource={shoppingLists}
            renderItem={(item) => <ShoppingListItem item={item} onDelete={_onDelete} />}
        />
        <Modal open={toggleAddModal.value} title="Add Shopping List" destroyOnClose={true} onCancel={toggleAddModal.hide} footer={null}>
            <ShoppingListAddWidget />
        </Modal>
    </React.Fragment>
}

type ShoppingListItemProps = {
    item: ShoppingList;
    onDelete: (item: ShoppingList) => void;
}

export const ShoppingListItem: React.FunctionComponent<ShoppingListItemProps> = (props) => {
    const toggleIngredient = useToggle({ defaultValue: false });
    const dishes = useSelector((state: RootState) => state.dishes.dishes);
    const dispatch = useDispatch();

    const _onGenerate = () => {
        let ingredientAmounts = dishes.map(dish => dish.ingredients).flat();
        let groups = groupBy(ingredientAmounts, "ingredientId");
        dispatch(generateIngredient({
            shoppingListId: props.item.id,
            ingredientGroups: Object.keys(groups).map(key => ({
                id: key,
                amounts: groups[key],
                isDone: false
            }))
        }));
        toggleIngredient.show();
    }

    const _onShow = () => {
        toggleIngredient.show();
    }

    return <React.Fragment>
        <List.Item
            actions={
                [
                    // <Button size="small" onClick={_onEdit} icon={<EditOutlined />} />,
                    props.item.ingredients.length > 0 ? <Button size="small" onClick={_onShow} icon={<FormOutlined />} />
                        : <Button size="small" onClick={_onGenerate} icon={<FormOutlined />} />,
                    <Popconfirm title="Delete?" onConfirm={() => props.onDelete(props.item)} >
                        <Button size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                ]
            }>
            <Typography.Text>{props.item.name} ({props.item.dishes.length} dishes)</Typography.Text >
        </List.Item >
        <Modal open={toggleIngredient.value} title={"Ingredient List (" + props.item.name + ")"} destroyOnClose={true} onCancel={toggleIngredient.hide} footer={null}>
            <ShoppingListDetailScreen shoppingList={props.item} />
        </Modal>
    </React.Fragment>
}