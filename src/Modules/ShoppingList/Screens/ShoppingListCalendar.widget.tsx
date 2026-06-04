import { List } from "@components/List";
import { selectDishes, selectIngredients, selectScheduledMeals, selectShoppingLists } from "@store/Selectors";
import { Calendar, Divider } from "antd"
import { SelectInfo } from "antd/es/calendar/generateCalendar"
import moment from "moment";
import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { ShoppingListItem } from "./ShoppingList.screen";
import { removeShoppingList } from "@store/Reducers/ShoppingListReducer";
import { orderBy } from "lodash";
import { Badge } from "@components/Badge";
import { Button } from "@components/Button";
import { PlusOutlined } from "@ant-design/icons";

export const ShoppingListCalendarWidget = ({ onAdd }) => {
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const shoppingLists = useSelector(selectShoppingLists);
    const dishes = useSelector(selectDishes);
    const scheduledMeals = useSelector(selectScheduledMeals);
    const ingredients = useSelector(selectIngredients);
    const dispatch = useDispatch();

    const _onSelect = (d, selectInfo: SelectInfo) => {
        let date = d.toDate() as Date;
        setSelectedDate(date);
    }

    const _cellRender = (d, info) => {
        let date = d.toDate() as Date;
        if (_hasShoppingList(date))
            return <Badge dot status="success" />;
    }

    const _onDelete = (item) => {
        dispatch(removeShoppingList([item.id]));
    }

    const _hasShoppingList = (date: Date) => {
        // let a = moment(shoppingLists[0].plannedDate);
        // let b = moment(date.toISOString());
        return shoppingLists.some(e => moment(e.plannedDate).format("DD/MM/YYYY") === moment(date.toISOString()).format("DD/MM/YYYY"));
    }

    const _findShoppingListsByDate = (date: Date) => {
        return orderBy(shoppingLists.filter(e => moment(e.plannedDate).format("DD/MM/YYYY") === moment(date.toISOString()).format("DD/MM/YYYY")), [obj => obj.createdDate], ['desc']);
    }

    return <React.Fragment>
        <Calendar fullscreen={false} onSelect={_onSelect} cellRender={_cellRender} />

        <Divider orientation="left">Lịch trong ngày {moment(selectedDate).format("DD/MM/YYYY")}</Divider>
        <Button fullwidth onClick={() => onAdd(selectedDate)} icon={<PlusOutlined />} />
        <List
            pagination={{
                position: "bottom", align: "center", pageSize: 5
            }}
            itemLayout="horizontal"
            dataSource={_findShoppingListsByDate(selectedDate)}
            renderItem={(item) => <ShoppingListItem item={item} allDishes={dishes} allScheduledMeals={scheduledMeals} allIngredients={ingredients} onDelete={_onDelete} />}
        />
    </React.Fragment>
}
