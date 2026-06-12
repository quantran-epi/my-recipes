import { InfoCircleOutlined } from '@ant-design/icons';
import { Box } from '@components/Layout/Box';
import { Stack } from '@components/Layout/Stack';
import { useMessage } from '@components/Message';
import { DeferredModalContent, Modal } from '@components/Modal';
import { Typography } from '@components/Typography';
import { ScheduledMeal, ScheduledMealSkipReason, ScheduledMealSlotKey } from '@store/Models/ScheduledMeal';
import { markSkipMeal } from '@store/Reducers/ScheduledMealReducer';
import { Input, Radio } from 'antd';
import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import {
    SCHEDULED_MEAL_SKIP_REASON_META,
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

export const ScheduledMealMarkSkipModal: React.FC<ScheduledMealMarkSkipModalProps> = ({ open, meal, slot, initialReason = 'eatOut', onClose }) => {
    const dispatch = useDispatch();
    const message = useMessage();
    const [reason, setReason] = useState<ScheduledMealSkipReason>(initialReason);
    const [note, setNote] = useState('');

    useEffect(() => {
        if (!open) return;
        setReason(initialReason);
        setNote('');
    }, [initialReason, open]);

    const slotLabel = slot ? ScheduledMealSlotStateHelper.getSlotLabel(slot) : 'bữa này';
    const plannedDishCount = meal && slot ? (meal.meals?.[slot] ?? []).length : 0;

    const _confirm = () => {
        if (!meal || !slot) return;
        dispatch(markSkipMeal({
            mealId: meal.id,
            slot,
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
        destroyOnClose
    >
        <DeferredModalContent active={open} minHeight={260}>
            <Stack direction="column" align="stretch" gap={12}>
                <Typography.Text style={{ display: 'block', lineHeight: '20px' }}>
                    Đánh dấu <strong>{slotLabel}</strong>{meal ? ` trong "${meal.name}"` : ''} là không tự nấu.
                </Typography.Text>

                {plannedDishCount > 0 && <Box style={{ border: '1px solid #ffd591', background: '#fff7e6', borderRadius: 8, padding: 10 }}>
                    <Typography.Text style={{ display: 'block', color: '#ad4e00', fontSize: 12, lineHeight: '18px' }}>
                        Bữa này đang có {plannedDishCount} món. Khi đánh dấu không nấu, các món trong bữa sẽ được xoá khỏi slot này.
                    </Typography.Text>
                </Box>}

                <div>
                    <Typography.Text strong style={{ display: 'block', fontSize: 12, marginBottom: 8 }}>Lý do</Typography.Text>
                    <Radio.Group value={reason} onChange={event => setReason(event.target.value)} style={{ width: '100%' }}>
                        <Stack direction="column" align="stretch" gap={8}>
                            {reasonOptions.map(([value, meta]) => {
                                const active = reason === value;
                                return <Radio key={value} value={value} style={{ marginRight: 0 }}>
                                    <Box style={{
                                        display: 'grid',
                                        gridTemplateColumns: '22px minmax(0, 1fr)',
                                        gap: 8,
                                        alignItems: 'start',
                                        border: `1px solid ${active ? meta.border : '#f0f0f0'}`,
                                        background: active ? meta.background : '#fff',
                                        borderRadius: 8,
                                        padding: 9,
                                        marginLeft: 4,
                                    }}>
                                        <span style={{ color: meta.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', paddingTop: 1 }}>{meta.icon}</span>
                                        <span style={{ minWidth: 0 }}>
                                            <Typography.Text strong style={{ display: 'block', color: '#111827', lineHeight: '18px' }}>{meta.label}</Typography.Text>
                                            <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12, lineHeight: '17px' }}>{meta.description}</Typography.Text>
                                        </span>
                                    </Box>
                                </Radio>;
                            })}
                        </Stack>
                    </Radio.Group>
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
