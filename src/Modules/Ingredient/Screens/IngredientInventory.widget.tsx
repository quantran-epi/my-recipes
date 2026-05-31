import { MinusOutlined, PlusOutlined } from "@ant-design/icons";
import { Button } from "@components/Button";
import { Option, Select } from "@components/Form/Select";
import { Stack } from "@components/Layout/Stack";
import { Typography } from "@components/Typography";
import { Ingredient, IngredientUnit, INGREDIENT_UNITS } from "@store/Models/Ingredient";
import { setInventory } from "@store/Reducers/InventoryReducer";
import { selectInventoryById } from "@store/Selectors";
import { InputNumber } from "antd";
import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";

type IngredientInventoryWidgetProps = {
    item: Ingredient;
    onDone?: () => void;
}

export const IngredientInventoryWidget: React.FC<IngredientInventoryWidgetProps> = ({ item, onDone }) => {
    const dispatch = useDispatch();
    const inventory = useSelector(selectInventoryById(item.id));
    const [amount, setAmount] = useState<number>(inventory?.amount ?? 0);
    const [unit, setUnit] = useState<IngredientUnit>(inventory?.unit ?? "g");

    const _onSave = () => {
        dispatch(setInventory({
            ingredientId: item.id,
            inventory: { amount, unit, lastUpdated: new Date() }
        }));
        onDone?.();
    };

    const _nudge = (delta: number) => {
        setAmount(prev => Math.max(0, prev + delta));
    };

    return (
        <div>
            <Typography.Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 10 }}>
                Cập nhật lượng tồn kho cho <Typography.Text strong>{item.name}</Typography.Text>
            </Typography.Text>

            <Stack gap={8} align="center" style={{ marginBottom: 16 }}>
                <Button icon={<MinusOutlined />} onClick={() => _nudge(-1)} size="small" />
                <InputNumber
                    min={0}
                    value={amount}
                    onChange={v => setAmount(v ?? 0)}
                    style={{ width: 90 }}
                    size="middle"
                />
                <Button icon={<PlusOutlined />} onClick={() => _nudge(1)} size="small" />
                <Select value={unit} onChange={v => setUnit(v)} style={{ width: 80 }} size="middle">
                    {INGREDIENT_UNITS.map(u => <Option key={u} value={u}>{u}</Option>)}
                </Select>
            </Stack>
            <Button type="primary" fullwidth onClick={_onSave}>Lưu</Button>
        </div>
    );
};
