import { ObjectPropertyHelper } from "@common/Helpers/ObjectProperty"
import { Button } from "@components/Button"
import { Input } from "@components/Form/Input"
import { Stack } from "@components/Layout/Stack"
import { SmartForm, useSmartForm } from "@components/SmartForm"
import { Dishes } from "@store/Models/Dishes"
import { editDishes } from "@store/Reducers/DishesReducer"
import { useDispatch } from "react-redux"

export const DishesEditWidget = ({ item, onDone }) => {
    const dispatch = useDispatch();

    const editDishesForm = useSmartForm<Dishes>({
        defaultValues: item,
        onSubmit: (values) => {
            dispatch(editDishes(values.transformValues));
            onDone();
        },
        itemDefinitions: defaultValues => ({
            id: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.id), noMarkup: true },
            name: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.name) },
            ingredients: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.name), noMarkup: true }
        })
    })

    const _onSave = () => {
        editDishesForm.submit();
    }

    return <SmartForm {...editDishesForm.defaultProps}>
        <SmartForm.Item {...editDishesForm.itemDefinitions.name}>
            <Input placeholder="Nhập tên" autoFocus />
        </SmartForm.Item>
        <Stack fullwidth justify="flex-end">
            <Button onClick={_onSave}>Save</Button>
        </Stack>
    </SmartForm>
}