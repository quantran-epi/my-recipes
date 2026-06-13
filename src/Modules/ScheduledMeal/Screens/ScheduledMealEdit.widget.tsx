import { ObjectPropertyHelper } from "@common/Helpers/ObjectProperty"
import { Button } from "@components/Button"
import { DatePicker } from "@components/Form/DatePicker"
import { Stack } from "@components/Layout/Stack"
import { useMessage } from "@components/Message"
import { SmartForm, useSmartForm } from "@components/SmartForm"
import { normalizeDishServings } from "@modules/ShoppingList/Screens/DishServingSelector.widget"
import { ScheduledMeal } from "@store/Models/ScheduledMeal"
import { rememberScheduledMealName } from "@store/Reducers/AppContextReducer"
import { editScheduledMeal } from "@store/Reducers/ScheduledMealReducer"
import { updateShoppingListIngredientMealData } from "@store/Reducers/ShoppingListReducer"
import { selectDishes, selectScheduledMealNameHistory, selectScheduledMeals } from "@store/Selectors"
import { AutoComplete } from "antd"
import dayjs from "dayjs"
import { useMemo } from "react"
import { useDispatch, useSelector } from "react-redux"
import { ScheduledMealEstimateSummary } from "./ScheduledMealEstimateSummary.widget"
import { ScheduledMealMealPlanner } from "./ScheduledMealMealPlanner.widget"
import { HouseholdMemberPicker } from "@modules/ScheduledMeal/Components/HouseholdMemberPicker"
import { Box } from "@components/Layout/Box"

const buildNameOptions = (names: string[]) => {
    const uniqueNames = Array.from(new Map(names
        .map(name => name.trim())
        .filter(Boolean)
        .map(name => [name.toLowerCase(), name])).values());
    return uniqueNames.map(name => ({ value: name }));
}

export const ScheduledMealEditWidget = ({ item, onDone }) => {
    const dispatch = useDispatch();
    const dishes = useSelector(selectDishes);
    const scheduledMeals = useSelector(selectScheduledMeals);
    const scheduledMealNameHistory = useSelector(selectScheduledMealNameHistory);
    const message = useMessage();
    const nameOptions = useMemo(() => buildNameOptions([...scheduledMealNameHistory, ...scheduledMeals.map(meal => meal.name)]), [scheduledMealNameHistory, scheduledMeals]);

    const editScheduledMealForm = useSmartForm<ScheduledMeal>({
        defaultValues: {
            ...item,
            dishServings: item.dishServings ?? {},
            plannedDate: dayjs(item.plannedDate)
        },
        onSubmit: (values) => {
            dispatch(editScheduledMeal(values.transformValues));
            dispatch(rememberScheduledMealName(values.transformValues.name));
            dispatch(updateShoppingListIngredientMealData(values.transformValues));
            message.success("Đã lưu thực đơn");
            editScheduledMealForm.reset();
            onDone();
        },
        itemDefinitions: defaultValues => ({
            id: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.id), noMarkup: true },
            name: { label: "Tên gợi nhớ", name: ObjectPropertyHelper.nameof(defaultValues, e => e.name) },
            meals: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.meals), noMarkup: true },
            memberIds: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.memberIds), noMarkup: true },
            skipMeals: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.skipMeals), noMarkup: true },
            cookedSlots: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.cookedSlots), noMarkup: true },
            eatenSlots: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.eatenSlots), noMarkup: true },
            actualMeals: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.actualMeals), noMarkup: true },
            dishServings: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.dishServings), noMarkup: true },
            createdDate: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.createdDate), noMarkup: true },
            plannedDate: { label: "Ngày kế hoạch", name: ObjectPropertyHelper.nameof(defaultValues, e => e.plannedDate) },
        }),
        transformFunc: (values) => {
            const selectedDishIds = Object.values(values.meals ?? { breakfast: [], lunch: [], dinner: [] }).flat();
            const skipMeals = values.skipMeals ? { ...values.skipMeals } : undefined;
            (Object.keys(values.meals ?? {}) as Array<keyof ScheduledMeal["meals"]>).forEach(slot => {
                if ((values.meals?.[slot] ?? []).length > 0) delete skipMeals?.[slot];
            });
            return {
                ...values,
                skipMeals,
                dishServings: normalizeDishServings(selectedDishIds, dishes, values.dishServings ?? {}),
                plannedDate: new Date(values.plannedDate)
            };
        }
    })

    const meals = SmartForm.useWatch("meals", editScheduledMealForm.form);
    const dishServings = SmartForm.useWatch("dishServings", editScheduledMealForm.form) ?? {};
    const memberIds = SmartForm.useWatch("memberIds", editScheduledMealForm.form) ?? [];
    const selectedDishIds = useMemo(() => Object.values(meals ?? { breakfast: [], lunch: [], dinner: [] }).flat(), [meals]);

    const _onSave = () => {
        editScheduledMealForm.submit();
    }

    const _onMealsChange = (nextMeals: ScheduledMeal["meals"], nextDishServings: Record<string, number>) => {
        editScheduledMealForm.form.setFieldsValue({
            meals: nextMeals,
            dishServings: nextDishServings,
        });
    }
    return <SmartForm {...editScheduledMealForm.defaultProps}>
        <SmartForm.Item {...editScheduledMealForm.itemDefinitions.name}>
            <AutoComplete
                options={nameOptions}
                placeholder="Nhập tên"
                autoFocus
                allowClear
                filterOption={(inputValue, option) => (option?.value ?? "").toString().toLowerCase().includes(inputValue.toLowerCase())}
            />
        </SmartForm.Item>
        <Box style={{ marginBottom: 12 }}>
            <HouseholdMemberPicker
                label="Cho ai ăn? (để trống = cả nhà)"
                value={memberIds}
                onChange={ids => editScheduledMealForm.form.setFieldsValue({ memberIds: ids })}
            />
        </Box>
        <ScheduledMealMealPlanner meals={meals} dishServings={dishServings} dishes={dishes} onMealsChange={_onMealsChange} />
        <SmartForm.Item {...editScheduledMealForm.itemDefinitions.plannedDate}>
            <DatePicker style={{ width: "100%" }} placeholder="Chọn ngày" format={"DD/MM/YYYY"} />
        </SmartForm.Item>
        <ScheduledMealEstimateSummary dishIds={selectedDishIds} dishServings={dishServings} title="Ước tính ngày này" maxRows={4} />
        <Stack fullwidth justify="flex-end">
            <Button onClick={_onSave}>Lưu</Button>
        </Stack>
    </SmartForm>
}
