import { ObjectPropertyHelper } from "@common/Helpers/ObjectProperty"
import { Button } from "@components/Button"
import { ImageInput } from "@components/Form/ImageInput"
import { Input, TextArea } from "@components/Form/Input"
import { Select } from "@components/Form/Select"
import { ServingSizeInput } from "@components/Form/ServingSizeInput"
import { Stack } from "@components/Layout/Stack"
import { useMessage } from "@components/Message"
import { SmartForm, useSmartForm } from "@components/SmartForm"
import { nanoid } from "@reduxjs/toolkit"
import { DISH_TAGS, Dishes } from "@store/Models/Dishes"
import { addDishes } from "@store/Reducers/DishesReducer"
import { selectDishes } from "@store/Selectors"
import { useMemo } from "react"
import { useDispatch, useSelector } from "react-redux"

export const DishesAddWidget = () => {
    const dispatch = useDispatch();
    const message = useMessage();
    const dishes = useSelector(selectDishes);
    const dishOptions = useMemo(() => dishes.map(dish => ({ label: dish.name, value: dish.id })), [dishes]);
    const tagOptions = useMemo(() => DISH_TAGS.map(tag => ({ label: tag, value: tag })), []);

    const addDishesForm = useSmartForm<Dishes>({
        defaultValues: {
            id: "",
            name: "",
            baseServings: 2,
            ingredients: [],
            note: "",
            includeDishes: [],
            steps: [],
            isCompleted: false,
            duration: {
                unfreeze: null,
                prepare: null,
                cooking: null,
                serve: null,
                cooldown: null
            },
            image: "",
            tags: [],
        },
        onSubmit: (values) => {
            dispatch(addDishes(values.transformValues));
            message.success("Đã thêm món ăn");
            addDishesForm.reset();
        },
        itemDefinitions: defaultValues => ({
            id: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.id), noMarkup: true },
            baseServings: { label: 'Khẩu phần gốc', name: ObjectPropertyHelper.nameof(defaultValues, e => e.baseServings) },
            name: { label: "Tên món ăn", name: ObjectPropertyHelper.nameof(defaultValues, e => e.name) },
            note: { label: "Ghi chú", name: ObjectPropertyHelper.nameof(defaultValues, e => e.note) },
            includeDishes: { label: "Bao gồm món", name: ObjectPropertyHelper.nameof(defaultValues, e => e.includeDishes) },
            ingredients: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.ingredients), noMarkup: true },
            steps: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.steps), noMarkup: true },
            isCompleted: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.isCompleted), noMarkup: true },
            image: { label: "Ảnh", name: ObjectPropertyHelper.nameof(defaultValues, e => e.image) },
            duration: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.duration), noMarkup: true },
            tags: { label: "Thể loại", name: ObjectPropertyHelper.nameof(defaultValues, e => e.tags) },
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
        <SmartForm.Item {...addDishesForm.itemDefinitions.baseServings}>
            <ServingSizeInput style={{ width: '100%' }} />
        </SmartForm.Item>
        <SmartForm.Item {...addDishesForm.itemDefinitions.includeDishes}>
            <Select
                showSearch
                mode="multiple"
                optionFilterProp="label"
                options={dishOptions}
                style={{ width: '100%' }} />
        </SmartForm.Item>
        <SmartForm.Item {...addDishesForm.itemDefinitions.note}>
            <TextArea rows={3} placeholder="Ghi chú" />
        </SmartForm.Item>
        <SmartForm.Item {...addDishesForm.itemDefinitions.tags}>
            <Select mode="multiple" placeholder="Chọn thể loại" options={tagOptions} style={{ width: '100%' }} />
        </SmartForm.Item>
        <SmartForm.Item {...addDishesForm.itemDefinitions.image}>
            <ImageInput />
        </SmartForm.Item>
        <Stack fullwidth justify="flex-end">
            <Button onClick={_onSave}>Lưu</Button>
        </Stack>
    </SmartForm>
}
