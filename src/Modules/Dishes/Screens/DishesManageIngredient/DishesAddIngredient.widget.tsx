import { ObjectPropertyHelper } from "@common/Helpers/ObjectProperty";
import { Button } from "@components/Button";
import { Input } from "@components/Form/Input";
import { Option, Select } from "@components/Form/Select";
import { Switch } from "@components/Form/Switch";
import { Stack } from "@components/Layout/Stack";
import { useMessage } from "@components/Message";
import { SmartForm, useSmartForm } from "@components/SmartForm";
import { DISH_INGREDIENT_PREPARE_PRESETS, Dishes, DishesIngredientAmount } from "@store/Models/Dishes";
import { IngredientUnit } from "@store/Models/Ingredient";
import { IngredientUnitHelper } from "@common/Helpers/IngredientUnitHelper";
import { addIngredientsToDish } from "@store/Reducers/DishesReducer";
import { selectIngredients, selectIngredientsById } from "@store/Selectors";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";

type DishesAddIngredientWidgetProps = {
    dish: Dishes;
    onDone?: () => void;
}

export const DishesAddIngredientWidget: React.FunctionComponent<DishesAddIngredientWidgetProps> = (props) => {
    const ingredients = useSelector(selectIngredients);
    const ingredientsById = useSelector(selectIngredientsById);
    const dispatch = useDispatch();
    const message = useMessage();
    const [selectedIngredientId, setSelectedIngredientId] = useState<string>("");
    const selectedIngredient = ingredientsById.get(selectedIngredientId);
    const recipeUnits = IngredientUnitHelper.getRecipeUnits(selectedIngredient);

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
            const ingredient = ingredientsById.get(values.transformValues.ingredientId);
            if (!ingredient) {
                message.error("Choose an ingredient first.");
                return;
            }
            if (!IngredientUnitHelper.canConvert(ingredient, values.transformValues.unit)) {
                message.error("This unit is not configured for the selected ingredient.");
                return;
            }
            if (props.dish.ingredients.some(ingre => ingre.ingredientId === values.transformValues.ingredientId)) {
                message.error("Đã tồn tại nguyên liệu trong món ăn");
                return;
            }
            dispatch(addIngredientsToDish({
                dishId: props.dish.id,
                ingres: [values.transformValues]
            }));
            message.success("Đã thêm nguyên liệu vào món");
            addIngreToDishForm.reset();
            setSelectedIngredientId("");
            props.onDone?.();
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

    const _onIngredientChange = (ingredientId: string) => {
        const ingredient = ingredientsById.get(ingredientId);
        const units = IngredientUnitHelper.getRecipeUnits(ingredient);
        setSelectedIngredientId(ingredientId);
        addIngreToDishForm.form.setFieldsValue({
            ingredientId,
            unit: (units[0] ?? "g") as IngredientUnit,
        });
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
                onChange={_onIngredientChange}
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
                {recipeUnits.map(unit => <Option key={unit} value={unit}>{unit}</Option>)}
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
