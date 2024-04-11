import { ObjectPropertyHelper } from "@common/Helpers/ObjectProperty"
import { Button } from "@components/Button"
import { Input } from "@components/Form/Input"
import { Stack } from "@components/Layout/Stack"
import { useMessage } from "@components/Message"
import { SmartForm, useSmartForm } from "@components/SmartForm"
import { nanoid } from "@reduxjs/toolkit"
import { Ingredient } from "@store/Models/Ingredient"
import { addIngredient } from "@store/Reducers/IngredientReducer"
import { useDispatch } from "react-redux"

export const IngredientAddWidget = () => {
    const dispatch = useDispatch();
    const message = useMessage();

    const addIngredientForm = useSmartForm<Ingredient>({
        defaultValues: {
            id: "",
            name: ""
        },
        onSubmit: (values) => {
            dispatch(addIngredient(values.transformValues));
            message.success();
            addIngredientForm.reset();
        },
        itemDefinitions: defaultValues => ({
            id: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.id), noMarkup: true },
            name: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.name) }
        }),
        transformFunc: (values) => ({
            ...values,
            id: values.name.concat(nanoid(10))
        })
    })

    const _onSave = () => {
        addIngredientForm.submit();
    }

    return <SmartForm {...addIngredientForm.defaultProps}>
        <SmartForm.Item {...addIngredientForm.itemDefinitions.name}>
            <Input placeholder="Nhập tên" autoFocus />
        </SmartForm.Item>
        <Stack fullwidth justify="flex-end">
            <Button onClick={_onSave}>Lưu</Button>
        </Stack>
    </SmartForm>
}