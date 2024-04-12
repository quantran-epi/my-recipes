import { CheckSquareOutlined, DeleteOutlined, FormOutlined, HolderOutlined, PlusOutlined, ReloadOutlined, CalendarOutlined } from "@ant-design/icons";
import { Button } from "@components/Button";
import { Dropdown } from "@components/Dropdown";
import { Input } from "@components/Form/Input";
import { Box } from "@components/Layout/Box";
import { Space } from "@components/Layout/Space";
import { Stack } from "@components/Layout/Stack";
import { List } from "@components/List";
import { Modal } from "@components/Modal";
import { Popconfirm } from "@components/Popconfirm";
import { Tooltip } from "@components/Tootip";
import { Typography } from "@components/Typography";
import { useScreenTitle, useToggle } from "@hooks";
import { nanoid } from "@reduxjs/toolkit";
import { ShoppingList } from "@store/Models/ShoppingList";
import { generateIngredient, removeShoppingList } from "@store/Reducers/ShoppingListReducer";
import { RootState } from "@store/Store";
import { debounce, groupBy, orderBy } from "lodash";
import moment from "moment";
import React, { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { ShoppingListAddWidget } from "./ShoppingListAdd.widget";
import { ShoppingListAddMoreDishesWidget } from "./ShoppingListAddMoreDishes.widget";
import { ShoppingListDetailWidget } from "./ShoppingListDetail.widget";
import { useModal } from "@components/Modal/ModalProvider";
import { ShoppingListCalendarWidget } from "./ShoppingListCalendar.widget";

export const ShoppingListScreen = () => {
    const shoppingLists = useSelector((state: RootState) => state.shoppingList.shoppingLists);
    const toggleCalendarModal = useToggle({ defaultValue: false });
    const toggleAddModal = useToggle({ defaultValue: false });
    const dispatch = useDispatch();
    const { } = useScreenTitle({ value: "Lịch mua sắm", deps: [] });
    const [searchText, setSearchText] = useState("");
    const filteredShoppingLists = useMemo<ShoppingList[]>(() => {
        return orderBy(shoppingLists.filter(e => e.name.trim().toLowerCase().includes(searchText.trim().toLowerCase())
            || moment(e.createdDate).format("DD/MM/YYYY hh:mm:ss A").includes(searchText.trim().toLowerCase())),
            [(obj) => new Date(obj.createdDate)], ['desc'])
    }, [shoppingLists, searchText])

    const _onAdd = () => {
        toggleAddModal.show();
    }

    const _onDelete = (item) => {
        dispatch(removeShoppingList([item.id]));
    }

    const _onShowCalendar = () => {
        toggleCalendarModal.show();
    }

    return <React.Fragment>
        <Stack.Compact>
            <Input autoFocus placeholder="Tìm kiếm" onChange={debounce((e) => setSearchText(e.target.value), 350)} />
            <Button onClick={_onAdd} icon={<PlusOutlined />} />
            <Button onClick={_onShowCalendar} icon={<CalendarOutlined />} />
        </Stack.Compact>
        <List
            pagination={{
                position: "bottom", align: "center", pageSize: 5, size: "small"
            }}
            itemLayout="horizontal"
            dataSource={filteredShoppingLists}
            renderItem={(item) => <ShoppingListItem item={item} onDelete={_onDelete} />}
        />
        <Modal open={toggleAddModal.value} title="Thêm lịch mua sắm" destroyOnClose={true} onCancel={toggleAddModal.hide} footer={null}>
            <ShoppingListAddWidget />
        </Modal>

        <Modal style={{ top: 50 }} open={toggleCalendarModal.value} title="Lịch mua sắm" destroyOnClose={true} onCancel={toggleCalendarModal.hide} footer={null}>
            <Box style={{ maxHeight: "100vh", overflowY: "auto" }}>
                <ShoppingListCalendarWidget />
            </Box>
        </Modal>
    </React.Fragment>
}

type ShoppingListItemProps = {
    item: ShoppingList;
    onDelete: (item: ShoppingList) => void;
}

export const ShoppingListItem: React.FunctionComponent<ShoppingListItemProps> = (props) => {
    const toggleIngredient = useToggle({ defaultValue: false });
    const toggleAddMoreDishes = useToggle({ defaultValue: false });
    const dishes = useSelector((state: RootState) => state.dishes.dishes);
    const dispatch = useDispatch();
    const modal = useModal();

    const _onGenerate = () => {
        dispatch(generateIngredient({
            shoppingListId: props.item.id,
            allDishes: dishes
        }));
    }

    const _onGenerateAndShow = () => {
        _onGenerate();
        toggleIngredient.show();
    }

    const _isAllIngredientDone = () => {
        return props.item.ingredients.length > 0 && props.item.ingredients.every(ingre => ingre.isDone);
    }

    const _onShow = () => {
        toggleIngredient.show();
    }

    const _onAddMoreDishes = () => {
        toggleAddMoreDishes.show();
    }

    const _onMoreActionClick = (e) => {
        switch (e.key) {
            case "reload": _onGenerate(); break;
            case "add_dishes": _onAddMoreDishes(); break;
        }
    }

    return <React.Fragment>
        <List.Item
            actions={
                [
                    props.item.ingredients.length > 0 ? <Button size="small" onClick={_onShow} icon={<FormOutlined />} />
                        : <Button size="small" onClick={_onGenerateAndShow} icon={<FormOutlined />} />,
                    <Popconfirm title="Xóa?" onConfirm={() => props.onDelete(props.item)} >
                        <Button size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>,
                    <Dropdown menu={{
                        items: [
                            {
                                label: 'Tải lại',
                                key: 'reload',
                                icon: <ReloadOutlined />,
                            },
                            {
                                label: 'Sửa món ăn',
                                key: 'add_dishes',
                                icon: <PlusOutlined />,
                            }
                        ],
                        onClick: _onMoreActionClick
                    }} placement="bottom">
                        <Button size="small" icon={<HolderOutlined />} />
                    </Dropdown>
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
                    <Space size={3}>
                        <FormOutlined />
                        <Typography.Text style={{ fontSize: 12 }}>{moment(props.item.createdDate).format("DD/MM/YYYY hh:mm:ss A")}</Typography.Text>
                    </Space>
                    <Space size={3}>
                        <CalendarOutlined />
                        <Typography.Text style={{ fontSize: 12 }}>{moment(props.item.plannedDate).format("DD/MM/YYYY")}</Typography.Text>
                    </Space>
                </Stack>} />
        </List.Item>
        <Modal style={{ top: 50 }} open={toggleIngredient.value} title={"Lịch mua sắm (" + props.item.name + ")"} destroyOnClose={true} onCancel={toggleIngredient.hide} footer={null}>
            <Box style={{ maxHeight: 600, overflowY: "auto" }}>
                <ShoppingListDetailWidget shoppingList={props.item} />
            </Box>
        </Modal>
        <Modal style={{ top: 50 }} open={toggleAddMoreDishes.value} title={"Sửa món ăn (" + props.item.name + ")"} destroyOnClose={true} onCancel={toggleAddMoreDishes.hide} footer={null}>
            <Box style={{ maxHeight: 600, overflowY: "auto" }}>
                <ShoppingListAddMoreDishesWidget shoppingList={props.item} onDone={() => {
                    toggleAddMoreDishes.hide();
                    modal.confirm({
                        content: "Tải lại danh sách nguyên liệu?",
                        okText: "Đồng ý",
                        cancelText: "Hủy",
                        onOk: () => {
                            _onGenerate();
                        }
                    })
                }} />
            </Box>
        </Modal>
    </React.Fragment>
}