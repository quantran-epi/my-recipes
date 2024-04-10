import { Button } from "@components/Button";
import { List } from "@components/List";
import { Modal } from "@components/Modal";
import { Typography } from "@components/Typography";
import { useScreenTitle, useToggle } from "@hooks";
import { removeIngredient } from "@store/Reducers/IngredientReducer";
import { RootState } from "@store/Store";
import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { IngredientAddWidget } from "./IngredientAdd.widget";
import { Ingredient } from "@store/Models/Ingredient";
import { IngredientEditWidget } from "./IngredientEdit.widget";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { Tooltip } from "@components/Tootip";
import { Popconfirm } from "@components/Popconfirm";

export const IngredientListScreen = () => {
    const ingredients = useSelector((state: RootState) => state.ingredient.ingredients);
    const toggleAddModal = useToggle({ defaultValue: false });
    const dispatch = useDispatch();
    const { } = useScreenTitle({ value: "Ingredient List" });

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
            renderItem={(item) => <IngredientItem item={item} onDelete={_onDelete} />}
        />
        <Modal open={toggleAddModal.value} title="Add Ingredient" destroyOnClose={true} onCancel={toggleAddModal.hide} footer={null}>
            <IngredientAddWidget />
        </Modal>
    </React.Fragment>
}

type IngredientItemProps = {
    item: Ingredient;
    onDelete: (item: Ingredient) => void;
}

export const IngredientItem: React.FunctionComponent<IngredientItemProps> = (props) => {
    const toggleEdit = useToggle({ defaultValue: false });

    const _onEdit = () => {
        toggleEdit.show();
    }

    return <React.Fragment>
        <List.Item
            actions={
                [
                    <Button size="small" onClick={_onEdit} icon={<EditOutlined />} />,
                    <Popconfirm title="Delete?" onConfirm={() => props.onDelete(props.item)}>
                        <Button size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                ]
            }>
            <List.Item.Meta description={<Tooltip title={props.item.name}>
                <Typography.Paragraph style={{ width: 200, marginBottom: 0 }} ellipsis>{props.item.name}</Typography.Paragraph>
            </Tooltip>} />
        </List.Item >
        <Modal open={toggleEdit.value} title="Edit Ingredient" destroyOnClose={true} onCancel={toggleEdit.hide} footer={null}>
            <IngredientEditWidget item={props.item} onDone={() => toggleEdit.hide()} />
        </Modal>
    </React.Fragment>
}