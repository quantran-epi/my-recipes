import { ObjectPropertyHelper } from "@common/Helpers/ObjectProperty"
import { Button } from "@components/Button"
import { DatePicker } from "@components/Form/DatePicker"
import { Input } from "@components/Form/Input"
import { Option, Select } from "@components/Form/Select"
import { Stack } from "@components/Layout/Stack"
import { useMessage } from "@components/Message"
import { SmartForm, useSmartForm } from "@components/SmartForm"
import { DishServingSelector, normalizeDishServings } from "@modules/ShoppingList/Screens/DishServingSelector.widget"
import { ScheduledMeal } from "@store/Models/ScheduledMeal"
import { editScheduledMeal } from "@store/Reducers/ScheduledMealReducer"
import { updateShoppingListIngredientMealData } from "@store/Reducers/ShoppingListReducer"
import { selectDishes } from "@store/Selectors"
import dayjs from "dayjs"
import { useMemo } from "react"
import { useDispatch, useSelector } from "react-redux"
import { ScheduledMealEstimateSummary } from "./ScheduledMealEstimateSummary.widget"

export const ScheduledMealEditWidget = ({ item, onDone }) => {
    const dispatch = useDispatch();
    const dishes = useSelector(selectDishes);
    const message = useMessage();

    const editScheduledMealForm = useSmartForm<ScheduledMeal>({
        defaultValues: {
            ...item,
            dishServings: item.dishServings ?? {},
            plannedDate: dayjs(item.plannedDate)
        },
        onSubmit: (values) => {
            dispatch(editScheduledMeal(values.transformValues));
            dispatch(updateShoppingListIngredientMealData(values.transformValues));
            message.success("Đã lưu thực đơn");
            editScheduledMealForm.reset();
            onDone();
        },
        itemDefinitions: defaultValues => ({
            id: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.id), noMarkup: true },
            name: { label: "Tên gợi nhớ", name: ObjectPropertyHelper.nameof(defaultValues, e => e.name) },
            meals: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.meals), noMarkup: true },
            dishServings: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.dishServings), noMarkup: true },
            createdDate: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.createdDate), noMarkup: true },
            plannedDate: { label: "Ngày kế hoạch", name: ObjectPropertyHelper.nameof(defaultValues, e => e.plannedDate) },
        }),
        transformFunc: (values) => {
            const selectedDishIds = Object.values(values.meals ?? { breakfast: [], lunch: [], dinner: [] }).flat();
            return {
                ...values,
                dishServings: normalizeDishServings(selectedDishIds, dishes, values.dishServings ?? {}),
                plannedDate: new Date(values.plannedDate)
            };
        }
    })

    const meals = SmartForm.useWatch("meals", editScheduledMealForm.form);
    const dishServings = SmartForm.useWatch("dishServings", editScheduledMealForm.form) ?? {};
    const selectedDishIds = useMemo(() => Object.values(meals ?? { breakfast: [], lunch: [], dinner: [] }).flat(), [meals]);

    const _onSave = () => {
        editScheduledMealForm.submit();
    }

    const _onSelectDish = (dishIds: string[], meals: keyof ScheduledMeal["meals"]) => {
        const currentValues = editScheduledMealForm.form.getFieldsValue();
        const nextMeals = {
            ...currentValues.meals,
            [meals]: dishIds ?? [],
        };
        const nextSelectedDishIds = Object.values(nextMeals).flat() as string[];
        editScheduledMealForm.form.setFieldsValue({
            meals: nextMeals,
            dishServings: normalizeDishServings(nextSelectedDishIds, dishes, currentValues.dishServings ?? {}),
        });
    }

    const _onDishServingsChange = (nextValue: Record<string, number>) => {
        editScheduledMealForm.form.setFieldsValue({ dishServings: nextValue });
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
        <DishServingSelector
            selectedDishIds={selectedDishIds}
            dishes={dishes}
            value={dishServings}
            onChange={_onDishServingsChange}
        />
        <SmartForm.Item {...editScheduledMealForm.itemDefinitions.plannedDate}>
            <DatePicker style={{ width: "100%" }} placeholder="Chọn ngày" format={"DD/MM/YYYY"} />
        </SmartForm.Item>
        <ScheduledMealEstimateSummary dishIds={selectedDishIds} dishServings={dishServings} title="Ước tính ngày này" maxRows={4} />
        <Stack fullwidth justify="flex-end">
            <Button onClick={_onSave}>Lưu</Button>
        </Stack>
    </SmartForm>
}
