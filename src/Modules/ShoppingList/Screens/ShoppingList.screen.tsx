import { DeleteOutlined, FormOutlined, CheckSquareOutlined } from "@ant-design/icons";
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
import { Tooltip } from "@components/Tootip";
import { Space } from "@components/Layout/Space";
import { nanoid } from "@reduxjs/toolkit";
import moment from "moment";
import { Stack } from "@components/Layout/Stack";
import { Box } from "@components/Layout/Box";

export const ShoppingListScreen = () => {
    const shoppingLists = useSelector((state: RootState) => state.shoppingList.shoppingLists);
    const toggleAddModal = useToggle({ defaultValue: false });
    const dispatch = useDispatch();
    const { } = useScreenTitle({ value: "Lịch mua sắm" });

    const _onAdd = () => {
        toggleAddModal.show();
    }

    const _onDelete = (item) => {
        dispatch(removeShoppingList([item.id]));
    }

    return <React.Fragment>
        <Button onClick={_onAdd}>Thêm</Button>
        <List
            itemLayout="horizontal"
            dataSource={shoppingLists}
            renderItem={(item) => <ShoppingListItem item={item} onDelete={_onDelete} />}
        />
        <Modal open={toggleAddModal.value} title="Thêm lịch mua sắm" destroyOnClose={true} onCancel={toggleAddModal.hide} footer={null}>
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
        let ingredientAmounts = dishes
            .filter(e => props.item.dishes.includes(e.id))
            .map(dish => dish.ingredients).flat();
        let groups = groupBy(ingredientAmounts, "ingredientId");
        dispatch(generateIngredient({
            shoppingListId: props.item.id,
            ingredientGroups: Object.keys(groups).map(key => ({
                id: key.concat('-gr-').concat(nanoid(10)),
                ingredientId: key,
                amounts: groups[key],
                isDone: false
            }))
        }));
        toggleIngredient.show();
    }

    const _isAllIngredientDone = () => {
        return props.item.ingredients.length > 0 && props.item.ingredients.every(ingre => ingre.isDone);
    }

    const _onShow = () => {
        toggleIngredient.show();
    }

    return <React.Fragment>
        <List.Item
            actions={
                [
                    props.item.ingredients.length > 0 ? <Button size="small" onClick={_onShow} icon={<FormOutlined />} />
                        : <Button size="small" onClick={_onGenerate} icon={<FormOutlined />} />,
                    <Popconfirm title="Xóa?" onConfirm={() => props.onDelete(props.item)} >
                        <Button size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                ]
            }>
            <List.Item.Meta title={<Tooltip title={props.item.name}>
                <Typography.Paragraph style={{ width: 200, marginBottom: 0, textDecorationLine: _isAllIngredientDone() ? "line-through" : undefined }} ellipsis>{props.item.name}</Typography.Paragraph>
            </Tooltip>}
                description={<Stack direction="column" align="flex-start" gap={2}>
                    <Space size={2}>
                        <CheckSquareOutlined />
                        <Typography.Text>{`${props.item.ingredients.filter(e => e.isDone).length}/${props.item.ingredients.length}`} nguyên liệu</Typography.Text>
                    </Space>
                    <Space>
                        <Typography.Text style={{ fontSize: 12 }}>Gồm {props.item.dishes.length + " món ăn"}</Typography.Text>
                    </Space>
                    <Space>
                        <Typography.Text style={{ fontSize: 12 }}>Ngày tạo: {moment(props.item.createdDate).format("DD/MM/YYYY hh:mm:ss A")}</Typography.Text>
                    </Space>
                </Stack>} />
        </List.Item>
        <Modal style={{ top: 50 }} open={toggleIngredient.value} title={"Lịch mua sắm (" + props.item.name + ")"} destroyOnClose={true} onCancel={toggleIngredient.hide} footer={null}>
            <Box style={{ maxHeight: 400, overflowY: "auto" }}>
                <ShoppingListDetailScreen shoppingList={props.item} />
            </Box>
        </Modal>
    </React.Fragment>
}