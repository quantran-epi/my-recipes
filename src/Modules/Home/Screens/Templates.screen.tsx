import { CalendarOutlined, DeleteOutlined, PlayCircleOutlined, SaveOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { Button } from '@components/Button';
import { DatePicker } from '@components/Form/DatePicker';
import { Input } from '@components/Form/Input';
import { Option, Select } from '@components/Form/Select';
import { Empty } from '@components/Empty';
import { Box } from '@components/Layout/Box';
import { Stack } from '@components/Layout/Stack';
import { Tag } from '@components/Tag';
import { Typography } from '@components/Typography';
import { normalizeDishServings } from '@modules/ShoppingList/Screens/DishServingSelector.widget';
import { nanoid } from 'nanoid';
import { ScheduledMeal } from '@store/Models/ScheduledMeal';
import {
    removeShoppingListTemplate,
    removeWeeklyMealTemplate,
    ShoppingListTemplate,
    upsertShoppingListTemplate,
    upsertWeeklyMealTemplate,
    WeeklyMealTemplate,
} from '@store/Reducers/AppContextReducer';
import { addScheduledMeal } from '@store/Reducers/ScheduledMealReducer';
import { addShoppingList, generateIngredient } from '@store/Reducers/ShoppingListReducer';
import {
    selectDishes,
    selectIngredients,
    selectInventory,
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
import { useScreenTitle } from '@hooks';
import { RootRoutes } from '@routing/RootRoutes';

type MealKey = keyof ScheduledMeal['meals'];

const mealKeys: MealKey[] = ['breakfast', 'lunch', 'dinner'];

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
    border: '1px solid #f0f0f0',
    borderRadius: 8,
    background: '#fbf9ff',
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
    const scheduledMeals = useSelector(selectScheduledMeals);
    const shoppingLists = useSelector(selectShoppingLists);
    const weeklyMealTemplates = useSelector(selectWeeklyMealTemplates);
    const shoppingListTemplates = useSelector(selectShoppingListTemplates);
    useScreenTitle({ value: 'Mẫu dùng lại', deps: [] });

    const [weekStart, setWeekStart] = useState<Dayjs>(dayjs().startOf('day'));
    const [mealTemplateName, setMealTemplateName] = useState(`Mẫu tuần ${formatWeekName(dayjs())}`);
    const [mealApplyStart, setMealApplyStart] = useState<Dayjs>(dayjs().startOf('day'));
    const [shoppingTemplateSourceId, setShoppingTemplateSourceId] = useState<string | undefined>();
    const [shoppingTemplateName, setShoppingTemplateName] = useState('Mẫu mua sắm hằng tuần');
    const [shoppingApplyDate, setShoppingApplyDate] = useState<Dayjs>(dayjs().startOf('day'));

    const dishesById = useMemo(() => new Map(dishes.map(item => [item.id, item])), [dishes]);
    const scheduledMealsByDate = useMemo(() => scheduledMeals.reduce((result, item) => {
        const key = getDateKey(item.plannedDate);
        result[key] = [...(result[key] ?? []), item];
        return result;
    }, {} as Record<string, ScheduledMeal[]>), [scheduledMeals]);

    const selectedShoppingList = shoppingLists.find(item => item.id === shoppingTemplateSourceId);

    const _saveWeeklyMealTemplate = () => {
        const days = Array.from({ length: 7 }).flatMap((_, offset) => {
            const date = weekStart.add(offset, 'day');
            const items = scheduledMealsByDate[date.format('YYYY-MM-DD')] ?? [];
            const merged = mergeDayMeals(items);
            if (getDishCountFromMeals(merged.meals) === 0) return [];
            return [{ offset, meals: merged.meals, dishServings: merged.dishServings }];
        });

        if (days.length === 0) {
            message.warning('Tuần đã chọn chưa có thực đơn để lưu thành mẫu');
            return;
        }

        const now = new Date().toISOString();
        const template: WeeklyMealTemplate = {
            id: `meal-template-${nanoid(8)}`,
            name: mealTemplateName.trim() || `Mẫu tuần ${formatWeekName(weekStart)}`,
            days,
            createdAt: now,
            updatedAt: now,
        };
        dispatch(upsertWeeklyMealTemplate(template));
        message.success(`Đã lưu mẫu thực đơn ${days.length} ngày`);
    };

    const _applyWeeklyMealTemplate = (template: WeeklyMealTemplate) => {
        template.days.forEach(day => {
            const plannedDate = mealApplyStart.add(day.offset, 'day').toDate();
            const name = `${template.name} - ${moment(plannedDate).format('DD/MM')}`;
            dispatch(addScheduledMeal({
                id: `${template.id}-${nanoid(8)}`,
                name,
                meals: day.meals,
                dishServings: day.dishServings ?? {},
                plannedDate,
                createdDate: new Date(),
            }));
            dispatch(rememberScheduledMealName(name));
        });
        message.success(`Đã tạo ${template.days.length} thực đơn từ mẫu`);
        navigate(RootRoutes.AuthorizedRoutes.ScheduledMealRoutes.List());
    };

    const _saveShoppingListTemplate = () => {
        if (!selectedShoppingList) {
            message.warning('Chọn một lịch mua sắm hiện có để lưu thành mẫu');
            return;
        }
        if ((selectedShoppingList.dishes ?? []).length === 0) {
            message.warning('Lịch mua sắm này chưa có món ăn để lưu thành mẫu');
            return;
        }

        const now = new Date().toISOString();
        const template: ShoppingListTemplate = {
            id: `shopping-template-${nanoid(8)}`,
            name: shoppingTemplateName.trim() || selectedShoppingList.name,
            dishes: selectedShoppingList.dishes ?? [],
            dishServings: selectedShoppingList.dishServings ?? {},
            createdAt: now,
            updatedAt: now,
        };
        dispatch(upsertShoppingListTemplate(template));
        message.success('Đã lưu mẫu mua sắm');
    };

    const _applyShoppingListTemplate = (template: ShoppingListTemplate) => {
        const normalizedServings = normalizeDishServings(template.dishes, dishes, template.dishServings ?? {});
        const shoppingList = {
            id: `${template.name}${nanoid(10)}`,
            name: `${template.name} - ${shoppingApplyDate.format('DD/MM')}`,
            dishes: template.dishes,
            dishServings: normalizedServings,
            ingredients: [],
            scheduledMeals: [],
            createdDate: new Date(),
            plannedDate: shoppingApplyDate.toDate(),
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
            alreadyHaveIngredientIds: [],
            autoMarkCoveredByInventory: true,
            dishServings: normalizedServings,
        }));
        message.success('Đã tạo lịch mua sắm từ mẫu');
        navigate(RootRoutes.AuthorizedRoutes.ShoppingListRoutes.Detail(shoppingList.id));
    };

    return <Box data-testid='templates-screen' style={pageStyle}>
        <section style={sectionStyle}>
            <div style={sectionHeaderStyle}>
                <SectionTitle icon={<CalendarOutlined />} title='Mẫu thực đơn theo tuần' subtitle='Lưu một tuần đã lên lịch và áp dụng lại cho tuần khác.' />
            </div>
            <div style={bodyStyle}>
                <Box style={{ border: '1px solid #f0f0f0', borderRadius: 8, padding: 10, background: '#fff' }}>
                    <div style={fieldGridStyle}>
                        <div>
                            <Typography.Text strong style={{ display: 'block', fontSize: 12, marginBottom: 5 }}>Tên mẫu</Typography.Text>
                            <Input value={mealTemplateName} onChange={event => setMealTemplateName(event.target.value)} />
                        </div>
                        <div>
                            <Typography.Text strong style={{ display: 'block', fontSize: 12, marginBottom: 5 }}>Ngày bắt đầu tuần nguồn</Typography.Text>
                            <DatePicker value={weekStart} onChange={value => value && setWeekStart(value)} format='DD/MM/YYYY' style={{ width: '100%' }} />
                        </div>
                        <Button icon={<SaveOutlined />} onClick={_saveWeeklyMealTemplate}>Lưu mẫu tuần</Button>
                    </div>
                </Box>

                <Box style={{ marginTop: 10 }}>
                    <div style={fieldGridStyle}>
                        <div>
                            <Typography.Text strong style={{ display: 'block', fontSize: 12, marginBottom: 5 }}>Áp dụng vào tuần bắt đầu</Typography.Text>
                            <DatePicker value={mealApplyStart} onChange={value => value && setMealApplyStart(value)} format='DD/MM/YYYY' style={{ width: '100%' }} />
                        </div>
                    </div>
                </Box>

                {weeklyMealTemplates.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description='Chưa có mẫu thực đơn' /> : <Stack direction='column' align='stretch' gap={8} style={{ marginTop: 10 }}>
                    {weeklyMealTemplates.map(template => {
                        const dishCount = template.days.reduce((sum, day) => sum + getDishCountFromMeals(day.meals), 0);
                        return <Box key={template.id} style={templateCardStyle}>
                            <Stack justify='space-between' align='flex-start' gap={8}>
                                <div style={{ minWidth: 0 }}>
                                    <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 15, lineHeight: '20px' }}>{template.name}</Typography.Text>
                                    <Stack wrap='wrap' gap={5} style={{ marginTop: 5 }}>
                                        <Tag color='purple' style={{ marginInlineEnd: 0 }}>{template.days.length} ngày</Tag>
                                        <Tag color='blue' style={{ marginInlineEnd: 0 }}>{dishCount} món</Tag>
                                        <Tag style={{ marginInlineEnd: 0 }}>Cập nhật {formatRelativeDate(template.updatedAt)}</Tag>
                                    </Stack>
                                </div>
                                <Stack gap={5}>
                                    <Button icon={<PlayCircleOutlined />} onClick={() => _applyWeeklyMealTemplate(template)}>Áp dụng</Button>
                                    <Button type='text' danger icon={<DeleteOutlined />} onClick={() => dispatch(removeWeeklyMealTemplate(template.id))} />
                                </Stack>
                            </Stack>
                        </Box>;
                    })}
                </Stack>}
            </div>
        </section>

        <section style={sectionStyle}>
            <div style={sectionHeaderStyle}>
                <SectionTitle icon={<ShoppingCartOutlined />} title='Mẫu mua sắm' subtitle='Lưu nhóm món hay mua và tạo nhanh lịch mua sắm mới.' />
            </div>
            <div style={bodyStyle}>
                <Box style={{ border: '1px solid #f0f0f0', borderRadius: 8, padding: 10, background: '#fff' }}>
                    <div style={fieldGridStyle}>
                        <div>
                            <Typography.Text strong style={{ display: 'block', fontSize: 12, marginBottom: 5 }}>Tên mẫu</Typography.Text>
                            <Input value={shoppingTemplateName} onChange={event => setShoppingTemplateName(event.target.value)} />
                        </div>
                        <div>
                            <Typography.Text strong style={{ display: 'block', fontSize: 12, marginBottom: 5 }}>Lịch mua sắm nguồn</Typography.Text>
                            <Select value={shoppingTemplateSourceId} onChange={setShoppingTemplateSourceId} placeholder='Chọn lịch mua sắm' showSearch style={{ width: '100%' }}>
                                {shoppingLists.map(item => <Option key={item.id} value={item.id}>{item.name} - {formatRelativeDate(item.plannedDate ?? item.createdDate)}</Option>)}
                            </Select>
                        </div>
                        <Button icon={<SaveOutlined />} onClick={_saveShoppingListTemplate}>Lưu mẫu mua sắm</Button>
                    </div>
                </Box>

                <Box style={{ marginTop: 10 }}>
                    <div style={fieldGridStyle}>
                        <div>
                            <Typography.Text strong style={{ display: 'block', fontSize: 12, marginBottom: 5 }}>Ngày mua khi áp dụng</Typography.Text>
                            <DatePicker value={shoppingApplyDate} onChange={value => value && setShoppingApplyDate(value)} format='DD/MM/YYYY' style={{ width: '100%' }} />
                        </div>
                    </div>
                </Box>

                {shoppingListTemplates.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description='Chưa có mẫu mua sắm' /> : <Stack direction='column' align='stretch' gap={8} style={{ marginTop: 10 }}>
                    {shoppingListTemplates.map(template => <Box key={template.id} style={templateCardStyle}>
                        <Stack justify='space-between' align='flex-start' gap={8}>
                            <div style={{ minWidth: 0 }}>
                                <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 15, lineHeight: '20px' }}>{template.name}</Typography.Text>
                                <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '17px', marginTop: 3 }}>
                                    {template.dishes.slice(0, 4).map(id => dishesById.get(id)?.name ?? id).join(', ')}{template.dishes.length > 4 ? ` và ${template.dishes.length - 4} món khác` : ''}
                                </Typography.Text>
                                <Stack wrap='wrap' gap={5} style={{ marginTop: 5 }}>
                                    <Tag color='blue' style={{ marginInlineEnd: 0 }}>{template.dishes.length} món</Tag>
                                    <Tag style={{ marginInlineEnd: 0 }}>Cập nhật {formatRelativeDate(template.updatedAt)}</Tag>
                                </Stack>
                            </div>
                            <Stack gap={5}>
                                <Button icon={<PlayCircleOutlined />} onClick={() => _applyShoppingListTemplate(template)}>Áp dụng</Button>
                                <Button type='text' danger icon={<DeleteOutlined />} onClick={() => dispatch(removeShoppingListTemplate(template.id))} />
                            </Stack>
                        </Stack>
                    </Box>)}
                </Stack>}
            </div>
        </section>
    </Box>;
};
