import { CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined } from "@ant-design/icons";
import { Button } from "@components/Button";
import { Stack } from "@components/Layout/Stack";
import { useMessage } from "@components/Message";
import { useModal } from "@components/Modal/ModalProvider";
import { Tag } from "@components/Tag";
import { Typography } from "@components/Typography";
import { CookingSession } from "@store/Models/CookingSession";
import { InventoryHelper } from "@common/Helpers/InventoryHelper";
import { IngredientUnitHelper } from "@common/Helpers/IngredientUnitHelper";
import { DishDurationHelper } from "@common/Helpers/DishDurationHelper";
import { cancelCooking, finishCooking, recordCookTime } from "@store/Reducers/CookingSessionReducer";
import { updateDishDuration } from "@store/Reducers/DishesReducer";
import { deductInventory } from "@store/Reducers/InventoryReducer";
import { DishDuration, DishDurationPhaseKey } from "@store/Models/Dishes";
import { selectDishes, selectDishesById, selectIngredientsById, selectInventory, selectInventoryHealthConfig } from "@store/Selectors";
import moment from "moment";
import 'moment/locale/vi';
import React, { useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Popconfirm } from "antd";

import { DishServingHelper } from '@common/Helpers/DishServingHelper';

type FinishCookingWidgetProps = {
    session: CookingSession;
    onDone: () => void;
}

// Sits above the cooking flow's nested modals (z-index 4400) so the confirm is reachable.
const COOKING_CONFIRM_Z_INDEX = 5200;

