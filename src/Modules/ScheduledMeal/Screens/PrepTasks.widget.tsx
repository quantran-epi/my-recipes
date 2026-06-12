import { CheckCircleOutlined, ClockCircleOutlined, QuestionCircleOutlined, WarningOutlined } from '@ant-design/icons';
import { DishDurationHelper } from '@common/Helpers/DishDurationHelper';
import { Button } from '@components/Button';
import { Box } from '@components/Layout/Box';
import { Stack } from '@components/Layout/Stack';
import { Tag } from '@components/Tag';
import { Typography } from '@components/Typography';
import { PrepTask, PrepTaskHelper } from '@modules/ScheduledMeal/Helpers/PrepTaskHelper';
import { markPrepTaskDone, unmarkPrepTaskDone } from '@store/Reducers/AppContextReducer';
import { selectDishesById, selectMealSlotTimes, selectPrepTaskCompletions, selectScheduledMeals } from '@store/Selectors';
import { Checkbox } from 'antd';
import dayjs from 'dayjs';
import React, { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

type UsePrepTasksParams = {
    windowHours?: number;
}

export const usePrepTasks = ({ windowHours = 36 }: UsePrepTasksParams = {}) => {
    const scheduledMeals = useSelector(selectScheduledMeals);
    const dishesById = useSelector(selectDishesById);
    const mealSlotTimes = useSelector(selectMealSlotTimes);
    const completions = useSelector(selectPrepTaskCompletions);
    const now = dayjs();
    const tasks = useMemo(() => PrepTaskHelper.buildPrepTasks(
        scheduledMeals,
        dishesById,
        now,
        now.add(windowHours, 'hour'),
        mealSlotTimes,
    ), [dishesById, mealSlotTimes, scheduledMeals, windowHours, now]);

    return { tasks, completions, mealSlotTimes };
};

type PrepTasksWidgetProps = {
    compact?: boolean;
    windowHours?: number;
    onSeeAll?: () => void;
};

const getTaskTone = (task: PrepTask) => {
    const phase = DishDurationHelper.getPhase(task.phaseKey);
    return { color: phase.color, background: phase.background, border: phase.border, description: phase.description };
};

const PrepTaskRow: React.FC<{ task: PrepTask; doneAt?: string; compact?: boolean }> = ({ task, doneAt, compact }) => {
    const dispatch = useDispatch();
    const [helpOpen, setHelpOpen] = useState(false);
    const tone = getTaskTone(task);
    const done = Boolean(doneAt);
    const minutesUntilStart = task.startAt.diff(dayjs(), 'minute');
    const dueSoon = !done && minutesUntilStart <= 60;
    const urgent = !done && minutesUntilStart < 0;

    return <Box style={{
        position: 'relative',
        border: `1px solid ${done ? '#f0f0f0' : dueSoon ? '#ffd591' : 'rgba(15,23,42,0.08)'}`,
        borderRadius: 8,
        background: done ? '#fafafa' : '#fff',
        padding: compact ? 10 : 12,
        overflow: 'hidden',
    }}>
        {(dueSoon || urgent) && <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: urgent ? '#cf1322' : '#fa8c16' }} />}
        <div style={{ display: 'grid', gridTemplateColumns: compact ? 'minmax(0, 1fr) auto' : '82px minmax(0, 1fr) auto', gap: 10, alignItems: 'start' }}>
            {!compact && <div style={{ minWidth: 0 }}>
                <Typography.Text strong style={{ display: 'block', color: dueSoon ? '#fa541c' : tone.color, fontSize: 15, lineHeight: '20px' }}>{task.startAt.format('HH:mm')}</Typography.Text>
                <Typography.Text type='secondary' style={{ display: 'block', fontSize: 11, lineHeight: '15px' }}>{task.startAt.format('DD/MM')}</Typography.Text>
            </div>}
            <div style={{ minWidth: 0 }}>
                <Stack wrap='wrap' gap={5} align='center'>
                    {compact && <Typography.Text strong style={{ color: dueSoon ? '#fa541c' : tone.color, fontSize: 13 }}>{task.startAt.format('HH:mm')}</Typography.Text>}
                    <Tag style={{ marginRight: 0, color: tone.color, background: tone.background, borderColor: tone.border }}>{task.phaseLabel} · {DishDurationHelper.formatMinutes(task.minutes)}</Tag>
                    {dueSoon && <Tag color={urgent ? 'red' : 'orange'} style={{ marginRight: 0 }}>{urgent ? 'Cần làm ngay' : 'Sắp đến giờ'}</Tag>}
                    <Button type='text' aria-label='Cách tính việc chuẩn bị' icon={<QuestionCircleOutlined />} onClick={() => setHelpOpen(value => !value)} style={{ width: 26, height: 26, paddingInline: 0, borderRadius: 999, color: helpOpen ? '#13a8a8' : '#9ca3af' }} />
                </Stack>
                <Typography.Text strong style={{ display: 'block', color: done ? '#8c8c8c' : '#111827', fontSize: 13, lineHeight: '18px', marginTop: 4, textDecoration: done ? 'line-through' : undefined, overflowWrap: 'anywhere' }}>{task.dishName}</Typography.Text>
                <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '17px', marginTop: 2 }}>
                    {task.slotLabel} · {task.mealName} · {DishDurationHelper.formatMinutes(task.leadMinutes)} trước nấu
                </Typography.Text>
                {doneAt && <Typography.Text type='secondary' style={{ display: 'block', fontSize: 11.5, lineHeight: '16px', marginTop: 4 }}>Hoàn tất lúc {dayjs(doneAt).format('HH:mm DD/MM')}</Typography.Text>}
                {helpOpen && <Box style={{ marginTop: 8, padding: '8px 10px', borderRadius: 6, background: 'rgba(19,168,168,0.08)', border: '1px solid rgba(19,168,168,0.18)' }}>
                    <Typography.Text style={{ display: 'block', color: '#0f766e', fontSize: 11.5, fontWeight: 700, marginBottom: 3 }}>Cách tính</Typography.Text>
                    <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '18px' }}>{task.methodology}</Typography.Text>
                    <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '18px', marginTop: 5 }}>{tone.description}</Typography.Text>
                </Box>}
            </div>
            <Checkbox checked={done} onChange={event => {
                if (event.target.checked) dispatch(markPrepTaskDone(task.id));
                else dispatch(unmarkPrepTaskDone(task.id));
            }} />
        </div>
    </Box>;
};

