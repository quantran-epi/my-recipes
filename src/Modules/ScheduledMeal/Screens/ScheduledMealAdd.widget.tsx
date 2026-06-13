import { ObjectPropertyHelper } from "@common/Helpers/ObjectProperty"
import { Button } from "@components/Button"
import { DatePicker } from "@components/Form/DatePicker"
import { Box } from "@components/Layout/Box"
import { Stack } from "@components/Layout/Stack"
import { useMessage } from "@components/Message"
import { SmartForm, useSmartForm } from "@components/SmartForm"
import { Tag } from "@components/Tag"
import { Typography } from "@components/Typography"
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

type MealSlotKey = keyof ScheduledMeal["meals"];

const mealSlotLabels: Array<{ key: MealSlotKey; label: string; color: string; background: string; border: string }> = [
    { key: "breakfast", label: "Sáng", color: "#d48806", background: "#fffbe6", border: "#ffe58f" },
    { key: "lunch", label: "Trưa", color: "#d46b08", background: "#fff7e6", border: "#ffd591" },
    { key: "dinner", label: "Tối", color: "#531dab", background: "#f9f0ff", border: "#efdbff" },
];

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
    const dishesById = useMemo(() => new Map(dishes.map(dish => [dish.id, dish])), [dishes]);

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
            skipMeals: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.skipMeals), noMarkup: true },
            cookedSlots: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.cookedSlots), noMarkup: true },
            actualMeals: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.actualMeals), noMarkup: true },
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
    const plannedDate = SmartForm.useWatch("plannedDate", addScheduledMealForm.form);
    const selectedDishIds = useMemo(() => Object.values(meals ?? { breakfast: [], lunch: [], dinner: [] }).flat(), [meals]);
    const existingMealsForPlannedDate = useMemo(() => {
        if (!plannedDate) return [];
        return scheduledMeals.filter(item => dayjs(item.plannedDate).isSame(dayjs(plannedDate), "day"));
    }, [plannedDate, scheduledMeals]);

    const _onSave = () => {
        addScheduledMealForm.submit();
    }

    const _onMealsChange = (nextMeals: ScheduledMeal["meals"], nextDishServings: Record<string, number>) => {
        addScheduledMealForm.form.setFieldsValue({
            meals: nextMeals,
            dishServings: nextDishServings,
        });
    }

    const _getExistingDishNames = (slot: MealSlotKey) => {
        return existingMealsForPlannedDate.flatMap(item => (item.meals?.[slot] ?? []).map(dishId => dishesById.get(dishId)?.name ?? dishId));
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
        {plannedDate && <Box style={{ display: "block", width: "100%", maxWidth: "100%", minWidth: 0, boxSizing: "border-box", alignSelf: "stretch", justifySelf: "stretch", marginInline: 0, textAlign: "left", border: "1px solid #e6f4ff", borderRadius: 8, background: "#f8fbff", padding: 10, marginBottom: 12 }}>
            <Typography.Text strong style={{ display: "block", color: "#111827", fontSize: 12, lineHeight: "17px", marginBottom: 8 }}>Thực đơn đã có trong ngày này</Typography.Text>
            <Stack direction="column" gap={6} fullwidth align="stretch" style={{ width: "100%", textAlign: "left" }}>
                {mealSlotLabels.map(slot => {
                    const names = _getExistingDishNames(slot.key);
                    return <div key={slot.key} style={{ display: "grid", gridTemplateColumns: "58px minmax(0, 1fr)", gap: 8, alignItems: "start", width: "100%", boxSizing: "border-box", textAlign: "left" }}>
                        <Tag style={{ marginRight: 0, color: slot.color, background: slot.background, borderColor: slot.border, textAlign: "center" }}>{slot.label}</Tag>
                        <Typography.Text type={names.length > 0 ? undefined : "secondary"} style={{ fontSize: 12, lineHeight: "18px", overflowWrap: "anywhere" }}>
                            {names.length > 0 ? names.join(" · ") : "Chưa có món"}
                        </Typography.Text>
                    </div>
                })}
            </Stack>
        </Box>}
        <div style={{ marginBottom: 14 }}>
            <ScheduledMealEstimateSummary dishIds={selectedDishIds} dishServings={dishServings} title="Ước tính ngày này" maxRows={4} />
        </div>
        <Stack fullwidth justify="flex-end">
            <Button onClick={_onSave}>Lưu</Button>
        </Stack>
    </SmartForm>
}
