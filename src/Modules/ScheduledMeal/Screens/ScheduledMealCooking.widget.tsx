import { CheckCircleOutlined, EyeOutlined, FireOutlined, RestOutlined } from '@ant-design/icons';
import { DishDurationHelper } from '@common/Helpers/DishDurationHelper';
import { DishServingHelper } from '@common/Helpers/DishServingHelper';
import { Button } from '@components/Button';
import { Box } from '@components/Layout/Box';
import { Stack } from '@components/Layout/Stack';
import { useMessage } from '@components/Message';
import { DeferredModalContent, Modal } from '@components/Modal';
import { Tag } from '@components/Tag';
import { Typography } from '@components/Typography';
import { CookingSessionWidget } from '@modules/Dishes/Screens/CookingSession.widget';
import { Dishes } from '@store/Models/Dishes';
import { CookingMealFeedbackHistoryRecord, CookingMealFeedbackSlot, CookingSessionMemberFeedback } from '@store/Models/CookingSession';
import { addLeftoverTrackerItem, consumeDishServings, DishServingKind } from '@store/Reducers/AppContextReducer';
import { saveMealFeedbackHistory, startCooking } from '@store/Reducers/CookingSessionReducer';
import { selectAvailableServingsByDishKind, selectCookingSessions, selectDishFeedbackHistory, selectDishes, selectDishesById, selectLeftoverTrackerItems, selectSelectedHouseholdMembers } from '@store/Selectors';
import { Input, InputNumber, Segmented, Select, Switch } from 'antd';
import dayjs from 'dayjs';
import { nanoid } from 'nanoid';
import React, { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { HouseholdMemberPicker } from '@modules/ScheduledMeal/Components/HouseholdMemberPicker';

export const getScheduledMealDishIds = (dishIds: string[]): string[] => Array.from(new Set(dishIds.filter(Boolean)));

const getMealDateKey = (value?: Date | string) => dayjs(value ?? new Date()).format('YYYY-MM-DD');

const feedbackOptions: Array<{ value: CookingSessionMemberFeedback; label: string }> = [
    { value: 'liked', label: 'Thích' },
    { value: 'neutral', label: 'Bình thường' },
    { value: 'disliked', label: 'Không hợp' },
];

const feedbackLabelByValue: Record<CookingSessionMemberFeedback, string> = feedbackOptions.reduce((result, option) => ({
    ...result,
    [option.value]: option.label,
}), {} as Record<CookingSessionMemberFeedback, string>);

const feedbackColorByValue: Record<CookingSessionMemberFeedback, string> = {
    liked: 'green',
    neutral: 'blue',
    disliked: 'volcano',
};

const findMealFeedbackRecord = (
    history: CookingMealFeedbackHistoryRecord[],
    dishId: string,
    context: { scheduledMealId?: string; mealSlot?: CookingMealFeedbackSlot; mealDate?: Date | string; mealTitle?: string },
): CookingMealFeedbackHistoryRecord | undefined => {
    const mealDate = getMealDateKey(context.mealDate);
    return history.find(record => {
        if (context.scheduledMealId && context.mealSlot) {
            return record.scheduledMealId === context.scheduledMealId
                && record.mealSlot === context.mealSlot
                && record.dishId === dishId;
        }
        if (context.scheduledMealId) {
            return record.scheduledMealId === context.scheduledMealId
                && record.dishId === dishId
                && record.mealDate === mealDate;
        }
        return record.dishId === dishId
            && record.mealDate === mealDate
            && (!context.mealTitle || record.mealTitle === context.mealTitle);
    });
};

const collectAllSteps = (dish: Dishes, dishesById: Map<string, Dishes>, visited = new Set<string>()): string[] => {
    if (visited.has(dish.id)) return [];
    visited.add(dish.id);
    const includedSteps = (dish.includeDishes ?? []).flatMap(id => {
        const includedDish = dishesById.get(id);
        return includedDish ? collectAllSteps(includedDish, dishesById, visited) : [];
    });
    return [...includedSteps, ...(dish.steps ?? []).map(step => step.content).filter(Boolean)];
};

type ScheduledMealCookingModalProps = {
    open: boolean;
    title: string;
    dishIds: string[];
    dishServings?: Record<string, number>;
    autoStartToken?: number;
    scheduledMealId?: string;
    mealSlot?: CookingMealFeedbackSlot;
    mealDate?: Date | string;
    onClose: () => void;
}

export const ScheduledMealCookingModal: React.FC<ScheduledMealCookingModalProps> = ({ open, title, dishIds, dishServings, scheduledMealId, mealSlot, mealDate, onClose }) => {
    const dispatch = useDispatch();
    const allDishes = useSelector(selectDishes);
    const dishesById = useSelector(selectDishesById);
    const sessions = useSelector(selectCookingSessions);
    const selectedMembers = useSelector(selectSelectedHouseholdMembers);
    const [focusedDishId, setFocusedDishId] = useState<string>();
    const [cookingOpen, setCookingOpen] = useState(false);
    const [cookMemberIds, setCookMemberIds] = useState<string[]>(() => selectedMembers.map(member => member.id));
    const [feedbackOpen, setFeedbackOpen] = useState(false);
    const [feedbackScope, setFeedbackScope] = useState<{ title: string; dishIds: string[] }>({ title: '', dishIds: [] });
    const uniqueDishIds = useMemo(() => getScheduledMealDishIds(dishIds), [dishIds]);
    const activeSessionByDishId = useMemo(() => new Map(sessions.filter(session => session.status === 'cooking').map(session => [session.dishId, session])), [sessions]);
    const finishedDishIds = useMemo(() => new Set(sessions.filter(session => session.status === 'finished').map(session => session.dishId)), [sessions]);

    const _startDish = React.useCallback((dishId: string, force = false) => {
        const dish = dishesById.get(dishId);
        if (!dish) return;
        if (!force && (activeSessionByDishId.has(dishId) || finishedDishIds.has(dishId))) return;
        const targetServings = dishServings?.[dishId] ?? DishServingHelper.getBaseServings(dish);
        const timerPhases = DishDurationHelper.getActiveItems(dish.duration)
            .map(item => ({ phaseKey: item.phase.key, plannedMinutes: item.minutes }));
        dispatch(startCooking({
            dishId: dish.id,
            dishName: dish.name,
            baseServings: DishServingHelper.getBaseServings(dish),
            targetServings,
            steps: collectAllSteps(dish, dishesById),
            ingredientIds: Array.from(new Set(DishServingHelper.collectIngredientAmounts(dish, allDishes, { targetServings }).map(item => item.ingredientId))),
            householdMemberIds: cookMemberIds,
            timerPhases,
        }));
    }, [activeSessionByDishId, allDishes, cookMemberIds, dishServings, dishesById, dispatch, finishedDishIds]);

    const _openDish = (dishId: string) => {
        const hasActive = activeSessionByDishId.has(dishId);
        const finished = finishedDishIds.has(dishId) && !hasActive;
        if (finished) {
            const dish = dishesById.get(dishId);
            setFeedbackScope({ title: `Phản hồi món - ${dish?.name ?? 'Đã nấu'}`, dishIds: [dishId] });
            setFeedbackOpen(true);
            return;
        }
        if (!hasActive) _startDish(dishId);
        setFocusedDishId(dishId);
        setCookingOpen(true);
    };

    // Re-seed the cook selection from the global selection each time the modal opens, so the
    // pre-fill stays convenient while still letting the user change who is cooking this meal.
    React.useEffect(() => {
        if (!open) return;
        setCookMemberIds(selectedMembers.map(member => member.id));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const focusedDish = focusedDishId ? dishesById.get(focusedDishId) : undefined;

    return <React.Fragment>
        <Modal
            open={open}
            title={<Stack align='center' gap={8}><FireOutlined style={{ color: '#fa8c16' }} />{title}</Stack>}
            onCancel={onClose}
            footer={null}
            destroyOnClose={false}
            width='min(900px, calc(100vw - 24px))'
            style={{ top: 34 }}
            bodyStyle={{ width: '100%', boxSizing: 'border-box' }}
        >
            <DeferredModalContent active={open} minHeight={260}>
                {uniqueDishIds.length === 0 ? <Box style={{ textAlign: 'center', padding: '26px 0' }}>
                    <Typography.Text type='secondary'>Bữa này chưa có món để nấu.</Typography.Text>
                </Box> : <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
                    <HouseholdMemberPicker value={cookMemberIds} onChange={setCookMemberIds} label='Người nấu cho bữa này' />
                    {uniqueDishIds.map(dishId => {
                        const dish = dishesById.get(dishId);
                        const session = activeSessionByDishId.get(dishId);
                        const finished = finishedDishIds.has(dishId);
                        const statusLabel = session?.steps?.length
                            ? `Đang nấu · bước ${(session.currentStepIndex ?? 0) + 1}/${session.steps.length}`
                            : session ? 'Đang nấu' : finished ? 'Đã xong' : 'Chưa bắt đầu';
                        const actionStyle: React.CSSProperties = session
                            ? { minWidth: 104, background: '#1677ff', borderColor: '#1677ff', color: '#fff', boxShadow: '0 8px 18px rgba(22,119,255,0.20)' }
                            : finished
                                ? { minWidth: 104, color: '#389e0d', borderColor: 'rgba(56,158,13,0.35)', background: '#f6ffed' }
                                : { minWidth: 104, color: '#fa8c16', borderColor: 'rgba(250,140,22,0.42)', background: '#fff7e6' };
                        if (!dish) return null;
                        return <Box key={dishId} style={{ width: '100%', boxSizing: 'border-box', border: '1px solid rgba(15,23,42,0.08)', borderRadius: 8, background: '#fff', padding: 10 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 12, alignItems: 'center' }}>
                                <div style={{ minWidth: 0 }}>
                                    <Typography.Text strong style={{ display: 'block', color: '#111827', lineHeight: '19px', overflowWrap: 'anywhere' }}>{dish.name}</Typography.Text>
                                    <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '17px', marginTop: 2 }}>{statusLabel}{dishServings?.[dishId] ? ` · ${dishServings[dishId]} phần` : ''}</Typography.Text>
                                </div>
                                <Button type={session ? 'primary' : 'default'} icon={finished && !session ? <EyeOutlined /> : <FireOutlined />} onClick={() => _openDish(dishId)} style={actionStyle}>
                                    {session ? 'Tiếp tục' : finished ? 'Phản hồi' : 'Bắt đầu'}
                                </Button>
                            </div>
                        </Box>;
                    })}
                </div>}
            </DeferredModalContent>
        </Modal>

        <Modal
            open={cookingOpen}
            title={<Stack align='center' gap={8}><FireOutlined style={{ color: '#fa8c16' }} />{focusedDish?.name ?? 'Đang nấu'}</Stack>}
            onCancel={() => setCookingOpen(false)}
            footer={null}
            destroyOnClose={false}
            width='min(760px, calc(100vw - 24px))'
            style={{ top: 24 }}
        >
            <DeferredModalContent active={cookingOpen} minHeight={260}>
                {focusedDish ? <CookingSessionWidget dish={focusedDish} onDone={() => setCookingOpen(false)} /> : null}
            </DeferredModalContent>
        </Modal>

        <MealCompletionLeftoverModal
            open={feedbackOpen}
            title={feedbackScope.title}
            dishIds={feedbackScope.dishIds}
            dishServings={dishServings}
            scheduledMealId={scheduledMealId}
            mealSlot={mealSlot ?? 'dish'}
            mealDate={mealDate}
            onClose={() => setFeedbackOpen(false)}
        />
    </React.Fragment>;
};

type MealCompletionLeftoverModalProps = {
    open: boolean;
    title: string;
    dishIds: string[];
    dishServings?: Record<string, number>;
    scheduledMealId?: string;
    mealSlot?: CookingMealFeedbackSlot;
    mealDate?: Date | string;
    readonly?: boolean;
    onClose: () => void;
}

type LeftoverDishDraft = {
    enabled: boolean;
    portions: number;
    eatInDays: number;
    note: string;
}

export const MealCompletionLeftoverModal: React.FC<MealCompletionLeftoverModalProps> = ({ open, title, dishIds, dishServings, scheduledMealId, mealSlot, mealDate, readonly, onClose }) => {
    const dispatch = useDispatch();
    const message = useMessage();
    const dishesById = useSelector(selectDishesById);
    const members = useSelector(selectSelectedHouseholdMembers);
    const feedbackHistory = useSelector(selectDishFeedbackHistory);
    const leftoverItems = useSelector(selectLeftoverTrackerItems);
    const servingsByDishKind = useSelector(selectAvailableServingsByDishKind);
    const uniqueDishIds = useMemo(() => getScheduledMealDishIds(dishIds), [dishIds]);
    const mealDateKey = useMemo(() => getMealDateKey(mealDate), [mealDate]);
    const mealDateValue = useMemo(() => dayjs(mealDateKey), [mealDateKey]);
    const mealLeftovers = useMemo(() => leftoverItems.filter(item => {
        if (scheduledMealId && item.scheduledMealId === scheduledMealId) {
            return mealSlot ? item.mealSlot === mealSlot : true;
        }
        // Fallback for older records: match by date + dish ids in scope.
        const dishSet = new Set(uniqueDishIds);
        return dishSet.has(item.dishId) && item.mealDate === mealDateKey;
    }), [leftoverItems, mealDateKey, mealSlot, scheduledMealId, uniqueDishIds]);
    const [drafts, setDrafts] = useState<Record<string, LeftoverDishDraft>>({});
    const [feedback, setFeedback] = useState<Record<string, Record<string, CookingSessionMemberFeedback>>>({});
    const [consumeKind, setConsumeKind] = useState<Record<string, DishServingKind>>({});
    const [consumeCount, setConsumeCount] = useState<Record<string, number>>({});

    const availableForKind = React.useCallback((dishId: string, kind: DishServingKind): number => {
        const stock = servingsByDishKind.get(dishId);
        if (!stock) return 0;
        return kind === 'fresh' ? stock.fresh : stock.leftover;
    }, [servingsByDishKind]);

    React.useEffect(() => {
        if (!open) return;
        setDrafts(Object.fromEntries(uniqueDishIds.map(id => [id, { enabled: false, portions: 1, eatInDays: 2, note: '' }])));
        setFeedback(Object.fromEntries(uniqueDishIds.map(id => {
            const record = findMealFeedbackRecord(feedbackHistory, id, { scheduledMealId, mealSlot, mealDate, mealTitle: title });
            return [id, record?.memberFeedback ?? {}];
        })));
        const nextConsumeKind: Record<string, DishServingKind> = {};
        const nextConsumeCount: Record<string, number> = {};
        uniqueDishIds.forEach(id => {
            const stock = servingsByDishKind.get(id);
            if (!stock || (stock.fresh <= 0 && stock.leftover <= 0)) return;
            const kind: DishServingKind = stock.fresh > 0 ? 'fresh' : 'leftover';
            const available = kind === 'fresh' ? stock.fresh : stock.leftover;
            const dish = dishesById.get(id);
            const defaultServings = dishServings?.[id] ?? DishServingHelper.getBaseServings(dish);
            nextConsumeKind[id] = kind;
            nextConsumeCount[id] = Math.min(available, defaultServings);
        });
        setConsumeKind(nextConsumeKind);
        setConsumeCount(nextConsumeCount);
    }, [dishServings, dishesById, feedbackHistory, mealDate, mealDateValue, mealSlot, members, open, scheduledMealId, servingsByDishKind, title, uniqueDishIds]);

    const _setFeedback = (dishId: string, memberId: string, value?: CookingSessionMemberFeedback) => {
        setFeedback(current => ({
            ...current,
            [dishId]: Object.fromEntries(Object.entries({ ...(current[dishId] ?? {}), [memberId]: value }).filter(([, reaction]) => Boolean(reaction))) as Record<string, CookingSessionMemberFeedback>,
        }));
    };

    const _updateDraft = (dishId: string, patch: Partial<LeftoverDishDraft>) => {
        setDrafts(current => ({
            ...current,
            [dishId]: {
                enabled: false,
                portions: 1,
                eatInDays: 2,
                note: '',
                ...(current[dishId] ?? {}),
                ...patch,
            },
        }));
    };

    const _setConsumeKind = (dishId: string, kind: DishServingKind) => {
        setConsumeKind(current => ({ ...current, [dishId]: kind }));
        setConsumeCount(current => {
            const available = availableForKind(dishId, kind);
            const previous = current[dishId] ?? 0;
            return { ...current, [dishId]: Math.min(available, previous > 0 ? previous : available) };
        });
    };

    const _setConsumeCount = (dishId: string, value: number) => {
        const kind = consumeKind[dishId] ?? 'leftover';
        const available = availableForKind(dishId, kind);
        const next = Number.isFinite(value) && value > 0 ? Math.min(available, value) : 0;
        setConsumeCount(current => ({ ...current, [dishId]: next }));
    };

    const _save = () => {
        let saved = 0;
        uniqueDishIds.forEach(dishId => {
            const dish = dishesById.get(dishId);
            const draft = drafts[dishId];
            if (!dish || !draft?.enabled || draft.portions <= 0) return;
            dispatch(addLeftoverTrackerItem({
                id: nanoid(10),
                dishId: dish.id,
                dishName: dish.name,
                portions: draft.portions,
                storedAt: new Date().toISOString(),
                eatBy: dayjs().add(draft.eatInDays, 'day').endOf('day').toISOString(),
                note: draft.note.trim() || undefined,
                status: 'available',
                scheduledMealId,
                mealSlot,
                mealDate: mealDateKey,
                mealTitle: title,
            }));
            saved += 1;
        });
        // Save editable per-meal feedback history and keep per-dish aggregate feedback in sync.
        let rated = 0;
        uniqueDishIds.forEach(dishId => {
            const dish = dishesById.get(dishId);
            if (!dish) return;
            const memberFeedback = feedback[dishId] ?? {};
            rated += Object.keys(memberFeedback).length;
            dispatch(saveMealFeedbackHistory({
                scheduledMealId,
                mealSlot,
                mealDate: mealDateKey,
                mealTitle: title,
                dishId,
                dishName: dish.name,
                memberFeedback,
            }));
        });
        // Draw down the dish serving inventory for the chosen kind (fresh vs leftover).
        let totalConsumed = 0;
        uniqueDishIds.forEach(dishId => {
            const kind = consumeKind[dishId];
            if (!kind) return;
            const requested = Number(consumeCount[dishId] ?? 0);
            if (!Number.isFinite(requested) || requested <= 0) return;
            const available = availableForKind(dishId, kind);
            if (available <= 0) return;
            const portions = Math.min(requested, available);
            if (portions <= 0) return;
            dispatch(consumeDishServings({ dishId, portions, kind }));
            totalConsumed += portions;
        });
        const parts: string[] = [];
        if (saved > 0) parts.push(`${saved} món còn lại`);
        if (totalConsumed > 0) parts.push(`${totalConsumed} phần đã dùng`);
        if (rated > 0) parts.push(`${rated} phản hồi`);
        message.success(parts.length > 0 ? `Đã lưu ${parts.join(' · ')}` : 'Đã hoàn tất bữa ăn');
        onClose();
    };

    const enabledCount = uniqueDishIds.filter(dishId => drafts[dishId]?.enabled).length;
    const memberNameById = useMemo(() => new Map(members.map(member => [member.id, member.name])), [members]);
    const renderFeedbackTags = (dishId: string) => {
        const entries = Object.entries(feedback[dishId] ?? {}) as [string, CookingSessionMemberFeedback][];
        if (entries.length === 0) return <Typography.Text type='secondary' style={{ fontSize: 12 }}>Chưa có phản hồi đã lưu</Typography.Text>;
        return <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
            {entries.map(([memberId, reaction]) => <div key={`${dishId}-${memberId}`} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 8, alignItems: 'center', width: '100%' }}>
                <Typography.Text style={{ minWidth: 0, color: '#111827', fontSize: 13, lineHeight: '18px', overflowWrap: 'anywhere' }}>{memberNameById.get(memberId) ?? 'Thành viên'}</Typography.Text>
                <Tag color={feedbackColorByValue[reaction]} style={{ marginRight: 0, flexShrink: 0 }}>{feedbackLabelByValue[reaction]}</Tag>
            </div>)}
        </div>;
    };

    return <Modal
        open={open}
        title={<Stack align='center' gap={8}><RestOutlined style={{ color: '#52c41a' }} />{title}</Stack>}
        onCancel={onClose}
        footer={null}
        destroyOnClose
        width='min(660px, calc(100vw - 24px))'
        bodyStyle={{ width: '100%', boxSizing: 'border-box' }}
    >
        <DeferredModalContent active={open} minHeight={180}>
            {uniqueDishIds.length === 0 ? <Box style={{ textAlign: 'center', padding: '24px 0' }}>
                <Typography.Text type='secondary'>Không có món để lưu phần còn lại.</Typography.Text>
            </Box> : readonly ? <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
                {uniqueDishIds.map(dishId => {
                    const dish = dishesById.get(dishId);
                    if (!dish) return null;
                    return <Box key={dishId} style={{ width: '100%', boxSizing: 'border-box', border: '1px solid rgba(15,23,42,0.08)', borderRadius: 8, background: '#fff', padding: 10 }}>
                        <Typography.Text strong style={{ display: 'block', color: '#111827', lineHeight: '19px', overflowWrap: 'anywhere' }}>{dish.name}</Typography.Text>
                        <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '17px', marginTop: 2 }}>Bữa này đã hoàn tất. Phản hồi chỉ xem, không chỉnh sửa.</Typography.Text>
                        <div style={{ marginTop: 8 }}>{renderFeedbackTags(dishId)}</div>
                    </Box>;
                })}
                {mealLeftovers.length > 0 && <Box style={{ width: '100%', boxSizing: 'border-box', border: '1px solid rgba(82,196,26,0.20)', borderRadius: 8, background: '#f6ffed', padding: 10 }}>
                    <Stack align='center' gap={6} style={{ marginBottom: 8 }}>
                        <RestOutlined style={{ color: '#52c41a' }} />
                        <Typography.Text strong style={{ color: '#135200', fontSize: 13, lineHeight: '18px' }}>Phần còn lại đã ghi nhận</Typography.Text>
                    </Stack>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7, width: '100%' }}>
                        {mealLeftovers.map(leftover => {
                            const eatBy = leftover.eatBy ? dayjs(leftover.eatBy) : null;
                            const statusLabel = leftover.status === 'finished' ? 'Đã ăn hết' : leftover.status === 'discarded' ? 'Đã bỏ' : 'Còn';
                            const statusColor = leftover.status === 'finished' ? 'default' : leftover.status === 'discarded' ? 'red' : 'green';
                            return <Box key={leftover.id} style={{ width: '100%', boxSizing: 'border-box', border: '1px solid rgba(15,23,42,0.06)', borderRadius: 6, background: '#fff', padding: 9 }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 8, alignItems: 'flex-start', width: '100%' }}>
                                    <div style={{ minWidth: 0 }}>
                                        <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 13, lineHeight: '18px', overflowWrap: 'anywhere' }}>{leftover.dishName}</Typography.Text>
                                        <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '17px', marginTop: 2 }}>
                                            {leftover.portions} phần{eatBy ? ` · ăn trước ${eatBy.format('DD/MM')}` : ''}
                                        </Typography.Text>
                                        {leftover.note && <Typography.Text style={{ display: 'block', color: '#475569', fontSize: 12, lineHeight: '17px', marginTop: 4, overflowWrap: 'anywhere' }}>{leftover.note}</Typography.Text>}
                                    </div>
                                    <Tag color={statusColor} style={{ marginRight: 0, flexShrink: 0 }}>{statusLabel}</Tag>
                                </div>
                            </Box>;
                        })}
                    </div>
                </Box>}
                <Button fullwidth onClick={onClose}>Đóng</Button>
            </div> : <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
                {uniqueDishIds.map(dishId => {
                    const dish = dishesById.get(dishId);
                    const draft = drafts[dishId] ?? { enabled: false, portions: 1, eatInDays: 2, note: '' };
                    if (!dish) return null;
                    return <Box key={dishId} style={{ width: '100%', boxSizing: 'border-box', border: '1px solid rgba(15,23,42,0.08)', borderRadius: 8, background: '#fff', padding: 10 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 10, alignItems: 'center', width: '100%' }}>
                            <Typography.Text strong style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{dish.name}</Typography.Text>
                            <Switch checked={draft.enabled} checkedChildren='Còn' unCheckedChildren='Hết' onChange={checked => _updateDraft(dishId, { enabled: checked })} />
                        </div>
                        {draft.enabled && <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(140px, 170px)', gap: 8, marginTop: 10 }}>
                            <div>
                                <Typography.Text strong style={{ display: 'block', fontSize: 12, marginBottom: 5 }}>Số phần còn</Typography.Text>
                                <InputNumber min={0.5} max={99} step={0.5} value={draft.portions} addonAfter='phần' onChange={value => _updateDraft(dishId, { portions: Number(value ?? 0) })} style={{ width: '100%' }} />
                            </div>
                            <div>
                                <Typography.Text strong style={{ display: 'block', fontSize: 12, marginBottom: 5 }}>Ăn trước</Typography.Text>
                                <Select value={draft.eatInDays} onChange={value => _updateDraft(dishId, { eatInDays: value })} options={[{ value: 1, label: 'Ngày mai' }, { value: 2, label: '2 ngày' }, { value: 3, label: '3 ngày' }, { value: 5, label: '5 ngày' }]} style={{ width: '100%' }} />
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <Typography.Text strong style={{ display: 'block', fontSize: 12, marginBottom: 5 }}>Ghi chú</Typography.Text>
                                <Input.TextArea value={draft.note} onChange={event => _updateDraft(dishId, { note: event.target.value })} placeholder='Ví dụ: để hộp ngăn mát, phần cho bữa trưa mai...' autoSize={{ minRows: 2, maxRows: 4 }} />
                            </div>
                        </div>}
                        {(() => {
                            const stock = servingsByDishKind.get(dishId);
                            if (!stock || (stock.fresh <= 0 && stock.leftover <= 0)) return null;
                            const bothKinds = stock.fresh > 0 && stock.leftover > 0;
                            const chosenKind: DishServingKind = consumeKind[dishId] ?? (stock.fresh > 0 ? 'fresh' : 'leftover');
                            const maxForKind = availableForKind(dishId, chosenKind);
                            const count = consumeCount[dishId] ?? 0;
                            return <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed rgba(82,196,26,0.4)' }}>
                                <Stack align='center' gap={6} style={{ marginBottom: 6 }}>
                                    <RestOutlined style={{ color: '#52c41a' }} />
                                    <Typography.Text strong style={{ display: 'block', fontSize: 12 }}>Dùng từ kho phần ăn</Typography.Text>
                                </Stack>
                                <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, marginBottom: 6 }}>
                                    Còn {stock.fresh} phần mới nấu · {stock.leftover} phần dư
                                </Typography.Text>
                                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(120px, 150px)', gap: 8, alignItems: 'flex-end' }}>
                                    <div style={{ minWidth: 0 }}>
                                        <Typography.Text strong style={{ display: 'block', fontSize: 12, marginBottom: 5 }}>Loại phần dùng</Typography.Text>
                                        {bothKinds ? (
                                            <Segmented
                                                value={chosenKind}
                                                onChange={value => _setConsumeKind(dishId, value as DishServingKind)}
                                                options={[{ label: 'Mới nấu', value: 'fresh' }, { label: 'Phần dư', value: 'leftover' }]}
                                                block
                                            />
                                        ) : (
                                            <Tag color={chosenKind === 'fresh' ? 'volcano' : 'gold'} style={{ marginInlineEnd: 0 }}>{chosenKind === 'fresh' ? 'Mới nấu' : 'Phần dư'}</Tag>
                                        )}
                                    </div>
                                    <div>
                                        <Typography.Text strong style={{ display: 'block', fontSize: 12, marginBottom: 5 }}>Số phần dùng</Typography.Text>
                                        <InputNumber min={0} max={maxForKind} step={0.5} value={count} addonAfter='phần' onChange={value => _setConsumeCount(dishId, Number(value ?? 0))} style={{ width: '100%' }} />
                                    </div>
                                </div>
                            </div>;
                        })()}
                        {members.length > 0 && <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(15,23,42,0.06)' }}>
                            <Typography.Text strong style={{ display: 'block', fontSize: 12, marginBottom: 6 }}>Mọi người thấy sao?</Typography.Text>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                                {members.map(member => <div key={member.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 132px', gap: 8, alignItems: 'center' }}>
                                    <Typography.Text style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.name}</Typography.Text>
                                    <Select
                                        size='small'
                                        allowClear
                                        value={feedback[dishId]?.[member.id]}
                                        placeholder='Chọn'
                                        style={{ width: '100%' }}
                                        onChange={value => _setFeedback(dishId, member.id, value)}
                                        options={feedbackOptions}
                                    />
                                </div>)}
                            </div>
                        </div>}
                    </Box>;
                })}
                <Button fullwidth type='primary' icon={<CheckCircleOutlined />} onClick={_save}>{enabledCount > 0 ? `Lưu ${enabledCount} món còn lại` : 'Hoàn tất, không còn dư'}</Button>
            </div>}
        </DeferredModalContent>
    </Modal>;
};