export const PrepTasksWidget: React.FC<PrepTasksWidgetProps> = ({ compact, windowHours = 36, onSeeAll }) => {
    const { tasks, completions } = usePrepTasks({ windowHours });
    const visibleTasks = compact ? tasks.slice(0, 4) : tasks;

    if (tasks.length === 0) {
        return <Box style={{ border: '1px dashed rgba(56,158,13,0.22)', borderRadius: 8, background: '#f6ffed', padding: compact ? 14 : 18, textAlign: 'center' }}>
            <CheckCircleOutlined style={{ color: '#389e0d', fontSize: 20 }} />
            <Typography.Text strong style={{ display: 'block', color: '#111827', marginTop: 6 }}>Tủ lạnh đã sẵn sàng</Typography.Text>
            <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '18px', marginTop: 3 }}>Không có món nào cần rã đông hay sơ chế từ giờ đến mai.</Typography.Text>
        </Box>;
    }

    const grouped = compact ? [{ date: 'compact', label: '', tasks: visibleTasks }] : PrepTaskHelper.groupTasksByDate(visibleTasks);

    return <Stack direction='column' align='stretch' gap={10}>
        {grouped.map(group => <div key={group.date}>
            {!compact && <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 13, marginBottom: 7 }}>{group.label} ({dayjs(group.date).format('DD/MM')})</Typography.Text>}
            <Stack direction='column' align='stretch' gap={8}>
                {group.tasks.map(task => <PrepTaskRow key={task.id} task={task} compact={compact} doneAt={completions[task.id]} />)}
            </Stack>
        </div>)}
        {compact && tasks.length > visibleTasks.length && onSeeAll && <Button type='link' onClick={onSeeAll} style={{ paddingInline: 0, alignSelf: 'flex-start' }}>
            Xem tất cả {tasks.length} việc chuẩn bị
        </Button>}
        {compact && tasks.length > 0 && tasks.some(task => !completions[task.id] && task.startAt.diff(dayjs(), 'minute') <= 60) && <Typography.Text type='secondary' style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5 }}>
            <WarningOutlined style={{ color: '#fa8c16' }} /> Có việc sắp đến giờ trong 1 giờ tới.
        </Typography.Text>}
    </Stack>;
};
