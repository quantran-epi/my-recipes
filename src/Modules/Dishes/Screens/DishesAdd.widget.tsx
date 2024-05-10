import { ObjectPropertyHelper } from "@common/Helpers/ObjectProperty"
import { Button } from "@components/Button"
import { Input, TextArea } from "@components/Form/Input"
import { Option, Select } from "@components/Form/Select"
import { Stack } from "@components/Layout/Stack"
import { useMessage } from "@components/Message"
import { SmartForm, useSmartForm } from "@components/SmartForm"
import { nanoid } from "@reduxjs/toolkit"
import { Dishes } from "@store/Models/Dishes"
import { addDishes, test } from "@store/Reducers/DishesReducer"
import { RootState } from "@store/Store"
import { range } from "lodash"
import { useEffect } from "react"
import { useDispatch, useSelector } from "react-redux"

export const DishesAddWidget = () => {
    const dispatch = useDispatch();
    const message = useMessage();
    const dishes = useSelector((state: RootState) => state.dishes.dishes);

    useEffect(() => {
        dispatch(test());
    }, [])

    const addDishesForm = useSmartForm<Dishes>({
        defaultValues: {
            id: "",
            name: "",
            ingredients: [],
            note: "",
            servingSize: 2,
            includeDishes: [],
            steps: [],
            isCompleted: false,
            image: ""
        },
        onSubmit: (values) => {
            dispatch(addDishes(values.transformValues));
            message.success();
            addDishesForm.reset();
        },
        itemDefinitions: defaultValues => ({
            id: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.id), noMarkup: true },
            name: { label: "Tên món ăn", name: ObjectPropertyHelper.nameof(defaultValues, e => e.name) },
            note: { label: "Ghi chú", name: ObjectPropertyHelper.nameof(defaultValues, e => e.note) },
            servingSize: { label: "Khẩu phần ăn", name: ObjectPropertyHelper.nameof(defaultValues, e => e.servingSize) },
            includeDishes: { label: "Bao gồm món", name: ObjectPropertyHelper.nameof(defaultValues, e => e.includeDishes) },
            ingredients: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.ingredients), noMarkup: true },
            steps: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.steps), noMarkup: true },
            isCompleted: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.isCompleted), noMarkup: true },
            image: { label: "Ảnh", name: ObjectPropertyHelper.nameof(defaultValues, e => e.image) },
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
        <SmartForm.Item {...addDishesForm.itemDefinitions.servingSize}>
            <Select
                showSearch
                filterOption={(inputValue, option) => {
                    if (!option?.children) return false;
                    return option?.children?.toString().toLowerCase().includes(inputValue.toLowerCase());
                }}
                style={{ width: '100%' }}>
                {range(1, 10, 1).map(servingSize => <Option key={servingSize} value={servingSize}>{servingSize} người</Option>)}
            </Select>
        </SmartForm.Item>
        <SmartForm.Item {...addDishesForm.itemDefinitions.includeDishes}>
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
        <SmartForm.Item {...addDishesForm.itemDefinitions.note}>
            <TextArea rows={5} placeholder="Ghi chú" autoFocus />
        </SmartForm.Item>
        <SmartForm.Item {...addDishesForm.itemDefinitions.image}>
            <Input placeholder="Nhập đường dẫn" autoFocus />
        </SmartForm.Item>
        <Stack fullwidth justify="flex-end">
            <Button onClick={_onSave}>Lưu</Button>
        </Stack>
    </SmartForm>
}