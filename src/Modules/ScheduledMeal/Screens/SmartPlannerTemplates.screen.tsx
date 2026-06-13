import { ClockCircleOutlined, CoffeeOutlined, DeleteOutlined, EditOutlined, LayoutOutlined, MinusOutlined, NumberOutlined, PlusOutlined, RestOutlined, SaveOutlined, TagsOutlined } from '@ant-design/icons';
import { Button } from '@components/Button';
import { Box } from '@components/Layout/Box';
import { Stack } from '@components/Layout/Stack';
import { useMessage } from '@components/Message';
import { Modal } from '@components/Modal';
import { useModal } from '@components/Modal/ModalProvider';
import { Tag } from '@components/Tag';
import { Typography } from '@components/Typography';
import { useScreenTitle } from '@hooks';
import type { PlannerMealSlot, SmartPlannerMealSlotDishRanges, SmartPlannerMealSlotTagRequirements } from '@modules/ScheduledMeal/Helpers/SmartPlannerEngine';
import { Dishes } from '@store/Models/Dishes';
import { SmartPlannerTemplate } from '@store/Models/SmartPlannerTemplate';
import { addSmartPlannerTemplate, removeSmartPlannerTemplate, updateSmartPlannerTemplate } from '@store/Reducers/SmartPlannerTemplateReducer';
import { selectDishes, selectSmartPlannerTemplates } from '@store/Selectors';
import { Collapse, Empty, Input } from 'antd';
import { nanoid } from 'nanoid';
import React, { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

// Mirrors the meal-slot concept used in SmartMealPlanner so templates read identically here.
const mealSlots: PlannerMealSlot[] = ['breakfast', 'lunch', 'dinner'];
const MEAL_SLOT_RANGE_MAX = 6;

const mealSlotMeta: Record<PlannerMealSlot, { label: string; tone: string; background: string; border: string }> = {
    breakfast: { label: 'Sáng', tone: '#d48806', background: '#fffbe6', border: '#ffe58f' },
    lunch: { label: 'Trưa', tone: '#d46b08', background: '#fff7e6', border: '#ffd591' },
    dinner: { label: 'Tối', tone: '#531dab', background: '#f9f0ff', border: '#efdbff' },
};

// Leading meal-time icon per slot, tinted with the slot tone for a clearer at-a-glance hierarchy.
const mealSlotIcon: Record<PlannerMealSlot, React.ReactNode> = {
    breakfast: <CoffeeOutlined />,
    lunch: <ClockCircleOutlined />,
    dinner: <RestOutlined />,
};

const DEFAULT_MEAL_SLOT_DISH_RANGES: SmartPlannerMealSlotDishRanges = {
    breakfast: { min: 1, max: 1 },
    lunch: { min: 1, max: 1 },
    dinner: { min: 1, max: 1 },
};

const DEFAULT_MEAL_SLOT_TAG_REQUIREMENTS: SmartPlannerMealSlotTagRequirements = {
    breakfast: [],
    lunch: [],
    dinner: [],
};

const collectDishTagOptions = (dishes: Dishes[]): string[] => {
    const counts = new Map<string, number>();
    dishes.forEach(dish => {
        (dish.tags ?? []).forEach(tag => {
            const trimmed = tag.trim();
            if (!trimmed) return;
            counts.set(trimmed, (counts.get(trimmed) ?? 0) + 1);
        });
    });
    return Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'vi'))
        .map(([tag]) => tag);
};

const cloneRanges = (ranges: SmartPlannerMealSlotDishRanges): SmartPlannerMealSlotDishRanges => ({
    breakfast: { ...ranges.breakfast },
    lunch: { ...ranges.lunch },
    dinner: { ...ranges.dinner },
});

const cloneTagRequirements = (requirements: SmartPlannerMealSlotTagRequirements): SmartPlannerMealSlotTagRequirements => ({
    breakfast: (requirements.breakfast ?? []).map(item => ({ ...item })),
    lunch: (requirements.lunch ?? []).map(item => ({ ...item })),
    dinner: (requirements.dinner ?? []).map(item => ({ ...item })),
});

type TemplateDraft = {
    id: string;
    name: string;
    createdAt: string;
    mealSlotDishRanges: SmartPlannerMealSlotDishRanges;
    mealSlotTagRequirements: SmartPlannerMealSlotTagRequirements;
    isNew: boolean;
};

