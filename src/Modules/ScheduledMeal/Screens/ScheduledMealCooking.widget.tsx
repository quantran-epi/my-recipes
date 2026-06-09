import { CheckCircleOutlined, FireOutlined, PlusOutlined, RestOutlined } from '@ant-design/icons';
import { DishServingHelper } from '@common/Helpers/DishServingHelper';
import { Button } from '@components/Button';
import { Box } from '@components/Layout/Box';
import { Stack } from '@components/Layout/Stack';
import { useMessage } from '@components/Message';
import { DeferredModalContent, Modal } from '@components/Modal';
import { Tag } from '@components/Tag';
import { Typography } from '@components/Typography';
import { CookingSessionWidget } from '@modules/Dishes/Screens/CookingSession.widget';
import { DishImageWidget } from '@modules/Dishes/Screens/DishesManageIngredient/DishImage.widget';
import { Dishes } from '@store/Models/Dishes';
import { addLeftoverTrackerItem } from '@store/Reducers/AppContextReducer';
import { startCooking } from '@store/Reducers/CookingSessionReducer';
import { selectCookingSessions, selectDishes, selectDishesById, selectSelectedHouseholdMembers } from '@store/Selectors';
import { Input, InputNumber, Select } from 'antd';
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

export const ScheduledMealCookingModal: React.FC<ScheduledMealCookingModalProps> = ({ open, title, dishIds, dishServings, autoStartToken, onClose }) => {
    const dispatch = useDispatch();
    const allDishes = useSelector(selectDishes);
    const dishesById = useSelector(selectDishesById);
    const sessions = useSelector(selectCookingSessions);
    const selectedMembers = useSelector(selectSelectedHouseholdMembers);
    const [focusedDishId, setFocusedDishId] = useState<string>();
    const [cookingOpen, setCookingOpen] = useState(false);
    const startedTokenRef = React.useRef<number | undefined>();
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

    const _startAll = React.useCallback(() => {
        uniqueDishIds.forEach(dishId => _startDish(dishId));
    }, [_startDish, uniqueDishIds]);

    React.useEffect(() => {
        if (!open || autoStartToken === undefined || startedTokenRef.current === autoStartToken) return;
        startedTokenRef.current = autoStartToken;
        _startAll();
    }, [_startAll, autoStartToken, open]);

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
            width='min(820px, calc(100vw - 24px))'
            style={{ top: 34 }}
        >
            <DeferredModalContent active={open} minHeight={260}>
                {uniqueDishIds.length === 0 ? <Box style={{ textAlign: 'center', padding: '26px 0' }}>
                    <Typography.Text type='secondary'>Bữa này chưa có món để nấu.</Typography.Text>
                </Box> : <Stack direction='column' gap={10}>
                    <Box style={{ border: '1px solid #ffe7ba', borderRadius: 8, background: '#fff7e6', padding: 10 }}>
                        <Stack justify='space-between' align='center' gap={10} wrap='wrap'>
                            <div style={{ minWidth: 0 }}>
                                <Typography.Text strong style={{ display: 'block', color: '#ad4e00' }}>{uniqueDishIds.length} món trong lượt nấu</Typography.Text>
                                <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12 }}>Mở từng món, hoàn thành món nào xong món đó. Món còn lại có thể tiếp tục sau.</Typography.Text>
                            </div>
                            <Button type='primary' icon={<FireOutlined />} onClick={_startAll} style={{ background: '#fa8c16', borderColor: '#fa8c16' }}>Bắt đầu / tiếp tục tất cả</Button>
                        </Stack>
                    </Box>

                    {uniqueDishIds.map(dishId => {
                        const dish = dishesById.get(dishId);
                        const session = activeSessionByDishId.get(dishId);
                        const finished = finishedDishIds.has(dishId);
                        const progress = session?.steps?.length
                            ? Math.round(((session.completedStepIndexes?.length ?? 0) / session.steps.length) * 100)
                            : session ? 100 : 0;
                        if (!dish) return null;
                        return <Box key={dishId} style={{ border: '1px solid rgba(15,23,42,0.08)', borderRadius: 8, background: '#fff', padding: 10 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '48px minmax(0, 1fr) auto', gap: 10, alignItems: 'center' }}>
                                <DishImageWidget src={dish.image} width={48} height={48} borderRadius={8} fallbackIconSize={24} showBrokenLabel={false} />
                                <div style={{ minWidth: 0 }}>
                                    <Typography.Text strong style={{ display: 'block', color: '#111827', lineHeight: '19px', overflowWrap: 'anywhere' }}>{dish.name}</Typography.Text>
                                    <Stack wrap='wrap' gap={5} style={{ marginTop: 5 }}>
                                        {session ? <Tag color='orange' style={{ marginRight: 0 }}>Đang nấu {progress}%</Tag> : finished ? <Tag color='green' style={{ marginRight: 0 }}>Đã xong</Tag> : <Tag style={{ marginRight: 0 }}>Chưa bắt đầu</Tag>}
                                        {dishServings?.[dishId] && <Tag color='blue' style={{ marginRight: 0 }}>{dishServings[dishId]} phần</Tag>}
                                    </Stack>
                                </div>
                                <Button icon={session ? <FireOutlined /> : finished ? <PlusOutlined /> : <FireOutlined />} onClick={() => _openDish(dishId)}>
                                    {session ? 'Tiếp tục' : finished ? 'Nấu lại' : 'Nấu'}
                                </Button>
                            </div>
                        </Box>;
                    })}
                </Stack>}
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

