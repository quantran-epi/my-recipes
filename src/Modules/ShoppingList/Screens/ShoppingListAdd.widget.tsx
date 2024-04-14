import { ObjectPropertyHelper } from "@common/Helpers/ObjectProperty"
import { Button } from "@components/Button"
import { DatePicker } from "@components/Form/DatePicker"
import { Input } from "@components/Form/Input"
import { Option, Select } from "@components/Form/Select"
import { Stack } from "@components/Layout/Stack"
import { useMessage } from "@components/Message"
import { SmartForm, useSmartForm } from "@components/SmartForm"
import { Typography } from "@components/Typography"
import { nanoid } from "@reduxjs/toolkit"
import { ShoppingList } from "@store/Models/ShoppingList"
import { removeAllSelectedMeals } from "@store/Reducers/ScheduledMealReducer"
import { addShoppingList } from "@store/Reducers/ShoppingListReducer"
import { RootState } from "@store/Store"
import dayjs from "dayjs"
import moment from "moment"
import React, { FunctionComponent, useEffect } from "react"
import { useDispatch, useSelector } from "react-redux"

type ShoppingListAddWidgetProps = {
    date: Date;
    scheduledMealIds?: string[];
    onDone: () => void;
}

export const ShoppingListAddWidget: FunctionComponent<ShoppingListAddWidgetProps> = ({ date, scheduledMealIds, onDone }) => {
    const dispatch = useDispatch();
    const dishes = useSelector((state: RootState) => state.dishes.dishes);
    const scheduledMeals = useSelector((state: RootState) => state.scheduledMeal.scheduledMeals);
    const message = useMessage();

    const addShoppingListForm = useSmartForm<ShoppingList>({
        defaultValues: {
            id: "",
            name: "No named",
            dishes: [],
            ingredients: [],
            scheduledMeals: [],
            createdDate: new Date(),
            plannedDate: null
        },
        onSubmit: (values) => {
            dispatch(addShoppingList(values.transformValues));
            message.success();
            addShoppingListForm.reset();
            onDone();
        },
        itemDefinitions: defaultValues => ({
            id: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.id), noMarkup: true },
            name: { label: "Tên gợi nhớ", name: ObjectPropertyHelper.nameof(defaultValues, e => e.name) },
            dishes: { label: "Chọn món ăn", name: ObjectPropertyHelper.nameof(defaultValues, e => e.dishes) },
            scheduledMeals: { label: "Chọn thực đơn", name: ObjectPropertyHelper.nameof(defaultValues, e => e.scheduledMeals) },
            ingredients: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.ingredients), noMarkup: true },
            createdDate: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.createdDate), noMarkup: true },
            plannedDate: { label: "Ngày kế hoạch", name: ObjectPropertyHelper.nameof(defaultValues, e => e.plannedDate) },
        }),
        transformFunc: (values) => ({
            ...values,
            id: values.name.concat(nanoid(10)),
            plannedDate: values.plannedDate ? new Date(values.plannedDate) : null
        })
    })

    const _onSave = () => {
        addShoppingListForm.submit();
    }

    useEffect(() => {
        if (date) addShoppingListForm.form.setFieldsValue({ plannedDate: dayjs(date) });
        if (scheduledMealIds) addShoppingListForm.form.setFieldsValue({ scheduledMeals: scheduledMealIds });
    }, [date, scheduledMealIds, scheduledMeals])

    return <React.Fragment>
        <SmartForm {...addShoppingListForm.defaultProps}>
            <SmartForm.Item {...addShoppingListForm.itemDefinitions.name}>
                <Input placeholder="Nhập tên" autoFocus allowClear />
            </SmartForm.Item>
            <SmartForm.Item {...addShoppingListForm.itemDefinitions.dishes}>
                <Select
                    showSearch
                    mode="multiple"
                    filterOption={(inputValue, option) => {
                        if (!option?.children) return false;
                        return option?.children?.toString().toLowerCase().includes(inputValue.toLowerCase());
                    }}
                    style={{ width: '100%' }}>
                    {dishes.map(dish => <Option key={dish.id} value={dish.id}>{dish.name}</Option>)}
                </Select>
            </SmartForm.Item>
            <SmartForm.Item {...addShoppingListForm.itemDefinitions.scheduledMeals}>
                <Select
                    showSearch
                    mode="multiple"
                    filterOption={(inputValue, option) => {
                        if (!option?.children) return false;
                        return option?.children?.toString().toLowerCase().includes(inputValue.toLowerCase());
                    }}
                    style={{ width: '100%' }}>
                    {scheduledMeals.map(meal => <Option key={meal.id} value={meal.id}>{meal.name}-{moment(meal.plannedDate).format("DD/MM/YYYY")}</Option>)}
                </Select>
            </SmartForm.Item>
            <SmartForm.Item {...addShoppingListForm.itemDefinitions.plannedDate}>
                <DatePicker style={{ width: "100%" }} placeholder="Chọn ngày" format={"DD/MM/YYYY"} />
            </SmartForm.Item>
            <Stack fullwidth justify="flex-end">
                <Button onClick={_onSave}>Lưu</Button>
            </Stack>
        </SmartForm>
    </React.Fragment>
}