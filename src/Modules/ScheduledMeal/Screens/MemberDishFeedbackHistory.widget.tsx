import { CalendarOutlined, CloseCircleOutlined, FrownOutlined, HistoryOutlined, MehOutlined, SmileOutlined, TeamOutlined } from '@ant-design/icons';
import { Box } from '@components/Layout/Box';
import { Stack } from '@components/Layout/Stack';
import { Tag } from '@components/Tag';
import { Typography } from '@components/Typography';
import { ActionButton } from '@components/Button';
import { CookingMealFeedbackHistoryRecord, CookingMealFeedbackSlot, CookingSessionMemberFeedback } from '@store/Models/CookingSession';
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

const slotLabelByValue: Record<CookingMealFeedbackSlot, string> = {
    breakfast: 'Bữa sáng',
    lunch: 'Bữa trưa',
    dinner: 'Bữa tối',
    day: 'Cả ngày',
    dish: 'Món riêng',
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

const stripActionPrefix = (title?: string): string => {
    const trimmed = title?.trim();
    if (!trimmed) return '';
    return trimmed.replace(/^(Phản hồi|Hoàn tất|Nấu)\s+(bữa\s+(sáng|trưa|tối)|bữa ăn|cả ngày|thực đơn)\s*[-:·]\s*/i, '').trim();
};

const FILTER_OPTIONS: Array<{ value: CookingSessionMemberFeedback; label: string; icon: React.ReactNode; color: string }> = [
    { value: 'liked', label: 'Thích', icon: <SmileOutlined />, color: 'green' },
    { value: 'neutral', label: 'Bình thường', icon: <MehOutlined />, color: 'blue' },
    { value: 'disliked', label: 'Không hợp', icon: <FrownOutlined />, color: 'volcano' },
];

export const MemberDishFeedbackHistoryWidget: React.FC<MemberDishFeedbackHistoryWidgetProps> = ({ lockedDate, maxRows, compact }) => {
    const history = useSelector(selectDishFeedbackHistory);
    const members = useSelector(selectHouseholdMembers);
    const [memberId, setMemberId] = useState<string>();
    const [date, setDate] = useState<Dayjs | null>(() => lockedDate ? toDayjs(lockedDate) : null);
    const [reactionFilters, setReactionFilters] = useState<Set<CookingSessionMemberFeedback>>(new Set());
    const effectiveDate = lockedDate ? toDayjs(lockedDate) : date;
    const selectedMemberId = memberId && members.some(member => member.id === memberId) ? memberId : members[0]?.id;
    const memberNameById = useMemo(() => new Map(members.map(member => [member.id, member.name])), [members]);

    const reactionMatchesFilter = React.useCallback((reaction: CookingSessionMemberFeedback) => {
        return reactionFilters.size === 0 || reactionFilters.has(reaction);
    }, [reactionFilters]);

    const filteredRecords = useMemo(() => {
        const dateKey = effectiveDate ? effectiveDate.format('YYYY-MM-DD') : null;
        return history.filter(record => {
            if (dateKey && record.mealDate !== dateKey) return false;
            const memberFeedback = record.memberFeedback ?? {};
            if (!selectedMemberId) return Object.keys(memberFeedback).length > 0;
            const reaction = memberFeedback[selectedMemberId];
            if (!reaction) return false;
            return reactionMatchesFilter(reaction);
        }).slice().sort((a, b) => {
            const dateDiff = new Date(b.mealDate).valueOf() - new Date(a.mealDate).valueOf();
            if (dateDiff !== 0) return dateDiff;
            return new Date(b.updatedAt).valueOf() - new Date(a.updatedAt).valueOf();
        });
    }, [effectiveDate, history, reactionMatchesFilter, selectedMemberId]);

    const limitedRecords = useMemo(() => typeof maxRows === 'number' ? filteredRecords.slice(0, maxRows) : filteredRecords, [filteredRecords, maxRows]);

    const groupedByDate = useMemo(() => {
        const groups = new Map<string, CookingMealFeedbackHistoryRecord[]>();
        limitedRecords.forEach(record => {
            const list = groups.get(record.mealDate);
            if (list) list.push(record);
            else groups.set(record.mealDate, [record]);
        });
        return Array.from(groups.entries()).sort((a, b) => new Date(b[0]).valueOf() - new Date(a[0]).valueOf());
    }, [limitedRecords]);

    React.useEffect(() => {
        if (lockedDate) setDate(toDayjs(lockedDate));
    }, [lockedDate]);

    React.useEffect(() => {
        if (!selectedMemberId && members[0]?.id) setMemberId(members[0].id);
    }, [members, selectedMemberId]);

    const _toggleReaction = (value: CookingSessionMemberFeedback) => {
        setReactionFilters(current => {
            const next = new Set(current);
            if (next.has(value)) next.delete(value);
            else next.add(value);
            return next;
        });
    };

    const _clearFilters = () => {
        setReactionFilters(new Set());
        if (!lockedDate) setDate(null);
    };

    const showDatePicker = !lockedDate;
    const groupByDate = !lockedDate && !date;
    const hasActiveFilter = reactionFilters.size > 0 || (showDatePicker && Boolean(date));

    const renderRecord = (record: CookingMealFeedbackHistoryRecord) => {
        const reaction = selectedMemberId ? record.memberFeedback?.[selectedMemberId] : undefined;
        if (!reaction) return null;
        const slot = record.mealSlot ? slotLabelByValue[record.mealSlot] : 'Bữa ăn';
        const mealName = stripActionPrefix(record.mealTitle) || 'Thực đơn';
        const dateLabel = dayjs(record.mealDate).format('DD/MM/YYYY');
        const subtitle = `${slot} · ${mealName} · ${dateLabel}`;
        return <Box key={record.id} style={{ width: '100%', boxSizing: 'border-box', border: '1px solid rgba(15,23,42,0.07)', borderRadius: 8, background: '#fff', padding: 9 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 8, alignItems: 'flex-start', width: '100%' }}>
                <div style={{ minWidth: 0 }}>
                    <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 13, lineHeight: '18px', overflowWrap: 'anywhere' }}>{record.dishName}</Typography.Text>
                    <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '17px', marginTop: 2, overflowWrap: 'anywhere' }}>{subtitle}</Typography.Text>
                </div>
                <Tag color={feedbackColorByValue[reaction]} style={{ marginRight: 0, flexShrink: 0 }}>{feedbackLabelByValue[reaction]}</Tag>
            </div>
        </Box>;
    };

    return <Box style={{ width: '100%', boxSizing: 'border-box', border: '1px solid rgba(15,23,42,0.08)', borderRadius: 8, background: compact ? '#fff' : '#f8fafc', padding: compact ? 10 : 12 }}>
        <Stack align='center' gap={7} style={{ marginBottom: 9, width: '100%' }}>
            <HistoryOutlined style={{ color: '#1677ff' }} />
            <Typography.Text strong style={{ color: '#111827', fontSize: compact ? 13 : 15 }}>Lịch sử phản hồi món</Typography.Text>
        </Stack>

        <div style={{ display: 'grid', gridTemplateColumns: showDatePicker ? 'minmax(0, 1fr) minmax(132px, 170px)' : 'minmax(0, 1fr)', gap: 8, width: '100%', marginBottom: 10 }}>
            <Select
                value={selectedMemberId}
                onChange={setMemberId}
                options={members.map(member => ({ value: member.id, label: member.name }))}
                placeholder='Chọn thành viên'
                style={{ width: '100%' }}
                suffixIcon={<TeamOutlined />}
            />
            {showDatePicker && <DatePicker
                value={date}
                onChange={value => setDate(value ? value.startOf('day') : null)}
                format='DD/MM/YYYY'
                placeholder='Tất cả ngày'
                allowClear
                style={{ width: '100%' }}
                suffixIcon={<CalendarOutlined />}
            />}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            {FILTER_OPTIONS.map(option => {
                const active = reactionFilters.has(option.value);
                return <Tag.CheckableTag
                    key={option.value}
                    checked={active}
                    onChange={() => _toggleReaction(option.value)}
                    style={{
                        marginRight: 0,
                        padding: '2px 9px',
                        borderRadius: 999,
                        border: `1px solid ${active ? 'transparent' : 'rgba(15,23,42,0.12)'}`,
                        background: active ? (option.color === 'green' ? '#52c41a' : option.color === 'volcano' ? '#fa541c' : '#1677ff') : '#fff',
                        color: active ? '#fff' : '#475569',
                        fontSize: 12,
                        lineHeight: '18px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                    }}
                >
                    {option.icon}{option.label}
                </Tag.CheckableTag>;
            })}
            {hasActiveFilter && <ActionButton icon={<CloseCircleOutlined />} onClick={_clearFilters}>Xoá lọc</ActionButton>}
        </div>

        {lockedDate && <Tag color='blue' style={{ marginRight: 0, marginBottom: 10 }}>{effectiveDate?.format('DD/MM/YYYY')}</Tag>}

        {members.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description='Chưa có thành viên trong nhà' /> : limitedRecords.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={hasActiveFilter ? 'Không có phản hồi khớp bộ lọc' : 'Chưa có phản hồi'} /> : groupByDate ? <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
            {groupedByDate.map(([dateKey, records]) => <div key={dateKey} style={{ display: 'flex', flexDirection: 'column', gap: 7, width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 2px' }}>
                    <Tag color='blue' style={{ marginRight: 0 }}>{dayjs(dateKey).format('DD/MM/YYYY')}</Tag>
                    <Typography.Text type='secondary' style={{ fontSize: 12 }}>{records.length} phản hồi</Typography.Text>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
                    {records.map(renderRecord)}
                </div>
            </div>)}
        </div> : <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
            {limitedRecords.map(renderRecord)}
        </div>}
    </Box>;
};
