import { ObjectPropertyHelper } from "@common/Helpers/ObjectProperty"
import { Button } from "@components/Button"
import { Input, TextArea } from "@components/Form/Input"
import { Option, Select } from "@components/Form/Select"
import { Stack } from "@components/Layout/Stack"
import { useMessage } from "@components/Message"
import { SmartForm, useSmartForm } from "@components/SmartForm"
import { Dishes } from "@store/Models/Dishes"
import { editDishes } from "@store/Reducers/DishesReducer"
import { ShoppingListIngredientHelpers } from "@store/Reducers/ShoppingListReducer"
import { RootState } from "@store/Store"
import { range } from "lodash"
import { useDispatch, useSelector } from "react-redux"

export const DishesEditWidget = ({ item, onDone }) => {
    const dispatch = useDispatch();
    const message = useMessage();
    const dishes = useSelector((state: RootState) => state.dishes.dishes);

    const editDishesForm = useSmartForm<Dishes>({
        defaultValues: item,
        onSubmit: (values) => {
            if (values.transformValues.includeDishes.some(e => ShoppingListIngredientHelpers.isInclude(e, dishes, values.transformValues.id))) {
                message.error("Lỗi lặp vòng tròn");
                return;
            }

            dispatch(editDishes(values.transformValues));
            message.success();
            onDone();
        },
        itemDefinitions: defaultValues => ({
            id: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.id), noMarkup: true },
            name: { label: "Tên món ăn", name: ObjectPropertyHelper.nameof(defaultValues, e => e.name) },
            note: { label: "Ghi chú", name: ObjectPropertyHelper.nameof(defaultValues, e => e.note) },
            servingSize: { label: "Khẩu phần ăn", name: ObjectPropertyHelper.nameof(defaultValues, e => e.servingSize) },
            includeDishes: { label: "Bao gồm món", name: ObjectPropertyHelper.nameof(defaultValues, e => e.includeDishes) },
            ingredients: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.ingredients), noMarkup: true },
            steps: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.steps), noMarkup: true }
        })
    })

    const _onSave = () => {
        editDishesForm.submit();
    }

    return <SmartForm {...editDishesForm.defaultProps}>
        <SmartForm.Item {...editDishesForm.itemDefinitions.name}>
            <Input placeholder="Nhập tên" autoFocus />
        </SmartForm.Item>
        <SmartForm.Item {...editDishesForm.itemDefinitions.servingSize}>
            <Select
                showSearch
                filterOption={(inputValue, option) => {
                    if (!option?.children) return false;
                    return option?.children?.toString().toLowerCase().includes(inputValue.toLowerCase());
                }}
                style={{ width: '100%' }}>
                {range(1, 10, 1).map(servingSize => <Option key={servingSize} value={servingSize}>{servingSize} người</Option>)}
            </Select>
        </SmartForm.Item>
        <SmartForm.Item {...editDishesForm.itemDefinitions.includeDishes}>
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
        <SmartForm.Item {...editDishesForm.itemDefinitions.note}>
            <TextArea rows={5} placeholder="Ghi chú" autoFocus />
        </SmartForm.Item>
        <Stack fullwidth justify="flex-end">
            <Button onClick={_onSave}>Lưu</Button>
        </Stack>
    </SmartForm>
}