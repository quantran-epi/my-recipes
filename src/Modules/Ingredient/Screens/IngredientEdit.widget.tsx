import { ObjectPropertyHelper } from "@common/Helpers/ObjectProperty"
import { Button } from "@components/Button"
import { Checkbox } from "@components/Form/Checkbox"
import { Input } from "@components/Form/Input"
import { Option, Select } from "@components/Form/Select"
import { Stack } from "@components/Layout/Stack"
import { useMessage } from "@components/Message"
import { SmartForm, useSmartForm } from "@components/SmartForm"
import { INGREDIENT_CATEGORIES, INGREDIENT_PRESERVATION_OPTIONS, INGREDIENT_SHELF_LIFE_OPTIONS, Ingredient, IngredientPriceEstimate, IngredientUnit } from "@store/Models/Ingredient"
import { editIngredient } from "@store/Reducers/IngredientReducer"
import { IngredientUnitHelper } from "@common/Helpers/IngredientUnitHelper"
import { IngredientPriceHelper } from "@common/Helpers/IngredientPriceHelper"
import { IngredientUnitRulesEditor } from "./IngredientUnitRulesEditor"
import { IngredientPriceEstimateEditor } from "./IngredientPriceEstimateEditor"
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
    const [priceEstimate, setPriceEstimate] = useState<Partial<IngredientPriceEstimate>>(() => item.priceEstimate ?? {
        amount: 1,
        unit: IngredientUnitHelper.getBaseUnit(item),
        currency: "VND",
    });

    const editIngredientForm = useSmartForm<Ingredient>({
        defaultValues: {
            category: "",
            shelfLife: undefined,
            preservationCondition: undefined,
            alwaysAvailable: false,
            ...item,
            baseUnit,
            inventoryUnits,
            recipeUnitConversions: conversionValues,
            priceEstimate: item.priceEstimate,
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
                message.error(`Không thể xóa đơn vị đang được sử dụng: ${invalidUnits.join(", ")}`);
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
            preservationCondition: { label: "Điều kiện bảo quản", name: ObjectPropertyHelper.nameof(defaultValues, e => e.preservationCondition) },
            alwaysAvailable: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.alwaysAvailable), valuePropName: "checked" },
            baseUnit: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.baseUnit), noMarkup: true },
            inventoryUnits: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.inventoryUnits), noMarkup: true },
            recipeUnitConversions: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.recipeUnitConversions), noMarkup: true },
            priceEstimate: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.priceEstimate), noMarkup: true },
        }),
        transformFunc: (values) => ({
            ...values,
            baseUnit,
            inventoryUnits: uniqueUnits([...inventoryUnits, baseUnit]),
            recipeUnitConversions: IngredientUnitHelper.normalizeRecipeConversions(baseUnit, recipeUnits, conversionValues),
            priceEstimate: IngredientPriceHelper.normalizePriceEstimate(priceEstimate),
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
        <SmartForm.Item {...editIngredientForm.itemDefinitions.preservationCondition}>
            <Select allowClear placeholder="Chọn điều kiện bảo quản" style={{ width: '100%' }}>
                {INGREDIENT_PRESERVATION_OPTIONS.map(opt => (
                    <Option key={opt.value} value={opt.value}>{opt.label} — {opt.description}</Option>
                ))}
            </Select>
        </SmartForm.Item>
        <SmartForm.Item {...editIngredientForm.itemDefinitions.alwaysAvailable}>
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
        <Stack fullwidth justify="flex-end">
            <Button onClick={_onSave}>Lưu</Button>
        </Stack>
    </SmartForm>
}
