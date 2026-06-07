import { ObjectPropertyHelper } from "@common/Helpers/ObjectProperty"
import { Button } from "@components/Button"
import { DatePicker } from "@components/Form/DatePicker"
import { Option, Select } from "@components/Form/Select"
import { Stack } from "@components/Layout/Stack"
import { useMessage } from "@components/Message"
import { SmartForm, useSmartForm } from "@components/SmartForm"
import { nanoid } from "@reduxjs/toolkit"
import { ShoppingList } from "@store/Models/ShoppingList"
import { rememberShoppingListName } from "@store/Reducers/AppContextReducer"
import { addShoppingList, generateIngredient } from "@store/Reducers/ShoppingListReducer"
import { selectDishes, selectIngredients, selectInventory, selectScheduledMeals, selectShoppingListNameHistory, selectShoppingLists } from "@store/Selectors"
import { AutoComplete } from "antd"
import dayjs from "dayjs"
import moment from "moment"
import React, { FunctionComponent, useEffect, useMemo, useState } from "react"
import { useDispatch, useSelector } from "react-redux"

import { DishServingSelector, normalizeDishServings } from './DishServingSelector.widget';

const buildNameOptions = (names: string[]) => {
    const uniqueNames = Array.from(new Map(names
        .map(name => name.trim())
        .filter(Boolean)
        .map(name => [name.toLowerCase(), name])).values());
    return uniqueNames.map(name => ({ value: name }));
}

type ShoppingListAddWidgetProps = {
    date: Date | null;
    initialName?: string;
    scheduledMealIds?: string[];
    dishIds?: string[];
    initialDishServings?: Record<string, number>;
    alreadyHaveIngredientIds?: string[];
    onDone: () => void;
    onCreated?: (shoppingList: ShoppingList) => void;
}

export const ShoppingListAddWidget: FunctionComponent<ShoppingListAddWidgetProps> = ({ date, initialName, scheduledMealIds, dishIds, initialDishServings, alreadyHaveIngredientIds, onDone, onCreated }) => {
    const dispatch = useDispatch();
    const dishes = useSelector(selectDishes);
    const shoppingLists = useSelector(selectShoppingLists);
    const shoppingListNameHistory = useSelector(selectShoppingListNameHistory);
    const scheduledMeals = useSelector(selectScheduledMeals);
    const allIngredients = useSelector(selectIngredients);
    const inventory = useSelector(selectInventory);
    const message = useMessage();
    const [selectedDishIds, setSelectedDishIds] = useState<string[]>(dishIds ?? []);
    const [dishServings, setDishServings] = useState<Record<string, number>>(() => normalizeDishServings(dishIds ?? [], dishes, initialDishServings ?? {}));
    const nameOptions = useMemo(() => buildNameOptions([...shoppingListNameHistory, ...shoppingLists.map(item => item.name)]), [shoppingListNameHistory, shoppingLists]);

    const addShoppingListForm = useSmartForm<ShoppingList>({
        defaultValues: {
            id: "",
            name: initialName ?? "No named",
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
            dispatch(rememberShoppingListName(transformedWithServings.name));
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
        if (initialName) addShoppingListForm.form.setFieldsValue({ name: initialName });
        if (date) addShoppingListForm.form.setFieldsValue({ plannedDate: dayjs(date) });
        if (scheduledMealIds) addShoppingListForm.form.setFieldsValue({ scheduledMeals: scheduledMealIds });
        if (dishIds) {
            addShoppingListForm.form.setFieldsValue({ dishes: dishIds });
            setSelectedDishIds(dishIds);
            setDishServings(prev => normalizeDishServings(dishIds, dishes, { ...(initialDishServings ?? {}), ...prev }));
        }
    }, [date, initialName, scheduledMealIds, dishIds, scheduledMeals])

    return <React.Fragment>
        <SmartForm {...addShoppingListForm.defaultProps}>
            <SmartForm.Item {...addShoppingListForm.itemDefinitions.name}>
                <AutoComplete
                    options={nameOptions}
                    placeholder="Nhập tên"
                    autoFocus
                    allowClear
                    filterOption={(inputValue, option) => (option?.value ?? "").toString().toLowerCase().includes(inputValue.toLowerCase())}
                />
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
