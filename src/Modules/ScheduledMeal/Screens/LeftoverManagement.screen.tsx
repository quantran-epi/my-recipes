import { CheckCircleOutlined, DeleteOutlined, FilterOutlined, FireOutlined, RestOutlined, RollbackOutlined, SearchOutlined } from '@ant-design/icons';
import { Button } from '@components/Button';
import { Box } from '@components/Layout/Box';
import { Stack } from '@components/Layout/Stack';
import { useMessage } from '@components/Message';
import { useModal } from '@components/Modal/ModalProvider';
import { Tag } from '@components/Tag';
import { Tooltip } from '@components/Tootip';
import { Typography } from '@components/Typography';
import { useScreenTitle } from '@hooks';
import { LeftoverTrackerItem, LeftoverTrackerItemStatus, discardLeftoverItem, eatLeftoverPortion, finishLeftoverItem } from '@store/Reducers/AppContextReducer';
import { selectLeftoverTrackerItems } from '@store/Selectors';
import { Empty, Input, Segmented } from 'antd';
import dayjs from 'dayjs';
import React, { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

const slotLabel: Record<string, string> = {
    breakfast: 'Bữa sáng',
    lunch: 'Bữa trưa',
    dinner: 'Bữa tối',
    day: 'Cả ngày',
    dish: 'Món riêng',
};

const stripActionPrefix = (title?: string): string => {
    const trimmed = title?.trim();
    if (!trimmed) return '';
    return trimmed.replace(/^(Phản hồi|Hoàn tất|Nấu)\s+(bữa\s+(sáng|trưa|tối)|bữa ăn|cả ngày|thực đơn)\s*[-:·]\s*/i, '').trim();
};

type StatusFilter = 'all' | LeftoverTrackerItemStatus;

const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
    { value: 'all', label: 'Tất cả' },
    { value: 'available', label: 'Còn' },
    { value: 'finished', label: 'Đã hết' },
    { value: 'discarded', label: 'Đã bỏ' },
];

const LEFTOVER_CONFIRM_Z_INDEX = 5200;

const getStatusVisual = (item: LeftoverTrackerItem) => {
    if (item.status === 'discarded') return { color: 'default', label: 'Đã bỏ', accent: '#9ca3af', background: '#f3f4f6', border: '#e5e7eb' };
    if (item.status === 'finished') return { color: 'blue', label: 'Đã hết', accent: '#1677ff', background: '#e6f4ff', border: '#91caff' };
    if (!item.eatBy) return { color: 'green', label: 'Còn', accent: '#389e0d', background: '#f6ffed', border: '#b7eb8f' };
    const days = dayjs(item.eatBy).startOf('day').diff(dayjs().startOf('day'), 'day');
    if (days < 0) return { color: 'red', label: 'Quá hạn', accent: '#cf1322', background: '#fff1f0', border: '#ffa39e' };
    if (days <= 1) return { color: 'orange', label: days === 0 ? 'Ăn hôm nay' : 'Ăn ngày mai', accent: '#fa8c16', background: '#fff7e6', border: '#ffd591' };
    return { color: 'green', label: `Còn ${days} ngày`, accent: '#389e0d', background: '#f6ffed', border: '#b7eb8f' };
};

const formatStoredAt = (stored?: string): string => {
    if (!stored) return '';
    return `Đã lưu ${dayjs(stored).format('DD/MM HH:mm')}`;
};

const leftoverActionBarStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: 4,
    border: '1px solid rgba(15,23,42,0.08)',
    borderRadius: 8,
    background: '#f8fafc',
};

const leftoverActionButtonStyle: React.CSSProperties = {
    width: 32,
    height: 30,
    paddingInline: 0,
    color: '#475569',
    borderColor: 'rgba(15,23,42,0.12)',
    background: '#fff',
};

const leftoverDangerActionButtonStyle: React.CSSProperties = {
    ...leftoverActionButtonStyle,
    color: '#cf1322',
    borderColor: 'rgba(207,19,34,0.22)',
};

