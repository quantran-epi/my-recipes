import { CheckCircleOutlined, EyeOutlined, FireOutlined, HistoryOutlined, RestOutlined } from '@ant-design/icons';
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
import { addLeftoverTrackerItem } from '@store/Reducers/AppContextReducer';
import { saveMealFeedbackHistory, startCooking } from '@store/Reducers/CookingSessionReducer';
import { selectCookingSessions, selectDishFeedbackHistory, selectDishes, selectDishesById, selectSelectedHouseholdMembers } from '@store/Selectors';
import { DatePicker, Empty, Input, InputNumber, Select, Switch } from 'antd';
import dayjs from 'dayjs';
import { nanoid } from 'nanoid';
import React, { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

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
        dispatch(startCooking({
            dishId: dish.id,
            dishName: dish.name,
            baseServings: DishServingHelper.getBaseServings(dish),
            targetServings,
            steps: collectAllSteps(dish, dishesById),
            ingredientIds: Array.from(new Set(DishServingHelper.collectIngredientAmounts(dish, allDishes, { targetServings }).map(item => item.ingredientId))),
            householdMemberIds: selectedMembers.map(member => member.id),
        }));
    }, [activeSessionByDishId, allDishes, dishServings, dishesById, dispatch, finishedDishIds, selectedMembers]);

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
    scheduledMealId?: string;
    mealSlot?: CookingMealFeedbackSlot;
    mealDate?: Date | string;
    onClose: () => void;
}

type LeftoverDishDraft = {
    enabled: boolean;
    portions: number;
    eatInDays: number;
    note: string;
}

export const MealCompletionLeftoverModal: React.FC<MealCompletionLeftoverModalProps> = ({ open, title, dishIds, scheduledMealId, mealSlot, mealDate, onClose }) => {
    const dispatch = useDispatch();
    const message = useMessage();
    const dishesById = useSelector(selectDishesById);
    const members = useSelector(selectSelectedHouseholdMembers);
    const feedbackHistory = useSelector(selectDishFeedbackHistory);
    const uniqueDishIds = useMemo(() => getScheduledMealDishIds(dishIds), [dishIds]);
    const mealDateKey = useMemo(() => getMealDateKey(mealDate), [mealDate]);
    const mealDateValue = useMemo(() => dayjs(mealDateKey), [mealDateKey]);
    const [drafts, setDrafts] = useState<Record<string, LeftoverDishDraft>>({});
    const [feedback, setFeedback] = useState<Record<string, Record<string, CookingSessionMemberFeedback>>>({});
    const [historyMemberId, setHistoryMemberId] = useState<string>();
    const [historyDate, setHistoryDate] = useState(() => mealDateValue);

    React.useEffect(() => {
        if (!open) return;
        setDrafts(Object.fromEntries(uniqueDishIds.map(id => [id, { enabled: false, portions: 1, eatInDays: 2, note: '' }])));
        setFeedback(Object.fromEntries(uniqueDishIds.map(id => {
            const record = findMealFeedbackRecord(feedbackHistory, id, { scheduledMealId, mealSlot, mealDate, mealTitle: title });
            return [id, record?.memberFeedback ?? {}];
        })));
        setHistoryDate(mealDateValue);
        setHistoryMemberId(current => current && members.some(member => member.id === current) ? current : members[0]?.id);
    }, [feedbackHistory, mealDate, mealDateValue, mealSlot, members, open, scheduledMealId, title, uniqueDishIds]);

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
        const parts: string[] = [];
        if (saved > 0) parts.push(`${saved} món còn lại`);
        if (rated > 0) parts.push(`${rated} phản hồi`);
        message.success(parts.length > 0 ? `Đã lưu ${parts.join(' · ')}` : 'Đã hoàn tất bữa ăn');
        onClose();
    };

    const enabledCount = uniqueDishIds.filter(dishId => drafts[dishId]?.enabled).length;
    const memberNameById = useMemo(() => new Map(members.map(member => [member.id, member.name])), [members]);
    const historyRows = useMemo(() => {
        const selectedDateKey = historyDate.format('YYYY-MM-DD');
        return feedbackHistory
            .filter(record => record.mealDate === selectedDateKey)
            .filter(record => historyMemberId ? Boolean(record.memberFeedback?.[historyMemberId]) : Object.keys(record.memberFeedback ?? {}).length > 0)
            .slice()
            .sort((a, b) => new Date(b.updatedAt).valueOf() - new Date(a.updatedAt).valueOf());
    }, [feedbackHistory, historyDate, historyMemberId]);

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
            </Box> : <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
                {members.length > 0 && <Box style={{ width: '100%', boxSizing: 'border-box', border: '1px solid rgba(15,23,42,0.08)', borderRadius: 8, background: '#f8fafc', padding: 10 }}>
                    <Stack align='center' gap={7} style={{ marginBottom: 8 }}>
                        <HistoryOutlined style={{ color: '#1677ff' }} />
                        <Typography.Text strong style={{ color: '#111827', fontSize: 13 }}>Lịch sử phản hồi</Typography.Text>
                    </Stack>
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(132px, 160px)', gap: 8, width: '100%' }}>
                        <Select
                            value={historyMemberId}
                            onChange={setHistoryMemberId}
                            options={members.map(member => ({ value: member.id, label: member.name }))}
                            placeholder='Thành viên'
                            style={{ width: '100%' }}
                        />
                        <DatePicker value={historyDate} onChange={value => value && setHistoryDate(value)} format='DD/MM/YYYY' style={{ width: '100%' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 9 }}>
                        {historyRows.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description='Chưa có phản hồi ngày này' /> : historyRows.slice(0, 8).map(record => {
                            const selectedFeedback = historyMemberId ? record.memberFeedback?.[historyMemberId] : undefined;
                            const feedbackEntries = selectedFeedback
                                ? [[historyMemberId, selectedFeedback] as [string, CookingSessionMemberFeedback]]
                                : Object.entries(record.memberFeedback ?? {}) as [string, CookingSessionMemberFeedback][];
                            return <Box key={record.id} style={{ border: '1px solid rgba(15,23,42,0.07)', borderRadius: 8, background: '#fff', padding: 9 }}>
                                <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 13, lineHeight: '18px', overflowWrap: 'anywhere' }}>{record.dishName}</Typography.Text>
                                <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '17px', marginTop: 2 }}>{record.mealTitle ?? 'Bữa ăn'} · {dayjs(record.mealDate).format('DD/MM/YYYY')}</Typography.Text>
                                <Stack wrap='wrap' gap={5} style={{ marginTop: 7 }}>
                                    {feedbackEntries.map(([memberId, reaction]) => <Tag key={`${record.id}-${memberId}`} color={feedbackColorByValue[reaction]} style={{ marginRight: 0 }}>
                                        {memberNameById.get(memberId) ?? 'Thành viên'}: {feedbackLabelByValue[reaction]}
                                    </Tag>)}
                                </Stack>
                            </Box>;
                        })}
                    </div>
                </Box>}
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
