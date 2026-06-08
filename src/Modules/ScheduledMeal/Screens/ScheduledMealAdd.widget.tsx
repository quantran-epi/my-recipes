import { ObjectPropertyHelper } from "@common/Helpers/ObjectProperty"
import { Button } from "@components/Button"
import { DatePicker } from "@components/Form/DatePicker"
import { Stack } from "@components/Layout/Stack"
import { useMessage } from "@components/Message"
import { SmartForm, useSmartForm } from "@components/SmartForm"
import { normalizeDishServings } from "@modules/ShoppingList/Screens/DishServingSelector.widget"
import { nanoid } from "@reduxjs/toolkit"
import { ScheduledMeal } from "@store/Models/ScheduledMeal"
import { rememberScheduledMealName } from "@store/Reducers/AppContextReducer"
import { addScheduledMeal } from "@store/Reducers/ScheduledMealReducer"
import { selectDishes, selectScheduledMealNameHistory, selectScheduledMeals } from "@store/Selectors"
import { AutoComplete } from "antd"
import dayjs from "dayjs"
import { useEffect, useMemo } from "react"
import { useDispatch, useSelector } from "react-redux"
import { ScheduledMealEstimateSummary } from "./ScheduledMealEstimateSummary.widget"
import { ScheduledMealMealPlanner } from "./ScheduledMealMealPlanner.widget"

const buildNameOptions = (names: string[]) => {
    const uniqueNames = Array.from(new Map(names
        .map(name => name.trim())
        .filter(Boolean)
        .map(name => [name.toLowerCase(), name])).values());
    return uniqueNames.map(name => ({ value: name }));
}

type ScheduledMealAddWidgetProps = {
    date: Date | null;
    initialName?: string;
    initialMeals?: ScheduledMeal["meals"];
    initialDishServings?: Record<string, number>;
    onDone: () => void;
    onCreated?: (scheduledMeal: ScheduledMeal) => void;
}

const createEmptyMeals = (): ScheduledMeal["meals"] => ({
    breakfast: [],
    lunch: [],
    dinner: [],
});

export const ScheduledMealAddWidget = ({ date, initialName, initialMeals, initialDishServings, onDone, onCreated }: ScheduledMealAddWidgetProps) => {
    const dispatch = useDispatch();
    const dishes = useSelector(selectDishes);
    const scheduledMeals = useSelector(selectScheduledMeals);
    const scheduledMealNameHistory = useSelector(selectScheduledMealNameHistory);
    const message = useMessage();
    const nameOptions = useMemo(() => buildNameOptions([...scheduledMealNameHistory, ...scheduledMeals.map(item => item.name)]), [scheduledMealNameHistory, scheduledMeals]);

    const addScheduledMealForm = useSmartForm<ScheduledMeal>({
        defaultValues: {
            id: "",
            name: initialName ?? "No named",
            meals: initialMeals ?? createEmptyMeals(),
            dishServings: initialDishServings ?? {},
            createdDate: new Date(),
            plannedDate: null
        },
        onSubmit: (values) => {
            dispatch(addScheduledMeal(values.transformValues));
            dispatch(rememberScheduledMealName(values.transformValues.name));
            message.success("Đã tạo thực đơn");
            addScheduledMealForm.reset();
            onDone();
            onCreated?.(values.transformValues);
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
                id: values.name.concat(nanoid(10)),
                dishServings: normalizeDishServings(selectedDishIds, dishes, values.dishServings ?? {}),
                plannedDate: new Date(values.plannedDate)
            };
        }
    })

    const meals = SmartForm.useWatch("meals", addScheduledMealForm.form);
    const dishServings = SmartForm.useWatch("dishServings", addScheduledMealForm.form) ?? {};
    const selectedDishIds = useMemo(() => Object.values(meals ?? { breakfast: [], lunch: [], dinner: [] }).flat(), [meals]);

    const _onSave = () => {
        addScheduledMealForm.submit();
    }

    const _onMealsChange = (nextMeals: ScheduledMeal["meals"], nextDishServings: Record<string, number>) => {
        addScheduledMealForm.form.setFieldsValue({
            meals: nextMeals,
            dishServings: nextDishServings,
        });
    }

    useEffect(() => {
        if (initialName) addScheduledMealForm.form.setFieldsValue({ name: initialName });
        if (initialMeals) addScheduledMealForm.form.setFieldsValue({ meals: initialMeals });
        if (initialDishServings) addScheduledMealForm.form.setFieldsValue({ dishServings: initialDishServings });
        if (date) addScheduledMealForm.form.setFieldsValue({ plannedDate: dayjs(date) });
    }, [addScheduledMealForm.form, date, initialName, initialMeals, initialDishServings])

    return <SmartForm {...addScheduledMealForm.defaultProps}>
        <SmartForm.Item {...addScheduledMealForm.itemDefinitions.name}>
            <AutoComplete
                options={nameOptions}
                placeholder="Nhập tên"
                autoFocus
                allowClear
                filterOption={(inputValue, option) => (option?.value ?? "").toString().toLowerCase().includes(inputValue.toLowerCase())}
            />
        </SmartForm.Item>
        <ScheduledMealMealPlanner meals={meals} dishServings={dishServings} dishes={dishes} onMealsChange={_onMealsChange} />
        <SmartForm.Item {...addScheduledMealForm.itemDefinitions.plannedDate}>
            <DatePicker style={{ width: "100%" }} placeholder="Chọn ngày" format={"DD/MM/YYYY"} />
        </SmartForm.Item>
        <ScheduledMealEstimateSummary dishIds={selectedDishIds} dishServings={dishServings} title="Ước tính ngày này" maxRows={4} />
        <Stack fullwidth justify="flex-end">
            <Button onClick={_onSave}>Lưu</Button>
        </Stack>
    </SmartForm>
}
