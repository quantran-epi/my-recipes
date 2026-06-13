import { CalendarOutlined, DeleteOutlined, EditOutlined, EyeOutlined, LayoutOutlined, MoreOutlined, PlayCircleOutlined, PlusOutlined, SaveOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { DateHelpers } from '@common/Helpers/DateHelper';
import { Button } from '@components/Button';
import { Dropdown } from '@components/Dropdown';
import { DatePicker } from '@components/Form/DatePicker';
import { Input } from '@components/Form/Input';
import { Option, Select } from '@components/Form/Select';
import { Empty } from '@components/Empty';
import { Box } from '@components/Layout/Box';
import { Stack } from '@components/Layout/Stack';
import { Tag } from '@components/Tag';
import { Typography } from '@components/Typography';
import { DishServingSelector, normalizeDishServings } from '@modules/ShoppingList/Screens/DishServingSelector.widget';
import { nanoid } from 'nanoid';
import { ScheduledMeal } from '@store/Models/ScheduledMeal';
import {
    removeShoppingListTemplate,
    removeWeeklyMealTemplate,
    ShoppingListTemplate,
    upsertShoppingListTemplate,
    upsertWeeklyMealTemplate,
    WeeklyMealTemplate,
    WeeklyMealTemplateDay,
} from '@store/Reducers/AppContextReducer';
import { addScheduledMeal } from '@store/Reducers/ScheduledMealReducer';
import { addShoppingList, generateIngredient } from '@store/Reducers/ShoppingListReducer';
import {
    selectDishes,
    selectIngredients,
    selectInventory,
    selectInventoryHealthConfig,
    selectScheduledMeals,
    selectShoppingListTemplates,
    selectShoppingLists,
    selectWeeklyMealTemplates,
} from '@store/Selectors';
import { rememberScheduledMealName, rememberShoppingListName } from '@store/Reducers/AppContextReducer';
import dayjs, { Dayjs } from 'dayjs';
import moment from 'moment';
import React, { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useMessage } from '@components/Message';
import { DeferredModalContent, Modal } from '@components/Modal';
import { useScreenTitle } from '@hooks';
import { RootRoutes } from '@routing/RootRoutes';
import { ScheduledMealMealPlanner } from '@modules/ScheduledMeal/Screens/ScheduledMealMealPlanner.widget';
import { SmartPlannerTemplatesManager } from '@modules/ScheduledMeal/Screens/SmartPlannerTemplates.screen';
import { HouseholdMemberPicker } from '@modules/ScheduledMeal/Components/HouseholdMemberPicker';

type MealKey = keyof ScheduledMeal['meals'];

const mealKeys: MealKey[] = ['breakfast', 'lunch', 'dinner'];
type MealTemplateScope = 'day' | 'week';
type MealTemplateCreateMode = 'existing' | 'scratch';
type ShoppingTemplateCreateMode = 'existing' | 'scratch';

const emptyMeals = (): ScheduledMeal['meals'] => ({ breakfast: [], lunch: [], dinner: [] });

const pageStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    maxWidth: 840,
    margin: '0 auto',
    padding: '0 0 18px',
};

const sectionStyle: React.CSSProperties = {
    border: '1px solid rgba(116,54,220,0.10)',
    borderRadius: 8,
    background: '#fff',
    boxShadow: '0 10px 28px rgba(74,48,130,0.08)',
    overflow: 'hidden',
};

const sectionHeaderStyle: React.CSSProperties = {
    padding: '13px 13px 11px',
    background: 'linear-gradient(90deg, rgba(116,54,220,0.10) 0%, rgba(255,255,255,0.96) 72%)',
    borderBottom: '1px solid rgba(116,54,220,0.09)',
};

const sectionHeaderRowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
};

const bodyStyle: React.CSSProperties = {
    padding: 12,
};

const fieldGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
    gap: 8,
    alignItems: 'end',
};

const templateCardStyle: React.CSSProperties = {
    position: 'relative',
    border: '1px solid rgba(116,54,220,0.12)',
    borderLeft: '3px solid #7436dc',
    borderRadius: 8,
    background: '#fff',
    padding: '11px 11px 11px 12px',
    boxShadow: '0 6px 18px rgba(74,48,130,0.06)',
};

const templateCardInnerStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) auto',
    alignItems: 'end',
    gap: 10,
};

const templateContentStyle: React.CSSProperties = {
    minWidth: 0,
    paddingRight: 76,
};

const templateUpdatedTextStyle: React.CSSProperties = {
    display: 'block',
    color: '#8c8c8c',
    fontSize: 11,
    lineHeight: '15px',
    marginTop: 2,
};

const templateActionsStyle: React.CSSProperties = {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 1,
    display: 'flex',
    gap: 4,
    justifyContent: 'flex-end',
    alignItems: 'center',
};

const templateMenuButtonStyle: React.CSSProperties = {
    width: 32,
    paddingInline: 0,
    border: '1px solid rgba(116,54,220,0.12)',
    background: '#fbf9ff',
};

const templateApplyButtonStyle: React.CSSProperties = {
    width: 32,
    paddingInline: 0,
    borderRadius: 6,
    boxShadow: '0 5px 12px rgba(116,54,220,0.14)',
};

const previewDayStyle: React.CSSProperties = {
    border: '1px solid #f0f0f0',
    borderRadius: 0,
    background: '#fff',
    padding: 10,
};

const getDateKey = (value: Date | string | Dayjs) => moment(dayjs.isDayjs(value) ? value.toDate() : value).format('YYYY-MM-DD');

