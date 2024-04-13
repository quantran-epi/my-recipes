import { DeleteOutlined, FormOutlined, PlusOutlined, CheckOutlined, CloseOutlined } from "@ant-design/icons";
import { Badge } from "@components/Badge";
import { Button } from "@components/Button";
import { Space } from "@components/Layout/Space";
import { Stack } from "@components/Layout/Stack";
import { List } from "@components/List";
import { Modal } from "@components/Modal";
import { Popconfirm } from "@components/Popconfirm";
import { Typography } from "@components/Typography";
import { useScreenTitle, useToggle } from "@hooks";
import { ScheduledMeal } from "@store/Models/ScheduledMeal";
import { removeScheduledMeal, toggleSelectedMeals } from "@store/Reducers/ScheduledMealReducer";
import { RootState } from "@store/Store";
import { Calendar, Divider } from "antd";
import { SelectInfo } from "antd/es/calendar/generateCalendar";
import { orderBy } from "lodash";
import moment from "moment";
import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { ScheduledMealAddWidget } from "./ScheduledMealAdd.widget";
import { ScheduledMealEditWidget } from "./ScheduledMealEdit.widget";

export const ScheduledMealListScreen = () => {
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const scheduledMeals = useSelector((state: RootState) => state.scheduledMeal.scheduledMeals);
    const dispatch = useDispatch();
    const { } = useScreenTitle({ value: "Thực đơn", deps: [] });
    const toggleAddModal = useToggle({ defaultValue: false });

    const _onSelect = (d, selectInfo: SelectInfo) => {
        let date = d.toDate() as Date;
        setSelectedDate(date);
    }

    const _cellRender = (d, info) => {
        let date = d.toDate() as Date;
        if (_hasScheduledMeal(date))
            return <Badge dot status="success" />;
    }

    const _onDelete = (item) => {
        dispatch(removeScheduledMeal([item.id]));
    }

    const _onAdd = () => {
        toggleAddModal.show();
    }

    const _hasScheduledMeal = (date: Date) => {
        // let a = moment(shoppingLists[0].plannedDate);
        // let b = moment(date.toISOString());
        return scheduledMeals.some(e => moment(e.plannedDate).format("DD/MM/YYYY") === moment(date.toISOString()).format("DD/MM/YYYY"));
    }

    const _findScheduledMealsByDate = (date: Date) => {
        return orderBy(scheduledMeals.filter(e => moment(e.plannedDate).format("DD/MM/YYYY") === moment(date.toISOString()).format("DD/MM/YYYY")), [obj => obj.createdDate], ['desc']);
    }

    return <React.Fragment>
        <Calendar fullscreen={false} onSelect={_onSelect} cellRender={_cellRender} />

        <Divider orientation="left">Thực đơn trong ngày {moment(selectedDate).format("DD/MM/YYYY")}</Divider>
        <Button fullwidth onClick={_onAdd} icon={<PlusOutlined />} />
        <List
            pagination={{
                position: "bottom", align: "center", pageSize: 5, size: "small"
            }}
            itemLayout="horizontal"
            dataSource={_findScheduledMealsByDate(selectedDate)}
            renderItem={(item) => <ScheduledMealItem item={item} onDelete={_onDelete} />}
        />

        <Modal open={toggleAddModal.value} title="Thêm thực đơn" destroyOnClose={true} onCancel={toggleAddModal.hide} footer={null}>
            <ScheduledMealAddWidget date={selectedDate} onDone={toggleAddModal.hide} />
        </Modal>
    </React.Fragment>
}

export const ScheduledMealItem = ({ item, onDelete }: { item: ScheduledMeal, onDelete }) => {
    const toggleEditModal = useToggle({ defaultValue: false });
    const selectedMeals = useSelector((state: RootState) => state.scheduledMeal.selectedMeals);
    const dispatch = useDispatch();

    const _onEdit = () => {
        toggleEditModal.show();
    }

    const _toggle = (selected: boolean) => {
        dispatch(toggleSelectedMeals({
            ids: [item.id],
            selected
        }))
    }

    const _isSelected = () => {
        return selectedMeals.includes(item.id);
    }

    return <React.Fragment>
        <List.Item
            actions={
                [
                    _isSelected() ? <Button size="small" onClick={() => _toggle(false)} icon={<CloseOutlined />} />
                        : <Button size="small" onClick={() => _toggle(true)} icon={<CheckOutlined />} />,
                    <Button size="small" onClick={_onEdit} icon={<FormOutlined />} />,
                    <Popconfirm title="Xóa?" onConfirm={() => onDelete(item)} >
                        <Button size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                ]
            }>
            <List.Item.Meta
                title={<Typography.Text strong style={{ color: _isSelected() ? "green" : undefined }}>{item.name}</Typography.Text>}
                description={<Stack gap={0} align="flex-start" direction="column">
                    <Space>
                        <Typography.Text>Bữa sáng: </Typography.Text>
                        <Typography.Text>{item.meals.breakfast.length} món</Typography.Text>
                    </Space>
                    <Space>
                        <Typography.Text>Bữa trưa: </Typography.Text>
                        <Typography.Text>{item.meals.lunch.length} món</Typography.Text>
                    </Space>
                    <Space>
                        <Typography.Text>Bữa tối: </Typography.Text>
                        <Typography.Text>{item.meals.dinner.length} món</Typography.Text>
                    </Space>
                </Stack>}
            />
        </List.Item>
        <Modal open={toggleEditModal.value} title="Sửa thực đơn" destroyOnClose={true} onCancel={toggleEditModal.hide} footer={null}>
            <ScheduledMealEditWidget item={item} onDone={toggleEditModal.hide} />
        </Modal>
    </React.Fragment >
}