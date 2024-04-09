import { ObjectPropertyHelper } from "@common/Helpers/ObjectProperty";
import { Button } from "@components/Button";
import { Form } from "@components/Form"
import { Input } from "@components/Form/Input";
import { Option, Select } from "@components/Form/Select";
import { Stack } from "@components/Layout/Stack";
import { useSmartForm } from "@components/SmartForm";
import { Dishes, DishesIngredientAmount } from "@store/Models/Dishes"
import { IngredientUnit } from "@store/Models/Ingredient";
import { DishesIngredientAddParams, addIngredientsToDish } from "@store/Reducers/DishesReducer";
import { RootState } from "@store/Store";
import { useDispatch, useSelector } from "react-redux";

type DishesAddIngredientWidgetProps = {
    dish: Dishes;
    onDone: () => void;
}

export const DishesAddIngredientWidget: React.FunctionComponent<DishesAddIngredientWidgetProps> = (props) => {
    const ingredients = useSelector((state: RootState) => state.ingredient.ingredients);
    const ingredientUnits: Array<IngredientUnit> = ["g", "kg", "lít", "ml"];
    const dispatch = useDispatch();

    const addIngreToDishForm = useSmartForm<DishesIngredientAmount>({
        defaultValues: {
            ingredientId: "",
            amount: "",
            unit: "g"
        },
        onSubmit: (values) => {
            dispatch(addIngredientsToDish({
                dishId: props.dish.id,
                ingres: [values.transformValues]
            }));
            props.onDone();
        },
        itemDefinitions: defaultValues => ({
            ingredientId: { label: "Ingredient", name: ObjectPropertyHelper.nameof(defaultValues, e => e.ingredientId) },
            amount: { label: "Amount", name: ObjectPropertyHelper.nameof(defaultValues, e => e.amount) },
            unit: { label: "Unit", name: ObjectPropertyHelper.nameof(defaultValues, e => e.unit) }
        }),
    })

    const _onSave = () => {
        addIngreToDishForm.submit();
    }

    return <Form {...addIngreToDishForm.defaultProps}>
        <Form.Item {...addIngreToDishForm.itemDefinitions.ingredientId}>
            <Select
                showSearch
                filterOption={(inputValue, option) => {
                    if (!option?.children) return false;
                    return option?.children?.toString().toLowerCase().includes(inputValue.toLowerCase());
                }}
                style={{ width: '100%' }}>
                {ingredients.map(ingre => <Option key={ingre.id} value={ingre.id}>{ingre.name}</Option>)}
            </Select>
        </Form.Item>
        <Form.Item {...addIngreToDishForm.itemDefinitions.amount}>
            <Input placeholder="Số lượng" />
        </Form.Item>
        <Form.Item {...addIngreToDishForm.itemDefinitions.unit}>
            <Select
                showSearch
                filterOption={(inputValue, option) => {
                    if (!option?.children) return false;
                    return option?.children?.toString().toLowerCase().includes(inputValue.toLowerCase());
                }}
                style={{ width: '100%' }}>
                {ingredientUnits.map(unit => <Option key={unit} value={unit}>{unit}</Option>)}
            </Select>
        </Form.Item>

        <Stack fullwidth justify="flex-end">
            <Button onClick={_onSave}>Save</Button>
        </Stack>
    </Form>
}