const getDishCountFromMeals = (meals: ScheduledMeal['meals']) => Object.values(meals ?? emptyMeals()).flat().length;

const mergeDayMeals = (items: ScheduledMeal[]): { meals: ScheduledMeal['meals']; dishServings: Record<string, number> } => {
    const meals = emptyMeals();
    const dishServings: Record<string, number> = {};

    items.forEach(item => {
        mealKeys.forEach(key => {
            const current = meals[key] ?? [];
            (item.meals?.[key] ?? []).forEach(dishId => {
                if (!current.includes(dishId)) current.push(dishId);
            });
            meals[key] = current;
        });
        Object.assign(dishServings, item.dishServings ?? {});
    });

    return { meals, dishServings };
};

const formatWeekName = (start: Dayjs) => `${start.format('DD/MM')} - ${start.add(6, 'day').format('DD/MM/YYYY')}`;

const formatRelativeDate = (date: Date | string) => moment(date).format('DD/MM/YYYY');

const getMondayStart = (value: Dayjs) => value.startOf('week').startOf('day');

const getTemplateScope = (template: WeeklyMealTemplate): MealTemplateScope => template.scope ?? (template.days.length > 1 ? 'week' : 'day');

const hasTemplateDayContent = (day: WeeklyMealTemplateDay) => getDishCountFromMeals(day.meals) > 0;

const createEmptyTemplateDay = (offset = 0): WeeklyMealTemplateDay => ({
    offset,
    meals: emptyMeals(),
    dishServings: {},
});

const createEmptyTemplateWeek = (): WeeklyMealTemplateDay[] => Array.from({ length: 7 }, (_, offset) => createEmptyTemplateDay(offset));

const weekdayLabel = (offset: number) => DateHelpers.capitalizeWeekdayLabel(getMondayStart(dayjs()).add(offset, 'day').format('dddd'));

const mealLabels: Record<MealKey, string> = {
    breakfast: 'Sáng',
    lunch: 'Trưa',
    dinner: 'Tối',
};

const getDefaultMealTemplateName = (scope: MealTemplateScope, weekStart = getMondayStart(dayjs())) => (
    scope === 'day' ? `Mẫu ngày ${dayjs().format('DD/MM')}` : `Mẫu tuần ${formatWeekName(weekStart)}`
);

const SectionTitle: React.FC<{ icon: React.ReactNode; title: string; subtitle: string }> = ({ icon, title, subtitle }) => (
    <Stack align='center' gap={9}>
        <span style={{ width: 38, height: 38, borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#7436dc', background: 'rgba(116,54,220,0.12)', flexShrink: 0, fontSize: 18 }}>{icon}</span>
        <div style={{ minWidth: 0 }}>
            <Typography.Text strong style={{ display: 'block', fontSize: 18, lineHeight: '23px', color: '#111827' }}>{title}</Typography.Text>
            <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '17px' }}>{subtitle}</Typography.Text>
        </div>
    </Stack>
);

