import { ObjectPropertyHelper } from "@common/Helpers/ObjectProperty"
import { Button } from "@components/Button"
import { Checkbox } from "@components/Form/Checkbox"
import { Input } from "@components/Form/Input"
import { Option, Select } from "@components/Form/Select"
import { Stack } from "@components/Layout/Stack"
import { useMessage } from "@components/Message"
import { SmartForm, useSmartForm } from "@components/SmartForm"
import { nanoid } from "@reduxjs/toolkit"
import { INGREDIENT_CATEGORIES, INGREDIENT_PRESERVATION_OPTIONS, INGREDIENT_SHELF_LIFE_OPTIONS, Ingredient, IngredientNutritionInfo, IngredientPriceEstimate, IngredientUnit } from "@store/Models/Ingredient"
import { addIngredient } from "@store/Reducers/IngredientReducer"
import { IngredientUnitHelper } from "@common/Helpers/IngredientUnitHelper"
import { IngredientPriceHelper } from "@common/Helpers/IngredientPriceHelper"
import { IngredientNutritionHelper } from "@common/Helpers/IngredientNutritionHelper"
import { IngredientUnitRulesEditor } from "./IngredientUnitRulesEditor"
import { IngredientPriceEstimateEditor } from "./IngredientPriceEstimateEditor"
import { IngredientNutritionEditor } from "./IngredientNutritionEditor"
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
    const [priceEstimate, setPriceEstimate] = useState<Partial<IngredientPriceEstimate>>(() => ({ amount: 1, unit: "kg" as IngredientUnit, currency: "VND" }));
    const [nutrition, setNutrition] = useState<Partial<IngredientNutritionInfo>>(() => ({ amount: 100, unit: "g" }));

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
            priceEstimate: undefined,
            nutrition: undefined,
        },
        onSubmit: (values) => {
            const error = IngredientUnitHelper.validateRules(values.transformValues);
            if (error) {
                message.error(error);
                return;
            }
            const priceError = IngredientPriceHelper.validatePriceEstimate(priceEstimate);
            if (priceError) {
                message.error(priceError);
                return;
            }
            const nutritionError = IngredientNutritionHelper.validateNutrition(nutrition);
            if (nutritionError) {
                message.error(nutritionError);
                return;
            }
            dispatch(addIngredient(values.transformValues));
            message.success("Đã thêm nguyên liệu");
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
            priceEstimate: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.priceEstimate), noMarkup: true },
            nutrition: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.nutrition), noMarkup: true },
        }),
        transformFunc: (values) => ({
            ...values,
            id: values.name.concat(nanoid(10)),
            baseUnit,
            inventoryUnits: uniqueUnits([...inventoryUnits, baseUnit]),
            recipeUnitConversions: IngredientUnitHelper.normalizeRecipeConversions(baseUnit, recipeUnits, conversionValues),
            priceEstimate: IngredientPriceHelper.normalizePriceEstimate(priceEstimate),
            nutrition: IngredientNutritionHelper.normalizeNutrition(nutrition, baseUnit),
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
        <IngredientPriceEstimateEditor
            value={priceEstimate}
            unitOptions={uniqueUnits([...inventoryUnits, baseUnit])}
            onChange={setPriceEstimate}
        />
        <IngredientNutritionEditor
            value={nutrition}
            unitOptions={uniqueUnits([...recipeUnits, ...inventoryUnits, baseUnit])}
            onChange={setNutrition}
        />
        <Stack fullwidth justify="flex-end">
            <Button onClick={_onSave}>Lưu</Button>
        </Stack>
    </SmartForm>
}
