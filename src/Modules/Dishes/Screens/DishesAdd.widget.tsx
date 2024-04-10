import { ObjectPropertyHelper } from "@common/Helpers/ObjectProperty"
import { Button } from "@components/Button"
import { Input } from "@components/Form/Input"
import { Stack } from "@components/Layout/Stack"
import { SmartForm, useSmartForm } from "@components/SmartForm"
import { nanoid } from "@reduxjs/toolkit"
import { Dishes } from "@store/Models/Dishes"
import { addDishes } from "@store/Reducers/DishesReducer"
import { useDispatch } from "react-redux"

export const DishesAddWidget = () => {
    const dispatch = useDispatch();

    const addDishesForm = useSmartForm<Dishes>({
        defaultValues: {
            id: "",
            name: "",
            ingredients: []
        },
        onSubmit: (values) => {
            dispatch(addDishes(values.transformValues));
            addDishesForm.reset();
        },
        itemDefinitions: defaultValues => ({
            id: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.id), noMarkup: true },
            name: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.name) },
            ingredients: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.ingredients), noMarkup: true }
        }),
        transformFunc: (values) => ({
            ...values,
            id: values.name.concat(nanoid(10))
        })
    })

    const _onSave = () => {
        addDishesForm.submit();
    }

    return <SmartForm {...addDishesForm.defaultProps}>
        <SmartForm.Item {...addDishesForm.itemDefinitions.name}>
            <Input placeholder="Nhập tên" autoFocus />
        </SmartForm.Item>
        <Stack fullwidth justify="flex-end">
            <Button onClick={_onSave}>Lưu</Button>
        </Stack>
    </SmartForm>
}