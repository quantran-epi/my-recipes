import { ObjectPropertyHelper } from "@common/Helpers/ObjectProperty";
import { Button } from "@components/Button";
import { Option, Select } from "@components/Form/Select";
import { Stack } from "@components/Layout/Stack";
import { useMessage } from "@components/Message";
import { SmartForm, useSmartForm } from "@components/SmartForm";
import { ShoppingList } from "@store/Models/ShoppingList";
import { ShoppingListAddDishesParams, addDishesToShoppingList } from "@store/Reducers/ShoppingListReducer";
import { selectDishes } from "@store/Selectors";
import { Input } from "antd";
import { useDispatch, useSelector } from "react-redux";

import React, { useState } from 'react';
import { DishServingSelector, normalizeDishServings } from './DishServingSelector.widget';

type ShoppingListAddMoreDishesWidgetProps = {
    shoppingList: ShoppingList;
    onDone: () => void;
}

export const ShoppingListAddMoreDishesWidget: React.FunctionComponent<ShoppingListAddMoreDishesWidgetProps> = (props) => {
    const dispatch = useDispatch();
    const message = useMessage();
    const dishes = useSelector(selectDishes);
    const [selectedDishIds, setSelectedDishIds] = useState<string[]>(props.shoppingList.dishes ?? []);
    const [dishServings, setDishServings] = useState<Record<string, number>>(() => normalizeDishServings(props.shoppingList.dishes ?? [], dishes, props.shoppingList.dishServings ?? {}));

    const addDishesToShoppingListForm = useSmartForm<ShoppingListAddDishesParams>({
        defaultValues: {
            dishesIds: props.shoppingList.dishes,
            dishServings: props.shoppingList.dishServings ?? {},
            shoppingList: props.shoppingList
        },
        onSubmit: (values) => {
            const normalizedDishServings = normalizeDishServings(values.transformValues.dishesIds ?? [], dishes, dishServings);
            dispatch(addDishesToShoppingList({
                ...values.transformValues,
                dishServings: normalizedDishServings,
            }));
            message.success("Đã cập nhật món trong lịch mua sắm");
            addDishesToShoppingListForm.reset();
            props.onDone();
        },
        itemDefinitions: defaultValues => ({
            dishesIds: { label: "Chọn món ăn", name: ObjectPropertyHelper.nameof(defaultValues, e => e.dishesIds) },
            dishServings: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.dishServings), noMarkup: true },
            shoppingList: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.shoppingList), noMarkup: true },
        }),
    })

    const _onSave = () => {
        addDishesToShoppingListForm.submit();
    }

    const _onDishesChange = (ids: string[]) => {
        const nextIds = ids ?? [];
        setSelectedDishIds(nextIds);
        setDishServings(prev => normalizeDishServings(nextIds, dishes, prev));
    }

    return <SmartForm {...addDishesToShoppingListForm.defaultProps}>
        <SmartForm.Item label="Lịch mua sắm">
            <Input value={addDishesToShoppingListForm.getValues().shoppingList.name} disabled />
        </SmartForm.Item>
        <SmartForm.Item {...addDishesToShoppingListForm.itemDefinitions.dishesIds}>
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
        <Stack fullwidth justify="flex-end">
            <Button onClick={_onSave}>Lưu</Button>
        </Stack>
    </SmartForm>
}
