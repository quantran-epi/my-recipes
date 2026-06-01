import { Typography } from "@components/Typography";
import { Option, Select } from "@components/Form/Select";
import { IngredientUnit, INGREDIENT_UNITS } from "@store/Models/Ingredient";
import { Divider, InputNumber } from "antd";
import React from "react";

type IngredientUnitRulesEditorProps = {
    baseUnit: IngredientUnit;
    inventoryUnits: IngredientUnit[];
    recipeUnits: IngredientUnit[];
    conversions: Partial<Record<IngredientUnit, number>>;
    onBaseUnitChange: (unit: IngredientUnit) => void;
    onInventoryUnitsChange: (units: IngredientUnit[]) => void;
    onRecipeUnitsChange: (units: IngredientUnit[]) => void;
    onConversionChange: (unit: IngredientUnit, value: number) => void;
}

export const IngredientUnitRulesEditor: React.FC<IngredientUnitRulesEditorProps> = ({
    baseUnit,
    inventoryUnits,
    recipeUnits,
    conversions,
    onBaseUnitChange,
    onInventoryUnitsChange,
    onRecipeUnitsChange,
    onConversionChange,
}) => {
    const recipeUnitsWithBase = Array.from(new Set([...recipeUnits, baseUnit]));

    const fieldStyle: React.CSSProperties = { marginBottom: 12, width: "100%" };
    const labelStyle: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 };

    return <div style={{ width: "100%", minWidth: 0 }}>
        <Divider style={{ margin: "8px 0 12px" }} />

        <div style={fieldStyle}>
            <Typography.Text style={labelStyle}>Base unit</Typography.Text>
            <Select value={baseUnit} onChange={onBaseUnitChange} style={{ width: "100%" }}>
                {INGREDIENT_UNITS.map(unit => <Option key={unit} value={unit}>{unit}</Option>)}
            </Select>
        </div>

        <div style={fieldStyle}>
            <Typography.Text style={labelStyle}>Inventory units</Typography.Text>
            <Select
                mode="multiple"
                maxTagCount="responsive"
                value={inventoryUnits}
                onChange={onInventoryUnitsChange}
                style={{ width: "100%" }}
            >
                {INGREDIENT_UNITS.map(unit => <Option key={unit} value={unit}>{unit}</Option>)}
            </Select>
        </div>

        <div style={fieldStyle}>
            <Typography.Text style={labelStyle}>Recipe units</Typography.Text>
            <Select
                mode="multiple"
                maxTagCount="responsive"
                value={recipeUnitsWithBase}
                onChange={onRecipeUnitsChange}
                style={{ width: "100%" }}
            >
                {INGREDIENT_UNITS.map(unit => <Option key={unit} value={unit}>{unit}</Option>)}
            </Select>
        </div>

        <div style={{ ...fieldStyle, marginBottom: 4 }}>
            <Typography.Text style={labelStyle}>Conversions to base unit</Typography.Text>
            <div style={{ maxHeight: 190, overflowY: "auto", paddingRight: 4 }}>
                {recipeUnitsWithBase.map(unit => (
                    <div
                        key={unit}
                        style={{
                            display: "grid",
                            gridTemplateColumns: "54px minmax(0, 1fr) 44px",
                            alignItems: "center",
                            gap: 8,
                            marginBottom: 6,
                            width: "100%",
                        }}
                    >
                        <Typography.Text style={{ fontSize: 12, whiteSpace: "nowrap" }}>1 {unit}</Typography.Text>
                        <InputNumber
                            min={0.0001}
                            disabled={unit === baseUnit}
                            value={unit === baseUnit ? 1 : conversions[unit]}
                            onChange={value => onConversionChange(unit, value ?? 0)}
                            style={{ width: "100%" }}
                        />
                        <Typography.Text style={{ fontSize: 12, whiteSpace: "nowrap" }}>{baseUnit}</Typography.Text>
                    </div>
                ))}
            </div>
        </div>
    </div>
}
