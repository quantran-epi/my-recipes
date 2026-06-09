import { DeleteOutlined, PlusOutlined, UserOutlined } from '@ant-design/icons';
import { Button } from '@components/Button';
import { Image } from '@components/Image';
import { Box } from '@components/Layout/Box';
import { Stack } from '@components/Layout/Stack';
import { useMessage } from '@components/Message';
import { Tag } from '@components/Tag';
import { Typography } from '@components/Typography';
import { useScreenTitle } from '@hooks';
import { DISH_TAGS } from '@store/Models/Dishes';
import { HouseholdMemberProfile, removeHouseholdMemberProfile, setSelectedHouseholdMemberIds, upsertHouseholdMemberProfile } from '@store/Reducers/AppContextReducer';
import { selectDishes, selectHouseholdMembers, selectIngredients, selectNutritionGoals, selectSelectedHouseholdMemberIds } from '@store/Selectors';
import { Empty, Input, InputNumber, Popconfirm, Select } from 'antd';
import { nanoid } from 'nanoid';
import React, { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import FamilyIcon from '../../../../assets/icons/family.png';

const MEMBER_COLORS = ['#1677ff', '#52c41a', '#fa8c16', '#eb2f96', '#722ed1', '#13a8a8', '#f5222d', '#2f54eb'];

const pageCss = `
.household-page {
    width: min(1180px, calc(100vw - 24px));
    margin: 0 auto;
    padding: 0 0 96px;
}
.household-hero {
    border-radius: 8px;
    border: 1px solid rgba(22,119,255,0.14);
    background: linear-gradient(135deg, #ffffff 0%, #f0f7ff 48%, #f7fffb 100%);
    box-shadow: 0 12px 28px rgba(15,23,42,0.08);
    padding: 14px;
    margin-bottom: 12px;
}
.household-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;
}
.household-panel {
    border-radius: 8px;
    border: 1px solid rgba(15,23,42,0.08);
    background: #fff;
    box-shadow: 0 10px 24px rgba(15,23,42,0.06);
    padding: 12px;
}
.household-member-button {
    width: 100%;
    border: 1px solid #e8edf7;
    background: #fff;
    border-radius: 8px;
    min-height: 72px;
    padding: 11px 12px;
    text-align: left;
    cursor: pointer;
    display: grid;
    grid-template-columns: 42px minmax(0, 1fr) auto;
    gap: 11px;
    align-items: center;
}
.household-member-button.active {
    border-color: rgba(22,119,255,0.42);
    background: #f0f7ff;
    box-shadow: 0 8px 18px rgba(22,119,255,0.10);
}
.household-member-list {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 8px;
}
.household-editor-panel {
    background: linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
}
`;

const fieldGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: 10,
};

const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <Typography.Text strong style={{ display: 'block', fontSize: 12, lineHeight: '16px', marginBottom: 5, color: '#374151' }}>{children}</Typography.Text>
);

