import { CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import { Button } from "@components/Button";
import { Stack } from "@components/Layout/Stack";
import { Tag } from "@components/Tag";
import { Typography } from "@components/Typography";
import { CookingSession } from "@store/Models/CookingSession";
import { Dishes } from "@store/Models/Dishes";
import { InventoryHelper } from "@common/Helpers/InventoryHelper";
import { IngredientUnitHelper } from "@common/Helpers/IngredientUnitHelper";
import { cancelCooking, finishCooking } from "@store/Reducers/CookingSessionReducer";
import { deductInventory } from "@store/Reducers/InventoryReducer";
import { selectDishes, selectIngredients, selectInventory } from "@store/Selectors";
import { RootState } from "@store/Store";
import { Space } from "antd";
import moment from "moment";
import 'moment/locale/vi';
import React, { useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";

import { DishServingHelper } from '@common/Helpers/DishServingHelper';

type FinishCookingWidgetProps = {
    session: CookingSession;
    onDone: () => void;
}

export const FinishCookingWidget: React.FunctionComponent<FinishCookingWidgetProps> = ({ session, onDone }) => {
    const dispatch = useDispatch();
    const allDishes = useSelector(selectDishes);
    const allIngredients = useSelector(selectIngredients);
    const inventoryItems = useSelector(selectInventory);

    const dish = allDishes.find(d => d.id === session.dishId);

    const deductions = useMemo(() => {
        if (!dish) return [];
        const amounts = DishServingHelper.collectIngredientAmounts(dish, allDishes, { targetServings: session.targetServings });
        const grouped: Record<string, { total: number; unit: string; name: string }> = {};
        amounts.forEach(amt => {
            const ingre = allIngredients.find(i => i.id === amt.ingredientId);
            const baseUnit = IngredientUnitHelper.getBaseUnit(ingre, [amt.unit]);
            const val = IngredientUnitHelper.toBaseAmount(ingre, amt.amount, amt.unit, baseUnit) ?? IngredientUnitHelper.parseAmount(amt.amount);
            if (!grouped[amt.ingredientId]) {
                grouped[amt.ingredientId] = { total: 0, unit: baseUnit, name: ingre?.name ?? amt.ingredientId };
            }
            grouped[amt.ingredientId].total += val;
        });
        return Object.entries(grouped)
            .filter(([id]) => inventoryItems[id] != null && !InventoryHelper.isAlwaysAvailable(allIngredients.find(i => i.id === id)))
            .map(([id, { total, unit, name }]) => ({ id, total, unit, name }));
    }, [dish, allDishes, allIngredients, inventoryItems, session.targetServings]);

    const _onFinish = () => {
        deductions.forEach(d => dispatch(deductInventory({
            ingredientId: d.id,
            amount: d.total,
            unit: d.unit as any,
            ingredient: allIngredients.find(i => i.id === d.id),
        })));
        dispatch(finishCooking(session.id));
        onDone();
    };

    const _onCancel = () => {
        dispatch(cancelCooking(session.id));
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
