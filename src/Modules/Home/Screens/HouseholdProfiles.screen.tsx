import { DeleteOutlined, PlusOutlined, SaveOutlined, UserOutlined } from '@ant-design/icons';
import { Button } from '@components/Button';
import { createSelectedOptionsDropdownRender, renderResponsiveTagPlaceholder } from '@components/Form/Select';
import { Image } from '@components/Image';
import { Box } from '@components/Layout/Box';
import { Stack } from '@components/Layout/Stack';
import { useMessage } from '@components/Message';
import { Tag } from '@components/Tag';
import { Typography } from '@components/Typography';
import { useScreenTitle } from '@hooks';
import { HouseholdHealthStatusTag, HouseholdHealthWidget } from './HouseholdHealth.widget';
import { DISH_TAGS } from '@store/Models/Dishes';
import { HouseholdMemberProfile, removeHouseholdMemberProfile, setCurrentHouseholdMemberId, setSelectedHouseholdMemberIds, upsertHouseholdMemberProfile } from '@store/Reducers/AppContextReducer';
import { selectCurrentHouseholdMemberId, selectDishes, selectHouseholdHealthProfiles, selectHouseholdMembers, selectIngredients, selectNutritionGoals, selectSelectedHouseholdMemberIds } from '@store/Selectors';
import { Empty, Input, InputNumber, Popconfirm, Segmented, Select, Switch } from 'antd';
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
.household-member-row {
    width: 100%;
    border: 1px solid #e8edf7;
    background: #fff;
    border-radius: 8px;
    min-height: 76px;
    padding: 10px 12px;
    text-align: left;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(132px, auto);
    gap: 12px;
    align-items: center;
}
.household-member-row.active {
    border-color: rgba(22,119,255,0.42);
    background: #f0f7ff;
    box-shadow: 0 8px 18px rgba(22,119,255,0.10);
}
.household-member-main {
    width: 100%;
    border: 0;
    background: transparent;
    padding: 0;
    text-align: left;
    cursor: pointer;
    display: grid;
    grid-template-columns: 42px minmax(0, 1fr);
    gap: 11px;
    align-items: center;
    font: inherit;
}
.household-member-toggle {
    display: grid;
    justify-items: end;
    gap: 4px;
    min-width: 112px;
    width: 100%;
    justify-self: end;
}
.household-member-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}
.household-editor-panel {
    background: linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
}
.household-editor-panel > * {
    width: 100%;
}
.household-editor-panel .ant-space,
.household-editor-panel .ant-space-item {
    width: 100%;
}
.household-editor-actions {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 10px;
    align-items: center;
    width: 100%;
    justify-items: end;
}
.household-editor-switches {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 8px;
    width: 100%;
}
.household-editor-action-buttons {
    display: flex;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 8px;
}
.household-editor-switch {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 9px;
    align-items: center;
    border: 1px solid rgba(22,119,255,0.12);
    border-radius: 8px;
    background: #fff;
    padding: 8px 10px;
    width: 100%;
    justify-self: stretch;
}
.household-editor-heading {
    display: grid;
    grid-template-columns: 42px minmax(0, 1fr);
    gap: 10px;
    align-items: center;
    min-width: 0;
    width: 100%;
    text-align: left;
}
.household-color-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    width: 100%;
}
.household-field-list {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 10px;
    width: 100%;
}
.household-field-row {
    display: grid;
    grid-template-columns: minmax(140px, 190px) minmax(0, 1fr);
    gap: 12px;
    align-items: start;
    border-top: 1px solid rgba(15,23,42,0.06);
    padding-top: 10px;
    width: 100%;
}
.household-field-control {
    min-width: 0;
    width: 100%;
}
.household-field-control .ant-input,
.household-field-control .ant-select,
.household-field-control .ant-input-number,
.household-field-control .ant-input-number-group-wrapper,
.household-field-control textarea {
    width: 100% !important;
}
.household-field-row:first-child {
    border-top: 0;
    padding-top: 0;
}
@media (max-width: 700px) {
    .household-editor-actions,
    .household-field-row {
        grid-template-columns: minmax(0, 1fr);
    }
    .household-member-row {
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 8px;
    }
    .household-member-toggle {
        justify-items: end;
        min-width: 0;
        width: auto;
    }
    .household-editor-actions {
        justify-items: stretch;
    }
    .household-editor-action-buttons {
        justify-content: stretch;
    }
    .household-editor-action-buttons .ant-btn {
        flex: 1 1 120px;
    }
    .household-editor-switch {
        grid-template-columns: minmax(0, 1fr) auto;
        width: 100%;
    }
}
`;

const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <Typography.Text strong style={{ display: 'block', fontSize: 12, lineHeight: '16px', marginBottom: 5, color: '#374151' }}>{children}</Typography.Text>
);

export const HouseholdProfilesScreen: React.FC = () => {
    useScreenTitle({ value: 'Nhà mình', deps: [] });
    const dispatch = useDispatch();
    const message = useMessage();
    const members = useSelector(selectHouseholdMembers);
    const selectedMemberIds = useSelector(selectSelectedHouseholdMemberIds);
    const currentHouseholdMemberId = useSelector(selectCurrentHouseholdMemberId);
    const dishes = useSelector(selectDishes);
    const ingredients = useSelector(selectIngredients);
    const nutritionGoals = useSelector(selectNutritionGoals);
    const healthProfiles = useSelector(selectHouseholdHealthProfiles);
    const [activeMemberId, setActiveMemberId] = useState<string | undefined>(() => members[0]?.id);
    const [draftMember, setDraftMember] = useState<HouseholdMemberProfile | null>(null);
    const [editorMode, setEditorMode] = useState<'food' | 'health'>('food');

    React.useEffect(() => {
        if (activeMemberId && members.some(member => member.id === activeMemberId)) return;
        setActiveMemberId(members[0]?.id);
    }, [activeMemberId, members]);

    const activeMember = members.find(member => member.id === activeMemberId);

    React.useEffect(() => {
        if (!activeMember) {
            setDraftMember(null);
            return;
        }

        setDraftMember({
            ...activeMember,
            favoriteDishIds: [...activeMember.favoriteDishIds],
            avoidedDishIds: [...activeMember.avoidedDishIds],
            favoriteIngredientIds: [...activeMember.favoriteIngredientIds],
            avoidedIngredientIds: [...activeMember.avoidedIngredientIds],
            allergenIngredientIds: [...activeMember.allergenIngredientIds],
            hardExcludedIngredientIds: [...activeMember.hardExcludedIngredientIds],
            preferredTags: [...activeMember.preferredTags],
            avoidedTags: [...activeMember.avoidedTags],
        });
    }, [activeMember]);

    const effectiveSelectedMemberIds = useMemo(() => {
        if (selectedMemberIds.length === 0) return members.map(member => member.id);
        const memberIds = new Set(members.map(member => member.id));
        return selectedMemberIds.filter(id => memberIds.has(id));
    }, [members, selectedMemberIds]);
    const selectedSet = useMemo(() => new Set(effectiveSelectedMemberIds), [effectiveSelectedMemberIds]);

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
            allergenIngredientIds: [],
            hardExcludedIngredientIds: [],
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

    const _updateDraftMember = (patch: Partial<HouseholdMemberProfile>) => {
        setDraftMember(current => current ? { ...current, ...patch } : current);
    };

    const _saveDraftMember = () => {
        if (!draftMember) return;
        dispatch(upsertHouseholdMemberProfile(draftMember));
        message.success(`Đã lưu hồ sơ ${draftMember.name.trim() || 'thành viên'}`);
    };

    const _removeMember = (member: HouseholdMemberProfile) => {
        dispatch(removeHouseholdMemberProfile(member.id));
        message.success(`Đã xoá hồ sơ ${member.name}`);
    };

    const _setMemberSelected = (memberId: string, selected: boolean) => {
        const baseIds = selectedMemberIds.length === 0 ? members.map(member => member.id) : effectiveSelectedMemberIds;
        if (!selected && baseIds.length <= 1) return;
        const next = selected
            ? Array.from(new Set([...baseIds, memberId]))
            : baseIds.filter(id => id !== memberId);
        dispatch(setSelectedHouseholdMemberIds(next));
    };

    const _setCurrentMember = (member: HouseholdMemberProfile, current: boolean) => {
        dispatch(setCurrentHouseholdMemberId(current ? member.id : undefined));
        message.success(current ? `Đã đánh dấu ${member.name} là tôi` : 'Đã bỏ đánh dấu hồ sơ tôi');
    };

    const activeMemberSelected = activeMember ? selectedSet.has(activeMember.id) : false;
    const activeMemberIsCurrent = activeMember ? activeMember.id === currentHouseholdMemberId : false;

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
                    <Tag color='blue' style={{ marginRight: 0 }}>{selectedSet.size} đang dùng</Tag>
                </Stack>
                {members.length === 0 ? <Empty description='Chưa có hồ sơ thành viên' image={Empty.PRESENTED_IMAGE_SIMPLE} /> : <div className='household-member-list'>
                    {members.map(member => {
                        const active = activeMember?.id === member.id;
                        const selected = selectedSet.has(member.id);
                        const isCurrent = member.id === currentHouseholdMemberId;
                        return <div key={member.id} className={`household-member-row${active ? ' active' : ''}`}>
                            <button type='button' className='household-member-main' onClick={() => setActiveMemberId(member.id)}>
                                <span style={{ width: 42, height: 42, borderRadius: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: `${member.color ?? '#1677ff'}18`, color: member.color ?? '#1677ff', border: `1px solid ${member.color ?? '#1677ff'}30` }}>
                                    <UserOutlined />
                                </span>
                                <span style={{ minWidth: 0 }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                                        <Typography.Text strong style={{ color: '#111827', lineHeight: '18px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.name}</Typography.Text>
                                        {isCurrent && <Tag color='gold' style={{ marginRight: 0, flexShrink: 0 }}>Tôi</Tag>}
                                    </span>
                                    <Typography.Text type='secondary' style={{ display: 'block', fontSize: 11, lineHeight: '15px' }}>
                                        {(member.favoriteDishIds.length + member.favoriteIngredientIds.length + member.preferredTags.length)} thích · {(member.avoidedDishIds.length + member.avoidedIngredientIds.length + member.avoidedTags.length)} tránh · {(member.allergenIngredientIds.length + member.hardExcludedIngredientIds.length)} chặn
                                    </Typography.Text>
                                    <Stack wrap='wrap' gap={5} style={{ marginTop: 5 }}>
                                        <HouseholdHealthStatusTag status={healthProfiles[member.id]?.status} compact />
                                    </Stack>
                                </span>
                            </button>
                            <div className='household-member-toggle'>
                                <Switch checked={selected} onChange={checked => _setMemberSelected(member.id, checked)} />
                                <Typography.Text type='secondary' style={{ fontSize: 11, lineHeight: '15px', textAlign: 'right' }}>{selected ? 'Tính khi gợi ý' : 'Tạm bỏ qua'}</Typography.Text>
                            </div>
                        </div>;
                    })}
                </div>}
            </Box>

            <Box className='household-panel household-editor-panel'>
                {!activeMember || !draftMember ? <Box style={{ minHeight: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Empty description='Chọn hoặc thêm một thành viên để chỉnh hồ sơ' image={Empty.PRESENTED_IMAGE_SIMPLE} />
                </Box> : <Stack direction='column' gap={14}>
                    <Stack justify='space-between' align='flex-start' gap={10} wrap='wrap'>
                        <div className='household-editor-heading'>
                            <span style={{ width: 42, height: 42, borderRadius: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: `${draftMember.color ?? '#1677ff'}18`, color: draftMember.color ?? '#1677ff', border: `1px solid ${draftMember.color ?? '#1677ff'}30`, flexShrink: 0 }}>
                                <UserOutlined style={{ fontSize: 20 }} />
                            </span>
                            <div style={{ minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', minWidth: 0 }}>
                                    <Typography.Text strong style={{ color: '#111827', fontSize: 18, lineHeight: '24px', overflowWrap: 'anywhere' }}>{draftMember.name || 'Thành viên'}</Typography.Text>
                                    {activeMemberIsCurrent && <Tag color='gold' style={{ marginRight: 0 }}>Tôi</Tag>}
                                </div>
                                <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '17px' }}>Hồ sơ ăn uống và sức khỏe của thành viên</Typography.Text>
                            </div>
                        </div>
                        <div className='household-editor-actions'>
                            <div className='household-editor-switches'>
                                <div className='household-editor-switch'>
                                    <span style={{ minWidth: 0 }}>
                                        <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 12, lineHeight: '16px' }}>{activeMemberIsCurrent ? 'Hồ sơ của tôi' : 'Đánh dấu là tôi'}</Typography.Text>
                                        <Typography.Text type='secondary' style={{ display: 'block', fontSize: 11, lineHeight: '15px' }}>{activeMemberIsCurrent ? 'Ứng dụng sẽ nhận biết đây là người đang dùng.' : 'Chỉ một hồ sơ được đánh dấu là tôi.'}</Typography.Text>
                                    </span>
                                    <Switch checked={activeMemberIsCurrent} onChange={checked => _setCurrentMember(activeMember, checked)} />
                                </div>
                                <div className='household-editor-switch'>
                                    <span style={{ minWidth: 0 }}>
                                        <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 12, lineHeight: '16px' }}>{activeMemberSelected ? 'Đang dùng khi gợi ý' : 'Tạm bỏ qua khi gợi ý'}</Typography.Text>
                                        <Typography.Text type='secondary' style={{ display: 'block', fontSize: 11, lineHeight: '15px' }}>Gợi ý món và thực đơn sẽ {activeMemberSelected ? 'tính' : 'không tính'} người này.</Typography.Text>
                                    </span>
                                    <Switch checked={activeMemberSelected} onChange={checked => _setMemberSelected(activeMember.id, checked)} />
                                </div>
                            </div>
                            <div className='household-editor-action-buttons'>
                                <Popconfirm title='Xoá hồ sơ này?' okText='Xoá' cancelText='Huỷ' okButtonProps={{ danger: true }} onConfirm={() => _removeMember(activeMember)}>
                                    <Button danger icon={<DeleteOutlined />}>Xoá</Button>
                                </Popconfirm>
                            </div>
                        </div>
                    </Stack>

                    <Segmented block value={editorMode} onChange={value => setEditorMode(value as 'food' | 'health')} options={[
                        { value: 'food', label: 'Ăn uống' },
                        { value: 'health', label: 'Sức khỏe' },
                    ]} />

                    {editorMode === 'food' ? <>
                    <div className='household-field-list'>
                        <div className='household-field-row'>
                            <FieldLabel>Tên</FieldLabel>
                            <div className='household-field-control'><Input value={draftMember.name} onChange={event => _updateDraftMember({ name: event.target.value })} placeholder='Tên thành viên' /></div>
                        </div>
                        <div className='household-field-row'>
                            <FieldLabel>Khẩu phần thường ăn</FieldLabel>
                            <div className='household-field-control'><InputNumber min={0.1} max={12} step={0.1} precision={1} value={draftMember.portionPreference ?? 1} addonAfter='phần' onChange={value => _updateDraftMember({ portionPreference: Number(value ?? 1) })} style={{ width: '100%' }} /></div>
                        </div>
                        <div className='household-field-row'>
                            <FieldLabel>Mục tiêu dinh dưỡng</FieldLabel>
                            <div className='household-field-control'><Select allowClear placeholder='Chọn mục tiêu' value={draftMember.nutritionGoalId} onChange={value => _updateDraftMember({ nutritionGoalId: value })} options={nutritionGoals.map(goal => ({ value: goal.id, label: goal.name }))} style={{ width: '100%' }} /></div>
                        </div>
                    </div>

                    <div>
                        <FieldLabel>Màu hồ sơ</FieldLabel>
                        <div className='household-color-list'>
                            {MEMBER_COLORS.map(color => <button key={color} type='button' aria-label={`Chọn màu ${color}`} onClick={() => _updateDraftMember({ color })} style={{ width: 32, height: 32, borderRadius: 12, border: draftMember.color === color ? '3px solid #111827' : '1px solid #d9d9d9', background: color, cursor: 'pointer' }} />)}
                        </div>
                    </div>

                    <div className='household-field-list'>
                        <div className='household-field-row'>
                            <FieldLabel>Món thích</FieldLabel>
                            <div className='household-field-control'><Select mode='multiple' allowClear maxTagCount='responsive' maxTagPlaceholder={renderResponsiveTagPlaceholder} value={draftMember.favoriteDishIds} onChange={ids => {
                                const nextIds = ids ?? [];
                                _updateDraftMember({ favoriteDishIds: nextIds, avoidedDishIds: draftMember.avoidedDishIds.filter(id => !nextIds.includes(id)) });
                            }} dropdownRender={createSelectedOptionsDropdownRender({ mode: 'multiple', value: draftMember.favoriteDishIds, options: dishOptions })} options={dishOptions} style={{ width: '100%' }} placeholder='Chọn món' /></div>
                        </div>
                        <div className='household-field-row'>
                            <FieldLabel>Món tránh</FieldLabel>
                            <div className='household-field-control'><Select mode='multiple' allowClear maxTagCount='responsive' maxTagPlaceholder={renderResponsiveTagPlaceholder} value={draftMember.avoidedDishIds} onChange={ids => {
                                const nextIds = ids ?? [];
                                _updateDraftMember({ avoidedDishIds: nextIds, favoriteDishIds: draftMember.favoriteDishIds.filter(id => !nextIds.includes(id)) });
                            }} dropdownRender={createSelectedOptionsDropdownRender({ mode: 'multiple', value: draftMember.avoidedDishIds, options: dishOptions })} options={dishOptions} style={{ width: '100%' }} placeholder='Chọn món' /></div>
                        </div>
                        <div className='household-field-row'>
                            <FieldLabel>Nguyên liệu thích</FieldLabel>
                            <div className='household-field-control'><Select mode='multiple' allowClear maxTagCount='responsive' maxTagPlaceholder={renderResponsiveTagPlaceholder} value={draftMember.favoriteIngredientIds} onChange={ids => {
                                const nextIds = ids ?? [];
                                _updateDraftMember({ favoriteIngredientIds: nextIds, avoidedIngredientIds: draftMember.avoidedIngredientIds.filter(id => !nextIds.includes(id)) });
                            }} dropdownRender={createSelectedOptionsDropdownRender({ mode: 'multiple', value: draftMember.favoriteIngredientIds, options: ingredientOptions })} options={ingredientOptions} style={{ width: '100%' }} placeholder='Chọn nguyên liệu' /></div>
                        </div>
                        <div className='household-field-row'>
                            <FieldLabel>Nguyên liệu tránh</FieldLabel>
                            <div className='household-field-control'><Select mode='multiple' allowClear maxTagCount='responsive' maxTagPlaceholder={renderResponsiveTagPlaceholder} value={draftMember.avoidedIngredientIds} onChange={ids => {
                                const nextIds = ids ?? [];
                                _updateDraftMember({ avoidedIngredientIds: nextIds, favoriteIngredientIds: draftMember.favoriteIngredientIds.filter(id => !nextIds.includes(id)) });
                            }} dropdownRender={createSelectedOptionsDropdownRender({ mode: 'multiple', value: draftMember.avoidedIngredientIds, options: ingredientOptions })} options={ingredientOptions} style={{ width: '100%' }} placeholder='Chọn nguyên liệu' /></div>
                        </div>
                        <div className='household-field-row'>
                            <FieldLabel>Dị ứng</FieldLabel>
                            <div className='household-field-control'><Select mode='multiple' allowClear maxTagCount='responsive' maxTagPlaceholder={renderResponsiveTagPlaceholder} value={draftMember.allergenIngredientIds} onChange={ids => {
                                const nextIds = ids ?? [];
                                _updateDraftMember({
                                    allergenIngredientIds: nextIds,
                                    favoriteIngredientIds: draftMember.favoriteIngredientIds.filter(id => !nextIds.includes(id)),
                                    avoidedIngredientIds: draftMember.avoidedIngredientIds.filter(id => !nextIds.includes(id)),
                                    hardExcludedIngredientIds: draftMember.hardExcludedIngredientIds.filter(id => !nextIds.includes(id)),
                                });
                            }} dropdownRender={createSelectedOptionsDropdownRender({ mode: 'multiple', value: draftMember.allergenIngredientIds, options: ingredientOptions })} options={ingredientOptions} style={{ width: '100%' }} placeholder='Chọn nguyên liệu gây dị ứng' /></div>
                        </div>
                        <div className='household-field-row'>
                            <FieldLabel>Nguyên liệu chặn cứng</FieldLabel>
                            <div className='household-field-control'><Select mode='multiple' allowClear maxTagCount='responsive' maxTagPlaceholder={renderResponsiveTagPlaceholder} value={draftMember.hardExcludedIngredientIds} onChange={ids => {
                                const nextIds = ids ?? [];
                                _updateDraftMember({
                                    hardExcludedIngredientIds: nextIds,
                                    favoriteIngredientIds: draftMember.favoriteIngredientIds.filter(id => !nextIds.includes(id)),
                                    avoidedIngredientIds: draftMember.avoidedIngredientIds.filter(id => !nextIds.includes(id)),
                                    allergenIngredientIds: draftMember.allergenIngredientIds.filter(id => !nextIds.includes(id)),
                                });
                            }} dropdownRender={createSelectedOptionsDropdownRender({ mode: 'multiple', value: draftMember.hardExcludedIngredientIds, options: ingredientOptions })} options={ingredientOptions} style={{ width: '100%' }} placeholder='Chọn nguyên liệu tuyệt đối không dùng' /></div>
                        </div>
                        <div className='household-field-row'>
                            <FieldLabel>Kiểu món thích</FieldLabel>
                            <div className='household-field-control'><Select mode='multiple' allowClear maxTagCount='responsive' maxTagPlaceholder={renderResponsiveTagPlaceholder} value={draftMember.preferredTags} onChange={tags => {
                                const nextTags = tags ?? [];
                                _updateDraftMember({ preferredTags: nextTags, avoidedTags: draftMember.avoidedTags.filter(tag => !nextTags.includes(tag)) });
                            }} dropdownRender={createSelectedOptionsDropdownRender({ mode: 'multiple', value: draftMember.preferredTags, options: tagOptions })} options={tagOptions} style={{ width: '100%' }} placeholder='Chọn tag' /></div>
                        </div>
                        <div className='household-field-row'>
                            <FieldLabel>Kiểu món tránh</FieldLabel>
                            <div className='household-field-control'><Select mode='multiple' allowClear maxTagCount='responsive' maxTagPlaceholder={renderResponsiveTagPlaceholder} value={draftMember.avoidedTags} onChange={tags => {
                                const nextTags = tags ?? [];
                                _updateDraftMember({ avoidedTags: nextTags, preferredTags: draftMember.preferredTags.filter(tag => !nextTags.includes(tag)) });
                            }} dropdownRender={createSelectedOptionsDropdownRender({ mode: 'multiple', value: draftMember.avoidedTags, options: tagOptions })} options={tagOptions} style={{ width: '100%' }} placeholder='Chọn tag' /></div>
                        </div>
                    </div>

                    <div>
                        <FieldLabel>Ghi chú riêng</FieldLabel>
                        <div className='household-field-control'><Input.TextArea value={draftMember.notes} onChange={event => _updateDraftMember({ notes: event.target.value })} placeholder='Ví dụ: ăn ít cay, không đậu phộng, khẩu phần trẻ em...' autoSize={{ minRows: 3, maxRows: 6 }} /></div>
                    </div>
                    <Stack justify='flex-end'>
                        <Button type='primary' icon={<SaveOutlined />} onClick={_saveDraftMember}>Lưu hồ sơ ăn uống</Button>
                    </Stack>
                    </> : <HouseholdHealthWidget member={activeMember} />}
                </Stack>}
            </Box>
        </div>
    </Box>;
};

export default HouseholdProfilesScreen;
