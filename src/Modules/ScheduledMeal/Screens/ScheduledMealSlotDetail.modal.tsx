import { CheckCircleFilled, EyeOutlined, FireOutlined, RestOutlined, TeamOutlined } from '@ant-design/icons';
import { Button } from '@components/Button';
import { Image } from '@components/Image';
import { Box } from '@components/Layout/Box';
import { Stack } from '@components/Layout/Stack';
import { DeferredModalContent, Modal } from '@components/Modal';
import { Tooltip } from '@components/Tootip';
import { Typography } from '@components/Typography';
import type { CookingMealFeedbackSlot } from '@store/Models/CookingSession';
import { ScheduledMeal, ScheduledMealSlotKey } from '@store/Models/ScheduledMeal';
import { setMealSlotCooked, setMealSlotEaten, unmarkSkipMeal } from '@store/Reducers/ScheduledMealReducer';
import { selectAvailableServingsByDishKind, selectDishNameById, selectHouseholdMembers } from '@store/Selectors';
import { Switch, Tag } from 'antd';
import moment from 'moment';
import React, { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import MorningIcon from '../../../../assets/icons/sunrise.png';
import NightIcon from '../../../../assets/icons/night.png';
import NoonIcon from '../../../../assets/icons/time.png';
import { ScheduledMealSlotStateHelper } from '../Helpers/ScheduledMealSlotStateHelper';
import { MealCompletionLeftoverModal, ScheduledMealCookingModal, getScheduledMealDishIds } from './ScheduledMealCooking.widget';
import { MemberDishFeedbackHistoryWidget } from './MemberDishFeedbackHistory.widget';
import { ScheduledMealMarkSkipModal } from './ScheduledMealMarkSkipModal';

export type SlotMeta = { label: string; icon: string; color: string; background: string; border: string };

export const SLOT_META: Record<ScheduledMealSlotKey, SlotMeta> = {
    breakfast: { label: 'Bữa sáng', icon: MorningIcon, color: '#d48806', background: '#fffbe6', border: '#ffe58f' },
    lunch: { label: 'Bữa trưa', icon: NoonIcon, color: '#d46b08', background: '#fff7e6', border: '#ffd591' },
    dinner: { label: 'Bữa tối', icon: NightIcon, color: '#531dab', background: '#f9f0ff', border: '#efdbff' },
};

type ScheduledMealSlotDetailModalProps = {
    open: boolean;
    date: Date;
    slot: ScheduledMealSlotKey;
    meals: ScheduledMeal[];     // all meal plans for the day
    onClose: () => void;
};

type CookScope = { title: string; dishIds: string[]; scheduledMealId: string; dishServings?: Record<string, number> };
type CompletionScope = CookScope & { readonly?: boolean };

export const ScheduledMealSlotDetailModal: React.FC<ScheduledMealSlotDetailModalProps> = ({ open, date, slot, meals, onClose }) => {
    const dispatch = useDispatch();
    const dishNameById = useSelector(selectDishNameById);
    const householdMembers = useSelector(selectHouseholdMembers);
    const servingsByDishKind = useSelector(selectAvailableServingsByDishKind);

    const [cookingOpen, setCookingOpen] = useState(false);
    const [cookingToken, setCookingToken] = useState(0);
    const [cookingScope, setCookingScope] = useState<CookScope>();
    const [completionOpen, setCompletionOpen] = useState(false);
    const [completionScope, setCompletionScope] = useState<CompletionScope>();
    const [skipMealId, setSkipMealId] = useState<string>();

    const meta = SLOT_META[slot];
    const memberNameById = useMemo(() => new Map(householdMembers.map(member => [member.id, member.name])), [householdMembers]);

    // Plans that actually touch this slot (planned or skipped), newest first to match the day view.
    const slotItems = useMemo(() => meals
        .filter(meal => ScheduledMealSlotStateHelper.getSlotState(meal, slot) !== 'empty'),
        [meals, slot]);

    const allDishIds = useMemo(() => getScheduledMealDishIds(slotItems.flatMap(meal => (
        ScheduledMealSlotStateHelper.getSlotState(meal, slot) === 'skipped' ? [] : (meal.meals?.[slot] ?? [])
    ))), [slotItems, slot]);

    const _dishName = (id: string) => dishNameById.get(id) ?? id;
    const _formatStock = (dishId: string): string | null => {
        const stock = servingsByDishKind.get(dishId);
        if (!stock) return null;
        const total = stock.fresh + stock.leftover;
        if (total <= 0) return null;
        if (stock.fresh > 0 && stock.leftover > 0) return `${stock.fresh} mới · ${stock.leftover} dư`;
        return `${total} phần`;
    };

    const _memberChips = (meal: ScheduledMeal) => {
        const ids = (meal.memberIds ?? []).filter(id => memberNameById.has(id));
        if (ids.length === 0) {
            return <Tag style={{ marginInlineEnd: 0, fontSize: 11 }} icon={<TeamOutlined />}>Cả nhà</Tag>;
        }
        return ids.map(id => <Tag key={id} color="purple" style={{ marginInlineEnd: 0, fontSize: 11 }}>{memberNameById.get(id)}</Tag>);
    };

    const _openCooking = (meal: ScheduledMeal) => {
        setCookingScope({
            title: `Nấu ${meta.label.toLowerCase()} - ${meal.name}`,
            dishIds: getScheduledMealDishIds(meal.meals?.[slot] ?? []),
            scheduledMealId: meal.id,
            dishServings: meal.dishServings,
        });
        setCookingToken(Date.now());
        setCookingOpen(true);
    };

    const _openCompletion = (meal: ScheduledMeal, readonly: boolean) => {
        setCompletionScope({
            title: `${readonly ? 'Phản hồi' : 'Hoàn tất'} ${meta.label.toLowerCase()} - ${meal.name}`,
            dishIds: getScheduledMealDishIds(meal.meals?.[slot] ?? []),
            scheduledMealId: meal.id,
            dishServings: meal.dishServings,
            readonly,
        });
        setCompletionOpen(true);
    };

    const slotForFeedback = slot as CookingMealFeedbackSlot;

    return <React.Fragment>
        <Modal
            open={open}
            title={<Stack align="center" gap={8}>
                <Image src={meta.icon} preview={false} width={20} style={{ marginBottom: 2 }} />
                <span>{meta.label} · {moment(date).format('DD/MM/YYYY')}</span>
            </Stack>}
            onCancel={onClose}
            footer={null}
            destroyOnClose
            width="min(680px, calc(100vw - 24px))"
            style={{ top: 36 }}
            bodyStyle={{ width: '100%', boxSizing: 'border-box' }}
        >
            <DeferredModalContent active={open} minHeight={200}>
                {slotItems.length === 0 ? <Box style={{ textAlign: 'center', padding: '26px 0' }}>
                    <Typography.Text type="secondary">Chưa có kế hoạch cho {meta.label.toLowerCase()} hôm nay.</Typography.Text>
                </Box> : <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
                    <Box style={{ border: `1px solid ${meta.border}`, borderRadius: 8, background: meta.background, padding: '9px 11px' }}>
                        <Typography.Text style={{ fontSize: 12, color: meta.color, fontWeight: 600 }}>
                            {allDishIds.length} món · {slotItems.length} kế hoạch
                        </Typography.Text>
                    </Box>

                    {slotItems.map(meal => {
                        const state = ScheduledMealSlotStateHelper.getSlotState(meal, slot);
                        const dishIds = meal.meals?.[slot] ?? [];
                        const cooked = Boolean(meal.cookedSlots?.[slot]);
                        const eaten = Boolean(meal.eatenSlots?.[slot]);
                        const skipMarker = meal.skipMeals?.[slot];
                        const skipMeta = skipMarker ? ScheduledMealSlotStateHelper.getReasonMeta(skipMarker.reason) : undefined;

                        return <Box key={meal.id} style={{ border: '1px solid rgba(15,23,42,0.08)', borderRadius: 8, background: '#fff', padding: 11 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 8, alignItems: 'start', marginBottom: 8 }}>
                                <div style={{ minWidth: 0 }}>
                                    <Typography.Text strong style={{ display: 'block', color: '#111827', lineHeight: '19px', overflowWrap: 'anywhere' }}>{meal.name}</Typography.Text>
                                    <Stack wrap="wrap" gap={5} style={{ marginTop: 5 }}>{_memberChips(meal)}</Stack>
                                </div>
                            </div>

                            {skipMarker && skipMeta && <Box style={{ border: `1px dashed ${skipMeta.border}`, borderRadius: 8, background: skipMeta.background, padding: '7px 9px', marginBottom: 8 }}>
                                <Stack align="center" justify="space-between" gap={8}>
                                    <Stack align="center" gap={6} style={{ minWidth: 0 }}>
                                        <span style={{ color: skipMeta.color, display: 'inline-flex' }}>{skipMeta.icon}</span>
                                        <Typography.Text style={{ fontSize: 12, color: skipMeta.color, fontWeight: 600 }}>{skipMeta.label}</Typography.Text>
                                    </Stack>
                                    <Button onClick={() => dispatch(unmarkSkipMeal({ mealId: meal.id, slot }))}>Bỏ đánh dấu</Button>
                                </Stack>
                            </Box>}

                            {dishIds.length === 0 ? (
                                <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12 }}>Chưa chọn món</Typography.Text>
                            ) : <Stack wrap="wrap" gap={5}>
                                {dishIds.map((id, index) => {
                                    const servings = meal.dishServings?.[id];
                                    const stock = _formatStock(id);
                                    return <Tag key={`${id}-${index}`} style={{ marginInlineEnd: 0, fontSize: 11, borderRadius: 10, opacity: skipMarker ? 0.6 : 1 }}>
                                        {_dishName(id)}{servings ? ` (${servings} phần)` : ''}{stock ? ` · còn ${stock}` : ''}
                                    </Tag>;
                                })}
                            </Stack>}

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
                                <Stack align="center" justify="space-between" gap={6} style={{ border: '1px solid rgba(15,23,42,0.06)', borderRadius: 8, padding: '6px 9px' }}>
                                    <Typography.Text type="secondary" style={{ fontSize: 11 }}>Đã nấu</Typography.Text>
                                    <Switch size="small" checked={cooked} onChange={checked => dispatch(setMealSlotCooked({ mealId: meal.id, slot, cooked: checked }))} />
                                </Stack>
                                <Stack align="center" justify="space-between" gap={6} style={{ border: '1px solid rgba(15,23,42,0.06)', borderRadius: 8, padding: '6px 9px' }}>
                                    <Typography.Text type="secondary" style={{ fontSize: 11 }}>Đã ăn</Typography.Text>
                                    <Switch size="small" checked={eaten} checkedChildren={<CheckCircleFilled />} onChange={checked => dispatch(setMealSlotEaten({ mealId: meal.id, slot, eaten: checked }))} />
                                </Stack>
                            </div>

                            <Stack wrap="wrap" gap={6} style={{ marginTop: 10 }}>
                                <Button icon={<FireOutlined />} disabled={dishIds.length === 0} onClick={() => _openCooking(meal)} style={{ color: '#fa8c16', borderColor: 'rgba(250,140,22,0.42)' }}>Nấu</Button>
                                <Tooltip title="Hoàn tất bữa: phản hồi, lưu phần còn lại, ghi nhận thực tế">
                                    <Button icon={<RestOutlined />} disabled={dishIds.length === 0} onClick={() => _openCompletion(meal, false)}>Hoàn tất</Button>
                                </Tooltip>
                                <Button icon={<EyeOutlined />} disabled={dishIds.length === 0} onClick={() => _openCompletion(meal, true)}>Phản hồi</Button>
                                {!skipMarker && <Button onClick={() => setSkipMealId(meal.id)}>Không nấu</Button>}
                            </Stack>
                        </Box>;
                    })}

                    <Box style={{ marginTop: 4 }}>
                        <Typography.Text strong style={{ display: 'block', fontSize: 13, marginBottom: 8 }}>Phản hồi trong ngày</Typography.Text>
                        <MemberDishFeedbackHistoryWidget lockedDate={date} compact maxRows={6} />
                    </Box>
                </div>}
            </DeferredModalContent>
        </Modal>

        {cookingScope && <ScheduledMealCookingModal
            open={cookingOpen}
            title={cookingScope.title}
            dishIds={cookingScope.dishIds}
            dishServings={cookingScope.dishServings}
            autoStartToken={cookingToken}
            scheduledMealId={cookingScope.scheduledMealId}
            mealSlot={slotForFeedback}
            mealDate={date}
            onClose={() => setCookingOpen(false)}
        />}

        {completionScope && <MealCompletionLeftoverModal
            open={completionOpen}
            title={completionScope.title}
            dishIds={completionScope.dishIds}
            dishServings={completionScope.dishServings}
            scheduledMealId={completionScope.scheduledMealId}
            mealSlot={slotForFeedback}
            mealDate={date}
            readonly={completionScope.readonly}
            onClose={() => setCompletionOpen(false)}
        />}

        <ScheduledMealMarkSkipModal
            open={Boolean(skipMealId)}
            meal={meals.find(meal => meal.id === skipMealId)}
            slot={slot}
            onClose={() => setSkipMealId(undefined)}
        />
    </React.Fragment>;
};
