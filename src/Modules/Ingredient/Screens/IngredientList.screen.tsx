import { Button } from "@components/Button";
import { List } from "@components/List"
import { Modal } from "@components/Modal";
import { Typography } from "@components/Typography";
import { useToggle } from "@hooks";
import { RootState } from "@store/Store"
import React from "react";
import { useDispatch, useSelector } from "react-redux"
import { IngredientAddWidget } from "./IngredientAdd.widget";
import { removeIngredient } from "@store/Reducers/IngredientReducer";

export const IngredientListScreen = () => {
    const ingredients = useSelector((state: RootState) => state.ingredient.ingredients);
    const toggleAddModal = useToggle({ defaultValue: false });
    const dispatch = useDispatch();

    const _onAdd = () => {
        toggleAddModal.show();
    }

    const _onDelete = (item) => {
        dispatch(removeIngredient([item.id]));
    }

    return <React.Fragment>
        <Button onClick={_onAdd}>Add</Button>
        <List
            itemLayout="horizontal"
            dataSource={ingredients}
            renderItem={(item) => (
                <List.Item
                    actions={[
                        <Button>Edit</Button>,
                        <Button danger onClick={() => _onDelete(item)}>Delete</Button>
                    ]}
                >
                    <Typography.Text>{item.name}</Typography.Text>
                </List.Item>
            )}
        />
        <Modal open={toggleAddModal.value} title="Add Ingredient" destroyOnClose={true} onCancel={toggleAddModal.hide} footer={null}>
            <IngredientAddWidget />
        </Modal>
    </React.Fragment>
}