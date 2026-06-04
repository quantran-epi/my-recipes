import { ObjectPropertyHelper } from "@common/Helpers/ObjectProperty"
import { Button } from "@components/Button"
import { ImageInput } from "@components/Form/ImageInput"
import { Input, TextArea } from "@components/Form/Input"
import { Select } from "@components/Form/Select"
import { ServingSizeInput } from "@components/Form/ServingSizeInput"
import { Switch } from "@components/Form/Switch"
import { Stack } from "@components/Layout/Stack"
import { useMessage } from "@components/Message"
import { SmartForm, useSmartForm } from "@components/SmartForm"
import { DISH_TAGS, Dishes } from "@store/Models/Dishes"
import { editDishes } from "@store/Reducers/DishesReducer"
import { ShoppingListIngredientHelpers, updateShoppingListIngredientDishData } from "@store/Reducers/ShoppingListReducer"
import { selectDishes } from "@store/Selectors"
import { useMemo } from "react"
import { useDispatch, useSelector } from "react-redux"

export const DishesEditWidget = ({ item, onDone }) => {
    const dispatch = useDispatch();
    const message = useMessage();
    const dishes = useSelector(selectDishes);
    const dishOptions = useMemo(() => dishes.map(dish => ({ label: dish.name, value: dish.id })), [dishes]);
    const tagOptions = useMemo(() => DISH_TAGS.map(tag => ({ label: tag, value: tag })), []);

    const editDishesForm = useSmartForm<Dishes>({
        defaultValues: { tags: [], ...item, baseServings: item.baseServings ?? 2 },
        onSubmit: (values) => {
            if (values.transformValues.includeDishes.some(e => ShoppingListIngredientHelpers.isInclude(e, dishes, values.transformValues.id))) {
                message.error("Lỗi lặp vòng tròn");
                return;
            }

            dispatch(editDishes(values.transformValues));
            dispatch(updateShoppingListIngredientDishData(values.transformValues));
            message.success("Đã lưu món ăn");
            onDone();
        },
        itemDefinitions: defaultValues => ({
            id: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.id), noMarkup: true },
            baseServings: { label: 'Khẩu phần gốc', name: ObjectPropertyHelper.nameof(defaultValues, e => e.baseServings) },
            name: { label: "Tên món ăn", name: ObjectPropertyHelper.nameof(defaultValues, e => e.name) },
            note: { label: "Ghi chú", name: ObjectPropertyHelper.nameof(defaultValues, e => e.note) },
            includeDishes: { label: "Bao gồm món", name: ObjectPropertyHelper.nameof(defaultValues, e => e.includeDishes) },
            ingredients: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.ingredients), noMarkup: true },
            steps: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.steps), noMarkup: true },
            isCompleted: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.isCompleted) },
            duration: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.duration), noMarkup: true },
            image: { label: "Ảnh", name: ObjectPropertyHelper.nameof(defaultValues, e => e.image) },
            tags: { label: "Thể loại", name: ObjectPropertyHelper.nameof(defaultValues, e => e.tags) },
        })
    })

    const _onSave = () => {
        editDishesForm.submit();
    }

    return <SmartForm {...editDishesForm.defaultProps}>
        <SmartForm.Item {...editDishesForm.itemDefinitions.name}>
            <Input placeholder="Nhập tên" autoFocus />
        </SmartForm.Item>
        <SmartForm.Item {...editDishesForm.itemDefinitions.baseServings}>
            <ServingSizeInput style={{ width: '100%' }} />
        </SmartForm.Item>
        <SmartForm.Item {...editDishesForm.itemDefinitions.includeDishes}>
            <Select
                showSearch
                mode="multiple"
                optionFilterProp="label"
                options={dishOptions}
                style={{ width: '100%' }} />
        </SmartForm.Item>
        <SmartForm.Item {...editDishesForm.itemDefinitions.note}>
            <TextArea rows={3} placeholder="Ghi chú" />
        </SmartForm.Item>
        <SmartForm.Item {...editDishesForm.itemDefinitions.tags}>
            <Select mode="multiple" placeholder="Chọn thể loại" options={tagOptions} style={{ width: '100%' }} />
        </SmartForm.Item>
        <SmartForm.Item {...editDishesForm.itemDefinitions.image}>
            <ImageInput />
        </SmartForm.Item>
        <SmartForm.Item {...editDishesForm.itemDefinitions.isCompleted}>
            <Switch checkedChildren="Hoàn thiện" unCheckedChildren="Chưa hoàn thiện" />
        </SmartForm.Item>
        <Stack fullwidth justify="flex-end">
            <Button onClick={_onSave}>Lưu</Button>
        </Stack>
    </SmartForm>
}
