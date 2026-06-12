import { ClockCircleOutlined, SettingOutlined, WarningOutlined } from '@ant-design/icons';
import { Button } from '@components/Button';
import { Box } from '@components/Layout/Box';
import { Stack } from '@components/Layout/Stack';
import { Tag } from '@components/Tag';
import { Typography } from '@components/Typography';
import { useScreenTitle } from '@hooks';
import { PrepTasksWidget, usePrepTasks } from './PrepTasks.widget';
import { MealSlotTimesModal } from './MealSlotTimesModal';
import dayjs from 'dayjs';
import React, { useState } from 'react';

const statCardStyle: React.CSSProperties = {
    border: '1px solid rgba(15,23,42,0.08)',
    borderRadius: 8,
    background: '#fff',
    padding: 11,
    minWidth: 0,
};

const StatCard: React.FC<{ label: string; value: string | number; hint: string; tone?: string }> = ({ label, value, hint, tone = '#13a8a8' }) => <Box style={statCardStyle}>
    <Typography.Text strong style={{ display: 'block', color: tone, fontSize: 22, lineHeight: '27px' }}>{value}</Typography.Text>
    <Typography.Text style={{ display: 'block', color: '#111827', fontSize: 12, lineHeight: '17px', fontWeight: 700 }}>{label}</Typography.Text>
    <Typography.Text type='secondary' style={{ display: 'block', fontSize: 11.5, lineHeight: '16px', marginTop: 4 }}>{hint}</Typography.Text>
</Box>;

export const PrepTasksScreen: React.FC = () => {
    useScreenTitle({ value: 'Việc chuẩn bị', deps: [] });
    const [settingsOpen, setSettingsOpen] = useState(false);
    const { tasks, completions } = usePrepTasks({ windowHours: 48 });
    const openTasks = tasks.filter(task => !completions[task.id]);
    const dueSoon = openTasks.filter(task => task.startAt.diff(dayjs(), 'minute') <= 60).length;
    const doneCount = tasks.length - openTasks.length;

    return <Box style={{ maxWidth: 860, margin: '0 auto', padding: '0 0 18px' }}>
        <Box style={{ border: '1px solid rgba(19,168,168,0.14)', borderRadius: 8, background: 'linear-gradient(135deg, #ffffff 0%, #e6fffb 56%, #f6ffed 100%)', padding: 14, boxShadow: '0 10px 28px rgba(15,23,42,0.08)', marginBottom: 12 }}>
            <Stack justify='space-between' align='flex-start' gap={10}>
                <Stack align='flex-start' gap={10} style={{ minWidth: 0 }}>
                    <span style={{ width: 42, height: 42, borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#13a8a8', background: '#e6fffb', border: '1px solid #87e8de', flexShrink: 0, fontSize: 21 }}><ClockCircleOutlined /></span>
                    <div style={{ minWidth: 0 }}>
                        <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 21, lineHeight: '27px' }}>Việc chuẩn bị</Typography.Text>
                        <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '18px', marginTop: 3 }}>Lịch rã đông và sơ chế cho hôm nay và ngày mai.</Typography.Text>
                    </div>
                </Stack>
                <Button icon={<SettingOutlined />} onClick={() => setSettingsOpen(true)}>Giờ bữa</Button>
            </Stack>
        </Box>

        <Box style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 12 }}>
            <StatCard label='Tổng việc' value={tasks.length} hint='Trong 48 giờ tới' />
            <StatCard label='Sắp đến hạn' value={dueSoon} hint='Cần bắt đầu trong 1 giờ' tone={dueSoon > 0 ? '#fa8c16' : '#389e0d'} />
            <StatCard label='Đã làm' value={doneCount} hint='Đã đánh dấu hoàn tất' tone='#389e0d' />
            <Box style={statCardStyle}>
                <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 13, lineHeight: '18px' }}>Cách tính</Typography.Text>
                <Typography.Text type='secondary' style={{ display: 'block', fontSize: 11.5, lineHeight: '16px', marginTop: 4 }}>Trừ ngược thời lượng rã đông và sơ chế từ giờ bữa ăn đã cấu hình.</Typography.Text>
                {dueSoon > 0 && <Tag color='orange' style={{ marginTop: 7, marginRight: 0 }}><WarningOutlined /> Sắp đến giờ</Tag>}
            </Box>
        </Box>

        <Box style={{ border: '1px solid rgba(15,23,42,0.08)', borderRadius: 8, background: '#fff', padding: 12, boxShadow: '0 10px 28px rgba(15,23,42,0.06)' }}>
            <PrepTasksWidget windowHours={48} />
        </Box>

        <MealSlotTimesModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </Box>;
};
