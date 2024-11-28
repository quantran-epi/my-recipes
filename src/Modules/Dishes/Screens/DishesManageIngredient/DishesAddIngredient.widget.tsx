import { ObjectPropertyHelper } from "@common/Helpers/ObjectProperty";
import { Button } from "@components/Button";
import { Input, TextArea } from "@components/Form/Input";
import { Option, Select } from "@components/Form/Select";
import { Switch } from "@components/Form/Switch";
import { Stack } from "@components/Layout/Stack";
import { useMessage } from "@components/Message";
import { SmartForm, useSmartForm } from "@components/SmartForm";
import { DISH_INGREDIENT_PREPARE_PRESETS, Dishes, DishesIngredientAmount } from "@store/Models/Dishes";
import { INGREDIENT_UNITS } from "@store/Models/Ingredient";
import { addIngredientsToDish, test } from "@store/Reducers/DishesReducer";
import { RootState } from "@store/Store";
import { AutoComplete } from "antd";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

type DishesAddIngredientWidgetProps = {
    dish: Dishes;
    onDone?: () => void;
}

export const DishesAddIngredientWidget: React.FunctionComponent<DishesAddIngredientWidgetProps> = (props) => {
    const ingredients = useSelector((state: RootState) => state.ingredient.ingredients);
    const dispatch = useDispatch();
    const message = useMessage();

    const addIngreToDishForm = useSmartForm<DishesIngredientAmount>({
        defaultValues: {
            ingredientId: "",
            amount: "",
            prepare: [],
            unit: "g",
            dishesId: props.dish.id,
            required: true,
            dish: null,
            meal: null
        },
        onSubmit: (values) => {
            if (props.dish.ingredients.some(ingre => ingre.ingredientId === values.transformValues.ingredientId)) {
                message.error("Đã tồn tại nguyên liệu trong món ăn");
                return;
            }
            dispatch(addIngredientsToDish({
                dishId: props.dish.id,
                ingres: [values.transformValues]
            }));
            message.success();
            addIngreToDishForm.reset();
            props.onDone();
        },
        itemDefinitions: defaultValues => ({
            ingredientId: { label: "Nguyên liệu", name: ObjectPropertyHelper.nameof(defaultValues, e => e.ingredientId) },
            amount: { label: "Số lượng", name: ObjectPropertyHelper.nameof(defaultValues, e => e.amount) },
            unit: { label: "Đơn vị tính", name: ObjectPropertyHelper.nameof(defaultValues, e => e.unit) },
            dishesId: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.dishesId), noMarkup: true },
            prepare: { label: "Sơ chế", name: ObjectPropertyHelper.nameof(defaultValues, e => e?.prepare) },
            required: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.required), valuePropName: "checked" },
            meal: { name: ObjectPropertyHelper.nameof(defaultValues, e => e?.meal), noMarkup: true },
            dish: { name: ObjectPropertyHelper.nameof(defaultValues, e => e?.dish), noMarkup: true }
        }),
    })

    const _onSave = () => {
        addIngreToDishForm.submit();
    }

    return <SmartForm {...addIngreToDishForm.defaultProps}>
        <SmartForm.Item {...addIngreToDishForm.itemDefinitions.ingredientId}>
            <Select
                autoFocus
                showSearch
                filterOption={(inputValue, option) => {
                    if (!option?.children) return false;
                    return option?.children?.toString().toLowerCase().includes(inputValue.toLowerCase());
                }}
                style={{ width: '100%' }}>
                {ingredients.map(ingre => <Option key={ingre.id} value={ingre.id}>{ingre.name}</Option>)}
            </Select>
        </SmartForm.Item>
        <SmartForm.Item {...addIngreToDishForm.itemDefinitions.amount}>
            <Input placeholder="Số lượng" />
        </SmartForm.Item>
        <SmartForm.Item {...addIngreToDishForm.itemDefinitions.unit}>
            <Select
                showSearch
                filterOption={(inputValue, option) => {
                    if (!option?.children) return false;
                    return option?.children?.toString().toLowerCase().includes(inputValue.toLowerCase());
                }}
                style={{ width: '100%' }}>
                {INGREDIENT_UNITS.map(unit => <Option key={unit} value={unit}>{unit}</Option>)}
            </Select>
        </SmartForm.Item>
        <SmartForm.Item {...addIngreToDishForm.itemDefinitions.prepare}>
            <Select
                allowClear
                mode="tags"
                style={{ width: '100%' }}
                placeholder="Sơ chế"
                options={DISH_INGREDIENT_PREPARE_PRESETS.map(e => ({ value: e }))}
            />
        </SmartForm.Item>
        <SmartForm.Item {...addIngreToDishForm.itemDefinitions.required}>
            <Switch checkedChildren="Bắt buộc" unCheckedChildren="Tùy chọn" />
        </SmartForm.Item>
        <Stack fullwidth justify="flex-end">
            <Button onClick={_onSave}>Lưu</Button>
        </Stack>
    </SmartForm>
}