import { ClockCircleOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { Button } from '@components/Button';
import { Box } from '@components/Layout/Box';
import { Stack } from '@components/Layout/Stack';
import { useMessage } from '@components/Message';
import { DeferredModalContent, Modal } from '@components/Modal';
import { Typography } from '@components/Typography';
import { DEFAULT_MEAL_SLOT_TIMES, MealSlotTimeKey, MealSlotTimes, updateHouseholdPreferenceProfile } from '@store/Reducers/AppContextReducer';
import { selectMealSlotTimes } from '@store/Selectors';
import { InputNumber } from 'antd';
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

type MealSlotTimesModalProps = {
    open: boolean;
    onClose: () => void;
};

const slotRows: Array<{ key: MealSlotTimeKey; label: string; hint: string }> = [
    { key: 'breakfast', label: 'Bữa sáng', hint: 'Planner sẽ trừ ngược thời gian rã đông và sơ chế từ giờ bữa sáng dự kiến.' },
    { key: 'lunch', label: 'Bữa trưa', hint: 'Đổi nếu nhà mình thường ăn trưa sớm hơn hoặc muộn hơn.' },
    { key: 'dinner', label: 'Bữa tối', hint: 'Phần lớn việc chuẩn bị, đặc biệt là rã đông, bám theo giờ này.' },
];

export const MealSlotTimesModal: React.FC<MealSlotTimesModalProps> = ({ open, onClose }) => {
    const dispatch = useDispatch();
    const message = useMessage();
    const current = useSelector(selectMealSlotTimes);
    const [draft, setDraft] = useState<MealSlotTimes>(current);
    const [helpKey, setHelpKey] = useState<MealSlotTimeKey>();

    useEffect(() => {
        if (open) setDraft(current);
    }, [current, open]);

    const _setClock = (key: MealSlotTimeKey, patch: Partial<MealSlotTimes[MealSlotTimeKey]>) => {
        setDraft(value => ({ ...value, [key]: { ...value[key], ...patch } }));
    };

    const _save = () => {
        dispatch(updateHouseholdPreferenceProfile({ mealSlotTimes: draft }));
        message.success('Đã lưu giờ bữa ăn');
        onClose();
    };

    const _reset = () => setDraft(DEFAULT_MEAL_SLOT_TIMES);

    return <Modal
        open={open}
        title={<Stack align='center' gap={8}><ClockCircleOutlined />Giờ bữa ăn</Stack>}
        onCancel={onClose}
        onOk={_save}
        okText='Lưu'
        cancelText='Huỷ'
        destroyOnClose
        footer={<Stack justify='space-between' style={{ width: '100%' }}>
            <Button onClick={_reset}>Đặt lại mặc định</Button>
            <Stack gap={8}>
                <Button onClick={onClose}>Huỷ</Button>
                <Button type='primary' onClick={_save}>Lưu</Button>
            </Stack>
        </Stack>}
    >
        <DeferredModalContent active={open} minHeight={220}>
            <Stack direction='column' align='stretch' gap={10}>
                <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '18px' }}>
                    Planner dùng các giờ này để tính khi nào cần bắt đầu rã đông và sơ chế.
                </Typography.Text>
                {slotRows.map(row => <Box key={row.key} style={{ border: '1px solid rgba(15,23,42,0.08)', borderRadius: 8, background: '#fff', padding: 10 }}>
                    <Stack align='center' justify='space-between' gap={8}>
                        <Stack align='center' gap={6} style={{ minWidth: 0 }}>
                            <Typography.Text strong style={{ color: '#111827' }}>{row.label}</Typography.Text>
                            <Button type='text' aria-label={`Giải thích ${row.label}`} icon={<QuestionCircleOutlined />} onClick={() => setHelpKey(value => value === row.key ? undefined : row.key)} style={{ width: 26, height: 26, paddingInline: 0, borderRadius: 999, color: helpKey === row.key ? '#13a8a8' : '#9ca3af' }} />
                        </Stack>
                        <Stack align='center' gap={6}>
                            <InputNumber min={0} max={23} value={draft[row.key].hour} onChange={value => _setClock(row.key, { hour: Number(value ?? 0) })} style={{ width: 72 }} />
                            <Typography.Text type='secondary'>:</Typography.Text>
                            <InputNumber min={0} max={59} value={draft[row.key].minute} onChange={value => _setClock(row.key, { minute: Number(value ?? 0) })} style={{ width: 72 }} />
                        </Stack>
                    </Stack>
                    {helpKey === row.key && <Box style={{ marginTop: 8, padding: '8px 10px', borderRadius: 6, background: 'rgba(19,168,168,0.08)', border: '1px solid rgba(19,168,168,0.18)' }}>
                        <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '18px' }}>{row.hint}</Typography.Text>
                    </Box>}
                </Box>)}
            </Stack>
        </DeferredModalContent>
    </Modal>;
};