const LeftoverItemRow: React.FC<{
    item: LeftoverTrackerItem;
    onEatOne: () => void;
    onFinish: () => void;
    onDiscard: () => void;
}> = ({ item, onEatOne, onFinish, onDiscard }) => {
    const visual = getStatusVisual(item);
    const slot = item.mealSlot ? slotLabel[item.mealSlot] ?? 'Bữa ăn' : null;
    const mealName = stripActionPrefix(item.mealTitle);
    const mealDate = item.mealDate ? dayjs(item.mealDate).format('DD/MM/YYYY') : null;
    const mealLine = [slot, mealName, mealDate].filter(Boolean).join(' · ');
    const eatByLabel = item.eatBy ? `ăn trước ${dayjs(item.eatBy).format('DD/MM')}` : 'ăn khi tiện';
    return <Box style={{ width: '100%', boxSizing: 'border-box', borderRadius: 8, border: `1px solid ${visual.border}`, background: '#fff', overflow: 'hidden', boxShadow: '0 6px 16px rgba(15,23,42,0.05)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '5px minmax(0, 1fr)', minWidth: 0 }}>
            <div style={{ background: visual.accent }} />
            <div style={{ padding: '11px 12px', minWidth: 0 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 8, alignItems: 'flex-start' }}>
                    <div style={{ minWidth: 0 }}>
                        <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 14.5, lineHeight: '20px', overflowWrap: 'anywhere' }}>
                            <FireOutlined style={{ color: visual.accent, marginRight: 6 }} />{item.dishName}
                        </Typography.Text>
                        <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12.5, lineHeight: '17px', marginTop: 2 }}>
                            {item.portions} phần · {eatByLabel}
                        </Typography.Text>
                        {mealLine && <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '17px', marginTop: 2, overflowWrap: 'anywhere' }}>{mealLine}</Typography.Text>}
                        {item.note && <Typography.Text style={{ display: 'block', color: '#475569', fontSize: 12, lineHeight: '17px', marginTop: 4, overflowWrap: 'anywhere' }}>{item.note}</Typography.Text>}
                        {item.storedAt && <Typography.Text type='secondary' style={{ display: 'block', fontSize: 11, lineHeight: '16px', marginTop: 4 }}>{formatStoredAt(item.storedAt)}</Typography.Text>}
                    </div>
                    <Tag color={visual.color} style={{ marginInlineEnd: 0, flexShrink: 0 }}>{visual.label}</Tag>
                </div>
                {item.status === 'available' && <Stack wrap='wrap' gap={6} style={{ marginTop: 10 }}>
                    <div style={leftoverActionBarStyle} aria-label='Thao tác phần còn lại'>
                        <Tooltip title='Ăn 1 phần'>
                            <Button aria-label='Ăn 1 phần' icon={<RollbackOutlined />} onClick={onEatOne} style={leftoverActionButtonStyle} />
                        </Tooltip>
                        <Tooltip title='Đã hết'>
                            <Button aria-label='Đã hết' icon={<CheckCircleOutlined />} onClick={onFinish} style={leftoverActionButtonStyle} />
                        </Tooltip>
                        <Tooltip title='Bỏ'>
                            <Button aria-label='Bỏ' icon={<DeleteOutlined />} danger onClick={onDiscard} style={leftoverDangerActionButtonStyle} />
                        </Tooltip>
                    </div>
                </Stack>}
            </div>
        </div>
    </Box>;
};

