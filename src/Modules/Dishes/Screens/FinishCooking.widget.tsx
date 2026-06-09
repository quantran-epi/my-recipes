import { CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import { Button } from "@components/Button";
import { Stack } from "@components/Layout/Stack";
import { useMessage } from "@components/Message";
import { Tag } from "@components/Tag";
import { Typography } from "@components/Typography";
import { CookingSession, CookingSessionMemberFeedback } from "@store/Models/CookingSession";
import { InventoryHelper } from "@common/Helpers/InventoryHelper";
import { IngredientUnitHelper } from "@common/Helpers/IngredientUnitHelper";
import { cancelCooking, finishCooking, setCookingMemberFeedback } from "@store/Reducers/CookingSessionReducer";
import { deductInventory } from "@store/Reducers/InventoryReducer";
import { selectDishes, selectDishesById, selectHouseholdMembers, selectIngredientsById, selectInventory, selectInventoryHealthConfig } from "@store/Selectors";
import moment from "moment";
import 'moment/locale/vi';
import React, { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Select } from "antd";

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
    const householdMembers = useSelector(selectHouseholdMembers);
    const [memberFeedback, setMemberFeedback] = useState<Record<string, CookingSessionMemberFeedback>>(session.memberFeedback ?? {});

    const dish = dishesById.get(session.dishId);
    const sessionIngredientStatusById = useMemo(() => new Map((session.ingredients ?? []).map(item => [item.ingredientId, item.status])), [session.ingredients]);
    const sessionMemberIdSet = useMemo(() => new Set(session.householdMemberIds ?? []), [session.householdMemberIds]);
    const cookingMembers = useMemo(() => householdMembers.filter(member => sessionMemberIdSet.has(member.id)), [householdMembers, sessionMemberIdSet]);

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
            .filter(([id]) => inventoryItems[id] != null
                && !InventoryHelper.isAlwaysAvailable(ingredientsById.get(id))
                && sessionIngredientStatusById.get(id) !== 'skipped')
            .map(([id, { total, unit, name }]) => ({ id, total, unit, name }));
    }, [dish, allDishes, ingredientsById, inventoryItems, session.targetServings, sessionIngredientStatusById]);

    const _onFinish = () => {
        deductions.forEach(d => dispatch(deductInventory({
            ingredientId: d.id,
            amount: d.total,
            unit: d.unit as any,
            ingredient: ingredientsById.get(d.id),
            inventoryConfig,
        })));
        Object.entries(memberFeedback).forEach(([memberId, feedback]) => {
            dispatch(setCookingMemberFeedback({ sessionId: session.id, memberId, feedback }));
        });
        dispatch(finishCooking(session.id));
        message.success("Đã hoàn thành phiên nấu");
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

        {cookingMembers.length > 0 && <div style={{ margin: '12px 0', padding: 10, border: '1px solid #d6e4ff', borderRadius: 8, background: '#f8fbff' }}>
            <Typography.Text strong style={{ display: 'block', fontSize: 13 }}>Mọi người thấy sao?</Typography.Text>
            <Stack direction="column" style={{ gap: 7, marginTop: 8 }}>
                {cookingMembers.map(member => <div key={member.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 132px', gap: 8, alignItems: 'center' }}>
                    <Typography.Text style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.name}</Typography.Text>
                    <Select
                        size="small"
                        value={memberFeedback[member.id]}
                        placeholder="Chọn"
                        onChange={(value) => setMemberFeedback(current => ({ ...current, [member.id]: value }))}
                        options={[
                            { value: 'liked', label: 'Thích' },
                            { value: 'neutral', label: 'Bình thường' },
                            { value: 'disliked', label: 'Không hợp' },
                        ]}
                    />
                </div>)}
            </Stack>
        </div>}

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
