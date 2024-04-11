import { ObjectPropertyHelper } from "@common/Helpers/ObjectProperty"
import { Button } from "@components/Button"
import { Input } from "@components/Form/Input"
import { Stack } from "@components/Layout/Stack"
import { useMessage } from "@components/Message"
import { SmartForm, useSmartForm } from "@components/SmartForm"
import { nanoid } from "@reduxjs/toolkit"
import { Ingredient } from "@store/Models/Ingredient"
import { addIngredient, editIngredient } from "@store/Reducers/IngredientReducer"
import { useDispatch } from "react-redux"

export const IngredientEditWidget = ({ item, onDone }) => {
    const dispatch = useDispatch();
    const message = useMessage();

    const editIngredientForm = useSmartForm<Ingredient>({
        defaultValues: item,
        onSubmit: (values) => {
            dispatch(editIngredient(values.transformValues));
            message.success();
            onDone();
        },
        itemDefinitions: defaultValues => ({
            id: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.id), noMarkup: true },
            name: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.name) }
        })
    })

    const _onSave = () => {
        editIngredientForm.submit();
    }

    return <SmartForm {...editIngredientForm.defaultProps}>
        <SmartForm.Item {...editIngredientForm.itemDefinitions.name}>
            <Input placeholder="Nhập tên" autoFocus />
        </SmartForm.Item>
        <Stack fullwidth justify="flex-end">
            <Button onClick={_onSave}>Lưu</Button>
        </Stack>
    </SmartForm>
}