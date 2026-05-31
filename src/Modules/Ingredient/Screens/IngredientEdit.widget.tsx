import { ObjectPropertyHelper } from "@common/Helpers/ObjectProperty"
import { Button } from "@components/Button"
import { Input } from "@components/Form/Input"
import { Option, Select } from "@components/Form/Select"
import { Stack } from "@components/Layout/Stack"
import { useMessage } from "@components/Message"
import { SmartForm, useSmartForm } from "@components/SmartForm"
import { nanoid } from "@reduxjs/toolkit"
import { INGREDIENT_CATEGORIES, INGREDIENT_SHELF_LIFE_OPTIONS, Ingredient } from "@store/Models/Ingredient"
import { addIngredient, editIngredient } from "@store/Reducers/IngredientReducer"
import { useDispatch } from "react-redux"

export const IngredientEditWidget = ({ item, onDone }) => {
    const dispatch = useDispatch();
    const message = useMessage();

    const editIngredientForm = useSmartForm<Ingredient>({
        defaultValues: { category: "", shelfLife: undefined, ...item },
        onSubmit: (values) => {
            dispatch(editIngredient(values.transformValues));
            message.success();
            onDone();
        },
        itemDefinitions: defaultValues => ({
            id: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.id), noMarkup: true },
            name: { label: "Tên nguyên liệu", name: ObjectPropertyHelper.nameof(defaultValues, e => e.name) },
            category: { label: "Nhóm", name: ObjectPropertyHelper.nameof(defaultValues, e => e.category) },
            shelfLife: { label: "Thời hạn bảo quản", name: ObjectPropertyHelper.nameof(defaultValues, e => e.shelfLife) },
        })
    })

    const _onSave = () => {
        editIngredientForm.submit();
    }

    return <SmartForm {...editIngredientForm.defaultProps}>
        <SmartForm.Item {...editIngredientForm.itemDefinitions.name}>
            <Input placeholder="Nhập tên" autoFocus />
        </SmartForm.Item>
        <SmartForm.Item {...editIngredientForm.itemDefinitions.category}>
            <Select allowClear placeholder="Chọn nhóm" style={{ width: '100%' }}>
                {INGREDIENT_CATEGORIES.map(cat => <Option key={cat} value={cat}>{cat}</Option>)}
            </Select>
        </SmartForm.Item>
        <SmartForm.Item {...editIngredientForm.itemDefinitions.shelfLife}>
            <Select allowClear placeholder="Chọn thời hạn bảo quản" style={{ width: '100%' }}>
                {INGREDIENT_SHELF_LIFE_OPTIONS.map(opt => (
                    <Option key={opt.value} value={opt.value}>
                        {opt.emoji} {opt.label} — {opt.description}
                    </Option>
                ))}
            </Select>
        </SmartForm.Item>
        <Stack fullwidth justify="flex-end">
            <Button onClick={_onSave}>Lưu</Button>
        </Stack>
    </SmartForm>
}