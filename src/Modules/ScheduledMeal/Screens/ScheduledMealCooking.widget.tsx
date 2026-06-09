import { CheckCircleOutlined, FireOutlined, RestOutlined } from '@ant-design/icons';
import { DishServingHelper } from '@common/Helpers/DishServingHelper';
import { Button } from '@components/Button';
import { Box } from '@components/Layout/Box';
import { Stack } from '@components/Layout/Stack';
import { useMessage } from '@components/Message';
import { DeferredModalContent, Modal } from '@components/Modal';
import { Typography } from '@components/Typography';
import { CookingSessionWidget } from '@modules/Dishes/Screens/CookingSession.widget';
import { Dishes } from '@store/Models/Dishes';
import { addLeftoverTrackerItem } from '@store/Reducers/AppContextReducer';
import { startCooking } from '@store/Reducers/CookingSessionReducer';
import { selectCookingSessions, selectDishes, selectDishesById, selectSelectedHouseholdMembers } from '@store/Selectors';
import { Input, InputNumber, Select, Switch } from 'antd';
import dayjs from 'dayjs';
import { nanoid } from 'nanoid';
import React, { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

export const getScheduledMealDishIds = (dishIds: string[]): string[] => Array.from(new Set(dishIds.filter(Boolean)));

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
    onClose: () => void;
}

export const ScheduledMealCookingModal: React.FC<ScheduledMealCookingModalProps> = ({ open, title, dishIds, dishServings, onClose }) => {
    const dispatch = useDispatch();
    const allDishes = useSelector(selectDishes);
    const dishesById = useSelector(selectDishesById);
    const sessions = useSelector(selectCookingSessions);
    const selectedMembers = useSelector(selectSelectedHouseholdMembers);
    const [focusedDishId, setFocusedDishId] = useState<string>();
    const [cookingOpen, setCookingOpen] = useState(false);
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
        const force = finishedDishIds.has(dishId) && !hasActive;
        if (!hasActive) _startDish(dishId, force);
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
                        if (!dish) return null;
                        return <Box key={dishId} style={{ width: '100%', boxSizing: 'border-box', border: '1px solid rgba(15,23,42,0.08)', borderRadius: 8, background: '#fff', padding: 10 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 12, alignItems: 'center' }}>
                                <div style={{ minWidth: 0 }}>
                                    <Typography.Text strong style={{ display: 'block', color: '#111827', lineHeight: '19px', overflowWrap: 'anywhere' }}>{dish.name}</Typography.Text>
                                    <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '17px', marginTop: 2 }}>{statusLabel}{dishServings?.[dishId] ? ` · ${dishServings[dishId]} phần` : ''}</Typography.Text>
                                </div>
                                <Button icon={<FireOutlined />} onClick={() => _openDish(dishId)} style={{ minWidth: 104 }}>
                                    {session ? 'Tiếp tục' : finished ? 'Nấu lại' : 'Bắt đầu'}
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
    </React.Fragment>;
};

type MealCompletionLeftoverModalProps = {
    open: boolean;
    title: string;
    dishIds: string[];
    onClose: () => void;
}

type LeftoverDishDraft = {
    enabled: boolean;
    portions: number;
    eatInDays: number;
    note: string;
}

export const MealCompletionLeftoverModal: React.FC<MealCompletionLeftoverModalProps> = ({ open, title, dishIds, onClose }) => {
    const dispatch = useDispatch();
    const message = useMessage();
    const dishesById = useSelector(selectDishesById);
    const uniqueDishIds = useMemo(() => getScheduledMealDishIds(dishIds), [dishIds]);
    const [drafts, setDrafts] = useState<Record<string, LeftoverDishDraft>>({});

    React.useEffect(() => {
        if (!open) return;
        setDrafts(Object.fromEntries(uniqueDishIds.map(id => [id, { enabled: false, portions: 1, eatInDays: 2, note: '' }])));
    }, [open, uniqueDishIds]);

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
        message.success(saved > 0 ? `Đã lưu ${saved} món còn lại` : 'Đã hoàn tất bữa ăn');
        onClose();
    };

    const enabledCount = uniqueDishIds.filter(dishId => drafts[dishId]?.enabled).length;

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
                    </Box>;
                })}
                <Button fullwidth type='primary' icon={<CheckCircleOutlined />} onClick={_save}>{enabledCount > 0 ? `Lưu ${enabledCount} món còn lại` : 'Hoàn tất, không còn dư'}</Button>
            </div>}
        </DeferredModalContent>
    </Modal>;
};
