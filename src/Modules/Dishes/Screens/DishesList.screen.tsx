import { Button } from "@components/Button";
import { List } from "@components/List";
import { Modal } from "@components/Modal";
import { Popconfirm } from "@components/Popconfirm";
import { Typography } from "@components/Typography";
import { useScreenTitle, useToggle } from "@hooks";
import { Dishes } from "@store/Models/Dishes";
import { removeDishes } from "@store/Reducers/DishesReducer";
import { RootState } from "@store/Store";
import React, { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { DishesAddWidget } from "./DishesAdd.widget";
import { DishesEditWidget } from "./DishesEdit.widget";
import { EditOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { RootRoutes } from "@routing/RootRoutes";
import { Tooltip } from "@components/Tootip";
import { debounce, sortBy } from "lodash";
import { Stack } from "@components/Layout/Stack";
import { Input } from "@components/Form/Input";

export const DishesListScreen = () => {
    const dishes = useSelector((state: RootState) => state.dishes.dishes);
    const toggleAddModal = useToggle({ defaultValue: false });
    const dispatch = useDispatch();
    const { } = useScreenTitle({ value: "Món ăn" });
    const [searchText, setSearchText] = useState("");
    const filteredDishes = useMemo<Dishes[]>(() => {
        return sortBy(dishes.filter(e => e.name.trim().toLowerCase().includes(searchText.trim().toLowerCase())), "name")
    }, [dishes, searchText])

    const _onAdd = () => {
        toggleAddModal.show();
    }

    const _onDelete = (item) => {
        dispatch(removeDishes([item.id]));
    }

    return <React.Fragment>
        <Stack.Compact>
            <Input autoFocus placeholder="Tìm kiếm" onChange={debounce((e) => setSearchText(e.target.value), 350)} />
            <Button onClick={_onAdd} icon={<PlusOutlined />} />
        </Stack.Compact>
        <List
            pagination={{
                position: "bottom", align: "center", pageSize: 7, size: "small"
            }}
            itemLayout="horizontal"
            dataSource={filteredDishes}
            renderItem={(item) => <DishesItem item={item} onDelete={_onDelete} />}
        />
        <Modal open={toggleAddModal.value} title="Thêm món ăn" destroyOnClose={true} onCancel={toggleAddModal.hide} footer={null}>
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
                    <Popconfirm title="Xóa?" onConfirm={() => props.onDelete(props.item)}>
                        <Button size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                ]
            }>
            <List.Item.Meta title={<Tooltip title={props.item.name}>
                <Typography.Paragraph style={{ width: 200, marginBottom: 0 }} ellipsis>{props.item.name}</Typography.Paragraph>
            </Tooltip>}
                description={"Gồm " + props.item.ingredients.length + " nguyên liệu"} />
        </List.Item >
        <Modal open={toggleEdit.value} title="Chỉnh sửa món ăn" destroyOnClose={true} onCancel={toggleEdit.hide} footer={null}>
            <DishesEditWidget item={props.item} onDone={() => toggleEdit.hide()} />
        </Modal>
    </React.Fragment>
}