export const TemplatesScreen = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const message = useMessage();
    const dishes = useSelector(selectDishes);
    const ingredients = useSelector(selectIngredients);
    const inventory = useSelector(selectInventory);
    const inventoryConfig = useSelector(selectInventoryHealthConfig);
    const scheduledMeals = useSelector(selectScheduledMeals);
    const shoppingLists = useSelector(selectShoppingLists);
    const weeklyMealTemplates = useSelector(selectWeeklyMealTemplates);
    const shoppingListTemplates = useSelector(selectShoppingListTemplates);
    useScreenTitle({ value: 'Mẫu dùng lại', deps: [] });

    const [mealCreatorOpen, setMealCreatorOpen] = useState(false);
    const [shoppingCreatorOpen, setShoppingCreatorOpen] = useState(false);
    const [mealTemplateEditId, setMealTemplateEditId] = useState<string | undefined>();
    const [shoppingTemplateEditId, setShoppingTemplateEditId] = useState<string | undefined>();
    const [mealPreviewTarget, setMealPreviewTarget] = useState<WeeklyMealTemplate | null>(null);
    const [shoppingPreviewTarget, setShoppingPreviewTarget] = useState<ShoppingListTemplate | null>(null);
    const [mealTemplateScope, setMealTemplateScope] = useState<MealTemplateScope>('day');
    const [mealTemplateCreateMode, setMealTemplateCreateMode] = useState<MealTemplateCreateMode>('existing');
    const [mealTemplateName, setMealTemplateName] = useState(`Mẫu ngày ${dayjs().format('DD/MM')}`);
    const [mealSourceMealId, setMealSourceMealId] = useState<string | undefined>();
    const [mealSourceWeek, setMealSourceWeek] = useState<Dayjs>(getMondayStart(dayjs()));
    const [scratchDay, setScratchDay] = useState<WeeklyMealTemplateDay>(() => createEmptyTemplateDay(0));
    const [scratchWeek, setScratchWeek] = useState<WeeklyMealTemplateDay[]>(() => createEmptyTemplateWeek());
    const [mealTemplateMemberIds, setMealTemplateMemberIds] = useState<string[]>([]);
    const [templateApplyTarget, setTemplateApplyTarget] = useState<WeeklyMealTemplate | null>(null);
    const [mealApplyDate, setMealApplyDate] = useState<Dayjs>(dayjs().startOf('day'));
    const [mealApplyWeek, setMealApplyWeek] = useState<Dayjs>(getMondayStart(dayjs()));
    const [shoppingTemplateSourceId, setShoppingTemplateSourceId] = useState<string | undefined>();
    const [shoppingTemplateCreateMode, setShoppingTemplateCreateMode] = useState<ShoppingTemplateCreateMode>('existing');
    const [shoppingTemplateName, setShoppingTemplateName] = useState('Mẫu mua sắm hằng tuần');
    const [shoppingTemplateDishIds, setShoppingTemplateDishIds] = useState<string[]>([]);
    const [shoppingTemplateDishServings, setShoppingTemplateDishServings] = useState<Record<string, number>>({});
    const [shoppingApplyDate, setShoppingApplyDate] = useState<Dayjs>(dayjs().startOf('day'));
    const [shoppingApplyTarget, setShoppingApplyTarget] = useState<ShoppingListTemplate | null>(null);

    const dishesById = useMemo(() => new Map(dishes.map(item => [item.id, item])), [dishes]);
    const scheduledMealsByDate = useMemo(() => scheduledMeals.reduce((result, item) => {
        const key = getDateKey(item.plannedDate);
        result[key] = [...(result[key] ?? []), item];
        return result;
    }, {} as Record<string, ScheduledMeal[]>), [scheduledMeals]);

    const selectedShoppingList = shoppingLists.find(item => item.id === shoppingTemplateSourceId);

    const _formatDishWithServing = (dishId: string, servings?: Record<string, number>) => {
        const name = dishesById.get(dishId)?.name ?? dishId;
        const serving = servings?.[dishId];
        return serving && serving !== 1 ? `${name} (${serving} phần)` : name;
    };

    const _openMealCreator = () => {
        const week = getMondayStart(dayjs());
        setMealTemplateEditId(undefined);
        setMealTemplateScope('day');
        setMealTemplateCreateMode('existing');
        setMealTemplateName(getDefaultMealTemplateName('day', week));
        setMealSourceMealId(undefined);
        setMealSourceWeek(week);
        setScratchDay(createEmptyTemplateDay(0));
        setScratchWeek(createEmptyTemplateWeek());
        setMealTemplateMemberIds([]);
        setMealCreatorOpen(true);
    };

    const _closeMealCreator = () => {
        setMealCreatorOpen(false);
        setMealTemplateEditId(undefined);
    };

    const _openMealTemplateEdit = (template: WeeklyMealTemplate) => {
        const scope = getTemplateScope(template);
        const daysByOffset = new Map(template.days.map(day => [day.offset, day]));
        setMealTemplateEditId(template.id);
        setMealTemplateName(template.name);
        setMealTemplateScope(scope);
        setMealTemplateCreateMode('scratch');
        setScratchDay({ ...(template.days[0] ?? createEmptyTemplateDay(0)), offset: 0 });
        setScratchWeek(createEmptyTemplateWeek().map(day => daysByOffset.get(day.offset) ?? day));
        setMealTemplateMemberIds(template.memberIds ?? []);
        setMealCreatorOpen(true);
    };

    const _openShoppingCreator = () => {
        setShoppingTemplateEditId(undefined);
        setShoppingTemplateName('Mẫu mua sắm hằng tuần');
        setShoppingTemplateCreateMode('existing');
        setShoppingTemplateSourceId(undefined);
        setShoppingTemplateDishIds([]);
        setShoppingTemplateDishServings({});
        setShoppingCreatorOpen(true);
    };

    const _closeShoppingCreator = () => {
        setShoppingCreatorOpen(false);
        setShoppingTemplateEditId(undefined);
    };

    const _openShoppingTemplateEdit = (template: ShoppingListTemplate) => {
        setShoppingTemplateEditId(template.id);
        setShoppingTemplateName(template.name);
        setShoppingTemplateCreateMode('scratch');
        setShoppingTemplateSourceId(undefined);
        setShoppingTemplateDishIds(template.dishes);
        setShoppingTemplateDishServings(normalizeDishServings(template.dishes, dishes, template.dishServings ?? {}));
        setShoppingCreatorOpen(true);
    };

    const _onMealTemplateScopeChange = (scope: MealTemplateScope) => {
        setMealTemplateScope(scope);
        if (!mealTemplateEditId) setMealTemplateName(getDefaultMealTemplateName(scope, mealSourceWeek));
    };

    const _onMealSourceWeekChange = (value?: Dayjs | null) => {
        if (!value) return;
        const nextWeek = getMondayStart(value);
        setMealSourceWeek(nextWeek);
        if (mealTemplateScope === 'week') {
            setMealTemplateName(getDefaultMealTemplateName('week', nextWeek));
        }
    };

    const getWeekTemplateDaysFromSource = (weekStart: Dayjs): WeeklyMealTemplateDay[] => {
        return Array.from({ length: 7 }).flatMap((_, offset) => {
            const date = weekStart.add(offset, 'day');
            const items = scheduledMealsByDate[date.format('YYYY-MM-DD')] ?? [];
            const merged = mergeDayMeals(items);
            if (getDishCountFromMeals(merged.meals) === 0) return [];
            return [{ offset, meals: merged.meals, dishServings: merged.dishServings }];
        });
    };

    const _saveMealTemplate = () => {
        let days: WeeklyMealTemplateDay[] = [];

        if (mealTemplateCreateMode === 'existing' && mealTemplateScope === 'day') {
            const sourceMeal = scheduledMeals.find(item => item.id === mealSourceMealId);
            if (!sourceMeal) {
                message.warning('Chọn một thực đơn ngày đã tạo để lưu mẫu');
                return;
            }
            days = [{ offset: 0, meals: sourceMeal.meals, dishServings: sourceMeal.dishServings ?? {} }];
        }

        if (mealTemplateCreateMode === 'existing' && mealTemplateScope === 'week') {
            days = getWeekTemplateDaysFromSource(getMondayStart(mealSourceWeek));
        }

        if (mealTemplateCreateMode === 'scratch' && mealTemplateScope === 'day') {
            days = hasTemplateDayContent(scratchDay) ? [{ ...scratchDay, offset: 0 }] : [];
        }

        if (mealTemplateCreateMode === 'scratch' && mealTemplateScope === 'week') {
            days = scratchWeek.filter(hasTemplateDayContent).map(day => ({ ...day, offset: day.offset }));
        }

        if (days.length === 0) {
            message.warning(mealTemplateScope === 'day' ? 'Mẫu ngày chưa có món ăn' : 'Mẫu tuần chưa có ngày nào có món ăn');
            return;
        }

        const now = new Date().toISOString();
        const existingTemplate = mealTemplateEditId ? weeklyMealTemplates.find(item => item.id === mealTemplateEditId) : undefined;
        const template: WeeklyMealTemplate = {
            id: mealTemplateEditId ?? `meal-template-${nanoid(8)}`,
            name: mealTemplateName.trim() || getDefaultMealTemplateName(mealTemplateScope, mealSourceWeek),
            scope: mealTemplateScope,
            memberIds: mealTemplateMemberIds,
            days,
            createdAt: existingTemplate?.createdAt ?? now,
            updatedAt: now,
        };
        dispatch(upsertWeeklyMealTemplate(template));
        message.success(`${mealTemplateEditId ? 'Đã cập nhật' : 'Đã lưu'} mẫu ${mealTemplateScope === 'day' ? 'ngày' : 'tuần'} (${days.length} ngày có món)`);
        _closeMealCreator();
    };

    const _applyMealTemplate = (template: WeeklyMealTemplate, date: Dayjs) => {
        const scope = getTemplateScope(template);
        const baseDate = scope === 'week' ? getMondayStart(date) : date.startOf('day');
        template.days.forEach(day => {
            const plannedDate = baseDate.add(scope === 'week' ? day.offset : 0, 'day').toDate();
            const name = `${template.name} - ${moment(plannedDate).format('DD/MM')}`;
            dispatch(addScheduledMeal({
                id: `${template.id}-${nanoid(8)}`,
                name,
                meals: day.meals,
                memberIds: template.memberIds ?? [],
                dishServings: day.dishServings ?? {},
                plannedDate,
                createdDate: new Date(),
            }));
            dispatch(rememberScheduledMealName(name));
        });
        message.success(`Đã tạo ${template.days.length} thực đơn từ mẫu`);
        setTemplateApplyTarget(null);
        navigate(RootRoutes.AuthorizedRoutes.ScheduledMealRoutes.List());
    };

    const _saveShoppingListTemplate = () => {
        let templateDishes: string[] = [];
        let templateServings: Record<string, number> = {};

        if (shoppingTemplateCreateMode === 'existing' && !selectedShoppingList) {
            message.warning('Chọn một lịch mua sắm hiện có để lưu thành mẫu');
            return;
        }

        if (shoppingTemplateCreateMode === 'existing') {
            templateDishes = selectedShoppingList?.dishes ?? [];
            templateServings = selectedShoppingList?.dishServings ?? {};
        } else {
            templateDishes = shoppingTemplateDishIds;
            templateServings = normalizeDishServings(shoppingTemplateDishIds, dishes, shoppingTemplateDishServings);
        }

        if (templateDishes.length === 0) {
            message.warning('Lịch mua sắm này chưa có món ăn để lưu thành mẫu');
            return;
        }

        const now = new Date().toISOString();
        const existingTemplate = shoppingTemplateEditId ? shoppingListTemplates.find(item => item.id === shoppingTemplateEditId) : undefined;
        const template: ShoppingListTemplate = {
            id: shoppingTemplateEditId ?? `shopping-template-${nanoid(8)}`,
            name: shoppingTemplateName.trim() || selectedShoppingList?.name || 'Mẫu mua sắm tự tạo',
            source: shoppingTemplateCreateMode,
            dishes: templateDishes,
            dishServings: templateServings,
            createdAt: existingTemplate?.createdAt ?? now,
            updatedAt: now,
        };
        dispatch(upsertShoppingListTemplate(template));
        message.success(shoppingTemplateEditId ? 'Đã cập nhật mẫu mua sắm' : 'Đã lưu mẫu mua sắm');
        _closeShoppingCreator();
    };

    const _applyShoppingListTemplate = (template: ShoppingListTemplate, date = shoppingApplyDate) => {
        const normalizedServings = normalizeDishServings(template.dishes, dishes, template.dishServings ?? {});
        const shoppingList = {
            id: `${template.name}${nanoid(10)}`,
            name: `${template.name} - ${date.format('DD/MM')}`,
            dishes: template.dishes,
            dishServings: normalizedServings,
            ingredients: [],
            scheduledMeals: [],
            createdDate: new Date(),
            plannedDate: date.toDate(),
            completedAt: undefined,
            completionImports: undefined,
        };

        dispatch(addShoppingList(shoppingList));
        dispatch(rememberShoppingListName(shoppingList.name));
        dispatch(generateIngredient({
            shoppingListId: shoppingList.id,
            allDishes: dishes,
            allScheduledMeals: scheduledMeals,
            allIngredients: ingredients,
            inventory,
            inventoryConfig,
            alreadyHaveIngredientIds: [],
            autoMarkCoveredByInventory: true,
            dishServings: normalizedServings,
        }));
        setShoppingApplyTarget(null);
        message.success('Đã tạo lịch mua sắm từ mẫu');
        navigate(RootRoutes.AuthorizedRoutes.ShoppingListRoutes.Detail(shoppingList.id));
    };

    const _onScratchDayChange = (meals: ScheduledMeal['meals'], dishServings: Record<string, number>) => {
        setScratchDay({ offset: 0, meals, dishServings });
    };

    const _onScratchWeekDayChange = (offset: number, meals: ScheduledMeal['meals'], dishServings: Record<string, number>) => {
        setScratchWeek(prev => prev.map(day => day.offset === offset ? { offset, meals, dishServings } : day));
    };

    const _onShoppingTemplateDishesChange = (ids: string[]) => {
        const nextIds = ids ?? [];
        setShoppingTemplateDishIds(nextIds);
        setShoppingTemplateDishServings(prev => normalizeDishServings(nextIds, dishes, prev));
    };

    return <Box data-testid='templates-screen' style={pageStyle}>
        <section style={sectionStyle}>
            <div style={sectionHeaderStyle}>
                <div style={sectionHeaderRowStyle}>
                    <SectionTitle icon={<CalendarOutlined />} title='Mẫu thực đơn' subtitle='Danh sách mẫu ngày và mẫu tuần đã lưu.' />
                    <Button icon={<PlusOutlined />} onClick={_openMealCreator}>Tạo mẫu</Button>
                </div>
            </div>
            <div style={bodyStyle}>
                {weeklyMealTemplates.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description='Chưa có mẫu thực đơn'>
                    <Button icon={<PlusOutlined />} onClick={_openMealCreator}>Tạo mẫu</Button>
                </Empty> : <Stack direction='column' align='stretch' gap={8}>
                    {weeklyMealTemplates.map(template => {
                        const dishCount = template.days.reduce((sum, day) => sum + getDishCountFromMeals(day.meals), 0);
                        const scope = getTemplateScope(template);
                        return <Box key={template.id} style={templateCardStyle}>
                            <div style={templateCardInnerStyle}>
                                <div style={templateContentStyle}>
                                    <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 15, lineHeight: '20px' }}>{template.name}</Typography.Text>
                                    <Typography.Text style={templateUpdatedTextStyle}>Cập nhật {formatRelativeDate(template.updatedAt)}</Typography.Text>
                                    <Stack wrap='wrap' gap={5} style={{ marginTop: 7 }}>
                                        <Tag color={scope === 'day' ? 'green' : 'purple'} style={{ marginInlineEnd: 0 }}>{scope === 'day' ? 'Mẫu ngày' : 'Mẫu tuần'}</Tag>
                                        <Tag color='purple' style={{ marginInlineEnd: 0 }}>{template.days.length} ngày</Tag>
                                        <Tag color='blue' style={{ marginInlineEnd: 0 }}>{dishCount} món</Tag>
                                    </Stack>
                                </div>
                                <div style={templateActionsStyle}>
                                    <Button type='primary' aria-label='Áp dụng mẫu thực đơn' icon={<PlayCircleOutlined />} style={templateApplyButtonStyle} onClick={() => setTemplateApplyTarget(template)} />
                                    <Dropdown menu={{
                                        items: [
                                            { label: 'Xem trước', key: 'preview', icon: <EyeOutlined /> },
                                            { label: 'Sửa mẫu', key: 'edit', icon: <EditOutlined /> },
                                            { type: 'divider' },
                                            { label: 'Xóa mẫu', key: 'delete', icon: <DeleteOutlined />, danger: true },
                                        ],
                                        onClick: (e) => {
                                            if (e.key === 'preview') setMealPreviewTarget(template);
                                            if (e.key === 'edit') _openMealTemplateEdit(template);
                                            if (e.key === 'delete') dispatch(removeWeeklyMealTemplate(template.id));
                                        },
                                    }} placement='bottomRight' trigger={['click']}>
                                        <Button type='text' aria-label='Tùy chọn mẫu thực đơn' icon={<MoreOutlined />} style={templateMenuButtonStyle} />
                                    </Dropdown>
                                </div>
                            </div>
                        </Box>;
                    })}
                </Stack>}
            </div>
        </section>

        <section style={sectionStyle}>
            <div style={sectionHeaderStyle}>
                <div style={sectionHeaderRowStyle}>
                    <SectionTitle icon={<ShoppingCartOutlined />} title='Mẫu mua sắm' subtitle='Danh sách nhóm món hay mua đã lưu.' />
                    <Button icon={<PlusOutlined />} onClick={_openShoppingCreator}>Tạo mẫu</Button>
                </div>
            </div>
            <div style={bodyStyle}>
                {shoppingListTemplates.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description='Chưa có mẫu mua sắm'>
                    <Button icon={<PlusOutlined />} onClick={_openShoppingCreator}>Tạo mẫu</Button>
                </Empty> : <Stack direction='column' align='stretch' gap={8}>
                    {shoppingListTemplates.map(template => <Box key={template.id} style={templateCardStyle}>
                        <div style={templateCardInnerStyle}>
                            <div style={templateContentStyle}>
                                <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 15, lineHeight: '20px' }}>{template.name}</Typography.Text>
                                <Typography.Text style={templateUpdatedTextStyle}>Cập nhật {formatRelativeDate(template.updatedAt)}</Typography.Text>
                                <Stack wrap='wrap' gap={5} style={{ marginTop: 7 }}>
                                    <Tag color={template.source === 'scratch' ? 'green' : 'purple'} style={{ marginInlineEnd: 0 }}>{template.source === 'scratch' ? 'Tự tạo' : 'Từ lịch'}</Tag>
                                    <Tag color='blue' style={{ marginInlineEnd: 0 }}>{template.dishes.length} món</Tag>
                                </Stack>
                            </div>
                            <div style={templateActionsStyle}>
                                <Button type='primary' aria-label='Áp dụng mẫu mua sắm' icon={<PlayCircleOutlined />} style={templateApplyButtonStyle} onClick={() => setShoppingApplyTarget(template)} />
                                <Dropdown menu={{
                                    items: [
                                        { label: 'Xem trước', key: 'preview', icon: <EyeOutlined /> },
                                        { label: 'Sửa mẫu', key: 'edit', icon: <EditOutlined /> },
                                        { type: 'divider' },
                                        { label: 'Xóa mẫu', key: 'delete', icon: <DeleteOutlined />, danger: true },
                                    ],
                                    onClick: (e) => {
                                        if (e.key === 'preview') setShoppingPreviewTarget(template);
                                        if (e.key === 'edit') _openShoppingTemplateEdit(template);
                                        if (e.key === 'delete') dispatch(removeShoppingListTemplate(template.id));
                                    },
                                }} placement='bottomRight' trigger={['click']}>
                                    <Button type='text' aria-label='Tùy chọn mẫu mua sắm' icon={<MoreOutlined />} style={templateMenuButtonStyle} />
                                </Dropdown>
                            </div>
                        </div>
                    </Box>)}
                </Stack>}
            </div>
        </section>

        <section style={sectionStyle}>
            <div style={sectionHeaderStyle}>
                <SectionTitle icon={<LayoutOutlined />} title='Mẫu số món' subtitle='Số món mỗi bữa và loại món bắt buộc để áp dụng nhanh.' />
            </div>
            <div style={bodyStyle}>
                <SmartPlannerTemplatesManager />
            </div>
        </section>

        <Modal
            open={Boolean(mealPreviewTarget)}
            title={mealPreviewTarget?.name ?? 'Xem mẫu thực đơn'}
            onCancel={() => setMealPreviewTarget(null)}
            footer={<Button onClick={() => setMealPreviewTarget(null)}>Đóng</Button>}
            width={700}
            bodyStyle={{ maxHeight: 'min(70vh, 620px)', overflowY: 'auto' }}
            destroyOnClose
        >
            <DeferredModalContent active={Boolean(mealPreviewTarget)} minHeight={140}>
                {mealPreviewTarget && <Stack direction='column' align='stretch' gap={8}>
                    {mealPreviewTarget.days.map(day => <Box key={day.offset} style={previewDayStyle}>
                        <Typography.Text strong style={{ display: 'block', color: '#2f2545', marginBottom: 8 }}>
                            {getTemplateScope(mealPreviewTarget) === 'week' ? weekdayLabel(day.offset) : 'Mẫu ngày'}
                        </Typography.Text>
                        <Stack direction='column' align='stretch' gap={6}>
                            {mealKeys.map(key => {
                                const dishIds = day.meals?.[key] ?? [];
                                if (dishIds.length === 0) return null;
                                return <Typography.Text key={key} style={{ display: 'block', fontSize: 13, lineHeight: '18px' }}>
                                    <b>{mealLabels[key]}:</b> {dishIds.map(dishId => _formatDishWithServing(dishId, day.dishServings)).join(', ')}
                                </Typography.Text>;
                            })}
                        </Stack>
                    </Box>)}
                </Stack>}
            </DeferredModalContent>
        </Modal>

        <Modal
            open={Boolean(shoppingPreviewTarget)}
            title={shoppingPreviewTarget?.name ?? 'Xem mẫu mua sắm'}
            onCancel={() => setShoppingPreviewTarget(null)}
            footer={<Button onClick={() => setShoppingPreviewTarget(null)}>Đóng</Button>}
            width={620}
            bodyStyle={{ maxHeight: 'min(70vh, 560px)', overflowY: 'auto' }}
            destroyOnClose
        >
            <DeferredModalContent active={Boolean(shoppingPreviewTarget)} minHeight={120}>
                {shoppingPreviewTarget && <Stack direction='column' align='stretch' gap={8}>
                    <Stack wrap='wrap' gap={6}>
                        <Tag color={shoppingPreviewTarget.source === 'scratch' ? 'green' : 'purple'} style={{ marginInlineEnd: 0 }}>{shoppingPreviewTarget.source === 'scratch' ? 'Tự tạo' : 'Từ lịch'}</Tag>
                        <Tag color='blue' style={{ marginInlineEnd: 0 }}>{shoppingPreviewTarget.dishes.length} món</Tag>
                    </Stack>
                    <Box style={previewDayStyle}>
                        {shoppingPreviewTarget.dishes.length === 0 ? <Typography.Text type='secondary'>Chưa có món</Typography.Text> : <Stack direction='column' align='stretch' gap={5}>
                            {shoppingPreviewTarget.dishes.map(dishId => <Typography.Text key={dishId} style={{ display: 'block', fontSize: 13, lineHeight: '18px' }}>
                                {_formatDishWithServing(dishId, shoppingPreviewTarget.dishServings)}
                            </Typography.Text>)}
                        </Stack>}
                    </Box>
                </Stack>}
            </DeferredModalContent>
        </Modal>

        <Modal
            open={mealCreatorOpen}
            title={mealTemplateEditId ? 'Sửa mẫu thực đơn' : 'Tạo mẫu thực đơn'}
            onCancel={_closeMealCreator}
            footer={null}
            width={760}
            bodyStyle={{ maxHeight: 'min(72vh, 680px)', overflowY: 'auto' }}
            destroyOnClose
        >
            <DeferredModalContent active={mealCreatorOpen} minHeight={180}>
                <Box style={{ padding: '4px 0' }}>
                    <div style={{ ...fieldGridStyle, marginBottom: 10 }}>
                        <div>
                            <Typography.Text strong style={{ display: 'block', fontSize: 12, marginBottom: 5 }}>Tên mẫu</Typography.Text>
                            <Input value={mealTemplateName} onChange={event => setMealTemplateName(event.target.value)} />
                        </div>
                        <div>
                            <Typography.Text strong style={{ display: 'block', fontSize: 12, marginBottom: 5 }}>Loại mẫu</Typography.Text>
                            <Select value={mealTemplateScope} onChange={_onMealTemplateScopeChange} style={{ width: '100%' }}>
                                <Option value='day'>Mẫu ngày</Option>
                                <Option value='week'>Mẫu tuần</Option>
                            </Select>
                        </div>
                        <div>
                            <Typography.Text strong style={{ display: 'block', fontSize: 12, marginBottom: 5 }}>Cách tạo</Typography.Text>
                            <Select value={mealTemplateCreateMode} onChange={value => setMealTemplateCreateMode(value)} style={{ width: '100%' }}>
                                <Option value='existing'>Chọn lịch đã tạo</Option>
                                <Option value='scratch'>Tự thiết kế</Option>
                            </Select>
                        </div>
                    </div>

                    <Box style={{ marginBottom: 10 }}>
                        <HouseholdMemberPicker
                            label='Cho ai ăn? (để trống = cả nhà)'
                            value={mealTemplateMemberIds}
                            onChange={setMealTemplateMemberIds}
                        />
                    </Box>

                    {mealTemplateCreateMode === 'existing' && mealTemplateScope === 'day' && <div style={fieldGridStyle}>
                        <div>
                            <Typography.Text strong style={{ display: 'block', fontSize: 12, marginBottom: 5 }}>Thực đơn ngày nguồn</Typography.Text>
                            <Select value={mealSourceMealId} onChange={setMealSourceMealId} placeholder='Chọn thực đơn đã tạo' showSearch style={{ width: '100%' }}>
                                {scheduledMeals.map(item => <Option key={item.id} value={item.id}>{item.name} - {formatRelativeDate(item.plannedDate)}</Option>)}
                            </Select>
                        </div>
                        <Button icon={<SaveOutlined />} onClick={_saveMealTemplate}>Lưu mẫu ngày</Button>
                    </div>}

                    {mealTemplateCreateMode === 'existing' && mealTemplateScope === 'week' && <div style={fieldGridStyle}>
                        <div>
                            <Typography.Text strong style={{ display: 'block', fontSize: 12, marginBottom: 5 }}>Tuần nguồn</Typography.Text>
                            <DatePicker picker='week' value={mealSourceWeek} onChange={_onMealSourceWeekChange} format='DD/MM/YYYY' style={{ width: '100%' }} />
                        </div>
                        <Button icon={<SaveOutlined />} onClick={_saveMealTemplate}>Lưu mẫu tuần</Button>
                    </div>}

                    {mealTemplateCreateMode === 'scratch' && mealTemplateScope === 'day' && <Box style={{ marginTop: 10 }}>
                        <ScheduledMealMealPlanner meals={scratchDay.meals} dishServings={scratchDay.dishServings ?? {}} dishes={dishes} onMealsChange={_onScratchDayChange} />
                        <Stack justify='flex-end'><Button icon={<SaveOutlined />} onClick={_saveMealTemplate}>Lưu mẫu ngày</Button></Stack>
                    </Box>}

                    {mealTemplateCreateMode === 'scratch' && mealTemplateScope === 'week' && <Stack direction='column' align='stretch' gap={10} style={{ marginTop: 10 }}>
                        {scratchWeek.map(day => <Box key={day.offset} style={{ border: '1px solid #f0f0f0', borderRadius: 0, padding: 10, background: '#fff' }}>
                            <Typography.Text strong style={{ display: 'block', color: '#2f2545', marginBottom: 8 }}>{weekdayLabel(day.offset)}</Typography.Text>
                            <ScheduledMealMealPlanner meals={day.meals} dishServings={day.dishServings ?? {}} dishes={dishes} onMealsChange={(meals, servings) => _onScratchWeekDayChange(day.offset, meals, servings)} />
                        </Box>)}
                        <Stack justify='flex-end'><Button icon={<SaveOutlined />} onClick={_saveMealTemplate}>Lưu mẫu tuần</Button></Stack>
                    </Stack>}
                </Box>
            </DeferredModalContent>
        </Modal>

        <Modal
            open={shoppingCreatorOpen}
            title={shoppingTemplateEditId ? 'Sửa mẫu mua sắm' : 'Tạo mẫu mua sắm'}
            onCancel={_closeShoppingCreator}
            footer={null}
            width={680}
            bodyStyle={{ maxHeight: 'min(72vh, 620px)', overflowY: 'auto' }}
            destroyOnClose
        >
            <DeferredModalContent active={shoppingCreatorOpen} minHeight={160}>
                <Box style={{ padding: '4px 0' }}>
                    <div style={{ ...fieldGridStyle, marginBottom: 10 }}>
                        <div>
                            <Typography.Text strong style={{ display: 'block', fontSize: 12, marginBottom: 5 }}>Tên mẫu</Typography.Text>
                            <Input value={shoppingTemplateName} onChange={event => setShoppingTemplateName(event.target.value)} />
                        </div>
                        <div>
                            <Typography.Text strong style={{ display: 'block', fontSize: 12, marginBottom: 5 }}>Cách tạo</Typography.Text>
                            <Select value={shoppingTemplateCreateMode} onChange={value => setShoppingTemplateCreateMode(value)} style={{ width: '100%' }}>
                                <Option value='existing'>Chọn lịch đã tạo</Option>
                                <Option value='scratch'>Tự chọn món</Option>
                            </Select>
                        </div>
                    </div>

                    {shoppingTemplateCreateMode === 'existing' && <div style={fieldGridStyle}>
                        <div>
                            <Typography.Text strong style={{ display: 'block', fontSize: 12, marginBottom: 5 }}>Lịch mua sắm nguồn</Typography.Text>
                            <Select value={shoppingTemplateSourceId} onChange={setShoppingTemplateSourceId} placeholder='Chọn lịch mua sắm' showSearch style={{ width: '100%' }}>
                                {shoppingLists.map(item => <Option key={item.id} value={item.id}>{item.name} - {formatRelativeDate(item.plannedDate ?? item.createdDate)}</Option>)}
                            </Select>
                        </div>
                        <Button icon={<SaveOutlined />} onClick={_saveShoppingListTemplate}>Lưu mẫu mua sắm</Button>
                    </div>}

                    {shoppingTemplateCreateMode === 'scratch' && <Box style={{ marginTop: 10 }}>
                        <Typography.Text strong style={{ display: 'block', fontSize: 12, marginBottom: 5 }}>Chọn món cho mẫu</Typography.Text>
                        <Select value={shoppingTemplateDishIds} onChange={_onShoppingTemplateDishesChange} placeholder='Chọn món ăn' mode='multiple' showSearch style={{ width: '100%' }}>
                            {dishes.map(dish => <Option key={dish.id} value={dish.id}>{dish.name}</Option>)}
                        </Select>
                        <Box style={{ marginTop: 10 }}>
                            <DishServingSelector selectedDishIds={shoppingTemplateDishIds} dishes={dishes} value={shoppingTemplateDishServings} onChange={setShoppingTemplateDishServings} />
                        </Box>
                        <Stack justify='flex-end'><Button icon={<SaveOutlined />} onClick={_saveShoppingListTemplate}>Lưu mẫu mua sắm</Button></Stack>
                    </Box>}
                </Box>
            </DeferredModalContent>
        </Modal>

        <Modal
            open={Boolean(templateApplyTarget)}
            title={`Áp dụng ${templateApplyTarget ? (getTemplateScope(templateApplyTarget) === 'day' ? 'mẫu ngày' : 'mẫu tuần') : 'mẫu thực đơn'}`}
            onCancel={() => setTemplateApplyTarget(null)}
            onOk={() => templateApplyTarget && _applyMealTemplate(templateApplyTarget, getTemplateScope(templateApplyTarget) === 'week' ? mealApplyWeek : mealApplyDate)}
            okText='Áp dụng'
            cancelText='Hủy'
            destroyOnClose
        >
            <DeferredModalContent active={Boolean(templateApplyTarget)} minHeight={96}>
                {templateApplyTarget && <Box style={{ padding: '8px 0' }}>
                    <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '17px', marginBottom: 8 }}>
                        {getTemplateScope(templateApplyTarget) === 'week'
                            ? 'Chọn tuần muốn tạo thực đơn. Tuần bắt đầu từ thứ Hai.'
                            : 'Chọn ngày muốn tạo thực đơn từ mẫu này.'}
                    </Typography.Text>
                    {getTemplateScope(templateApplyTarget) === 'week' ? (
                        <DatePicker picker='week' value={mealApplyWeek} onChange={value => value && setMealApplyWeek(getMondayStart(value))} format='DD/MM/YYYY' style={{ width: '100%' }} />
                    ) : (
                        <DatePicker value={mealApplyDate} onChange={value => value && setMealApplyDate(value)} format='DD/MM/YYYY' style={{ width: '100%' }} />
                    )}
                </Box>}
            </DeferredModalContent>
        </Modal>

        <Modal
            open={Boolean(shoppingApplyTarget)}
            title='Áp dụng mẫu mua sắm'
            onCancel={() => setShoppingApplyTarget(null)}
            onOk={() => shoppingApplyTarget && _applyShoppingListTemplate(shoppingApplyTarget, shoppingApplyDate)}
            okText='Tạo lịch mua'
            cancelText='Hủy'
            destroyOnClose
        >
            <DeferredModalContent active={Boolean(shoppingApplyTarget)} minHeight={96}>
                <Box style={{ padding: '8px 0' }}>
                    <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '17px', marginBottom: 8 }}>
                        Chọn ngày mua mới. App sẽ tạo lịch mua sắm và tự sinh checklist nguyên liệu.
                    </Typography.Text>
                    <DatePicker value={shoppingApplyDate} onChange={value => value && setShoppingApplyDate(value)} format='DD/MM/YYYY' style={{ width: '100%' }} />
                </Box>
            </DeferredModalContent>
        </Modal>
    </Box>;
};
