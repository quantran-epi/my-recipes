import { ObjectPropertyHelper } from "@common/Helpers/ObjectProperty"
import { Button } from "@components/Button"
import { DatePicker } from "@components/Form/DatePicker"
import { Input } from "@components/Form/Input"
import { Option, Select } from "@components/Form/Select"
import { Stack } from "@components/Layout/Stack"
import { useMessage } from "@components/Message"
import { SmartForm, useSmartForm } from "@components/SmartForm"
import { ScheduledMeal } from "@store/Models/ScheduledMeal"
import { editScheduledMeal } from "@store/Reducers/ScheduledMealReducer"
import { updateShoppingListIngredientMealData } from "@store/Reducers/ShoppingListReducer"
import { RootState } from "@store/Store"
import dayjs from "dayjs"
import { useDispatch, useSelector } from "react-redux"

export const ScheduledMealEditWidget = ({ item, onDone }) => {
    const dispatch = useDispatch();
    const dishes = useSelector((state: RootState) => state.dishes.dishes);
    const message = useMessage();

    const editScheduledMealForm = useSmartForm<ScheduledMeal>({
        defaultValues: {
            ...item,
            plannedDate: dayjs(item.plannedDate)
        },
        onSubmit: (values) => {
            dispatch(editScheduledMeal(values.transformValues));
            dispatch(updateShoppingListIngredientMealData(values.transformValues));
            message.success();
            editScheduledMealForm.reset();
            onDone();
        },
        itemDefinitions: defaultValues => ({
            id: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.id), noMarkup: true },
            name: { label: "Tên gợi nhớ", name: ObjectPropertyHelper.nameof(defaultValues, e => e.name) },
            meals: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.meals), noMarkup: true },
            createdDate: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.createdDate), noMarkup: true },
            plannedDate: { label: "Ngày kế hoạch", name: ObjectPropertyHelper.nameof(defaultValues, e => e.plannedDate) },
        }),
        transformFunc: (values) => ({
            ...values,
            plannedDate: new Date(values.plannedDate)
        })
    })

    const meals = SmartForm.useWatch("meals", editScheduledMealForm.form);

    const _onSave = () => {
        editScheduledMealForm.submit();
    }

    const _onSelectDish = (dishIds: string[], meals: keyof ScheduledMeal["meals"]) => {
        switch (meals) {
            case "breakfast": editScheduledMealForm.form.setFieldsValue({
                meals: {
                    ...editScheduledMealForm.form.getFieldsValue().meals,
                    breakfast: dishIds
                }
            }); break;
            case "lunch": editScheduledMealForm.form.setFieldsValue({
                meals: {
                    ...editScheduledMealForm.form.getFieldsValue().meals,
                    lunch: dishIds
                }
            }); break;
            case "dinner": editScheduledMealForm.form.setFieldsValue({
                meals: {
                    ...editScheduledMealForm.form.getFieldsValue().meals,
                    dinner: dishIds
                }
            }); break;
        }
    }
    return <SmartForm {...editScheduledMealForm.defaultProps}>
        <SmartForm.Item {...editScheduledMealForm.itemDefinitions.name}>
            <Input placeholder="Nhập tên" autoFocus allowClear />
        </SmartForm.Item>
        <SmartForm.Item label="Bữa sáng">
            <Select
                onChange={value => _onSelectDish(value, "breakfast")}
                value={meals?.breakfast}
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
        <SmartForm.Item label="Bữa trưa">
            <Select
                onChange={value => _onSelectDish(value, "lunch")}
                value={meals?.lunch}
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
        <SmartForm.Item label="Bữa tối">
            <Select
                onChange={value => _onSelectDish(value, "dinner")}
                value={meals?.dinner}
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
        <SmartForm.Item {...editScheduledMealForm.itemDefinitions.plannedDate}>
            <DatePicker style={{ width: "100%" }} placeholder="Chọn ngày" format={"DD/MM/YYYY"} />
        </SmartForm.Item>
        <Stack fullwidth justify="flex-end">
            <Button onClick={_onSave}>Lưu</Button>
        </Stack>
    </SmartForm>
}