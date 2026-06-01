import { ObjectPropertyHelper } from "@common/Helpers/ObjectProperty"
import { Button } from "@components/Button"
import { Checkbox } from "@components/Form/Checkbox"
import { Input } from "@components/Form/Input"
import { Option, Select } from "@components/Form/Select"
import { Stack } from "@components/Layout/Stack"
import { useMessage } from "@components/Message"
import { SmartForm, useSmartForm } from "@components/SmartForm"
import { nanoid } from "@reduxjs/toolkit"
import { INGREDIENT_CATEGORIES, INGREDIENT_PRESERVATION_OPTIONS, INGREDIENT_SHELF_LIFE_OPTIONS, Ingredient, IngredientUnit } from "@store/Models/Ingredient"
import { addIngredient } from "@store/Reducers/IngredientReducer"
import { IngredientUnitHelper } from "@common/Helpers/IngredientUnitHelper"
import { IngredientUnitRulesEditor } from "./IngredientUnitRulesEditor"
import { useState } from "react"
import { useDispatch } from "react-redux"

const uniqueUnits = (units: IngredientUnit[]): IngredientUnit[] => Array.from(new Set(units));

export const IngredientAddWidget = () => {
    const dispatch = useDispatch();
    const message = useMessage();
    const [baseUnit, setBaseUnit] = useState<IngredientUnit>("g");
    const [inventoryUnits, setInventoryUnits] = useState<IngredientUnit[]>(["g", "kg"]);
    const [recipeUnits, setRecipeUnits] = useState<IngredientUnit[]>(["g", "kg"]);
    const [conversionValues, setConversionValues] = useState<Partial<Record<IngredientUnit, number>>>(() =>
        IngredientUnitHelper.normalizeRecipeConversions("g", ["g", "kg"], {})
    );

    const addIngredientForm = useSmartForm<Ingredient>({
        defaultValues: {
            id: "",
            name: "",
            category: "",
            shelfLife: undefined,
            preservationCondition: undefined,
            alwaysAvailable: false,
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
            dispatch(addIngredient(values.transformValues));
            message.success();
            addIngredientForm.reset();
        },
        itemDefinitions: defaultValues => ({
            id: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.id), noMarkup: true },
            name: { label: "Tên nguyên liệu", name: ObjectPropertyHelper.nameof(defaultValues, e => e.name) },
            category: { label: "Nhóm", name: ObjectPropertyHelper.nameof(defaultValues, e => e.category) },
            shelfLife: { label: "Thời hạn bảo quản", name: ObjectPropertyHelper.nameof(defaultValues, e => e.shelfLife) },
            preservationCondition: { label: "Điều kiện bảo quản", name: ObjectPropertyHelper.nameof(defaultValues, e => e.preservationCondition) },
            alwaysAvailable: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.alwaysAvailable), valuePropName: "checked" },
            baseUnit: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.baseUnit), noMarkup: true },
            inventoryUnits: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.inventoryUnits), noMarkup: true },
            recipeUnitConversions: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.recipeUnitConversions), noMarkup: true },
        }),
        transformFunc: (values) => ({
            ...values,
            id: values.name.concat(nanoid(10)),
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
        addIngredientForm.submit();
    }

    return <SmartForm {...addIngredientForm.defaultProps}>
        <SmartForm.Item {...addIngredientForm.itemDefinitions.name}>
            <Input placeholder="Nhập tên" autoFocus />
        </SmartForm.Item>
        <SmartForm.Item {...addIngredientForm.itemDefinitions.category}>
            <Select allowClear placeholder="Chọn nhóm" style={{ width: '100%' }}>
                {INGREDIENT_CATEGORIES.map(cat => <Option key={cat} value={cat}>{cat}</Option>)}
            </Select>
        </SmartForm.Item>
        <SmartForm.Item {...addIngredientForm.itemDefinitions.shelfLife}>
            <Select allowClear placeholder="Chọn thời hạn bảo quản" style={{ width: '100%' }}>
                {INGREDIENT_SHELF_LIFE_OPTIONS.map(opt => (
                    <Option key={opt.value} value={opt.value}>
                        {opt.emoji} {opt.label} — {opt.description}
                    </Option>
                ))}
            </Select>
        </SmartForm.Item>
        <SmartForm.Item {...addIngredientForm.itemDefinitions.preservationCondition}>
            <Select allowClear placeholder="Chọn điều kiện bảo quản" style={{ width: '100%' }}>
                {INGREDIENT_PRESERVATION_OPTIONS.map(opt => (
                    <Option key={opt.value} value={opt.value}>{opt.label} — {opt.description}</Option>
                ))}
            </Select>
        </SmartForm.Item>
        <SmartForm.Item {...addIngredientForm.itemDefinitions.alwaysAvailable}>
            <Checkbox>Luôn có sẵn, không cần quản lý tồn kho</Checkbox>
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
