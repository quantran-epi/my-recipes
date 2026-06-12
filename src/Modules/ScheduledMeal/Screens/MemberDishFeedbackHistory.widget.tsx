import { CalendarOutlined, HistoryOutlined, TeamOutlined } from '@ant-design/icons';
import { Box } from '@components/Layout/Box';
import { Stack } from '@components/Layout/Stack';
import { Tag } from '@components/Tag';
import { Typography } from '@components/Typography';
import { CookingSessionMemberFeedback } from '@store/Models/CookingSession';
import { selectDishFeedbackHistory, selectHouseholdMembers } from '@store/Selectors';
import { DatePicker, Empty, Select } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import React, { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';

const feedbackLabelByValue: Record<CookingSessionMemberFeedback, string> = {
    liked: 'Thích',
    neutral: 'Bình thường',
    disliked: 'Không hợp',
};

const feedbackColorByValue: Record<CookingSessionMemberFeedback, string> = {
    liked: 'green',
    neutral: 'blue',
    disliked: 'volcano',
};

type MemberDishFeedbackHistoryWidgetProps = {
    lockedDate?: Date | string | Dayjs;
    maxRows?: number;
    compact?: boolean;
}

const toDayjs = (value?: Date | string | Dayjs): Dayjs => {
    if (dayjs.isDayjs(value)) return value.startOf('day');
    const parsed = value ? dayjs(value) : dayjs();
    return (parsed.isValid() ? parsed : dayjs()).startOf('day');
};

export const MemberDishFeedbackHistoryWidget: React.FC<MemberDishFeedbackHistoryWidgetProps> = ({ lockedDate, maxRows, compact }) => {
    const history = useSelector(selectDishFeedbackHistory);
    const members = useSelector(selectHouseholdMembers);
    const [memberId, setMemberId] = useState<string>();
    const [date, setDate] = useState<Dayjs>(() => toDayjs(lockedDate));
    const effectiveDate = lockedDate ? toDayjs(lockedDate) : date;
    const selectedMemberId = memberId && members.some(member => member.id === memberId) ? memberId : members[0]?.id;
    const memberNameById = useMemo(() => new Map(members.map(member => [member.id, member.name])), [members]);
    const rows = useMemo(() => {
        const dateKey = effectiveDate.format('YYYY-MM-DD');
        const filtered = history
            .filter(record => record.mealDate === dateKey)
            .filter(record => selectedMemberId ? Boolean(record.memberFeedback?.[selectedMemberId]) : Object.keys(record.memberFeedback ?? {}).length > 0)
            .slice()
            .sort((a, b) => new Date(b.updatedAt).valueOf() - new Date(a.updatedAt).valueOf());
        return typeof maxRows === 'number' ? filtered.slice(0, maxRows) : filtered;
    }, [effectiveDate, history, maxRows, selectedMemberId]);

    React.useEffect(() => {
        if (lockedDate) setDate(toDayjs(lockedDate));
    }, [lockedDate]);

    React.useEffect(() => {
        if (!selectedMemberId && members[0]?.id) setMemberId(members[0].id);
    }, [members, selectedMemberId]);

    return <Box style={{ width: '100%', boxSizing: 'border-box', border: '1px solid rgba(15,23,42,0.08)', borderRadius: 8, background: compact ? '#fff' : '#f8fafc', padding: compact ? 10 : 12 }}>
        <Stack align='center' gap={7} style={{ marginBottom: 9, width: '100%' }}>
            <HistoryOutlined style={{ color: '#1677ff' }} />
            <Typography.Text strong style={{ color: '#111827', fontSize: compact ? 13 : 15 }}>Lịch sử phản hồi món</Typography.Text>
        </Stack>

        <div style={{ display: 'grid', gridTemplateColumns: lockedDate ? 'minmax(0, 1fr)' : 'minmax(0, 1fr) minmax(132px, 170px)', gap: 8, width: '100%', marginBottom: 10 }}>
            <Select
                value={selectedMemberId}
                onChange={setMemberId}
                options={members.map(member => ({ value: member.id, label: member.name }))}
                placeholder='Chọn thành viên'
                style={{ width: '100%' }}
                suffixIcon={<TeamOutlined />}
            />
            {lockedDate ? null : <DatePicker value={effectiveDate} onChange={value => value && setDate(value.startOf('day'))} format='DD/MM/YYYY' style={{ width: '100%' }} suffixIcon={<CalendarOutlined />} />}
        </div>

        {lockedDate && <Tag color='blue' style={{ marginRight: 0, marginBottom: 10 }}>{effectiveDate.format('DD/MM/YYYY')}</Tag>}

        {members.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description='Chưa có thành viên trong nhà' /> : rows.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description='Chưa có phản hồi trong ngày này' /> : <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
            {rows.map(record => {
                const selectedFeedback = selectedMemberId ? record.memberFeedback?.[selectedMemberId] : undefined;
                const feedbackEntries = selectedFeedback
                    ? [[selectedMemberId, selectedFeedback] as [string, CookingSessionMemberFeedback]]
                    : Object.entries(record.memberFeedback ?? {}) as [string, CookingSessionMemberFeedback][];
                return <Box key={record.id} style={{ width: '100%', boxSizing: 'border-box', border: '1px solid rgba(15,23,42,0.07)', borderRadius: 8, background: '#fff', padding: 9 }}>
                    <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 13, lineHeight: '18px', overflowWrap: 'anywhere' }}>{record.dishName}</Typography.Text>
                    <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '17px', marginTop: 2 }}>{record.mealTitle ?? 'Bữa ăn'} · {dayjs(record.mealDate).format('DD/MM/YYYY')}</Typography.Text>
                    <Stack wrap='wrap' gap={5} style={{ marginTop: 7 }}>
                        {feedbackEntries.map(([feedbackMemberId, reaction]) => <Tag key={`${record.id}-${feedbackMemberId}`} color={feedbackColorByValue[reaction]} style={{ marginRight: 0 }}>
                            {memberNameById.get(feedbackMemberId) ?? 'Thành viên'}: {feedbackLabelByValue[reaction]}
                        </Tag>)}
                    </Stack>
                </Box>;
            })}
        </div>}
    </Box>;
};
