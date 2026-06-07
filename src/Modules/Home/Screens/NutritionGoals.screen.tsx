import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { NutritionGoalHelper } from '@common/Helpers/NutritionGoalHelper';
import { Button } from '@components/Button';
import { Image } from '@components/Image';
import { Box } from '@components/Layout/Box';
import { Stack } from '@components/Layout/Stack';
import { useMessage } from '@components/Message';
import { Modal } from '@components/Modal';
import { useModal } from '@components/Modal/ModalProvider';
import { Tag } from '@components/Tag';
import { Typography } from '@components/Typography';
import { useAdminMode, useScreenTitle } from '@hooks';
import { NutritionGoal, NutritionGoalCriterion, NutritionGoalCriteriaDirection, NutritionGoalNutrientKey } from '@store/Models/SharedConfig';
import { removeNutritionGoal, resetNutritionGoals, upsertNutritionGoal } from '@store/Reducers/SharedConfigReducer';
import { selectNutritionGoals } from '@store/Selectors';
import { Input, InputNumber, Select } from 'antd';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import NutritionPlanIcon from '../../../../assets/icons/nutrition-plan.png';

const goalColors = ['#7436dc', '#1677ff', '#389e0d', '#d48806', '#cf1322', '#13a8a8'];

const createId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const createCriterion = (): NutritionGoalCriterion => ({
    id: createId('criterion'),
    nutrient: 'calories',
    direction: 'at_most',
    max: 600,
});

const createDraftGoal = (): NutritionGoal => ({
    id: createId('nutrition-goal'),
    name: '',
    description: '',
    color: goalColors[0],
    criteria: [createCriterion()],
});

const criterionNeedsMin = (direction: NutritionGoalCriteriaDirection) => direction === 'at_least' || direction === 'between';
const criterionNeedsMax = (direction: NutritionGoalCriteriaDirection) => direction === 'at_most' || direction === 'between';

const validateGoal = (goal: NutritionGoal): string | null => {
    if (!goal.name.trim()) return 'Nhập tên mục tiêu.';
    if (goal.criteria.length === 0) return 'Thêm ít nhất một tiêu chí dinh dưỡng.';
    for (const criterion of goal.criteria) {
        if (criterionNeedsMin(criterion.direction) && (criterion.min === undefined || criterion.min < 0)) return 'Nhập giá trị tối thiểu hợp lệ.';
        if (criterionNeedsMax(criterion.direction) && (criterion.max === undefined || criterion.max < 0)) return 'Nhập giá trị tối đa hợp lệ.';
        if (criterion.direction === 'between' && (criterion.min ?? 0) > (criterion.max ?? 0)) return 'Khoảng dinh dưỡng cần có tối thiểu nhỏ hơn tối đa.';
    }
    return null;
};

const normalizeNumber = (value: number | null): number | undefined => typeof value === 'number' && Number.isFinite(value) ? Math.round(value * 10) / 10 : undefined;

