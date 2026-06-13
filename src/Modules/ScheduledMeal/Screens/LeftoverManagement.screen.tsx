import { CheckCircleOutlined, DeleteOutlined, FireOutlined, PlusOutlined, RestOutlined, RollbackOutlined, SearchOutlined } from '@ant-design/icons';
import { ActionButton, Button } from '@components/Button';
import { Box } from '@components/Layout/Box';
import { Stack } from '@components/Layout/Stack';
import { useMessage } from '@components/Message';
import { Modal } from '@components/Modal';
import { useModal } from '@components/Modal/ModalProvider';
import { Tag } from '@components/Tag';
import { Typography } from '@components/Typography';
import { useScreenTitle, useToggle } from '@hooks';
import { DishServingKind, LeftoverTrackerItem, LeftoverTrackerItemStatus, addLeftoverTrackerItem, discardLeftoverItem, eatLeftoverServings, finishLeftoverItem } from '@store/Reducers/AppContextReducer';
import { selectDishes, selectLeftoverTrackerItems } from '@store/Selectors';
import { Empty, Input, InputNumber, Segmented, Select } from 'antd';
import dayjs from 'dayjs';
import { nanoid } from 'nanoid';
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

type KindFilter = 'all' | DishServingKind;

const KIND_OPTIONS: Array<{ value: KindFilter; label: string }> = [
    { value: 'all', label: 'Tất cả' },
    { value: 'fresh', label: 'Mới nấu' },
    { value: 'leftover', label: 'Phần dư' },
];

// Day-offset options for the "ăn trước" picker, mirroring MealCompletionLeftoverModal.
const EAT_BY_OPTIONS: Array<{ value: number; label: string }> = [
    { value: 1, label: 'Ngày mai' },
    { value: 2, label: '2 ngày' },
    { value: 3, label: '3 ngày' },
    { value: 5, label: '5 ngày' },
];

const itemKind = (item: LeftoverTrackerItem): DishServingKind => item.kind === 'fresh' ? 'fresh' : 'leftover';

const getKindVisual = (item: LeftoverTrackerItem) => itemKind(item) === 'fresh'
    ? { color: 'volcano', label: 'Mới nấu' }
    : { color: 'gold', label: 'Phần dư' };

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

const LeftoverItemRow: React.FC<{
    item: LeftoverTrackerItem;
    onEatPart: () => void;
    onFinish: () => void;
    onDiscard: () => void;
}> = ({ item, onEatPart, onFinish, onDiscard }) => {
    const visual = getStatusVisual(item);
    const kindVisual = getKindVisual(item);
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
                        {item.status === 'discarded' && item.discardReason && <Typography.Text style={{ display: 'block', color: '#9ca3af', fontSize: 12, lineHeight: '17px', marginTop: 4, overflowWrap: 'anywhere' }}>Lý do bỏ: {item.discardReason}</Typography.Text>}
                        {item.storedAt && <Typography.Text type='secondary' style={{ display: 'block', fontSize: 11, lineHeight: '16px', marginTop: 4 }}>{formatStoredAt(item.storedAt)}</Typography.Text>}
                    </div>
                    <Stack direction='column' align='flex-end' gap={4} style={{ flexShrink: 0 }}>
                        <Tag color={kindVisual.color} style={{ marginInlineEnd: 0 }}>{kindVisual.label}</Tag>
                        <Tag color={visual.color} style={{ marginInlineEnd: 0 }}>{visual.label}</Tag>
                    </Stack>
                </div>
                {item.status === 'available' && <Stack wrap='wrap' gap={6} style={{ marginTop: 10 }}>
                    <ActionButton tone='success' icon={<RollbackOutlined />} onClick={onEatPart}>Ăn một phần</ActionButton>
                    <ActionButton tone='primary' icon={<CheckCircleOutlined />} onClick={onFinish}>Đã hết</ActionButton>
                    <ActionButton tone='danger' icon={<DeleteOutlined />} onClick={onDiscard}>Bỏ</ActionButton>
                </Stack>}
            </div>
        </div>
    </Box>;
};