export const HouseholdProfilesScreen: React.FC = () => {
    useScreenTitle({ value: 'Nhà mình', deps: [] });
    const dispatch = useDispatch();
    const message = useMessage();
    const members = useSelector(selectHouseholdMembers);
    const selectedMemberIds = useSelector(selectSelectedHouseholdMemberIds);
    const dishes = useSelector(selectDishes);
    const ingredients = useSelector(selectIngredients);
    const nutritionGoals = useSelector(selectNutritionGoals);
    const [activeMemberId, setActiveMemberId] = useState<string | undefined>(() => members[0]?.id);

    React.useEffect(() => {
        if (activeMemberId && members.some(member => member.id === activeMemberId)) return;
        setActiveMemberId(members[0]?.id);
    }, [activeMemberId, members]);

    const activeMember = members.find(member => member.id === activeMemberId);
    const selectedSet = useMemo(() => new Set(selectedMemberIds), [selectedMemberIds]);

    const dishOptions = useMemo(() => dishes
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(dish => ({ value: dish.id, label: dish.name })), [dishes]);

    const ingredientOptions = useMemo(() => ingredients
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(ingredient => ({ value: ingredient.id, label: ingredient.name })), [ingredients]);

    const tagOptions = useMemo(() => {
        const tags = new Set<string>(DISH_TAGS);
        dishes.forEach(dish => dish.tags?.forEach(tag => tags.add(tag)));
        return Array.from(tags).sort((a, b) => a.localeCompare(b)).map(tag => ({ value: tag, label: tag }));
    }, [dishes]);

    const _createMember = () => {
        const now = new Date().toISOString();
        const id = nanoid(8);
        const member: HouseholdMemberProfile = {
            id,
            name: `Thành viên ${members.length + 1}`,
            color: MEMBER_COLORS[members.length % MEMBER_COLORS.length],
            favoriteDishIds: [],
            avoidedDishIds: [],
            favoriteIngredientIds: [],
            avoidedIngredientIds: [],
            preferredTags: [],
            avoidedTags: [],
            portionPreference: 1,
            createdAt: now,
            updatedAt: now,
        };
        dispatch(upsertHouseholdMemberProfile(member));
        dispatch(setSelectedHouseholdMemberIds(Array.from(new Set([...selectedMemberIds, id]))));
        setActiveMemberId(id);
        message.success('Đã thêm hồ sơ thành viên');
    };

    const _updateMember = (member: HouseholdMemberProfile, patch: Partial<HouseholdMemberProfile>) => {
        dispatch(upsertHouseholdMemberProfile({ ...member, ...patch }));
    };

    const _removeMember = (member: HouseholdMemberProfile) => {
        dispatch(removeHouseholdMemberProfile(member.id));
        message.success(`Đã xoá hồ sơ ${member.name}`);
    };

    const _toggleSelectedMember = (memberId: string) => {
        const next = selectedSet.has(memberId)
            ? selectedMemberIds.filter(id => id !== memberId)
            : [...selectedMemberIds, memberId];
        dispatch(setSelectedHouseholdMemberIds(next));
    };

    return <Box className='household-page' data-testid='household-profiles-page'>
        <style>{pageCss}</style>
        <Box className='household-hero'>
            <Stack justify='space-between' align='center' gap={12} wrap='wrap'>
                <Stack align='center' gap={10} style={{ minWidth: 0 }}>
                    <span style={{ width: 44, height: 44, borderRadius: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#e6f4ff', border: '1px solid #91caff', flexShrink: 0 }}>
                        <Image src={FamilyIcon} preview={false} width={27} alt='' />
                    </span>
                    <div style={{ minWidth: 0 }}>
                        <Typography.Text style={{ display: 'block', color: '#1677ff', fontSize: 12, lineHeight: '16px', fontWeight: 800 }}>Nhà mình</Typography.Text>
                        <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 24, lineHeight: '31px' }}>Hồ sơ thành viên</Typography.Text>
                        <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '18px', marginTop: 3 }}>Lưu món thích, món tránh, khẩu phần và mục tiêu riêng cho từng người.</Typography.Text>
                    </div>
                </Stack>
                <Button type='primary' icon={<PlusOutlined />} onClick={_createMember}>Thêm thành viên</Button>
            </Stack>
        </Box>

        <div className='household-layout'>
            <Box className='household-panel'>
                <Stack justify='space-between' align='center' style={{ marginBottom: 10 }}>
                    <Typography.Text strong>{members.length} thành viên</Typography.Text>
                    <Tag color='blue' style={{ marginRight: 0 }}>{selectedMemberIds.length || members.length} đang dùng</Tag>
                </Stack>
                {members.length === 0 ? <Empty description='Chưa có hồ sơ thành viên' image={Empty.PRESENTED_IMAGE_SIMPLE} /> : <div className='household-member-list'>
                    {members.map(member => {
                        const active = activeMember?.id === member.id;
                        const selected = selectedSet.has(member.id) || selectedMemberIds.length === 0;
                        return <button key={member.id} type='button' className={`household-member-button${active ? ' active' : ''}`} onClick={() => setActiveMemberId(member.id)}>
                            <span style={{ width: 42, height: 42, borderRadius: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: `${member.color ?? '#1677ff'}18`, color: member.color ?? '#1677ff', border: `1px solid ${member.color ?? '#1677ff'}30` }}>
                                <UserOutlined />
                            </span>
                            <span style={{ minWidth: 0 }}>
                                <Typography.Text strong style={{ display: 'block', color: '#111827', lineHeight: '18px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.name}</Typography.Text>
                                <Typography.Text type='secondary' style={{ display: 'block', fontSize: 11, lineHeight: '15px' }}>
                                    {(member.favoriteDishIds.length + member.favoriteIngredientIds.length + member.preferredTags.length)} thích · {(member.avoidedDishIds.length + member.avoidedIngredientIds.length + member.avoidedTags.length)} tránh
                                </Typography.Text>
                            </span>
                            <Tag color={selected ? 'green' : 'default'} style={{ marginRight: 0 }}>{selected ? 'Dùng' : 'Tắt'}</Tag>
                        </button>;
                    })}
                </div>}
            </Box>

            <Box className='household-panel household-editor-panel'>
                {!activeMember ? <Box style={{ minHeight: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Empty description='Chọn hoặc thêm một thành viên để chỉnh hồ sơ' image={Empty.PRESENTED_IMAGE_SIMPLE} />
                </Box> : <Stack direction='column' gap={14}>
                    <Stack justify='space-between' align='flex-start' gap={10} wrap='wrap'>
                        <Stack align='center' gap={10} style={{ minWidth: 0 }}>
                            <span style={{ width: 42, height: 42, borderRadius: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: `${activeMember.color ?? '#1677ff'}18`, color: activeMember.color ?? '#1677ff', border: `1px solid ${activeMember.color ?? '#1677ff'}30`, flexShrink: 0 }}>
                                <UserOutlined style={{ fontSize: 20 }} />
                            </span>
                            <div style={{ minWidth: 0 }}>
                                <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 18, lineHeight: '24px', overflowWrap: 'anywhere' }}>{activeMember.name}</Typography.Text>
                                <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '17px' }}>Tự lưu khi chỉnh sửa</Typography.Text>
                            </div>
                        </Stack>
                        <Stack gap={8}>
                            <Button onClick={() => _toggleSelectedMember(activeMember.id)}>{selectedSet.has(activeMember.id) || selectedMemberIds.length === 0 ? 'Đang dùng' : 'Dùng khi gợi ý'}</Button>
                            <Popconfirm title='Xoá hồ sơ này?' okText='Xoá' cancelText='Huỷ' okButtonProps={{ danger: true }} onConfirm={() => _removeMember(activeMember)}>
                                <Button danger icon={<DeleteOutlined />}>Xoá</Button>
                            </Popconfirm>
                        </Stack>
                    </Stack>

                    <div style={fieldGridStyle}>
                        <div>
                            <FieldLabel>Tên</FieldLabel>
                            <Input value={activeMember.name} onChange={event => _updateMember(activeMember, { name: event.target.value })} placeholder='Tên thành viên' />
                        </div>
                        <div>
                            <FieldLabel>Khẩu phần thường ăn</FieldLabel>
                            <InputNumber min={0.5} max={12} step={0.5} value={activeMember.portionPreference ?? 1} addonAfter='phần' onChange={value => _updateMember(activeMember, { portionPreference: Number(value ?? 1) })} style={{ width: '100%' }} />
                        </div>
                        <div>
                            <FieldLabel>Thời gian nấu tối đa</FieldLabel>
                            <InputNumber min={5} max={480} step={5} value={activeMember.maxCookMinutes} addonAfter='phút' placeholder='Không giới hạn' onChange={value => _updateMember(activeMember, { maxCookMinutes: value === null ? undefined : Number(value) })} style={{ width: '100%' }} />
                        </div>
                        <div>
                            <FieldLabel>Mục tiêu dinh dưỡng</FieldLabel>
                            <Select allowClear placeholder='Chọn mục tiêu' value={activeMember.nutritionGoalId} onChange={value => _updateMember(activeMember, { nutritionGoalId: value })} options={nutritionGoals.map(goal => ({ value: goal.id, label: goal.name }))} style={{ width: '100%' }} />
                        </div>
                    </div>

                    <div>
                        <FieldLabel>Màu hồ sơ</FieldLabel>
                        <Stack wrap='wrap' gap={8}>
                            {MEMBER_COLORS.map(color => <button key={color} type='button' aria-label={`Chọn màu ${color}`} onClick={() => _updateMember(activeMember, { color })} style={{ width: 32, height: 32, borderRadius: 12, border: activeMember.color === color ? '3px solid #111827' : '1px solid #d9d9d9', background: color, cursor: 'pointer' }} />)}
                        </Stack>
                    </div>

                    <div style={fieldGridStyle}>
                        <div>
                            <FieldLabel>Món thích</FieldLabel>
                            <Select mode='multiple' allowClear maxTagCount='responsive' value={activeMember.favoriteDishIds} onChange={ids => _updateMember(activeMember, { favoriteDishIds: ids, avoidedDishIds: activeMember.avoidedDishIds.filter(id => !ids.includes(id)) })} options={dishOptions} style={{ width: '100%' }} placeholder='Chọn món' />
                        </div>
                        <div>
                            <FieldLabel>Món tránh</FieldLabel>
                            <Select mode='multiple' allowClear maxTagCount='responsive' value={activeMember.avoidedDishIds} onChange={ids => _updateMember(activeMember, { avoidedDishIds: ids, favoriteDishIds: activeMember.favoriteDishIds.filter(id => !ids.includes(id)) })} options={dishOptions} style={{ width: '100%' }} placeholder='Chọn món' />
                        </div>
                        <div>
                            <FieldLabel>Nguyên liệu thích</FieldLabel>
                            <Select mode='multiple' allowClear maxTagCount='responsive' value={activeMember.favoriteIngredientIds} onChange={ids => _updateMember(activeMember, { favoriteIngredientIds: ids, avoidedIngredientIds: activeMember.avoidedIngredientIds.filter(id => !ids.includes(id)) })} options={ingredientOptions} style={{ width: '100%' }} placeholder='Chọn nguyên liệu' />
                        </div>
                        <div>
                            <FieldLabel>Nguyên liệu tránh</FieldLabel>
                            <Select mode='multiple' allowClear maxTagCount='responsive' value={activeMember.avoidedIngredientIds} onChange={ids => _updateMember(activeMember, { avoidedIngredientIds: ids, favoriteIngredientIds: activeMember.favoriteIngredientIds.filter(id => !ids.includes(id)) })} options={ingredientOptions} style={{ width: '100%' }} placeholder='Chọn nguyên liệu' />
                        </div>
                        <div>
                            <FieldLabel>Kiểu món thích</FieldLabel>
                            <Select mode='multiple' allowClear maxTagCount='responsive' value={activeMember.preferredTags} onChange={tags => _updateMember(activeMember, { preferredTags: tags, avoidedTags: activeMember.avoidedTags.filter(tag => !tags.includes(tag)) })} options={tagOptions} style={{ width: '100%' }} placeholder='Chọn tag' />
                        </div>
                        <div>
                            <FieldLabel>Kiểu món tránh</FieldLabel>
                            <Select mode='multiple' allowClear maxTagCount='responsive' value={activeMember.avoidedTags} onChange={tags => _updateMember(activeMember, { avoidedTags: tags, preferredTags: activeMember.preferredTags.filter(tag => !tags.includes(tag)) })} options={tagOptions} style={{ width: '100%' }} placeholder='Chọn tag' />
                        </div>
                    </div>

                    <div>
                        <FieldLabel>Ghi chú riêng</FieldLabel>
                        <Input.TextArea value={activeMember.notes} onChange={event => _updateMember(activeMember, { notes: event.target.value })} placeholder='Ví dụ: ăn ít cay, không đậu phộng, khẩu phần trẻ em...' autoSize={{ minRows: 3, maxRows: 6 }} />
                    </div>
                </Stack>}
            </Box>
        </div>
    </Box>;
};

export default HouseholdProfilesScreen;
