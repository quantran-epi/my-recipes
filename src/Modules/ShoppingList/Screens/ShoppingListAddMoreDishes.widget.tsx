import { ObjectPropertyHelper } from "@common/Helpers/ObjectProperty";
import { Button } from "@components/Button";
import { Option, Select } from "@components/Form/Select";
import { Stack } from "@components/Layout/Stack";
import { SmartForm, useSmartForm } from "@components/SmartForm";
import { ShoppingList } from "@store/Models/ShoppingList";
import { ShoppingListAddDishesParams, addDishesToShoppingList } from "@store/Reducers/ShoppingListReducer";
import { RootState } from "@store/Store";
import { Input } from "antd";
import { useDispatch, useSelector } from "react-redux";

type ShoppingListAddMoreDishesWidgetProps = {
    shoppingList: ShoppingList;
    onDone: () => void;
}

export const ShoppingListAddMoreDishesWidget: React.FunctionComponent<ShoppingListAddMoreDishesWidgetProps> = (props) => {
    const dispatch = useDispatch();
    const dishes = useSelector((state: RootState) => state.dishes.dishes);

    const addDishesToShoppingListForm = useSmartForm<ShoppingListAddDishesParams>({
        defaultValues: {
            dishesIds: props.shoppingList.dishes,
            shoppingList: props.shoppingList
        },
        onSubmit: (values) => {
            dispatch(addDishesToShoppingList(values.transformValues));
            addDishesToShoppingListForm.reset();
            props.onDone();
        },
        itemDefinitions: defaultValues => ({
            dishesIds: { label: "Chọn món ăn", name: ObjectPropertyHelper.nameof(defaultValues, e => e.dishesIds) },
            shoppingList: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.shoppingList), noMarkup: true },
        }),
    })

    const _onSave = () => {
        addDishesToShoppingListForm.submit();
    }

    return <SmartForm {...addDishesToShoppingListForm.defaultProps}>
        <SmartForm.Item label="Lịch mua sắm">
            <Input value={addDishesToShoppingListForm.getValues().shoppingList.name} disabled />
        </SmartForm.Item>
        <SmartForm.Item {...addDishesToShoppingListForm.itemDefinitions.dishesIds}>
            <Select
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
        <Stack fullwidth justify="flex-end">
            <Button onClick={_onSave}>Lưu</Button>
        </Stack>
    </SmartForm>
}