export const LeftoverManagementScreen: React.FC = () => {
    useScreenTitle({ value: 'Phần còn lại', deps: [] });
    const dispatch = useDispatch();
    const message = useMessage();
    const modal = useModal();
    const items = useSelector(selectLeftoverTrackerItems);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('available');
    const [search, setSearch] = useState('');

    const filtered = useMemo(() => {
        const query = search.trim().toLowerCase();
        return items.filter(item => {
            if (statusFilter !== 'all' && item.status !== statusFilter) return false;
            if (!query) return true;
            const haystack = [item.dishName, item.note, stripActionPrefix(item.mealTitle), item.mealSlot ? slotLabel[item.mealSlot] : ''].filter(Boolean).join(' ').toLowerCase();
            return haystack.includes(query);
        }).slice().sort((a, b) => {
            if (a.status !== b.status) {
                if (a.status === 'available') return -1;
                if (b.status === 'available') return 1;
            }
            const aTime = a.eatBy ? dayjs(a.eatBy).valueOf() : dayjs(a.storedAt).valueOf();
            const bTime = b.eatBy ? dayjs(b.eatBy).valueOf() : dayjs(b.storedAt).valueOf();
            return aTime - bTime;
        });
    }, [items, search, statusFilter]);

    const stats = useMemo(() => {
        const available = items.filter(item => item.status === 'available');
        const expiringSoon = available.filter(item => {
            if (!item.eatBy) return false;
            const days = dayjs(item.eatBy).startOf('day').diff(dayjs().startOf('day'), 'day');
            return days <= 1;
        }).length;
        const overdue = available.filter(item => item.eatBy && dayjs(item.eatBy).startOf('day').isBefore(dayjs().startOf('day'), 'day')).length;
        return {
            availableCount: available.length,
            totalPortions: available.reduce((sum, item) => sum + (Number.isFinite(item.portions) ? item.portions : 0), 0),
            expiringSoon,
            overdue,
        };
    }, [items]);

    const _confirmLeftoverAction = (item: LeftoverTrackerItem, action: 'eat' | 'finish' | 'discard') => {
        const config = action === 'eat'
            ? {
                title: 'Xác nhận ăn 1 phần?',
                content: `Ghi nhận đã ăn 1 phần "${item.dishName}". Còn lại ${Math.max(0, item.portions - 1)} phần sau khi lưu.`,
                okText: 'Ăn 1 phần',
                onOk: () => { dispatch(eatLeftoverPortion(item.id)); message.success('Đã ghi nhận 1 phần'); },
            }
            : action === 'finish'
                ? {
                    title: 'Đánh dấu đã hết?',
                    content: `"${item.dishName}" sẽ được chuyển sang trạng thái đã hết.`,
                    okText: 'Đã hết',
                    onOk: () => { dispatch(finishLeftoverItem(item.id)); message.success('Đã đánh dấu hết'); },
                }
                : {
                    title: 'Bỏ phần còn lại?',
                    content: `"${item.dishName}" sẽ được đánh dấu đã bỏ và không còn nằm trong phần đang còn.`,
                    okText: 'Bỏ',
                    onOk: () => { dispatch(discardLeftoverItem(item.id)); message.success('Đã bỏ phần này'); },
                    okButtonProps: { danger: true },
                };

        modal.confirm({
            ...config,
            cancelText: 'Hủy',
            centered: true,
            zIndex: LEFTOVER_CONFIRM_Z_INDEX,
        });
    };

    return <Box style={{ width: 'min(920px, calc(100vw - 24px))', margin: '0 auto', padding: '0 0 96px' }}>
        <Box style={{ border: '1px solid rgba(56,158,13,0.18)', borderRadius: 8, background: 'linear-gradient(135deg, #ffffff 0%, #f6ffed 100%)', padding: 12, marginBottom: 12, boxShadow: '0 10px 26px rgba(15,23,42,0.07)' }}>
            <Stack align='center' gap={9} style={{ width: '100%' }}>
                <span style={{ width: 42, height: 42, borderRadius: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#f6ffed', color: '#389e0d', border: '1px solid #b7eb8f', flexShrink: 0 }}>
                    <RestOutlined />
                </span>
                <div style={{ minWidth: 0 }}>
                    <Typography.Text style={{ display: 'block', color: '#389e0d', fontSize: 12, lineHeight: '16px', fontWeight: 800 }}>Tủ lạnh</Typography.Text>
                    <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 22, lineHeight: '28px' }}>Quản lý phần còn lại</Typography.Text>
                    <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '18px', marginTop: 3 }}>Theo dõi món còn dư, ghi nhận khi ăn dần và xử lý phần quá hạn.</Typography.Text>
                </div>
            </Stack>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginTop: 12 }}>
                <Box style={{ border: '1px solid rgba(15,23,42,0.06)', borderRadius: 8, background: '#fff', padding: 10 }}>
                    <Typography.Text type='secondary' style={{ display: 'block', fontSize: 11, lineHeight: '15px' }}>Đang còn</Typography.Text>
                    <Typography.Text strong style={{ display: 'block', color: '#389e0d', fontSize: 20, lineHeight: '26px' }}>{stats.availableCount}</Typography.Text>
                    <Typography.Text type='secondary' style={{ display: 'block', fontSize: 11, lineHeight: '15px' }}>{stats.totalPortions} phần</Typography.Text>
                </Box>
                <Box style={{ border: '1px solid rgba(15,23,42,0.06)', borderRadius: 8, background: '#fff', padding: 10 }}>
                    <Typography.Text type='secondary' style={{ display: 'block', fontSize: 11, lineHeight: '15px' }}>Sắp hết hạn</Typography.Text>
                    <Typography.Text strong style={{ display: 'block', color: stats.expiringSoon > 0 ? '#fa8c16' : '#9ca3af', fontSize: 20, lineHeight: '26px' }}>{stats.expiringSoon}</Typography.Text>
                    <Typography.Text type='secondary' style={{ display: 'block', fontSize: 11, lineHeight: '15px' }}>trong 1 ngày tới</Typography.Text>
                </Box>
                <Box style={{ border: '1px solid rgba(15,23,42,0.06)', borderRadius: 8, background: '#fff', padding: 10 }}>
                    <Typography.Text type='secondary' style={{ display: 'block', fontSize: 11, lineHeight: '15px' }}>Quá hạn</Typography.Text>
                    <Typography.Text strong style={{ display: 'block', color: stats.overdue > 0 ? '#cf1322' : '#9ca3af', fontSize: 20, lineHeight: '26px' }}>{stats.overdue}</Typography.Text>
                    <Typography.Text type='secondary' style={{ display: 'block', fontSize: 11, lineHeight: '15px' }}>cần xử lý</Typography.Text>
                </Box>
            </div>
        </Box>

        <Box style={{ border: '1px solid rgba(15,23,42,0.08)', borderRadius: 8, background: '#fff', padding: 10, marginBottom: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 8 }}>
                <Input
                    allowClear
                    placeholder='Tìm theo tên món, ghi chú hoặc bữa ăn'
                    prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                />
                <Stack align='center' gap={6} wrap='wrap' style={{ width: '100%' }}>
                    <FilterOutlined style={{ color: '#6b7280' }} />
                    <Segmented
                        value={statusFilter}
                        onChange={value => setStatusFilter(value as StatusFilter)}
                        options={STATUS_OPTIONS.map(option => ({ label: option.label, value: option.value }))}
                        style={{ background: '#f8fafc' }}
                    />
                </Stack>
            </div>
        </Box>

        {filtered.length === 0 ? <Box style={{ border: '1px dashed #d9d9d9', borderRadius: 8, background: '#fafafa', padding: '28px 12px' }}>
            <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={statusFilter === 'available' ? 'Tủ lạnh đang trống. Khi hoàn tất bữa ăn, mọi phần dư sẽ được lưu ở đây.' : 'Không có phần nào khớp bộ lọc'}
            />
        </Box> : <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
            {filtered.map(item => <LeftoverItemRow
                key={item.id}
                item={item}
                onEatOne={() => _confirmLeftoverAction(item, 'eat')}
                onFinish={() => _confirmLeftoverAction(item, 'finish')}
                onDiscard={() => _confirmLeftoverAction(item, 'discard')}
            />)}
        </div>}
    </Box>;
};

export default LeftoverManagementScreen;