export const MealCompletionLeftoverModal: React.FC<MealCompletionLeftoverModalProps> = ({ open, title, dishIds, onClose }) => {
    const dispatch = useDispatch();
    const message = useMessage();
    const dishesById = useSelector(selectDishesById);
    const uniqueDishIds = useMemo(() => getScheduledMealDishIds(dishIds), [dishIds]);
    const [selectedDishId, setSelectedDishId] = useState<string>();
    const [portions, setPortions] = useState<number>(1);
    const [eatInDays, setEatInDays] = useState<number>(2);
    const [note, setNote] = useState('');

    React.useEffect(() => {
        if (!open) return;
        setSelectedDishId(current => current && uniqueDishIds.includes(current) ? current : uniqueDishIds[0]);
        setPortions(1);
        setEatInDays(2);
        setNote('');
    }, [open, uniqueDishIds]);

    const selectedDish = selectedDishId ? dishesById.get(selectedDishId) : undefined;
    const _save = () => {
        if (!selectedDish || portions <= 0) return;
        dispatch(addLeftoverTrackerItem({
            id: nanoid(10),
            dishId: selectedDish.id,
            dishName: selectedDish.name,
            portions,
            storedAt: new Date().toISOString(),
            eatBy: dayjs().add(eatInDays, 'day').endOf('day').toISOString(),
            note: note.trim() || undefined,
            status: 'available',
        }));
        message.success('Đã lưu món còn lại');
        onClose();
    };

    return <Modal
        open={open}
        title={<Stack align='center' gap={8}><RestOutlined style={{ color: '#52c41a' }} />{title}</Stack>}
        onCancel={onClose}
        footer={null}
        destroyOnClose
        width='min(560px, calc(100vw - 24px))'
    >
        <DeferredModalContent active={open} minHeight={180}>
            {uniqueDishIds.length === 0 ? <Box style={{ textAlign: 'center', padding: '24px 0' }}>
                <Typography.Text type='secondary'>Không có món để lưu phần còn lại.</Typography.Text>
            </Box> : <Stack direction='column' gap={10}>
                <div>
                    <Typography.Text strong style={{ display: 'block', fontSize: 12, marginBottom: 5 }}>Món còn lại</Typography.Text>
                    <Select value={selectedDishId} onChange={setSelectedDishId} options={uniqueDishIds.map(id => ({ value: id, label: dishesById.get(id)?.name ?? id }))} style={{ width: '100%' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 160px', gap: 8 }}>
                    <div>
                        <Typography.Text strong style={{ display: 'block', fontSize: 12, marginBottom: 5 }}>Số phần</Typography.Text>
                        <InputNumber min={0.5} max={99} step={0.5} value={portions} addonAfter='phần' onChange={value => setPortions(Number(value ?? 0))} style={{ width: '100%' }} />
                    </div>
                    <div>
                        <Typography.Text strong style={{ display: 'block', fontSize: 12, marginBottom: 5 }}>Ăn trước</Typography.Text>
                        <Select value={eatInDays} onChange={setEatInDays} options={[{ value: 1, label: 'Ngày mai' }, { value: 2, label: '2 ngày' }, { value: 3, label: '3 ngày' }, { value: 5, label: '5 ngày' }]} style={{ width: '100%' }} />
                    </div>
                </div>
                <div>
                    <Typography.Text strong style={{ display: 'block', fontSize: 12, marginBottom: 5 }}>Ghi chú</Typography.Text>
                    <Input.TextArea value={note} onChange={event => setNote(event.target.value)} placeholder='Ví dụ: để hộp ngăn mát, phần cho bữa trưa mai...' autoSize={{ minRows: 2, maxRows: 4 }} />
                </div>
                <Button fullwidth type='primary' icon={<CheckCircleOutlined />} disabled={!selectedDish || portions <= 0} onClick={_save}>Lưu món còn lại</Button>
            </Stack>}
        </DeferredModalContent>
    </Modal>;
};