export const NutritionGoalsScreen = () => {
    const dispatch = useDispatch();
    const goals = useSelector(selectNutritionGoals);
    const { isAdmin } = useAdminMode();
    const message = useMessage();
    const modal = useModal();
    const [editorOpen, setEditorOpen] = React.useState(false);
    const [editingGoal, setEditingGoal] = React.useState<NutritionGoal | null>(null);
    const [draftGoal, setDraftGoal] = React.useState<NutritionGoal>(createDraftGoal);
    useScreenTitle({ value: 'Dinh dưỡng', deps: [] });

    const openCreate = () => {
        setDraftGoal(createDraftGoal());
        setEditingGoal(null);
        setEditorOpen(true);
    };

    const openEdit = (goal: NutritionGoal) => {
        setDraftGoal({ ...goal, criteria: goal.criteria.map(item => ({ ...item })) });
        setEditingGoal(goal);
        setEditorOpen(true);
    };

    const closeEditor = () => {
        setEditorOpen(false);
        setEditingGoal(null);
        setDraftGoal(createDraftGoal());
    };

    const updateCriterion = (criterionId: string, patch: Partial<NutritionGoalCriterion>) => {
        setDraftGoal(prev => ({
            ...prev,
            criteria: prev.criteria.map(criterion => criterion.id === criterionId ? { ...criterion, ...patch } : criterion),
        }));
    };

    const updateCriterionDirection = (criterionId: string, direction: NutritionGoalCriteriaDirection) => {
        setDraftGoal(prev => ({
            ...prev,
            criteria: prev.criteria.map(criterion => {
                if (criterion.id !== criterionId) return criterion;
                if (direction === 'at_least') return { ...criterion, direction, min: criterion.min ?? criterion.max ?? 10, max: undefined };
                if (direction === 'at_most') return { ...criterion, direction, max: criterion.max ?? criterion.min ?? 10, min: undefined };
                return { ...criterion, direction, min: criterion.min ?? 10, max: criterion.max ?? 20 };
            }),
        }));
    };

    const removeCriterion = (criterionId: string) => {
        setDraftGoal(prev => ({ ...prev, criteria: prev.criteria.filter(item => item.id !== criterionId) }));
    };

    const saveGoal = () => {
        const error = validateGoal(draftGoal);
        if (error) {
            message.error(error);
            return;
        }

        const now = new Date().toISOString();
        dispatch(upsertNutritionGoal({
            ...draftGoal,
            name: draftGoal.name.trim(),
            description: draftGoal.description?.trim(),
            createdAt: editingGoal?.createdAt ?? now,
            updatedAt: now,
        }));
        message.success(editingGoal ? 'Đã cập nhật mục tiêu dinh dưỡng' : 'Đã thêm mục tiêu dinh dưỡng');
        closeEditor();
    };

    const confirmDelete = (goal: NutritionGoal) => {
        modal.confirm({
            title: 'Xoá mục tiêu dinh dưỡng',
            content: `Bạn có chắc muốn xoá mục tiêu "${goal.name}"?`,
            okText: 'Xoá',
            cancelText: 'Huỷ',
            centered: true,
            onOk: () => {
                dispatch(removeNutritionGoal(goal.id));
                message.success('Đã xoá mục tiêu dinh dưỡng');
            },
        });
    };

    const confirmReset = () => {
        modal.confirm({
            title: 'Khôi phục mục tiêu mặc định',
            content: 'Thao tác này sẽ thay danh sách mục tiêu hiện tại bằng bộ mặc định.',
            okText: 'Khôi phục',
            cancelText: 'Huỷ',
            centered: true,
            onOk: () => {
                dispatch(resetNutritionGoals());
                message.success('Đã khôi phục mục tiêu mặc định');
            },
        });
    };

    return <Box style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 0 14px', maxWidth: 980, margin: '0 auto' }}>
        <Box style={{ borderRadius: 8, padding: 14, background: 'linear-gradient(135deg, #8f46f7 0%, #7436dc 58%, #5e2bbf 100%)', color: '#fff', boxShadow: '0 18px 36px rgba(74,48,130,0.24)' }}>
            <Stack justify='space-between' align='flex-start' gap={12}>
                <div style={{ minWidth: 0 }}>
                    <Typography.Text style={{ display: 'block', color: 'rgba(255,255,255,0.82)', fontSize: 12, lineHeight: '16px', fontWeight: 650 }}>My Recipes</Typography.Text>
                    <Typography.Text strong style={{ display: 'block', color: '#fff', fontSize: 22, lineHeight: '28px' }}>Dinh dưỡng</Typography.Text>
                    <Typography.Text style={{ display: 'block', color: 'rgba(255,255,255,0.78)', fontSize: 12, lineHeight: '17px', marginTop: 4 }}>Tạo các bộ tiêu chí để gợi ý món ăn theo kcal, đạm, chất béo, chất xơ và vi chất.</Typography.Text>
                </div>
                {isAdmin && <Stack gap={8} wrap='wrap' style={{ flexShrink: 0 }}>
                    <Button icon={<ReloadOutlined />} onClick={confirmReset} style={{ borderRadius: 999, background: 'rgba(255,255,255,0.14)', borderColor: 'rgba(255,255,255,0.28)', color: '#fff' }}>Mặc định</Button>
                    <Button type='primary' icon={<PlusOutlined />} onClick={openCreate} style={{ borderRadius: 999, background: '#fff', borderColor: '#fff', color: '#5e2bbf', fontWeight: 750 }}>Thêm</Button>
                </Stack>}
            </Stack>
        </Box>

        {!isAdmin && <Box style={{ border: '1px solid rgba(116,54,220,0.12)', borderRadius: 0, background: '#fff', padding: 11 }}>
            <Typography.Text type='secondary' style={{ fontSize: 12, lineHeight: '17px' }}>Bạn có thể xem mục tiêu. Đăng nhập admin để thêm, sửa hoặc xoá mục tiêu dùng chung.</Typography.Text>
        </Box>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 12 }}>
            {goals.map(goal => (
                <Box key={goal.id} style={{ border: `1px solid ${goal.color ?? '#7436dc'}22`, borderRadius: 8, background: '#fff', padding: 12, boxShadow: '0 10px 24px rgba(74,48,130,0.08)', minWidth: 0 }}>
                    <Stack justify='space-between' align='flex-start' gap={8} style={{ marginBottom: 8 }}>
                        <Stack align='flex-start' gap={9} style={{ minWidth: 0 }}>
                            <span style={{ width: 36, height: 36, borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: goal.color ?? '#7436dc', background: `${goal.color ?? '#7436dc'}14`, border: `1px solid ${goal.color ?? '#7436dc'}24`, flexShrink: 0 }}><Image src={NutritionPlanIcon} preview={false} width={24} alt="" /></span>
                            <div style={{ minWidth: 0 }}>
                                <Typography.Text strong style={{ display: 'block', fontSize: 16, lineHeight: '21px', color: '#111827', overflowWrap: 'anywhere' }}>{goal.name}</Typography.Text>
                                {goal.description && <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '16px', marginTop: 2 }}>{goal.description}</Typography.Text>}
                            </div>
                        </Stack>
                        {isAdmin && <Stack gap={4} style={{ flexShrink: 0 }}>
                            <Button type='text' aria-label={`Sửa ${goal.name}`} icon={<EditOutlined />} onClick={() => openEdit(goal)} style={{ width: 32, height: 32, borderRadius: 8, paddingInline: 0 }} />
                            <Button type='text' danger aria-label={`Xoá ${goal.name}`} icon={<DeleteOutlined />} onClick={() => confirmDelete(goal)} style={{ width: 32, height: 32, borderRadius: 8, paddingInline: 0 }} />
                        </Stack>}
                    </Stack>
                    <Stack wrap='wrap' gap={6}>
                        {goal.criteria.map(criterion => <Tag key={criterion.id} color='purple' style={{ marginInlineEnd: 0, maxWidth: '100%', whiteSpace: 'normal' }}>{NutritionGoalHelper.formatCriterion(criterion)}</Tag>)}
                    </Stack>
                </Box>
            ))}
        </div>

        <Modal
            title={editingGoal ? 'Sửa mục tiêu dinh dưỡng' : 'Thêm mục tiêu dinh dưỡng'}
            open={editorOpen && isAdmin}
            onCancel={closeEditor}
            footer={<Stack justify='flex-end' gap={8}><Button onClick={closeEditor}>Huỷ</Button><Button type='primary' onClick={saveGoal}>Lưu</Button></Stack>}
            width='min(720px, calc(100vw - 24px))'
            destroyOnClose={false}
        >
            <Stack direction='column' align='stretch' gap={12}>
                <div>
                    <Typography.Text strong style={{ display: 'block', fontSize: 12, marginBottom: 5 }}>Tên mục tiêu</Typography.Text>
                    <Input value={draftGoal.name} onChange={event => setDraftGoal(prev => ({ ...prev, name: event.target.value }))} placeholder='Ví dụ: Giảm mỡ, Giàu đạm buổi trưa...' />
                </div>
                <div>
                    <Typography.Text strong style={{ display: 'block', fontSize: 12, marginBottom: 5 }}>Mô tả</Typography.Text>
                    <Input.TextArea value={draftGoal.description} onChange={event => setDraftGoal(prev => ({ ...prev, description: event.target.value }))} rows={2} placeholder='Mô tả ngắn để dễ nhớ mục tiêu này dùng khi nào.' />
                </div>
                <div>
                    <Typography.Text strong style={{ display: 'block', fontSize: 12, marginBottom: 6 }}>Màu nhận diện</Typography.Text>
                    <Stack wrap='wrap' gap={7}>
                        {goalColors.map(color => <button key={color} type='button' aria-label={`Chọn màu ${color}`} onClick={() => setDraftGoal(prev => ({ ...prev, color }))} style={{ width: 30, height: 30, borderRadius: 999, border: draftGoal.color === color ? '3px solid #111827' : '1px solid #d9d9d9', background: color, cursor: 'pointer' }} />)}
                    </Stack>
                </div>

                <Stack justify='space-between' align='center' gap={8}>
                    <Typography.Text strong>Tiêu chí dinh dưỡng / khẩu phần</Typography.Text>
                    <Button icon={<PlusOutlined />} onClick={() => setDraftGoal(prev => ({ ...prev, criteria: [...prev.criteria, createCriterion()] }))}>Thêm tiêu chí</Button>
                </Stack>

                <Stack direction='column' align='stretch' gap={8}>
                    {draftGoal.criteria.map(criterion => (
                        <Box key={criterion.id} style={{ border: '1px solid #f0f0f0', borderRadius: 0, padding: 9, background: '#fbf9ff' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(118px, 1fr))', gap: 8, alignItems: 'end' }}>
                                <div>
                                    <Typography.Text type='secondary' style={{ display: 'block', fontSize: 11, marginBottom: 3 }}>Chỉ số</Typography.Text>
                                    <Select
                                        value={criterion.nutrient}
                                        onChange={(value: NutritionGoalNutrientKey) => updateCriterion(criterion.id, { nutrient: value })}
                                        style={{ width: '100%' }}
                                        options={NutritionGoalHelper.nutrientOptions.map(item => ({ value: item.value, label: item.label }))}
                                    />
                                </div>
                                <div>
                                    <Typography.Text type='secondary' style={{ display: 'block', fontSize: 11, marginBottom: 3 }}>Điều kiện</Typography.Text>
                                    <Select
                                        value={criterion.direction}
                                        onChange={value => updateCriterionDirection(criterion.id, value)}
                                        style={{ width: '100%' }}
                                        options={NutritionGoalHelper.directionOptions.map(item => ({ value: item.value, label: item.label }))}
                                    />
                                </div>
                                <div>
                                    <Typography.Text type='secondary' style={{ display: 'block', fontSize: 11, marginBottom: 3 }}>Tối thiểu</Typography.Text>
                                    <InputNumber
                                        min={0}
                                        step={0.5}
                                        disabled={!criterionNeedsMin(criterion.direction)}
                                        value={criterion.min}
                                        onChange={value => updateCriterion(criterion.id, { min: normalizeNumber(value) })}
                                        addonAfter={NutritionGoalHelper.getNutrientUnit(criterion.nutrient)}
                                        style={{ width: '100%' }}
                                    />
                                </div>
                                <div>
                                    <Typography.Text type='secondary' style={{ display: 'block', fontSize: 11, marginBottom: 3 }}>Tối đa</Typography.Text>
                                    <InputNumber
                                        min={0}
                                        step={0.5}
                                        disabled={!criterionNeedsMax(criterion.direction)}
                                        value={criterion.max}
                                        onChange={value => updateCriterion(criterion.id, { max: normalizeNumber(value) })}
                                        addonAfter={NutritionGoalHelper.getNutrientUnit(criterion.nutrient)}
                                        style={{ width: '100%' }}
                                    />
                                </div>
                                <Button type='text' danger icon={<DeleteOutlined />} aria-label='Xoá tiêu chí' onClick={() => removeCriterion(criterion.id)} style={{ width: 34, height: 34, borderRadius: 8, paddingInline: 0 }} />
                            </div>
                        </Box>
                    ))}
                </Stack>
            </Stack>
        </Modal>
    </Box>;
};
