import { CalendarOutlined, DeleteOutlined, EditOutlined, HolderOutlined, LoadingOutlined, MonitorOutlined, OrderedListOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { Button } from "@components/Button";
import { Dropdown } from "@components/Dropdown";
import { Input } from "@components/Form/Input";
import { Image } from "@components/Image";
import { Box } from "@components/Layout/Box";
import { Space } from "@components/Layout/Space";
import { Stack } from "@components/Layout/Stack";
import { List } from "@components/List";
import { Modal } from "@components/Modal";
import { useModal } from "@components/Modal/ModalProvider";
import { Popconfirm } from "@components/Popconfirm";
import { Tooltip } from "@components/Tootip";
import { Typography } from "@components/Typography";
import { useScreenTitle, useToggle } from "@hooks";
import { ShoppingList } from "@store/Models/ShoppingList";
import { generateIngredient, removeShoppingList } from "@store/Reducers/ShoppingListReducer";
import { RootState } from "@store/Store";
import { debounce, groupBy, orderBy, pickBy } from "lodash";
import moment from "moment";
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import ComposeIcon from "../../../../assets/icons/compose.png";
import ChecklistIcon from "../../../../assets/icons/done.png";
import CalendarIcon from "../../../../assets/icons/nineteen.png";
import ShoppinglistIcon from "../../../../assets/icons/shoppingList.png";
import { ShoppingListAddWidget } from "./ShoppingListAdd.widget";
import { ShoppingListAddMoreDishesWidget } from "./ShoppingListAddMoreDishes.widget";
import { ShoppingListCalendarWidget } from "./ShoppingListCalendar.widget";
import { ShoppingListDetailWidget } from "./ShoppingListDetail.widget";
import { ShoppingListEditWidget } from "./ShoppingListEdit.widget";
import { DateHelpers } from "@common/Helpers/DateHelper";
import { test } from "@store/Reducers/DishesReducer";

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
    const [selectedDate, setSelectedDate] = useState<Date>();

    const _onAdd = () => {
        toggleAddModal.show();
    }

    const _onDelete = (item) => {
        dispatch(removeShoppingList([item.id]));
    }

    const _onShowCalendar = () => {
        toggleCalendarModal.show();
    }

    const _onAddWithDate = (date: Date) => {
        setSelectedDate(date);
        _onAdd();
    }

    return <React.Fragment>
        <Stack.Compact>
            <Input allowClear placeholder="Tìm kiếm" onChange={debounce((e) => setSearchText(e.target.value), 350)} />
            <Button onClick={_onAdd} icon={<PlusOutlined />} />
            <Button onClick={_onShowCalendar} icon={<CalendarOutlined />} />
        </Stack.Compact>
        <List
            pagination={{
                position: "bottom", align: "center", pageSize: 3
            }}
            itemLayout="horizontal"
            dataSource={filteredShoppingLists}
            renderItem={(item) => <ShoppingListItem item={item} onDelete={_onDelete} />}
        />
        <Modal open={toggleAddModal.value} title={<Space>
            <Image src={ShoppinglistIcon} preview={false} width={24} style={{ marginBottom: 3 }} />
            Thêm lịch mua sắm
        </Space>} destroyOnClose={true} onCancel={toggleAddModal.hide} footer={null}>
            <ShoppingListAddWidget date={selectedDate} onDone={toggleAddModal.hide} />
        </Modal>

        <Modal style={{ top: 50 }} open={toggleCalendarModal.value} title={<Space>
            <Image src={ShoppinglistIcon} preview={false} width={24} style={{ marginBottom: 3 }} />
            Lịch mua sắm
        </Space>} destroyOnClose={true} onCancel={toggleCalendarModal.hide} footer={null}>
            <Box style={{ maxHeight: 550, overflowY: "auto" }}>
                <ShoppingListCalendarWidget onAdd={_onAddWithDate} />
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
    const scheduledMeals = useSelector((state: RootState) => state.scheduledMeal.scheduledMeals);
    const dispatch = useDispatch();
    const modal = useModal();
    const toggleEditModal = useToggle({ defaultValue: false });
    const toggleLoading = useToggle();

    const _onGenerate = () => {
        dispatch(generateIngredient({
            shoppingListId: props.item.id,
            allDishes: dishes,
            allScheduledMeals: scheduledMeals
        }));
    }

    const _onGenerateAndShow = () => {
        _onGenerate();
        _onShow();
    }

    const _isAllIngredientDone = () => {
        return props.item.ingredients.length > 0 && props.item.ingredients.every(ingre => ingre.isDone);
    }

    const _onShow = () => {
        toggleLoading.show();
        toggleIngredient.show();
    }

    const _onAddMoreDishes = () => {
        toggleAddMoreDishes.show();
    }

    const _onMoreActionClick = (e) => {
        switch (e.key) {
            case "reload": modal.confirm({
                content: "Tải lại danh sách nguyên liệu?",
                onOk: () => {
                    _onGenerate();
                }
            }); break;
            case "add_dishes": _onAddMoreDishes(); break;
            case "edit_shopping_list": toggleEditModal.show(); break;
        }
    }

    const _isOverdue = () => {
        return DateHelpers.calculateDaysBetween(new Date(), props.item.plannedDate) < 0;
    }

    return <React.Fragment>
        <List.Item
            actions={
                [
                    props.item.ingredients.length > 0 ? <Button size="small" onClick={_onShow} icon={toggleLoading.value ? <LoadingOutlined /> : <MonitorOutlined />} />
                        : <Button size="small" onClick={_onGenerateAndShow} icon={toggleLoading.value ? <LoadingOutlined /> : <MonitorOutlined />} />,
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
                                icon: <OrderedListOutlined />,
                            },
                            {
                                label: 'Sửa lịch mua sắm',
                                key: 'edit_shopping_list',
                                icon: <EditOutlined />,
                            }
                        ],
                        onClick: _onMoreActionClick
                    }} placement="bottom">
                        <Button size="small" icon={<HolderOutlined />} />
                    </Dropdown>
                ]
            }>
            <List.Item.Meta title={<Tooltip title={props.item.name}>
                <Typography.Paragraph
                    style={{ width: 200, marginBottom: 0, textDecorationLine: _isAllIngredientDone() ? "line-through" : undefined }}
                    type={_isAllIngredientDone() ? "secondary" : undefined} ellipsis>{props.item.name}</Typography.Paragraph>
            </Tooltip>}
                description={<Stack direction="column" align="flex-start" gap={2}>
                    <Space size={5}>
                        <Tooltip title="Đã hoàn thành"><Image src={ChecklistIcon} preview={false} width={18} style={{ marginBottom: 3 }} /></Tooltip>
                        <Typography.Text style={{ fontSize: 16 }}>{`${props.item.ingredients.filter(e => e.isDone).length}/${props.item.ingredients.length}`} nguyên liệu</Typography.Text>
                    </Space>
                    <Space size={5}>
                        <Typography.Text style={{ fontSize: 14 }}>Gồm</Typography.Text>
                        <Typography.Text style={{ fontSize: 14 }} strong>{props.item.dishes.length}</Typography.Text>
                        <Typography.Text style={{ fontSize: 14 }}>món ăn, </Typography.Text>
                        <Typography.Text style={{ fontSize: 14 }} strong>{props.item.scheduledMeals?.length}</Typography.Text>
                        <Typography.Text style={{ fontSize: 14 }}>thực đơn</Typography.Text>
                    </Space>
                    <Space size={5}>
                        <Tooltip title="Ngày tạo"><Image src={ComposeIcon} preview={false} width={18} style={{ marginBottom: 3 }} /></Tooltip>
                        <Typography.Text style={{ fontSize: 14 }}>{moment(props.item.createdDate).format("ddd, DD/MM/YY hh:mm A")}</Typography.Text>
                    </Space>
                    {props.item.plannedDate && <Space size={10}>
                        <Tooltip title="Ngày thực hiện"><Image src={CalendarIcon} preview={false} width={16} style={{ marginBottom: 3 }} /></Tooltip>

                        {_isOverdue() ? <Tooltip title={moment(props.item.plannedDate).startOf("day").from(moment().startOf("day"))}>
                            <Typography.Text type={"danger"} style={{ fontSize: 14 }}>{props.item.plannedDate ? moment(props.item.plannedDate).format("ddd, DD/MM/YY") : "N/A"}</Typography.Text>
                        </Tooltip> :
                            <Typography.Text style={{ fontSize: 14 }}>{props.item.plannedDate ? moment(props.item.plannedDate).format("ddd, DD/MM/YY") : "N/A"}</Typography.Text>}
                    </Space>}
                </Stack>} />
        </List.Item>
        <Modal style={{ top: 50 }} open={toggleIngredient.value} title={<Space>
            <Image src={ShoppinglistIcon} preview={false} width={24} style={{ marginBottom: 3 }} />
            {props.item.name}
        </Space>} destroyOnClose={true} onCancel={toggleIngredient.hide} footer={null} afterOpenChange={() => toggleLoading.hide()}>
            <ShoppingListDetailWidget shoppingList={props.item} />
        </Modal>
        <Modal style={{ top: 50 }} open={toggleAddMoreDishes.value} title={<Space>
            <Image src={ShoppinglistIcon} preview={false} width={24} style={{ marginBottom: 3 }} />
            Sửa món ăn
        </Space>} destroyOnClose={true} onCancel={toggleAddMoreDishes.hide} footer={null}>
            <Box style={{ maxHeight: 550, overflowY: "auto" }}>
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
        <Modal open={toggleEditModal.value} title={
            <Space>
                <Image src={ShoppinglistIcon} preview={false} width={24} style={{ marginBottom: 3 }} />
                Sửa lịch mua sắm
            </Space>
        } destroyOnClose={true} onCancel={toggleEditModal.hide} footer={null}>
            <ShoppingListEditWidget item={props.item} onDone={toggleEditModal.hide} />
        </Modal>
    </React.Fragment >
}