type AddLeftoverForm = {
    dishId?: string;
    customName: string;
    portions: number;
    eatInDays: number;
    kind: DishServingKind;
    note: string;
};

const createAddForm = (): AddLeftoverForm => ({
    dishId: undefined,
    customName: '',
    portions: 1,
    eatInDays: 2,
    kind: 'leftover',
    note: '',
});

export const LeftoverManagementScreen: React.FC = () => {
    useScreenTitle({ value: 'Phần còn lại', deps: [] });
    const dispatch = useDispatch();
    const message = useMessage();
    const modal = useModal();
    const items = useSelector(selectLeftoverTrackerItems);
    const dishes = useSelector(selectDishes);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('available');
    const [kindFilter, setKindFilter] = useState<KindFilter>('all');
    const [search, setSearch] = useState('');

    // Eat-part-of modal state (which item, and how many servings were eaten).
    const [eatPartItem, setEatPartItem] = useState<LeftoverTrackerItem | null>(null);
    const [eatPartCount, setEatPartCount] = useState<number>(1);
    // Discard modal state (which item, and the optional reason).
    const [discardItem, setDiscardItem] = useState<LeftoverTrackerItem | null>(null);
    const [discardReason, setDiscardReason] = useState<string>('');
    // Manual-add modal.
    const addModal = useToggle();
    const [addForm, setAddForm] = useState<AddLeftoverForm>(createAddForm);

    const dishOptions = useMemo(() => dishes.map(dish => ({ value: dish.id, label: dish.name })), [dishes]);

    const filtered = useMemo(() => {
        const query = search.trim().toLowerCase();
        return items.filter(item => {
            if (statusFilter !== 'all' && item.status !== statusFilter) return false;
            if (kindFilter !== 'all' && itemKind(item) !== kindFilter) return false;
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
    }, [items, search, statusFilter, kindFilter]);

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

    const _openEatPart = (item: LeftoverTrackerItem) => {
        setEatPartItem(item);
        setEatPartCount(Math.min(1, item.portions));
    };

    const _confirmEatPart = () => {
        if (!eatPartItem) return;
        const count = Math.max(0, Math.min(eatPartCount, eatPartItem.portions));
        if (count <= 0) {
            message.error('Số phần đã ăn phải lớn hơn 0');
            return;
        }
        dispatch(eatLeftoverServings({ id: eatPartItem.id, count }));
        message.success(`Đã ghi nhận ăn ${count} phần`);
        setEatPartItem(null);
    };

    const _confirmFinish = (item: LeftoverTrackerItem) => {
        modal.confirm({
            title: 'Đánh dấu đã hết?',
            content: `"${item.dishName}" sẽ được chuyển sang trạng thái đã hết.`,
            okText: 'Đã hết',
            cancelText: 'Hủy',
            centered: true,
            zIndex: LEFTOVER_CONFIRM_Z_INDEX,
            onOk: () => { dispatch(finishLeftoverItem(item.id)); message.success('Đã đánh dấu hết'); },
        });
    };

    const _openDiscard = (item: LeftoverTrackerItem) => {
        setDiscardItem(item);
        setDiscardReason('');
    };

    const _confirmDiscard = () => {
        if (!discardItem) return;
        dispatch(discardLeftoverItem({ id: discardItem.id, reason: discardReason }));
        message.success('Đã bỏ phần này');
        setDiscardItem(null);
    };

    const _updateAddForm = (patch: Partial<AddLeftoverForm>) => setAddForm(current => ({ ...current, ...patch }));

    const _openAddModal = () => {
        setAddForm(createAddForm());
        addModal.show();
    };

    const _submitAdd = () => {
        const selectedDish = addForm.dishId ? dishes.find(dish => dish.id === addForm.dishId) : undefined;
        const dishName = (selectedDish?.name ?? addForm.customName).trim();
        if (!dishName) {
            message.error('Chọn món hoặc nhập tên phần còn lại');
            return;
        }
        const portions = Number(addForm.portions);
        if (!Number.isFinite(portions) || portions <= 0) {
            message.error('Số phần phải lớn hơn 0');
            return;
        }
        const now = dayjs();
        dispatch(addLeftoverTrackerItem({
            id: nanoid(10),
            dishId: selectedDish?.id ?? nanoid(10),
            dishName,
            portions,
            storedAt: now.toISOString(),
            eatBy: now.add(addForm.eatInDays, 'day').toISOString(),
            note: addForm.note.trim() || undefined,
            kind: addForm.kind,
            status: 'available',
        }));
        message.success(`Đã thêm "${dishName}" vào phần còn lại`);
        addModal.hide();
    };

    return <Box style={{ width: 'min(920px, calc(100vw - 24px))', margin: '0 auto', padding: '0 0 96px' }}>
        <Box style={{ border: '1px solid rgba(56,158,13,0.18)', borderRadius: 8, background: 'linear-gradient(135deg, #ffffff 0%, #f6ffed 100%)', padding: 12, marginBottom: 12, boxShadow: '0 10px 26px rgba(15,23,42,0.07)' }}>
            <Stack justify='space-between' align='center' gap={9} wrap='wrap' style={{ width: '100%' }}>
                <Stack align='center' gap={9} style={{ minWidth: 0 }}>
                    <span style={{ width: 42, height: 42, borderRadius: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#f6ffed', color: '#389e0d', border: '1px solid #b7eb8f', flexShrink: 0 }}>
                        <RestOutlined />
                    </span>
                    <div style={{ minWidth: 0 }}>
                        <Typography.Text style={{ display: 'block', color: '#389e0d', fontSize: 12, lineHeight: '16px', fontWeight: 800 }}>Tủ lạnh</Typography.Text>
                        <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 22, lineHeight: '28px' }}>Quản lý phần còn lại</Typography.Text>
                        <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '18px', marginTop: 3 }}>Theo dõi món còn dư, ghi nhận khi ăn dần và xử lý phần quá hạn.</Typography.Text>
                    </div>
                </Stack>
                <Button type='primary' icon={<PlusOutlined />} onClick={_openAddModal}>Thêm phần còn lại</Button>
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
                    <Segmented
                        value={statusFilter}
                        onChange={value => setStatusFilter(value as StatusFilter)}
                        options={STATUS_OPTIONS.map(option => ({ label: option.label, value: option.value }))}
                        style={{ background: '#f8fafc' }}
                    />
                    <Segmented
                        value={kindFilter}
                        onChange={value => setKindFilter(value as KindFilter)}
                        options={KIND_OPTIONS.map(option => ({ label: option.label, value: option.value }))}
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
                onEatPart={() => _openEatPart(item)}
                onFinish={() => _confirmFinish(item)}
                onDiscard={() => _openDiscard(item)}
            />)}
        </div>}

        {/* ── Eat part-of modal ── */}
        <Modal
            open={Boolean(eatPartItem)}
            onCancel={() => setEatPartItem(null)}
            title='Ăn một phần'
            okText='Ghi nhận'
            cancelText='Hủy'
            centered
            destroyOnClose
            zIndex={LEFTOVER_CONFIRM_Z_INDEX}
            onOk={_confirmEatPart}
        >
            {eatPartItem && <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Typography.Text type='secondary' style={{ fontSize: 13, lineHeight: '19px' }}>
                    "{eatPartItem.dishName}" còn {eatPartItem.portions} phần. Nhập số phần đã ăn để trừ khỏi phần còn lại.
                </Typography.Text>
                <div>
                    <Typography.Text strong style={{ display: 'block', fontSize: 12, marginBottom: 5 }}>Số phần đã ăn</Typography.Text>
                    <InputNumber
                        min={0.5}
                        step={0.5}
                        max={eatPartItem.portions}
                        value={eatPartCount}
                        addonAfter='phần'
                        onChange={value => setEatPartCount(Number(value ?? 0))}
                        style={{ width: '100%' }}
                    />
                </div>
            </div>}
        </Modal>

        {/* ── Discard (throw away) modal ── */}
        <Modal
            open={Boolean(discardItem)}
            onCancel={() => setDiscardItem(null)}
            title='Bỏ phần còn lại'
            okText='Bỏ'
            cancelText='Hủy'
            centered
            destroyOnClose
            okButtonProps={{ danger: true }}
            zIndex={LEFTOVER_CONFIRM_Z_INDEX}
            onOk={_confirmDiscard}
        >
            {discardItem && <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Typography.Text type='secondary' style={{ fontSize: 13, lineHeight: '19px' }}>
                    "{discardItem.dishName}" sẽ được đánh dấu đã bỏ và không còn nằm trong phần đang còn.
                </Typography.Text>
                <div>
                    <Typography.Text strong style={{ display: 'block', fontSize: 12, marginBottom: 5 }}>Lý do bỏ (tuỳ chọn)</Typography.Text>
                    <Input.TextArea
                        value={discardReason}
                        onChange={event => setDiscardReason(event.target.value)}
                        placeholder='Ví dụ: để quá lâu, có mùi lạ, không còn ngon...'
                        autoSize={{ minRows: 2, maxRows: 4 }}
                    />
                </div>
            </div>}
        </Modal>

        {/* ── Manual add modal ── */}
        <Modal
            open={addModal.value}
            onCancel={addModal.hide}
            title='Thêm phần còn lại'
            okText='Thêm'
            cancelText='Hủy'
            centered
            destroyOnClose
            onOk={_submitAdd}
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                    <Typography.Text strong style={{ display: 'block', fontSize: 12, marginBottom: 5 }}>Món có sẵn</Typography.Text>
                    <Select
                        allowClear
                        showSearch
                        optionFilterProp='label'
                        placeholder='Chọn món trong danh sách'
                        value={addForm.dishId}
                        onChange={value => _updateAddForm({ dishId: value })}
                        options={dishOptions}
                        style={{ width: '100%' }}
                    />
                </div>
                {!addForm.dishId && <div>
                    <Typography.Text strong style={{ display: 'block', fontSize: 12, marginBottom: 5 }}>Hoặc nhập tên món</Typography.Text>
                    <Input
                        value={addForm.customName}
                        onChange={event => _updateAddForm({ customName: event.target.value })}
                        placeholder='Ví dụ: cơm chiên mua ngoài'
                    />
                </div>}
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(140px, 170px)', gap: 8 }}>
                    <div>
                        <Typography.Text strong style={{ display: 'block', fontSize: 12, marginBottom: 5 }}>Số phần</Typography.Text>
                        <InputNumber min={0.5} step={0.5} max={99} value={addForm.portions} addonAfter='phần' onChange={value => _updateAddForm({ portions: Number(value ?? 0) })} style={{ width: '100%' }} />
                    </div>
                    <div>
                        <Typography.Text strong style={{ display: 'block', fontSize: 12, marginBottom: 5 }}>Ăn trước</Typography.Text>
                        <Select value={addForm.eatInDays} onChange={value => _updateAddForm({ eatInDays: value })} options={EAT_BY_OPTIONS} style={{ width: '100%' }} />
                    </div>
                </div>
                <div>
                    <Typography.Text strong style={{ display: 'block', fontSize: 12, marginBottom: 5 }}>Loại phần</Typography.Text>
                    <Segmented
                        value={addForm.kind}
                        onChange={value => _updateAddForm({ kind: value as DishServingKind })}
                        options={[{ label: 'Phần dư', value: 'leftover' }, { label: 'Mới nấu', value: 'fresh' }]}
                        block
                    />
                </div>
                <div>
                    <Typography.Text strong style={{ display: 'block', fontSize: 12, marginBottom: 5 }}>Ghi chú</Typography.Text>
                    <Input.TextArea
                        value={addForm.note}
                        onChange={event => _updateAddForm({ note: event.target.value })}
                        placeholder='Ví dụ: để hộp ngăn mát, phần cho bữa trưa mai...'
                        autoSize={{ minRows: 2, maxRows: 4 }}
                    />
                </div>
            </div>
        </Modal>
    </Box>;
};

export default LeftoverManagementScreen;
