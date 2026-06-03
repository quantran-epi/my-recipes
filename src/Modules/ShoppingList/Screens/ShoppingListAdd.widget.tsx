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
import { addShoppingList, generateIngredient } from "@store/Reducers/ShoppingListReducer"
import { RootState } from "@store/Store"
import dayjs from "dayjs"
import moment from "moment"
import React, { FunctionComponent, useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"

import { DishServingSelector, normalizeDishServings } from './DishServingSelector.widget';

type ShoppingListAddWidgetProps = {
    date: Date | null;
    scheduledMealIds?: string[];
    dishIds?: string[];
    initialDishServings?: Record<string, number>;
    alreadyHaveIngredientIds?: string[];
    onDone: () => void;
    onCreated?: (shoppingList: ShoppingList) => void;
}

export const ShoppingListAddWidget: FunctionComponent<ShoppingListAddWidgetProps> = ({ date, scheduledMealIds, dishIds, initialDishServings, alreadyHaveIngredientIds, onDone, onCreated }) => {
    const dispatch = useDispatch();
    const dishes = useSelector((state: RootState) => state.shared.dishes.dishes);
    const scheduledMeals = useSelector((state: RootState) => state.personal.scheduledMeal.scheduledMeals);
    const allIngredients = useSelector((state: RootState) => state.shared.ingredient.ingredients);
    const inventory = useSelector((state: RootState) => state.personal.inventory.items);
    const message = useMessage();
    const [selectedDishIds, setSelectedDishIds] = useState<string[]>(dishIds ?? []);
    const [dishServings, setDishServings] = useState<Record<string, number>>(() => normalizeDishServings(dishIds ?? [], dishes, initialDishServings ?? {}));

    const addShoppingListForm = useSmartForm<ShoppingList>({
        defaultValues: {
            id: "",
            name: "No named",
            dishes: [],
            dishServings: {},
            ingredients: [],
            scheduledMeals: [],
            createdDate: new Date(),
            plannedDate: null,
            completedAt: undefined,
            completionImports: undefined,
        },
        onSubmit: (values) => {
            const transformed = values.transformValues;
            const normalizedDishServings = normalizeDishServings(transformed.dishes ?? [], dishes, dishServings);
            const transformedWithServings = { ...transformed, dishServings: normalizedDishServings };
            dispatch(addShoppingList(transformedWithServings));
            // Auto-generate ingredient checklist; mark already-have items as done
            dispatch(generateIngredient({
                shoppingListId: transformedWithServings.id,
                allDishes: dishes,
                allScheduledMeals: scheduledMeals,
                allIngredients: allIngredients,
                inventory,
                alreadyHaveIngredientIds: alreadyHaveIngredientIds ?? [],
                autoMarkCoveredByInventory: true,
                dishServings: normalizedDishServings,
            }));
            message.success("Đã tạo lịch mua sắm");
            addShoppingListForm.reset();
            onDone();
            onCreated?.(transformedWithServings);
        },
        itemDefinitions: defaultValues => ({
            id: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.id), noMarkup: true },
            name: { label: "Tên gợi nhớ", name: ObjectPropertyHelper.nameof(defaultValues, e => e.name) },
            dishes: { label: "Chọn món ăn", name: ObjectPropertyHelper.nameof(defaultValues, e => e.dishes) },
            scheduledMeals: { label: "Chọn thực đơn", name: ObjectPropertyHelper.nameof(defaultValues, e => e.scheduledMeals) },
            ingredients: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.ingredients), noMarkup: true },
            dishServings: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.dishServings), noMarkup: true },
            createdDate: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.createdDate), noMarkup: true },
            plannedDate: { label: "Ngày kế hoạch", name: ObjectPropertyHelper.nameof(defaultValues, e => e.plannedDate) },
            completedAt: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.completedAt), noMarkup: true },
            completionImports: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.completionImports), noMarkup: true },
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

    const _onDishesChange = (ids: string[]) => {
        const nextIds = ids ?? [];
        setSelectedDishIds(nextIds);
        setDishServings(prev => normalizeDishServings(nextIds, dishes, prev));
    }

    useEffect(() => {
        if (date) addShoppingListForm.form.setFieldsValue({ plannedDate: dayjs(date) });
        if (scheduledMealIds) addShoppingListForm.form.setFieldsValue({ scheduledMeals: scheduledMealIds });
        if (dishIds) {
            addShoppingListForm.form.setFieldsValue({ dishes: dishIds });
            setSelectedDishIds(dishIds);
            setDishServings(prev => normalizeDishServings(dishIds, dishes, { ...(initialDishServings ?? {}), ...prev }));
        }
    }, [date, scheduledMealIds, dishIds, scheduledMeals])

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
                    onChange={_onDishesChange}
                    style={{ width: '100%' }}>
                    {dishes.map(dish => <Option key={dish.id} value={dish.id}>{dish.name}</Option>)}
                </Select>
            </SmartForm.Item>
            <DishServingSelector
                selectedDishIds={selectedDishIds}
                dishes={dishes}
                value={dishServings}
                onChange={setDishServings}
            />
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
