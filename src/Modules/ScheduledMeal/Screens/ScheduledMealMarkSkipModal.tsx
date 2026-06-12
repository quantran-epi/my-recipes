import { InfoCircleOutlined } from '@ant-design/icons';
import { Box } from '@components/Layout/Box';
import { Stack } from '@components/Layout/Stack';
import { useMessage } from '@components/Message';
import { DeferredModalContent, Modal } from '@components/Modal';
import { Typography } from '@components/Typography';
import { ScheduledMeal, ScheduledMealSkipReason, ScheduledMealSlotKey } from '@store/Models/ScheduledMeal';
import { markSkipMeal } from '@store/Reducers/ScheduledMealReducer';
import { Input } from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import {
    SCHEDULED_MEAL_SKIP_REASON_META,
    SCHEDULED_MEAL_SLOT_LABELS,
    ScheduledMealSlotStateHelper,
} from '../Helpers/ScheduledMealSlotStateHelper';

type ScheduledMealMarkSkipModalProps = {
    open: boolean;
    meal?: ScheduledMeal;
    slot?: ScheduledMealSlotKey;
    initialReason?: ScheduledMealSkipReason;
    onClose: () => void;
};

const reasonOptions = Object.entries(SCHEDULED_MEAL_SKIP_REASON_META) as Array<[ScheduledMealSkipReason, typeof SCHEDULED_MEAL_SKIP_REASON_META[ScheduledMealSkipReason]]>;
const SLOT_KEYS: ScheduledMealSlotKey[] = ['breakfast', 'lunch', 'dinner'];

export const ScheduledMealMarkSkipModal: React.FC<ScheduledMealMarkSkipModalProps> = ({ open, meal, slot, initialReason = 'eatOut', onClose }) => {
    const dispatch = useDispatch();
    const message = useMessage();
    const [reason, setReason] = useState<ScheduledMealSkipReason>(initialReason);
    const [note, setNote] = useState('');
    const [selectedSlot, setSelectedSlot] = useState<ScheduledMealSlotKey | undefined>(slot);

    const availableSlots = useMemo(
        () => SLOT_KEYS.filter(key => !meal?.skipMeals?.[key]),
        [meal],
    );

    useEffect(() => {
        if (!open) return;
        setReason(initialReason);
        setNote('');
        setSelectedSlot(slot ?? availableSlots[0]);
    }, [initialReason, open, slot, availableSlots]);

    const activeSlot = selectedSlot;
    const slotLabel = activeSlot ? ScheduledMealSlotStateHelper.getSlotLabel(activeSlot) : 'bữa này';
    const plannedDishCount = meal && activeSlot ? (meal.meals?.[activeSlot] ?? []).length : 0;

    const _confirm = () => {
        if (!meal || !activeSlot) return;
        dispatch(markSkipMeal({
            mealId: meal.id,
            slot: activeSlot,
            marker: {
                reason,
                note: note.trim() || undefined,
                markedAt: new Date().toISOString(),
            },
        }));
        message.success(`Đã đánh dấu ${slotLabel} không tự nấu`);
        onClose();
    };

    return <Modal
        open={open}
        title="Đánh dấu bữa"
        onCancel={onClose}
        onOk={_confirm}
        okText="Đánh dấu"
        cancelText="Huỷ"
        okButtonProps={{ disabled: !activeSlot }}
        destroyOnClose
    >
        <DeferredModalContent active={open} minHeight={260}>
            <Stack direction="column" align="stretch" gap={12}>
                <Typography.Text style={{ display: 'block', lineHeight: '20px' }}>
                    Chọn bữa{meal ? ` trong "${meal.name}"` : ''} mà bạn không tự nấu.
                </Typography.Text>

                {!slot && <div>
                    <Typography.Text strong style={{ display: 'block', fontSize: 12, marginBottom: 8 }}>Bữa</Typography.Text>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                        {SLOT_KEYS.map(key => {
                            const disabled = !availableSlots.includes(key);
                            const active = activeSlot === key;
                            return <button
                                key={key}
                                type="button"
                                onClick={() => !disabled && setSelectedSlot(key)}
                                disabled={disabled}
                                style={{
                                    border: `1px solid ${active ? '#91caff' : '#f0f0f0'}`,
                                    background: disabled ? '#fafafa' : (active ? '#e6f4ff' : '#fff'),
                                    color: disabled ? '#bfbfbf' : '#111827',
                                    borderRadius: 8,
                                    padding: '8px 10px',
                                    cursor: disabled ? 'not-allowed' : 'pointer',
                                    fontWeight: active ? 700 : 500,
                                    textTransform: 'capitalize',
                                }}
                            >
                                {SCHEDULED_MEAL_SLOT_LABELS[key]}
                            </button>;
                        })}
                    </div>
                </div>}

                {plannedDishCount > 0 && <Box style={{ border: '1px solid #ffd591', background: '#fff7e6', borderRadius: 8, padding: 10 }}>
                    <Typography.Text style={{ display: 'block', color: '#ad4e00', fontSize: 12, lineHeight: '18px' }}>
                        {slotLabel} đang có {plannedDishCount} món. Khi đánh dấu không nấu, các món trong bữa sẽ được xoá khỏi slot này.
                    </Typography.Text>
                </Box>}

                <div>
                    <Typography.Text strong style={{ display: 'block', fontSize: 12, marginBottom: 8 }}>Lý do</Typography.Text>
                    <Stack direction="column" align="stretch" gap={8}>
                        {reasonOptions.map(([value, meta]) => {
                            const active = reason === value;
                            return <button
                                key={value}
                                type="button"
                                onClick={() => setReason(value)}
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '22px minmax(0, 1fr)',
                                    gap: 8,
                                    alignItems: 'start',
                                    width: '100%',
                                    border: `1px solid ${active ? meta.border : '#f0f0f0'}`,
                                    background: active ? meta.background : '#fff',
                                    borderRadius: 8,
                                    padding: 10,
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    transition: 'border-color 0.15s, background 0.15s',
                                }}
                            >
                                <span style={{ color: meta.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', paddingTop: 1 }}>{meta.icon}</span>
                                <span style={{ minWidth: 0 }}>
                                    <Typography.Text strong style={{ display: 'block', color: '#111827', lineHeight: '18px' }}>{meta.label}</Typography.Text>
                                    <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12, lineHeight: '17px' }}>{meta.description}</Typography.Text>
                                </span>
                            </button>;
                        })}
                    </Stack>
                </div>

                <div>
                    <Typography.Text strong style={{ display: 'block', fontSize: 12, marginBottom: 6 }}>Ghi chú (tuỳ chọn)</Typography.Text>
                    <Input.TextArea value={note} onChange={event => setNote(event.target.value)} autoSize={{ minRows: 2, maxRows: 4 }} placeholder="Ví dụ: Ăn nhà ngoại lúc 19h" />
                </div>

                <Box style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr)', gap: 8, border: '1px solid #e6f4ff', background: '#f8fbff', borderRadius: 8, padding: 10 }}>
                    <InfoCircleOutlined style={{ color: '#1677ff', marginTop: 2 }} />
                    <Typography.Text type="secondary" style={{ fontSize: 12, lineHeight: '18px' }}>
                        Bữa đã đánh dấu sẽ được planner, danh sách mua sắm và luồng nấu bỏ qua.
                    </Typography.Text>
                </Box>
            </Stack>
        </DeferredModalContent>
    </Modal>;
};