const renderStepperControl = (label: string, value: number, onDecrement: () => void, onIncrement: () => void, decrementDisabled: boolean, incrementDisabled: boolean) => (
    <Stack align='center' gap={4} style={{ flexShrink: 0 }}>
        <Typography.Text style={{ fontSize: 12, lineHeight: '18px', color: '#475569' }}>{label}</Typography.Text>
        <Button aria-label={`Giảm ${label}`} icon={<MinusOutlined />} disabled={decrementDisabled} onClick={onDecrement} style={{ width: 30, height: 30, paddingInline: 0, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} />
        <Box style={{ minWidth: 32, textAlign: 'center', padding: '4px 8px', borderRadius: 6, border: '1px solid rgba(15,23,42,0.10)', background: '#f8fafc' }}>
            <Typography.Text strong style={{ fontSize: 13, lineHeight: '18px', color: '#111827' }}>{value}</Typography.Text>
        </Box>
        <Button aria-label={`Tăng ${label}`} icon={<PlusOutlined />} disabled={incrementDisabled} onClick={onIncrement} style={{ width: 30, height: 30, paddingInline: 0, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} />
    </Stack>
);

const TemplateDetail: React.FC<{ template: { mealSlotDishRanges: SmartPlannerMealSlotDishRanges; mealSlotTagRequirements: SmartPlannerMealSlotTagRequirements } }> = ({ template }) => (
    <Stack direction='column' align='stretch' gap={8} style={{ width: '100%' }}>
        {mealSlots.map(slot => {
            const meta = mealSlotMeta[slot];
            const range = template.mealSlotDishRanges[slot];
            const tagRequirements = template.mealSlotTagRequirements[slot] ?? [];
            const tagMinTotal = tagRequirements.reduce((sum, item) => sum + Math.max(0, item.min), 0);
            return <Box key={slot} style={{ width: '100%', boxSizing: 'border-box', border: `1px solid ${meta.border}`, borderRadius: 8, background: meta.background, padding: '9px 11px' }}>
                <Stack align='center' gap={9} wrap='wrap' style={{ width: '100%' }}>
                    <span style={{ width: 30, height: 30, borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: meta.tone, background: '#fff', border: `1px solid ${meta.border}`, fontSize: 16, flexShrink: 0 }}>{mealSlotIcon[slot]}</span>
                    <Typography.Text strong style={{ fontSize: 14, lineHeight: '20px', color: meta.tone, flex: 1, minWidth: 0 }}>{meta.label}</Typography.Text>
                    <Tag color='blue' icon={<NumberOutlined />} style={{ marginRight: 0 }}>{range.min}-{range.max} món</Tag>
                    {tagMinTotal > 0 && <Tag color='cyan' icon={<TagsOutlined />} style={{ marginRight: 0 }}>{tagMinTotal} loại bắt buộc</Tag>}
                </Stack>
                {tagRequirements.filter(item => item.min > 0).length > 0 && <Stack wrap='wrap' gap={5} style={{ marginTop: 8 }}>
                    {tagRequirements.filter(item => item.min > 0).map(item => <Tag key={item.tag} icon={<TagsOutlined />} style={{ marginRight: 0, color: '#0f766e', background: '#e6fffb', borderColor: 'rgba(19,168,168,0.40)' }}>{item.tag}: {item.min}</Tag>)}
                </Stack>}
            </Box>;
        })}
    </Stack>
);

// Self-contained template management UI (list + create/edit modal + handlers) without the page hero.
// Rendered both inside the standalone screen and as a section of the reuse-template page.
export const SmartPlannerTemplatesManager: React.FC = () => {
    const dispatch = useDispatch();
    const message = useMessage();
    const modal = useModal();
    const dishes = useSelector(selectDishes);
    const templates = useSelector(selectSmartPlannerTemplates);
    const tagRequirementOptions = useMemo(() => collectDishTagOptions(dishes), [dishes]);
    const [draft, setDraft] = useState<TemplateDraft>();

    const _openCreate = () => {
        setDraft({
            id: nanoid(10),
            name: '',
            createdAt: new Date().toISOString(),
            mealSlotDishRanges: cloneRanges(DEFAULT_MEAL_SLOT_DISH_RANGES),
            mealSlotTagRequirements: cloneTagRequirements(DEFAULT_MEAL_SLOT_TAG_REQUIREMENTS),
            isNew: true,
        });
    };

    const _openEdit = (template: SmartPlannerTemplate) => {
        setDraft({
            id: template.id,
            name: template.name,
            createdAt: template.createdAt,
            mealSlotDishRanges: cloneRanges(template.mealSlotDishRanges),
            mealSlotTagRequirements: cloneTagRequirements(template.mealSlotTagRequirements),
            isNew: false,
        });
    };

    const _stepDishRange = (slot: PlannerMealSlot, key: 'min' | 'max', delta: number) => {
        setDraft(current => {
            if (!current) return current;
            const range = current.mealSlotDishRanges[slot];
            const nextValue = Math.max(0, Math.min(MEAL_SLOT_RANGE_MAX, range[key] + delta));
            const nextRange = key === 'min'
                ? { min: nextValue, max: Math.max(nextValue, range.max) }
                : { min: Math.min(range.min, nextValue), max: nextValue };
            return { ...current, mealSlotDishRanges: { ...current.mealSlotDishRanges, [slot]: nextRange } };
        });
    };

    const _stepTagRequirement = (slot: PlannerMealSlot, tag: string, delta: number) => {
        setDraft(current => {
            if (!current) return current;
            const list = current.mealSlotTagRequirements[slot] ?? [];
            const existing = list.find(item => item.tag === tag);
            const currentMin = existing?.min ?? 0;
            const nextMin = Math.max(0, Math.min(MEAL_SLOT_RANGE_MAX, currentMin + delta));
            const nextList = nextMin <= 0
                ? list.filter(item => item.tag !== tag)
                : existing
                    ? list.map(item => item.tag === tag ? { ...item, min: nextMin } : item)
                    : [...list, { tag, min: nextMin }];
            return { ...current, mealSlotTagRequirements: { ...current.mealSlotTagRequirements, [slot]: nextList } };
        });
    };

    const _getDishRangeError = (ranges: SmartPlannerMealSlotDishRanges): string | null => {
        const hasAnyDish = mealSlots.some(slot => ranges[slot].max > 0);
        if (!hasAnyDish) return 'Cần ít nhất một bữa có số món lớn hơn 0.';
        const invalidSlot = mealSlots.find(slot => ranges[slot].min < 0 || ranges[slot].max < ranges[slot].min || ranges[slot].max > MEAL_SLOT_RANGE_MAX);
        if (invalidSlot) return `${mealSlotMeta[invalidSlot].label} cần có min >= 0, max >= min và max không quá ${MEAL_SLOT_RANGE_MAX}.`;
        return null;
    };

    const _saveDraft = () => {
        if (!draft) return;
        const name = draft.name.trim();
        if (!name) {
            message.error('Vui lòng nhập tên mẫu');
            return;
        }
        const error = _getDishRangeError(draft.mealSlotDishRanges);
        if (error) {
            message.error(error);
            return;
        }
        const payload: SmartPlannerTemplate = {
            id: draft.id,
            name,
            createdAt: draft.createdAt,
            mealSlotDishRanges: draft.mealSlotDishRanges,
            mealSlotTagRequirements: draft.mealSlotTagRequirements,
        };
        if (draft.isNew) {
            dispatch(addSmartPlannerTemplate(payload));
            message.success(`Đã tạo mẫu "${name}"`);
        } else {
            dispatch(updateSmartPlannerTemplate(payload));
            message.success(`Đã cập nhật mẫu "${name}"`);
        }
        setDraft(undefined);
    };

    const _removeTemplate = (template: SmartPlannerTemplate) => {
        modal.confirm({
            title: 'Xóa mẫu này?',
            content: `"${template.name}" sẽ bị xóa khỏi danh sách mẫu số món.`,
            okText: 'Xóa',
            cancelText: 'Hủy',
            okButtonProps: { danger: true },
            centered: true,
            onOk: () => {
                dispatch(removeSmartPlannerTemplate({ id: template.id }));
                message.success('Đã xóa mẫu');
            },
        });
    };

    const editModal = draft ? <Modal
        open={Boolean(draft)}
        onCancel={() => setDraft(undefined)}
        title={draft.isNew ? 'Tạo mẫu số món' : 'Sửa mẫu số món'}
        width={620}
        destroyOnClose
        footer={<Stack justify='flex-end' gap={8}>
            <Button onClick={() => setDraft(undefined)}>Hủy</Button>
            <Button type='primary' icon={<SaveOutlined />} onClick={_saveDraft}>Lưu mẫu</Button>
        </Stack>}
        bodyStyle={{ background: '#f8fafc' }}
    >
        <Stack direction='column' align='stretch' gap={10} style={{ width: '100%' }}>
            <div style={{ width: '100%' }}>
                <Typography.Text strong style={{ display: 'block', marginBottom: 6 }}>Tên mẫu</Typography.Text>
                <Input
                    value={draft.name}
                    placeholder='Ví dụ: Ngày thường, Cuối tuần...'
                    onChange={event => setDraft(current => current ? { ...current, name: event.target.value } : current)}
                />
            </div>
            {mealSlots.map(slot => {
                const meta = mealSlotMeta[slot];
                const range = draft.mealSlotDishRanges[slot];
                const tagRequirements = draft.mealSlotTagRequirements[slot] ?? [];
                const tagMinTotal = tagRequirements.reduce((sum, item) => sum + Math.max(0, item.min), 0);
                return <Box key={slot} style={{ width: '100%', boxSizing: 'border-box', border: `1px solid ${meta.border}`, borderRadius: 8, background: '#fff', padding: 12 }}>
                    <Stack justify='space-between' align='center' gap={10} wrap='wrap' style={{ width: '100%' }}>
                        <Stack align='center' gap={6} wrap='wrap' style={{ minWidth: 0 }}>
                            <span style={{ width: 28, height: 28, borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: meta.tone, background: meta.background, border: `1px solid ${meta.border}`, flexShrink: 0, fontSize: 15 }}>{mealSlotIcon[slot]}</span>
                            <Tag style={{ marginRight: 0, color: meta.tone, background: meta.background, borderColor: meta.border, minWidth: 52, textAlign: 'center' }}>{meta.label}</Tag>
                            <Tag color='blue' icon={<NumberOutlined />} style={{ marginRight: 0 }}>{range.min}-{range.max} món</Tag>
                            {tagMinTotal > 0 && <Tag color='cyan' icon={<TagsOutlined />} style={{ marginRight: 0 }}>{tagMinTotal} món bắt buộc</Tag>}
                        </Stack>
                        <Stack align='center' gap={10} wrap='wrap'>
                            {renderStepperControl('Min', range.min, () => _stepDishRange(slot, 'min', -1), () => _stepDishRange(slot, 'min', 1), range.min <= 0, range.min >= MEAL_SLOT_RANGE_MAX)}
                            {renderStepperControl('Max', range.max, () => _stepDishRange(slot, 'max', -1), () => _stepDishRange(slot, 'max', 1), range.max <= 0, range.max >= MEAL_SLOT_RANGE_MAX)}
                        </Stack>
                    </Stack>
                    <Collapse
                        ghost
                        size='small'
                        style={{ marginTop: 10, paddingTop: 8, borderTop: '1px dashed rgba(15,23,42,0.08)' }}
                        items={[{
                            key: `${slot}-tags`,
                            label: <Stack align='center' justify='space-between' gap={6} wrap='wrap' style={{ width: '100%' }}>
                                <Typography.Text strong style={{ fontSize: 12, lineHeight: '17px', color: '#334155' }}>Bắt buộc có loại món</Typography.Text>
                                <Typography.Text type='secondary' style={{ fontSize: 11, lineHeight: '16px' }}>Tổng yêu cầu: {tagMinTotal} món</Typography.Text>
                            </Stack>,
                            children: tagRequirementOptions.length === 0 ? <Typography.Text type='secondary' style={{ display: 'block', fontSize: 11, lineHeight: '16px' }}>Chưa có món nào gắn nhãn. Thêm tag cho món trong trang Món ăn để dùng tính năng này.</Typography.Text> : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 6 }}>
                                {tagRequirementOptions.map(tag => {
                                    const value = tagRequirements.find(item => item.tag === tag)?.min ?? 0;
                                    const active = value > 0;
                                    return <Stack key={tag} justify='space-between' align='center' gap={6} style={{ padding: '6px 8px', borderRadius: 6, border: `1px solid ${active ? 'rgba(19,168,168,0.40)' : 'rgba(15,23,42,0.08)'}`, background: active ? '#e6fffb' : '#f8fafc' }}>
                                        <Typography.Text style={{ fontSize: 12, lineHeight: '17px', color: active ? '#0f766e' : '#475569', overflowWrap: 'anywhere' }}>{tag}</Typography.Text>
                                        <Stack align='center' gap={3} style={{ flexShrink: 0 }}>
                                            <Button aria-label={`Giảm yêu cầu ${tag}`} icon={<MinusOutlined />} disabled={value <= 0} onClick={() => _stepTagRequirement(slot, tag, -1)} style={{ width: 24, height: 24, paddingInline: 0, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} />
                                            <span style={{ minWidth: 18, textAlign: 'center', fontSize: 12, fontWeight: 700, color: active ? '#0f766e' : '#9ca3af' }}>{value}</span>
                                            <Button aria-label={`Tăng yêu cầu ${tag}`} icon={<PlusOutlined />} disabled={value >= MEAL_SLOT_RANGE_MAX} onClick={() => _stepTagRequirement(slot, tag, 1)} style={{ width: 24, height: 24, paddingInline: 0, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} />
                                        </Stack>
                                    </Stack>;
                                })}
                            </div>,
                        }]}
                    />
                    {tagMinTotal > range.max && <Typography.Text style={{ display: 'block', color: '#ad4e00', fontSize: 11, lineHeight: '16px', marginTop: 6 }}>Yêu cầu loại món vượt quá max ({tagMinTotal} &gt; {range.max}) — planner sẽ tự nâng max khi gợi ý.</Typography.Text>}
                </Box>;
            })}
        </Stack>
    </Modal> : null;

    return <Box style={{ width: '100%' }}>
        {editModal}
        <Stack justify='flex-end' style={{ width: '100%', marginBottom: 12 }}>
            <Button type='primary' icon={<PlusOutlined />} onClick={_openCreate} style={{ flexShrink: 0 }}>Tạo mẫu</Button>
        </Stack>

        {templates.length === 0 ? <Box style={{ border: '1px dashed #d9d9d9', borderRadius: 8, background: '#fafafa', padding: '28px 12px' }}>
            <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description='Chưa có mẫu nào. Tạo mẫu số món để dùng lại nhanh khi lập thực đơn.'
            />
        </Box> : <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
            {templates.map(template => <Box key={template.id} style={{ border: '1px solid rgba(15,23,42,0.08)', borderRadius: 8, background: '#fff', padding: 12, boxShadow: '0 6px 16px rgba(15,23,42,0.05)' }}>
                <Stack justify='space-between' align='flex-start' gap={8} wrap='wrap' style={{ width: '100%', marginBottom: 10 }}>
                    <Typography.Text strong style={{ color: '#111827', fontSize: 16, lineHeight: '22px', overflowWrap: 'anywhere' }}>{template.name}</Typography.Text>
                    <Stack align='center' gap={6} style={{ flexShrink: 0 }}>
                        <Button icon={<EditOutlined />} onClick={() => _openEdit(template)}>Sửa</Button>
                        <Button danger icon={<DeleteOutlined />} onClick={() => _removeTemplate(template)}>Xóa</Button>
                    </Stack>
                </Stack>
                <TemplateDetail template={template} />
            </Box>)}
        </div>}
    </Box>;
};

// Standalone route screen: page hero + the shared manager. Kept functional (unlinked from drawer)
// so the route still resolves if reached directly.
export const SmartPlannerTemplatesScreen: React.FC = () => {
    useScreenTitle({ value: 'Mẫu số món', deps: [] });
    return <Box style={{ width: 'min(920px, calc(100vw - 24px))', margin: '0 auto', padding: '0 0 96px' }}>
        <Box style={{ border: '1px solid rgba(196,105,22,0.18)', borderRadius: 8, background: 'linear-gradient(135deg, #ffffff 0%, #fff7e6 100%)', padding: 12, marginBottom: 12, boxShadow: '0 10px 26px rgba(15,23,42,0.07)' }}>
            <Stack align='center' gap={9} style={{ width: '100%' }}>
                <span style={{ width: 42, height: 42, borderRadius: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#fff7e6', color: '#d46b08', border: '1px solid #ffd591', flexShrink: 0 }}>
                    <LayoutOutlined />
                </span>
                <div style={{ minWidth: 0, flex: 1 }}>
                    <Typography.Text style={{ display: 'block', color: '#d46b08', fontSize: 12, lineHeight: '16px', fontWeight: 800 }}>Lập thực đơn</Typography.Text>
                    <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 22, lineHeight: '28px' }}>Mẫu số món</Typography.Text>
                    <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '18px', marginTop: 3 }}>Tạo và quản lý các mẫu số món mỗi bữa cùng yêu cầu loại món để áp dụng nhanh khi lập thực đơn.</Typography.Text>
                </div>
            </Stack>
        </Box>
        <SmartPlannerTemplatesManager />
    </Box>;
};

export default SmartPlannerTemplatesScreen;
