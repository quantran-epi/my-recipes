import { CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import { Button } from "@components/Button";
import { Stack } from "@components/Layout/Stack";
import { useMessage } from "@components/Message";
import { Tag } from "@components/Tag";
import { Typography } from "@components/Typography";
import { CookingSession } from "@store/Models/CookingSession";
import { InventoryHelper } from "@common/Helpers/InventoryHelper";
import { IngredientUnitHelper } from "@common/Helpers/IngredientUnitHelper";
import { addLeftoverTrackerItem } from "@store/Reducers/AppContextReducer";
import { cancelCooking, finishCooking } from "@store/Reducers/CookingSessionReducer";
import { deductInventory } from "@store/Reducers/InventoryReducer";
import { selectDishes, selectDishesById, selectIngredientsById, selectInventory, selectInventoryHealthConfig } from "@store/Selectors";
import moment from "moment";
import 'moment/locale/vi';
import { nanoid } from "nanoid";
import React, { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { InputNumber, Select } from "antd";

import { DishServingHelper } from '@common/Helpers/DishServingHelper';

type FinishCookingWidgetProps = {
    session: CookingSession;
    onDone: () => void;
}

export const FinishCookingWidget: React.FunctionComponent<FinishCookingWidgetProps> = ({ session, onDone }) => {
    const dispatch = useDispatch();
    const message = useMessage();
    const allDishes = useSelector(selectDishes);
    const dishesById = useSelector(selectDishesById);
    const ingredientsById = useSelector(selectIngredientsById);
    const inventoryItems = useSelector(selectInventory);
    const inventoryConfig = useSelector(selectInventoryHealthConfig);
    const [leftoverPortions, setLeftoverPortions] = useState<number>(0);
    const [eatInDays, setEatInDays] = useState<number>(2);

    const dish = dishesById.get(session.dishId);

    const deductions = useMemo(() => {
        if (!dish) return [];
        const amounts = DishServingHelper.collectIngredientAmounts(dish, allDishes, { targetServings: session.targetServings });
        const grouped: Record<string, { total: number; unit: string; name: string }> = {};
        amounts.forEach(amt => {
            const ingre = ingredientsById.get(amt.ingredientId);
            const baseUnit = IngredientUnitHelper.getBaseUnit(ingre, [amt.unit]);
            const val = IngredientUnitHelper.toBaseAmount(ingre, amt.amount, amt.unit, baseUnit) ?? IngredientUnitHelper.parseAmount(amt.amount);
            if (!grouped[amt.ingredientId]) {
                grouped[amt.ingredientId] = { total: 0, unit: baseUnit, name: ingre?.name ?? amt.ingredientId };
            }
            grouped[amt.ingredientId].total += val;
        });
        return Object.entries(grouped)
            .filter(([id]) => inventoryItems[id] != null && !InventoryHelper.isAlwaysAvailable(ingredientsById.get(id)))
            .map(([id, { total, unit, name }]) => ({ id, total, unit, name }));
    }, [dish, allDishes, ingredientsById, inventoryItems, session.targetServings]);

    const _onFinish = () => {
        deductions.forEach(d => dispatch(deductInventory({
            ingredientId: d.id,
            amount: d.total,
            unit: d.unit as any,
            ingredient: ingredientsById.get(d.id),
            inventoryConfig,
        })));
        if (leftoverPortions > 0) {
            dispatch(addLeftoverTrackerItem({
                id: nanoid(10),
                dishId: session.dishId,
                dishName: session.dishName,
                portions: leftoverPortions,
                storedAt: new Date().toISOString(),
                eatBy: moment().add(eatInDays, 'day').endOf('day').toISOString(),
                cookingSessionId: session.id,
                status: 'available',
            }));
        }
        dispatch(finishCooking(session.id));
        message.success(leftoverPortions > 0 ? "Đã lưu món còn lại" : "Đã hoàn thành phiên nấu");
        onDone();
    };

    const _onCancel = () => {
        dispatch(cancelCooking(session.id));
        message.success("Đã hủy phiên nấu");
        onDone();
    };

    const startedAt = moment(session.startedAt).locale("vi").fromNow();

    return <React.Fragment>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Bắt đầu {startedAt}
        </Typography.Text>

        <div style={{ margin: '12px 0' }}>
            <Typography.Text strong style={{ fontSize: 13 }}>Nguyên liệu sẽ được trừ khỏi tồn kho:</Typography.Text>
            {deductions.length === 0 && (
                <Typography.Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                    Không có nguyên liệu nào có tồn kho để trừ.
                </Typography.Text>
            )}
            {deductions.map(d => (
                <div key={d.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '5px 0', borderBottom: '1px solid rgba(5,5,5,0.04)'
                }}>
                    <Typography.Text>{d.name}</Typography.Text>
                    <Tag color="orange" style={{ marginInlineEnd: 0 }}>−{d.total}{d.unit}</Tag>
                </div>
            ))}
        </div>

        <div style={{ margin: '12px 0', padding: 10, border: '1px solid #e8f5e9', borderRadius: 8, background: '#f6ffed' }}>
            <Typography.Text strong style={{ display: 'block', fontSize: 13 }}>Còn món sau bữa?</Typography.Text>
            <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12, lineHeight: '17px', marginTop: 2 }}>
                Lưu lại để nhớ ăn trước khi món không còn ngon.
            </Typography.Text>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 150px', gap: 8, alignItems: 'center', marginTop: 9 }}>
                <InputNumber
                    min={0}
                    max={99}
                    step={0.5}
                    value={leftoverPortions}
                    addonAfter="phần"
                    onChange={(value) => setLeftoverPortions(Number(value ?? 0))}
                    style={{ width: '100%' }}
                />
                <Select
                    value={eatInDays}
                    onChange={setEatInDays}
                    options={[
                        { value: 1, label: 'Ăn ngày mai' },
                        { value: 2, label: 'Trong 2 ngày' },
                        { value: 3, label: 'Trong 3 ngày' },
                        { value: 5, label: 'Trong 5 ngày' },
                    ]}
                />
            </div>
        </div>

        <Stack direction="column" style={{ gap: 8, marginTop: 12 }}>
            <Button fullwidth icon={<CloseCircleOutlined />} danger onClick={_onCancel}>
                Hủy (không trừ tồn kho)
            </Button>
            <Button fullwidth type="primary" icon={<CheckCircleOutlined />} onClick={_onFinish}>
                Hoàn thành & trừ tồn kho
            </Button>
        </Stack>
    </React.Fragment>;
};
