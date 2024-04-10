import { ObjectPropertyHelper } from "@common/Helpers/ObjectProperty"
import { Button } from "@components/Button"
import { Input } from "@components/Form/Input"
import { Option, Select } from "@components/Form/Select"
import { Stack } from "@components/Layout/Stack"
import { SmartForm, useSmartForm } from "@components/SmartForm"
import { nanoid } from "@reduxjs/toolkit"
import { ShoppingList } from "@store/Models/ShoppingList"
import { addShoppingList } from "@store/Reducers/ShoppingListReducer"
import { RootState } from "@store/Store"
import { useDispatch, useSelector } from "react-redux"

export const ShoppingListAddWidget = () => {
    const dispatch = useDispatch();
    const dishes = useSelector((state: RootState) => state.dishes.dishes);

    const addShoppingListForm = useSmartForm<ShoppingList>({
        defaultValues: {
            id: "",
            name: new Date().toLocaleString(),
            dishes: [],
            ingredients: [],
            createdDate: new Date()
        },
        onSubmit: (values) => {
            dispatch(addShoppingList(values.transformValues));
            addShoppingListForm.reset();
        },
        itemDefinitions: defaultValues => ({
            id: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.id), noMarkup: true },
            name: { label: "Tên gợi nhớ", name: ObjectPropertyHelper.nameof(defaultValues, e => e.name) },
            dishes: { label: "Chọn món ăn", name: ObjectPropertyHelper.nameof(defaultValues, e => e.dishes) },
            ingredients: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.ingredients), noMarkup: true },
            createdDate: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.createdDate), noMarkup: true },
        }),
        transformFunc: (values) => ({
            ...values,
            id: values.name.concat(nanoid(10))
        })
    })

    const _onSave = () => {
        addShoppingListForm.submit();
    }

    return <SmartForm {...addShoppingListForm.defaultProps}>
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
        <Stack fullwidth justify="flex-end">
            <Button onClick={_onSave}>Lưu</Button>
        </Stack>
    </SmartForm>
}