export const FinishCookingWidget: React.FunctionComponent<FinishCookingWidgetProps> = ({ session, onDone }) => {
    const dispatch = useDispatch();
    const message = useMessage();
    const modal = useModal();
    const allDishes = useSelector(selectDishes);
    const dishesById = useSelector(selectDishesById);
    const ingredientsById = useSelector(selectIngredientsById);
    const inventoryItems = useSelector(selectInventory);
    const inventoryConfig = useSelector(selectInventoryHealthConfig);
    const dish = dishesById.get(session.dishId);
    const sessionIngredientStatusById = useMemo(() => new Map((session.ingredients ?? []).map(item => [item.ingredientId, item.status])), [session.ingredients]);

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

    // Actual cook time, derived from the live timer. Per-phase data is precise (each phase has its
    // own accumulatedSeconds); without a timer we fall back to coarse wall-clock (finish − start).
    const cookTime = useMemo(() => {
        const timer = session.timer;
        if (timer && timer.phases.length > 0) {
            // The active phase's in-progress segment isn't folded into accumulatedSeconds until
            // finishCooking dispatches, so add it here or a straight-through cook undercounts.
            const startedMs = timer.phaseStartedAt ? Date.parse(timer.phaseStartedAt) : NaN;
            const runningSeconds = (!timer.isPaused && Number.isFinite(startedMs))
                ? Math.max(0, Math.round((Date.now() - startedMs) / 1000))
                : 0;
            const phaseMinutes: Partial<Record<DishDurationPhaseKey, number>> = {};
            let totalSeconds = 0;
            timer.phases.forEach(p => {
                const seconds = p.accumulatedSeconds + (p.phaseKey === timer.activePhaseKey ? runningSeconds : 0);
                totalSeconds += seconds;
                if (seconds > 0) phaseMinutes[p.phaseKey] = Math.max(1, Math.round(seconds / 60));
            });
            const plannedMinutes = timer.phases.reduce((sum, p) => sum + p.plannedMinutes, 0);
            return {
                hasTimer: true,
                totalMinutes: Math.max(0, Math.round(totalSeconds / 60)),
                plannedMinutes,
                phaseMinutes,
            };
        }
        // wall-clock fallback (approximate — includes idle time)
        const startMs = Date.parse(session.startedAt);
        const elapsedMin = Number.isFinite(startMs) ? Math.max(0, Math.round((Date.now() - startMs) / 60000)) : 0;
        return { hasTimer: false, totalMinutes: elapsedMin, plannedMinutes: 0, phaseMinutes: undefined as Partial<Record<DishDurationPhaseKey, number>> | undefined };
    }, [session.timer, session.startedAt]);

    const cookTimeDelta = cookTime.plannedMinutes > 0 ? cookTime.totalMinutes - cookTime.plannedMinutes : 0;

    const _onFinish = () => {
        deductions.forEach(d => dispatch(deductInventory({
            ingredientId: d.id,
            amount: d.total,
            unit: d.unit as any,
            ingredient: ingredientsById.get(d.id),
            inventoryConfig,
        })));
        if (cookTime.totalMinutes > 0) {
            dispatch(recordCookTime({
                dishId: session.dishId,
                totalMinutes: cookTime.totalMinutes,
                phaseMinutes: cookTime.phaseMinutes,
            }));
        }
        dispatch(finishCooking(session.id));
        message.success("Đã hoàn thành phiên nấu");
        onDone();
    };

    const _onUpdateDuration = () => {
        if (!dish || !cookTime.phaseMinutes) return;
        const nextDuration = DishDurationHelper.normalize(cookTime.phaseMinutes as Partial<DishDuration>);
        const phaseSummary = DishDurationHelper.phases
            .filter(p => cookTime.phaseMinutes?.[p.key] != null)
            .map(p => `${p.shortLabel} ${cookTime.phaseMinutes?.[p.key]}'`)
            .join(" · ");
        modal.confirm({
            title: "Cập nhật thời lượng món?",
            content: `Thời lượng món "${dish.name}" sẽ được đặt theo lần nấu này: ${phaseSummary}. Thời lượng dự kiến cũ sẽ bị ghi đè.`,
            okText: "Cập nhật",
            cancelText: "Để sau",
            centered: true,
            zIndex: COOKING_CONFIRM_Z_INDEX,
            onOk: () => {
                dispatch(updateDishDuration({ dishId: dish.id, duration: nextDuration }));
                message.success("Đã cập nhật thời lượng món theo lần nấu này");
            },
        });
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

        {cookTime.totalMinutes > 0 && <div style={{ margin: '12px 0', padding: 10, border: '1px solid #ffe7ba', borderRadius: 8, background: '#fffbe6' }}>
            <Stack align="center" gap={6} style={{ marginBottom: 6 }}>
                <ClockCircleOutlined style={{ color: '#d46b08' }} />
                <Typography.Text strong style={{ fontSize: 13 }}>Thời gian nấu thực tế</Typography.Text>
            </Stack>
            {cookTime.hasTimer && cookTime.plannedMinutes > 0 ? (
                <Typography.Text style={{ display: 'block', fontSize: 13 }}>
                    Bạn nấu hết <Typography.Text strong>{cookTime.totalMinutes} phút</Typography.Text>
                    {' '}(dự kiến {cookTime.plannedMinutes} phút
                    {cookTimeDelta !== 0 && <Typography.Text style={{ color: cookTimeDelta > 0 ? '#cf1322' : '#389e0d' }}>, {cookTimeDelta > 0 ? '+' : ''}{cookTimeDelta}</Typography.Text>})
                </Typography.Text>
            ) : (
                <Typography.Text style={{ display: 'block', fontSize: 13 }}>
                    Khoảng <Typography.Text strong>{cookTime.totalMinutes} phút</Typography.Text> <Typography.Text type="secondary">(ước tính thô)</Typography.Text>
                </Typography.Text>
            )}
            {cookTime.hasTimer && cookTime.phaseMinutes && Object.keys(cookTime.phaseMinutes).length > 0 && (
                <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 4 }}>
                    {DishDurationHelper.phases
                        .filter(p => cookTime.phaseMinutes?.[p.key] != null)
                        .map(p => `${p.shortLabel} ${cookTime.phaseMinutes?.[p.key]}'`)
                        .join(' · ')}
                </Typography.Text>
            )}
            {cookTime.hasTimer && dish && cookTime.phaseMinutes && Object.keys(cookTime.phaseMinutes).length > 0 && (
                <Popconfirm
                    title="Cập nhật thời lượng món?"
                    description="Thời lượng hiện tại của món sẽ được thay bằng thời gian nấu thực tế lần này."
                    okText="Cập nhật"
                    cancelText="Hủy"
                    onConfirm={_onUpdateDuration}
                >
                    <Button style={{ marginTop: 10 }} fullwidth>
                        Cập nhật thời lượng
                    </Button>
                </Popconfirm>
            )}
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
