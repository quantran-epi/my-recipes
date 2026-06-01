import { ObjectPropertyHelper } from "@common/Helpers/ObjectProperty"
import { Button } from "@components/Button"
import { Input } from "@components/Form/Input"
import { Option, Select } from "@components/Form/Select"
import { Stack } from "@components/Layout/Stack"
import { useMessage } from "@components/Message"
import { SmartForm, useSmartForm } from "@components/SmartForm"
import { INGREDIENT_CATEGORIES, INGREDIENT_SHELF_LIFE_OPTIONS, Ingredient, IngredientUnit } from "@store/Models/Ingredient"
import { editIngredient } from "@store/Reducers/IngredientReducer"
import { IngredientUnitHelper } from "@common/Helpers/IngredientUnitHelper"
import { IngredientUnitRulesEditor } from "./IngredientUnitRulesEditor"
import { RootState } from "@store/Store"
import { useState } from "react"
import { useDispatch, useSelector } from "react-redux"

const uniqueUnits = (units: IngredientUnit[]): IngredientUnit[] => Array.from(new Set(units));

export const IngredientEditWidget = ({ item, onDone }) => {
    const dispatch = useDispatch();
    const message = useMessage();
    const dishes = useSelector((state: RootState) => state.shared.dishes.dishes);
    const inventory = useSelector((state: RootState) => state.personal.inventory.items[item.id]);
    const [baseUnit, setBaseUnit] = useState<IngredientUnit>(() => IngredientUnitHelper.getBaseUnit(item));
    const [inventoryUnits, setInventoryUnits] = useState<IngredientUnit[]>(() => IngredientUnitHelper.getInventoryUnits(item));
    const [recipeUnits, setRecipeUnits] = useState<IngredientUnit[]>(() => IngredientUnitHelper.getRecipeUnits(item));
    const [conversionValues, setConversionValues] = useState<Partial<Record<IngredientUnit, number>>>(() =>
        IngredientUnitHelper.getRecipeUnitConversions(item)
    );

    const editIngredientForm = useSmartForm<Ingredient>({
        defaultValues: {
            category: "",
            shelfLife: undefined,
            ...item,
            baseUnit,
            inventoryUnits,
            recipeUnitConversions: conversionValues,
        },
        onSubmit: (values) => {
            const error = IngredientUnitHelper.validateRules(values.transformValues);
            if (error) {
                message.error(error);
                return;
            }

            const nextRecipeUnits = IngredientUnitHelper.getRecipeUnits(values.transformValues);
            const usedRecipeUnits = uniqueUnits(dishes.flatMap(dish =>
                dish.ingredients.filter(ingre => ingre.ingredientId === item.id).map(ingre => ingre.unit)
            ));
            const removedRecipeUnits = usedRecipeUnits.filter(unit => !nextRecipeUnits.includes(unit));

            const usedInventoryUnits = uniqueUnits((inventory?.batches ?? [])
                .map(batch => IngredientUnitHelper.getBatchUnit(inventory, batch, item)));
            if (!inventory?.batches && (inventory as any)?.amount > 0 && inventory?.unit) usedInventoryUnits.push(inventory.unit);
            const removedInventoryUnits = usedInventoryUnits.filter(unit => !values.transformValues.inventoryUnits?.includes(unit));

            const invalidUnits = uniqueUnits([...removedRecipeUnits, ...removedInventoryUnits]);
            if (invalidUnits.length > 0) {
                message.error(`Cannot remove units currently in use: ${invalidUnits.join(", ")}`);
                return;
            }

            dispatch(editIngredient(values.transformValues));
            message.success();
            onDone?.();
        },
        itemDefinitions: defaultValues => ({
            id: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.id), noMarkup: true },
            name: { label: "Tên nguyên liệu", name: ObjectPropertyHelper.nameof(defaultValues, e => e.name) },
            category: { label: "Nhóm", name: ObjectPropertyHelper.nameof(defaultValues, e => e.category) },
            shelfLife: { label: "Thời hạn bảo quản", name: ObjectPropertyHelper.nameof(defaultValues, e => e.shelfLife) },
            baseUnit: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.baseUnit), noMarkup: true },
            inventoryUnits: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.inventoryUnits), noMarkup: true },
            recipeUnitConversions: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.recipeUnitConversions), noMarkup: true },
        }),
        transformFunc: (values) => ({
            ...values,
            baseUnit,
            inventoryUnits: uniqueUnits([...inventoryUnits, baseUnit]),
            recipeUnitConversions: IngredientUnitHelper.normalizeRecipeConversions(baseUnit, recipeUnits, conversionValues),
        })
    })

    const _onBaseUnitChange = (unit: IngredientUnit) => {
        setBaseUnit(unit);
        setInventoryUnits(prev => uniqueUnits([...prev, unit]));
        setRecipeUnits(prev => uniqueUnits([...prev, unit]));
        setConversionValues(prev => IngredientUnitHelper.normalizeRecipeConversions(unit, uniqueUnits([...recipeUnits, unit]), prev));
    }

    const _onInventoryUnitsChange = (units: IngredientUnit[]) => {
        setInventoryUnits(uniqueUnits([...units, baseUnit]));
    }

    const _onRecipeUnitsChange = (units: IngredientUnit[]) => {
        const nextUnits = uniqueUnits([...units, baseUnit]);
        setRecipeUnits(nextUnits);
        setConversionValues(prev => IngredientUnitHelper.normalizeRecipeConversions(baseUnit, nextUnits, prev));
    }

    const _onConversionChange = (unit: IngredientUnit, value: number) => {
        setConversionValues(prev => ({ ...prev, [unit]: value }));
    }

    const _onSave = () => {
        editIngredientForm.submit();
    }

    return <SmartForm {...editIngredientForm.defaultProps}>
        <SmartForm.Item {...editIngredientForm.itemDefinitions.name}>
            <Input placeholder="Nhập tên" autoFocus />
        </SmartForm.Item>
        <SmartForm.Item {...editIngredientForm.itemDefinitions.category}>
            <Select allowClear placeholder="Chọn nhóm" style={{ width: '100%' }}>
                {INGREDIENT_CATEGORIES.map(cat => <Option key={cat} value={cat}>{cat}</Option>)}
            </Select>
        </SmartForm.Item>
        <SmartForm.Item {...editIngredientForm.itemDefinitions.shelfLife}>
            <Select allowClear placeholder="Chọn thời hạn bảo quản" style={{ width: '100%' }}>
                {INGREDIENT_SHELF_LIFE_OPTIONS.map(opt => (
                    <Option key={opt.value} value={opt.value}>
                        {opt.emoji} {opt.label} — {opt.description}
                    </Option>
                ))}
            </Select>
        </SmartForm.Item>
        <IngredientUnitRulesEditor
            baseUnit={baseUnit}
            inventoryUnits={inventoryUnits}
            recipeUnits={recipeUnits}
            conversions={conversionValues}
            onBaseUnitChange={_onBaseUnitChange}
            onInventoryUnitsChange={_onInventoryUnitsChange}
            onRecipeUnitsChange={_onRecipeUnitsChange}
            onConversionChange={_onConversionChange}
        />
        <Stack fullwidth justify="flex-end">
            <Button onClick={_onSave}>Lưu</Button>
        </Stack>
    </SmartForm>
}
