import { Button } from "@components/Button";
import { List } from "@components/List";
import { Modal } from "@components/Modal";
import { Popconfirm } from "@components/Popconfirm";
import { Typography } from "@components/Typography";
import { useScreenTitle, useToggle } from "@hooks";
import { Dishes } from "@store/Models/Dishes";
import { removeDishes } from "@store/Reducers/DishesReducer";
import { RootState } from "@store/Store";
import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { DishesAddWidget } from "./DishesAdd.widget";
import { DishesEditWidget } from "./DishesEdit.widget";
import { EditOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { RootRoutes } from "@routing/RootRoutes";

export const DishesListScreen = () => {
    const dishes = useSelector((state: RootState) => state.dishes.dishes);
    const toggleAddModal = useToggle({ defaultValue: false });
    const dispatch = useDispatch();
    const { } = useScreenTitle({ value: "Dishes List" });

    const _onAdd = () => {
        toggleAddModal.show();
    }

    const _onDelete = (item) => {
        dispatch(removeDishes([item.id]));
    }

    return <React.Fragment>
        <Button onClick={_onAdd}>Add</Button>
        <List
            itemLayout="horizontal"
            dataSource={dishes}
            renderItem={(item) => <DishesItem item={item} onDelete={_onDelete} />}
        />
        <Modal open={toggleAddModal.value} title="Add Dishes" destroyOnClose={true} onCancel={toggleAddModal.hide} footer={null}>
            <DishesAddWidget />
        </Modal>
    </React.Fragment>
}

type DishesItemProps = {
    item: Dishes;
    onDelete: (item: Dishes) => void;
}

export const DishesItem: React.FunctionComponent<DishesItemProps> = (props) => {
    const toggleEdit = useToggle({ defaultValue: false });
    const navigate = useNavigate();

    const _onEdit = () => {
        toggleEdit.show();
    }

    const _onManageIngredient = () => {
        navigate(RootRoutes.AuthorizedRoutes.DishesRoutes.ManageIngredient(props.item.id));
    }

    return <React.Fragment>
        <List.Item
            actions={
                [
                    <Button size="small" onClick={_onEdit} icon={<EditOutlined />} />,
                    <Button size="small" onClick={_onManageIngredient} icon={<PlusOutlined />} />,
                    <Popconfirm title="Delete?" onConfirm={() => props.onDelete(props.item)}>
                        <Button size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                ]
            }>
            <Typography.Text>{props.item.name}</Typography.Text>
        </List.Item >
        <Modal open={toggleEdit.value} title="Edit Dishes" destroyOnClose={true} onCancel={toggleEdit.hide} footer={null}>
            <DishesEditWidget item={props.item} onDone={() => toggleEdit.hide()} />
        </Modal>
    </React.Fragment>
}