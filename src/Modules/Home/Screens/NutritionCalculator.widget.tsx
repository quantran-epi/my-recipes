import {
    CalendarOutlined,
    CalculatorOutlined,
    CheckCircleOutlined,
    FireOutlined,
    PieChartOutlined,
    ShoppingCartOutlined,
    UnorderedListOutlined,
    WarningOutlined,
} from '@ant-design/icons';
import { DateHelpers } from '@common/Helpers/DateHelper';
import { DishNutritionHelper, type DishNutritionNutrientKey, DishNutritionSummary, DishNutritionTotals } from '@common/Helpers/DishNutritionHelper';
import { DishServingHelper } from '@common/Helpers/DishServingHelper';
import { NutritionGoalHelper } from '@common/Helpers/NutritionGoalHelper';
import { Button } from '@components/Button';
import { Option, Select } from '@components/Form/Select';
import { Box } from '@components/Layout/Box';
import { Space } from '@components/Layout/Space';
import { Stack } from '@components/Layout/Stack';
import { DeferredModalContent, Modal } from '@components/Modal';
import { Tag } from '@components/Tag';
import { Typography } from '@components/Typography';
import { DishServingSelector, normalizeDishServings } from '@modules/ShoppingList/Screens/DishServingSelector.widget';
import { ShoppingListAddWidget } from '@modules/ShoppingList/Screens/ShoppingListAdd.widget';
import { RootRoutes } from '@routing/RootRoutes';
import { Dishes } from '@store/Models/Dishes';
import { ScheduledMeal } from '@store/Models/ScheduledMeal';
import { ShoppingList } from '@store/Models/ShoppingList';
import { NutritionGoal } from '@store/Models/SharedConfig';
import { selectDishes, selectIngredientsById, selectNutritionGoals, selectScheduledMeals, selectShoppingLists } from '@store/Selectors';
import { Progress } from 'antd';
import dayjs from 'dayjs';
import React, { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';

export type NutritionCalculatorSource = 'dishes' | 'shoppingLists' | 'scheduledMeals';

type CreationModal = 'shoppingList' | null;

export type NutritionCalculatorInitialSelection = {
    key: string;
    source: NutritionCalculatorSource;
    dishIds: string[];
    shoppingListIds: string[];
    mealIds: string[];
}

type CalculatorDishEntry = {
    key: string;
    dishId: string;
    servings?: number;
    sourceLabel: string;
}

type CalculatorDishResult = {
    entry: CalculatorDishEntry;
    dish?: Dishes;
    summary?: DishNutritionSummary;
}

type NutritionAggregate = {
    results: CalculatorDishResult[];
    total: DishNutritionTotals;
    perServing: DishNutritionTotals;
    servings: number;
    ingredientCount: number;
    coveredIngredientCount: number;
    coveragePercent: number;
    missingNutritionIngredientIds: string[];
    missingConversionIngredientIds: string[];
    sourceNames: string[];
    hasNutrition: boolean;
}

const sourceOptions: Array<{ label: string; shortLabel: string; value: NutritionCalculatorSource; icon: React.ReactNode; description: string; tone: string; background: string; border: string }> = [
    { label: 'Món ăn', shortLabel: 'Món', value: 'dishes', icon: <PieChartOutlined />, description: 'Tự chọn món và khẩu phần', tone: '#7436dc', background: '#f9f0ff', border: '#d3adf7' },
    { label: 'Lịch mua sắm', shortLabel: 'Mua sắm', value: 'shoppingLists', icon: <ShoppingCartOutlined />, description: 'Tính từ danh sách đang có', tone: '#0958d9', background: '#e6f4ff', border: '#91caff' },
    { label: 'Thực đơn', shortLabel: 'Thực đơn', value: 'scheduledMeals', icon: <CalendarOutlined />, description: 'Tổng hợp theo bữa đã lên', tone: '#13a8a8', background: '#e6fffb', border: '#87e8de' },
];

const getMealDishIds = (meal: ScheduledMeal): string[] => [
    ...(meal.meals.breakfast ?? []),
    ...(meal.meals.lunch ?? []),
    ...(meal.meals.dinner ?? []),
];

const addTotals = (target: DishNutritionTotals, source: DishNutritionTotals) => {
    DishNutritionHelper.nutrientKeys.forEach(key => {
        const value = source[key];
        if (typeof value === 'number' && Number.isFinite(value)) target[key] = DishNutritionHelper.roundOne((target[key] ?? 0) + value);
    });
};

const divideTotals = (source: DishNutritionTotals, divisor: number): DishNutritionTotals => {
    const safeDivisor = divisor > 0 ? divisor : 1;
    return DishNutritionHelper.nutrientKeys.reduce((result, key) => {
        const value = source[key];
        if (typeof value === 'number' && Number.isFinite(value)) result[key] = DishNutritionHelper.roundOne(value / safeDivisor);
        return result;
    }, {} as DishNutritionTotals);
};

const hasAnyNutrition = (source: DishNutritionTotals): boolean => DishNutritionHelper.nutrientKeys.some(key => typeof source[key] === 'number' && Number.isFinite(source[key]));

const getMealLabel = (meal: ScheduledMeal) => `${meal.name} · ${DateHelpers.formatWithCapitalizedWeekday(meal.plannedDate, 'ddd DD/MM')}`;

const getShoppingListLabel = (shoppingList: ShoppingList) => {
    const dateLabel = shoppingList.plannedDate ? DateHelpers.formatWithCapitalizedWeekday(shoppingList.plannedDate, 'ddd DD/MM') : 'Chưa đặt ngày';
    return `${shoppingList.name} · ${dateLabel}`;
};

const buildMealEntries = (meal: ScheduledMeal, sourceLabel = getMealLabel(meal)): CalculatorDishEntry[] => {
    return getMealDishIds(meal).map((dishId, index) => ({
        key: `${meal.id}-${index}-${dishId}`,
        dishId,
        servings: meal.dishServings?.[dishId],
        sourceLabel,
    }));
};

const buildShoppingListEntries = (
    shoppingList: ShoppingList,
    scheduledMealsById: Map<string, ScheduledMeal>,
    dishesById: Map<string, Dishes>,
): CalculatorDishEntry[] => {
    const listLabel = getShoppingListLabel(shoppingList);
    const directDishEntries = (shoppingList.dishes ?? []).map((dishId, index) => ({
        key: `${shoppingList.id}-dish-${index}-${dishId}`,
        dishId,
        servings: shoppingList.dishServings?.[dishId] ?? DishServingHelper.getBaseServings(dishesById.get(dishId)),
        sourceLabel: listLabel,
    }));

    const mealEntries = (shoppingList.scheduledMeals ?? []).flatMap(mealId => {
        const meal = scheduledMealsById.get(mealId);
        if (!meal) return [];
        return buildMealEntries(meal, `${shoppingList.name} / ${getMealLabel(meal)}`);
    });

    return [...directDishEntries, ...mealEntries];
};

const calculateAggregate = (
    entries: CalculatorDishEntry[],
    dishes: Dishes[],
    dishesById: Map<string, Dishes>,
    ingredientsById: Map<string, any>,
): NutritionAggregate => {
    const total: DishNutritionTotals = {};
    const missingNutritionIds = new Set<string>();
    const missingConversionIds = new Set<string>();
    const sourceNames = new Set<string>();
    let servings = 0;
    let ingredientCount = 0;
    let coveredIngredientCount = 0;

    const results = entries.map(entry => {
        const dish = dishesById.get(entry.dishId);
        const summary = dish ? DishNutritionHelper.calculateDishNutrition(dish, dishes, ingredientsById, { targetServings: entry.servings }) : undefined;

        if (summary) {
            addTotals(total, summary.total);
            servings += summary.servings;
            ingredientCount += summary.ingredientCount;
            coveredIngredientCount += summary.coveredIngredientCount;
            summary.missingNutritionIngredientIds.forEach(id => missingNutritionIds.add(id));
            summary.missingConversionIngredientIds.forEach(id => missingConversionIds.add(id));
            summary.sourceNames.forEach(name => sourceNames.add(name));
        }

        return { entry, dish, summary };
    });

    const perServing = divideTotals(total, servings);

    return {
        results,
        total,
        perServing,
        servings,
        ingredientCount,
        coveredIngredientCount,
        coveragePercent: ingredientCount > 0 ? Math.round(coveredIngredientCount / ingredientCount * 100) : 0,
        missingNutritionIngredientIds: Array.from(missingNutritionIds),
        missingConversionIngredientIds: Array.from(missingConversionIds),
        sourceNames: Array.from(sourceNames),
        hasNutrition: hasAnyNutrition(total),
    };
};

const toGoalSummary = (aggregate: NutritionAggregate): DishNutritionSummary => ({
    dishId: 'nutrition-calculator',
    servings: aggregate.servings,
    ingredientCount: aggregate.ingredientCount,
    coveredIngredientCount: aggregate.coveredIngredientCount,
    coveragePercent: aggregate.coveragePercent,
    total: aggregate.total,
    perServing: aggregate.perServing,
    missingNutritionIngredientIds: aggregate.missingNutritionIngredientIds,
    missingConversionIngredientIds: aggregate.missingConversionIngredientIds,
    sourceNames: aggregate.sourceNames,
    hasNutrition: aggregate.hasNutrition,
});

const primaryMetricKeys = ['calories', 'protein', 'carbs', 'fat', 'fiber'] as const;

const compactSourceLabel = (value: string) => value.length > 58 ? `${value.slice(0, 55)}...` : value;

const splitQueryIds = (value: string | null): string[] => Array.from(new Set((value ?? '').split(',').map(item => item.trim()).filter(Boolean)));

const getInitialSelectionFromSearch = (searchParams: URLSearchParams): NutritionCalculatorInitialSelection => {
    const dishIds = splitQueryIds(searchParams.get('dishes'));
    const shoppingListIds = splitQueryIds(searchParams.get('shoppingLists'));
    const mealIds = splitQueryIds(searchParams.get('scheduledMeals'));
    const requestedSource = searchParams.get('source');
    const source: NutritionCalculatorSource = requestedSource === 'shoppingLists' || requestedSource === 'scheduledMeals' || requestedSource === 'dishes'
        ? requestedSource
        : shoppingListIds.length > 0
            ? 'shoppingLists'
            : mealIds.length > 0
                ? 'scheduledMeals'
                : 'dishes';

    return {
        key: [source, dishIds.join(','), shoppingListIds.join(','), mealIds.join(',')].join('|'),
        source,
        dishIds,
        shoppingListIds,
        mealIds,
    };
};

const CalculatorPanel: React.FunctionComponent<{ title: string; subtitle?: string; icon: React.ReactNode; tone: string; action?: React.ReactNode; children: React.ReactNode }> = ({ title, subtitle, icon, tone, action, children }) => {
    return <Box style={{ border: `1px solid ${tone}1f`, borderRadius: 8, background: '#fff', padding: 12, boxShadow: '0 10px 24px rgba(15,23,42,0.06)', minWidth: 0 }}>
        <Stack justify='space-between' align='flex-start' gap={10} style={{ marginBottom: 11 }}>
            <Stack align='center' gap={9} style={{ minWidth: 0 }}>
                <span style={{ width: 34, height: 34, borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: tone, background: `${tone}12`, border: `1px solid ${tone}24`, flexShrink: 0 }}>{icon}</span>
                <div style={{ minWidth: 0 }}>
                    <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 15, lineHeight: '20px' }}>{title}</Typography.Text>
                    {subtitle && <Typography.Text type='secondary' style={{ display: 'block', fontSize: 11, lineHeight: '15px', marginTop: 2 }}>{subtitle}</Typography.Text>}
                </div>
            </Stack>
            {action && <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'flex-end' }}>{action}</div>}
        </Stack>
        {children}
    </Box>;
};

const CalculatorMetricTile: React.FunctionComponent<{ label: string; value: string; detail: string; tone: string; active?: boolean; onClick?: () => void }> = ({ label, value, detail, tone, active, onClick }) => {
    const content = <>
        <Typography.Text type='secondary' style={{ display: 'block', fontSize: 11, lineHeight: '15px' }}>{label}</Typography.Text>
        <Typography.Text strong style={{ display: 'block', fontSize: 17, lineHeight: '23px', color: tone, overflowWrap: 'anywhere' }}>{value}</Typography.Text>
        <Typography.Text type='secondary' style={{ display: 'block', fontSize: 11, lineHeight: '15px' }}>{detail}</Typography.Text>
    </>;
    const style: React.CSSProperties = { border: active ? `1px solid ${tone}` : `1px solid ${tone}1f`, borderRadius: 8, background: active ? `${tone}12` : `${tone}08`, padding: 10, minWidth: 0, boxShadow: active ? `inset 0 0 0 1px ${tone}33` : undefined };

    if (onClick) return <button type='button' onClick={onClick} style={{ ...style, width: '100%', textAlign: 'left', cursor: 'pointer' }}>
        {content}
    </button>;

    return <Box style={style}>
        {content}
    </Box>;
};

export const NutritionCalculatorModalContent: React.FunctionComponent<{ initialSelection?: NutritionCalculatorInitialSelection }> = ({ initialSelection }) => {
    const navigate = useNavigate();
    const dishes = useSelector(selectDishes);
    const ingredientsById = useSelector(selectIngredientsById);
    const shoppingLists = useSelector(selectShoppingLists);
    const scheduledMeals = useSelector(selectScheduledMeals);
    const goals = useSelector(selectNutritionGoals);
    const dishesById = useMemo(() => new Map(dishes.map(item => [item.id, item])), [dishes]);
    const shoppingListsById = useMemo(() => new Map(shoppingLists.map(item => [item.id, item])), [shoppingLists]);
    const scheduledMealsById = useMemo(() => new Map(scheduledMeals.map(item => [item.id, item])), [scheduledMeals]);
    const initialDishIds = initialSelection?.dishIds ?? [];
    const [source, setSource] = useState<NutritionCalculatorSource>(initialSelection?.source ?? 'dishes');
    const [selectedDishIds, setSelectedDishIds] = useState<string[]>(initialDishIds);
    const [selectedDishServings, setSelectedDishServings] = useState<Record<string, number>>(() => normalizeDishServings(initialDishIds, dishesById, {}));
    const [selectedShoppingListIds, setSelectedShoppingListIds] = useState<string[]>(initialSelection?.shoppingListIds ?? []);
    const [selectedMealIds, setSelectedMealIds] = useState<string[]>(initialSelection?.mealIds ?? []);
    const [creationModal, setCreationModal] = useState<CreationModal>(null);
    const [selectedNutrientKey, setSelectedNutrientKey] = useState<DishNutritionNutrientKey | null>(null);

    const entries = useMemo(() => {
        if (source === 'shoppingLists') {
            return selectedShoppingListIds.flatMap(id => {
                const shoppingList = shoppingListsById.get(id);
                return shoppingList ? buildShoppingListEntries(shoppingList, scheduledMealsById, dishesById) : [];
            });
        }

        if (source === 'scheduledMeals') {
            return selectedMealIds.flatMap(id => {
                const meal = scheduledMealsById.get(id);
                return meal ? buildMealEntries(meal) : [];
            });
        }

        return selectedDishIds.map(dishId => ({
            key: `dish-${dishId}`,
            dishId,
            servings: selectedDishServings[dishId],
            sourceLabel: 'Món tự chọn',
        }));
    }, [dishesById, scheduledMealsById, selectedDishIds, selectedDishServings, selectedMealIds, selectedShoppingListIds, shoppingListsById, source]);

    const aggregate = useMemo(() => calculateAggregate(entries, dishes, dishesById, ingredientsById), [dishes, dishesById, entries, ingredientsById]);
    const selectedDishServingsForCreation = useMemo(() => normalizeDishServings(selectedDishIds, dishesById, selectedDishServings), [dishesById, selectedDishIds, selectedDishServings]);
    const goalSummary = useMemo(() => toGoalSummary(aggregate), [aggregate]);
    const topGoalMatches = useMemo(() => goals
        .map((goal: NutritionGoal) => ({ goal, match: NutritionGoalHelper.score(goalSummary, goal) }))
        .sort((a, b) => b.match.score - a.match.score)
        .slice(0, 3), [goalSummary, goals]);
    const selectedNutrientOption = useMemo(() => selectedNutrientKey
        ? NutritionGoalHelper.nutrientOptions.find(option => option.value === selectedNutrientKey)
        : undefined, [selectedNutrientKey]);
    const selectedNutrientBreakdown = useMemo(() => {
        if (!selectedNutrientKey) return [];
        return aggregate.results.map(result => {
            const rows = result.dish
                ? DishNutritionHelper.calculateIngredientContributions(result.dish, dishes, ingredientsById, { targetServings: result.entry.servings })
                    .sort((a, b) => (b.total[selectedNutrientKey] ?? -1) - (a.total[selectedNutrientKey] ?? -1))
                : [];
            return {
                result,
                rows,
                total: result.summary?.total[selectedNutrientKey],
            };
        });
    }, [aggregate.results, dishes, ingredientsById, selectedNutrientKey]);

    const _onDishChange = (ids: string[]) => {
        const nextIds = ids ?? [];
        setSelectedDishIds(nextIds);
        setSelectedDishServings(prev => normalizeDishServings(nextIds, dishesById, prev));
    };

    const selectedSourceCount = source === 'dishes'
        ? selectedDishIds.length
        : source === 'shoppingLists'
            ? selectedShoppingListIds.length
            : selectedMealIds.length;
    const canCreateFromDishes = source === 'dishes' && selectedDishIds.length > 0;

    return <>
        <Box style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Box style={{ border: '1px solid rgba(19,168,168,0.18)', borderRadius: 8, background: 'linear-gradient(135deg, #ffffff 0%, #f6fffb 48%, #fff7e6 100%)', padding: 14, boxShadow: '0 12px 28px rgba(15,23,42,0.07)' }}>
                <Stack justify='space-between' align='flex-start' gap={12} wrap='wrap'>
                    <Stack align='center' gap={10} style={{ minWidth: 0 }}>
                        <span style={{ width: 42, height: 42, borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#0f766e', background: '#ccfbf1', border: '1px solid #99f6e4', flexShrink: 0, fontSize: 18 }}>
                            <FireOutlined />
                        </span>
                        <div style={{ minWidth: 0 }}>
                            <Typography.Text strong style={{ display: 'block', fontSize: 18, lineHeight: '23px', color: '#111827' }}>Máy tính dinh dưỡng</Typography.Text>
                            <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '17px', marginTop: 2 }}>Chọn nguồn, kiểm tra tổng dinh dưỡng và xem mức độ khớp mục tiêu.</Typography.Text>
                        </div>
                    </Stack>
                    <Stack align='center' gap={6} wrap='wrap' style={{ flexShrink: 0 }}>
                        <Tag color='cyan' style={{ marginInlineEnd: 0 }}>{selectedSourceCount} nguồn</Tag>
                        <Tag color='blue' style={{ marginInlineEnd: 0 }}>{aggregate.results.length} lượt món</Tag>
                        <Tag color='gold' style={{ marginInlineEnd: 0 }}>{aggregate.servings} phần</Tag>
                    </Stack>
                </Stack>
            </Box>

            <CalculatorPanel
                title='Chọn dữ liệu tính'
                subtitle='Bắt đầu từ món lẻ, lịch mua sắm hoặc thực đơn đã lên.'
                icon={<CalculatorOutlined />}
                tone='#13a8a8'
                action={source === 'dishes' ? <Stack gap={6} wrap='wrap' justify='flex-end'>
                    <Button aria-label='Tạo lịch mua sắm từ món đã chọn' disabled={!canCreateFromDishes} icon={<ShoppingCartOutlined />} onClick={() => setCreationModal('shoppingList')}>Mua sắm</Button>
                </Stack> : undefined}
            >
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                    {sourceOptions.map(option => {
                        const active = source === option.value;
                        return <button
                            key={option.value}
                            type='button'
                            onClick={() => setSource(option.value)}
                            aria-pressed={active}
                            style={{
                                minWidth: 0,
                                minHeight: 76,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 4,
                                border: active ? `2px solid ${option.tone}` : `1px solid ${option.border}`,
                                borderRadius: 8,
                                background: active ? option.background : '#fff',
                                color: active ? option.tone : '#4b5563',
                                cursor: 'pointer',
                                padding: '8px 6px',
                                boxShadow: active ? `0 10px 22px ${option.tone}1f` : '0 5px 14px rgba(15,23,42,0.05)',
                            }}
                        >
                            <span style={{ width: 30, height: 30, borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: active ? '#fff' : option.background, color: option.tone, fontSize: 16, flexShrink: 0 }}>{option.icon}</span>
                            <Typography.Text strong style={{ display: 'block', color: 'inherit', fontSize: 12, lineHeight: '15px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{option.shortLabel}</Typography.Text>
                            <Typography.Text type='secondary' style={{ display: 'block', fontSize: 10, lineHeight: '13px', textAlign: 'center', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{option.description}</Typography.Text>
                        </button>;
                    })}
                </div>

                <Box style={{ border: '1px solid #eef2f7', borderRadius: 8, background: '#fbfcfe', padding: 10, marginTop: 10 }}>
                    <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 12, lineHeight: '16px', marginBottom: 7 }}>
                        {source === 'dishes' ? 'Món cần tính' : source === 'shoppingLists' ? 'Lịch mua sắm cần tính' : 'Thực đơn cần tính'}
                    </Typography.Text>
                    {source === 'dishes' && <Select
                        showSearch
                        mode='multiple'
                        value={selectedDishIds}
                        placeholder='Chọn món ăn'
                        onChange={_onDishChange}
                        filterOption={(inputValue, option) => Boolean(option?.children?.toString().toLowerCase().includes(inputValue.toLowerCase()))}
                        style={{ width: '100%' }}>
                        {dishes.map(dish => <Option key={dish.id} value={dish.id}>{dish.name}</Option>)}
                    </Select>}
                    {source === 'shoppingLists' && <Select
                        showSearch
                        mode='multiple'
                        value={selectedShoppingListIds}
                        placeholder='Chọn lịch mua sắm'
                        onChange={ids => setSelectedShoppingListIds(ids ?? [])}
                        filterOption={(inputValue, option) => Boolean(option?.children?.toString().toLowerCase().includes(inputValue.toLowerCase()))}
                        style={{ width: '100%' }}>
                        {shoppingLists.map(item => <Option key={item.id} value={item.id}>{getShoppingListLabel(item)}</Option>)}
                    </Select>}
                    {source === 'scheduledMeals' && <Select
                        showSearch
                        mode='multiple'
                        value={selectedMealIds}
                        placeholder='Chọn thực đơn'
                        onChange={ids => setSelectedMealIds(ids ?? [])}
                        filterOption={(inputValue, option) => Boolean(option?.children?.toString().toLowerCase().includes(inputValue.toLowerCase()))}
                        style={{ width: '100%' }}>
                        {scheduledMeals.map(item => <Option key={item.id} value={item.id}>{getMealLabel(item)}</Option>)}
                    </Select>}
                </Box>

                {source === 'dishes' && <Box style={{ border: '1px solid #f3f4f6', borderRadius: 8, background: '#fff', padding: 10, marginTop: 10 }}>
                    <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 12, lineHeight: '16px', marginBottom: 7 }}>Khẩu phần từng món</Typography.Text>
                    <DishServingSelector selectedDishIds={selectedDishIds} dishes={dishes} value={selectedDishServings} onChange={setSelectedDishServings} />
                </Box>}
            </CalculatorPanel>

            {aggregate.results.length === 0 ? <Box style={{ border: '1px dashed #d9d9d9', borderRadius: 8, padding: 24, textAlign: 'center', background: '#fafafa' }}>
                <Typography.Text type='secondary'>Chưa có dữ liệu để tính.</Typography.Text>
            </Box> : <>
                <CalculatorPanel title='Tổng quan dinh dưỡng' subtitle='Các chỉ số chính theo tổng đã chọn và trung bình mỗi phần.' icon={<PieChartOutlined />} tone='#7436dc' action={<Tag color={aggregate.coveragePercent >= 80 ? 'green' : 'gold'} style={{ marginInlineEnd: 0 }}>{aggregate.coveragePercent}% phủ dữ liệu</Tag>}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(118px, 1fr))', gap: 8 }}>
                        {primaryMetricKeys.map(key => <CalculatorMetricTile
                            key={key}
                            label={NutritionGoalHelper.getNutrientLabel(key)}
                            value={NutritionGoalHelper.formatNutrientValue(key, aggregate.total[key])}
                            detail={`${NutritionGoalHelper.formatNutrientValue(key, aggregate.perServing[key])} / phần`}
                            tone={key === 'calories' ? '#d46b08' : key === 'protein' ? '#1677ff' : key === 'fiber' ? '#389e0d' : '#0f172a'}
                            active={selectedNutrientKey === key}
                            onClick={() => setSelectedNutrientKey(current => current === key ? null : key)}
                        />)}
                        <Box style={{ border: '1px solid #e6f4ff', borderRadius: 8, background: '#f7fbff', padding: 10, minWidth: 0 }}>
                            <Typography.Text type='secondary' style={{ display: 'block', fontSize: 11, lineHeight: '15px' }}>Độ phủ</Typography.Text>
                            <Stack align='center' gap={8} style={{ marginTop: 2 }}>
                                <Progress type='circle' size={40} percent={aggregate.coveragePercent} strokeColor={aggregate.coveragePercent >= 80 ? '#13a8a8' : '#faad14'} />
                                <div style={{ minWidth: 0 }}>
                                    <Typography.Text strong style={{ display: 'block', lineHeight: '18px' }}>{aggregate.coveredIngredientCount}/{aggregate.ingredientCount}</Typography.Text>
                                    <Typography.Text type='secondary' style={{ display: 'block', fontSize: 11 }}>nguyên liệu</Typography.Text>
                                </div>
                            </Stack>
                        </Box>
                    </div>
                </CalculatorPanel>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))', gap: 12, alignItems: 'start' }}>
                    <CalculatorPanel title='Chi tiết lượt món' subtitle='Món nào đang đóng góp vào phép tính hiện tại.' icon={<UnorderedListOutlined />} tone='#0958d9' action={<Tag color='blue' style={{ marginInlineEnd: 0 }}>{aggregate.results.length} lượt</Tag>}>
                        <Stack direction='column' align='stretch' gap={7} style={{ maxHeight: 280, overflowY: 'auto', paddingRight: 2 }}>
                            {aggregate.results.map(result => <div key={result.entry.key} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 8, alignItems: 'center', border: '1px solid #f3f4f6', borderRadius: 8, padding: '8px 9px', background: '#fcfcfd' }}>
                                <div style={{ minWidth: 0 }}>
                                    <Typography.Text strong style={{ display: 'block', lineHeight: '18px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{result.dish?.name ?? result.entry.dishId}</Typography.Text>
                                    <Typography.Text type='secondary' style={{ display: 'block', fontSize: 11, lineHeight: '15px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{compactSourceLabel(result.entry.sourceLabel)}</Typography.Text>
                                </div>
                                <Stack gap={5} wrap='wrap' justify='flex-end'>
                                    <Tag style={{ marginInlineEnd: 0 }}>{result.summary?.servings ?? '-'} phần</Tag>
                                    <Tag color='orange' style={{ marginInlineEnd: 0 }}>{DishNutritionHelper.formatCalories(result.summary?.total.calories)}</Tag>
                                </Stack>
                            </div>)}
                        </Stack>
                    </CalculatorPanel>

                    <CalculatorPanel title='Mục tiêu gần nhất' subtitle='Mục tiêu nutrition khớp nhất với lựa chọn hiện tại.' icon={<CheckCircleOutlined />} tone='#389e0d'>
                        {topGoalMatches.length === 0 ? <Typography.Text type='secondary' style={{ fontSize: 12 }}>Chưa có mục tiêu.</Typography.Text> : <Stack direction='column' align='stretch' gap={7}>
                            {topGoalMatches.map(({ goal, match }) => <div key={goal.id} style={{ border: `1px solid ${goal.color ?? '#13a8a8'}24`, borderRadius: 8, padding: 8, background: `${goal.color ?? '#13a8a8'}0d` }}>
                                <Stack justify='space-between' align='center' gap={8}>
                                    <Typography.Text strong style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{goal.name}</Typography.Text>
                                    <Tag color={match.matchedCriteriaCount === match.totalCriteriaCount ? 'green' : 'blue'} style={{ marginInlineEnd: 0 }}>{Math.round(match.score * 100)}%</Tag>
                                </Stack>
                                <Typography.Text type='secondary' style={{ display: 'block', fontSize: 11, lineHeight: '15px', marginTop: 3 }}>{match.matchedCriteriaCount}/{match.totalCriteriaCount} tiêu chí</Typography.Text>
                            </div>)}
                        </Stack>}
                    </CalculatorPanel>
                </div>

                <CalculatorPanel title='Toàn bộ chỉ số' subtitle='Bảng đầy đủ để kiểm tra các chỉ số ngoài nhóm chính.' icon={<FireOutlined />} tone='#d48806' action={<Space size={6} wrap>
                    {aggregate.hasNutrition && <Tag color='green' icon={<CheckCircleOutlined />} style={{ marginInlineEnd: 0 }}>Có dữ liệu</Tag>}
                    {(aggregate.missingNutritionIngredientIds.length > 0 || aggregate.missingConversionIngredientIds.length > 0) && <Tag color='gold' icon={<WarningOutlined />} style={{ marginInlineEnd: 0 }}>Thiếu {aggregate.missingNutritionIngredientIds.length + aggregate.missingConversionIngredientIds.length}</Tag>}
                </Space>}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(132px, 1fr))', gap: 7 }}>
                        {NutritionGoalHelper.nutrientOptions.map(option => <button key={option.value} type='button' onClick={() => setSelectedNutrientKey(current => current === option.value ? null : option.value)} style={{ border: selectedNutrientKey === option.value ? '1px solid #d48806' : '1px solid #f3f4f6', borderRadius: 8, padding: '7px 8px', background: selectedNutrientKey === option.value ? '#fff7e6' : '#fcfcfd', minWidth: 0, textAlign: 'left', cursor: 'pointer', boxShadow: selectedNutrientKey === option.value ? 'inset 0 0 0 1px rgba(212,136,6,0.20)' : undefined }}>
                            <Typography.Text type='secondary' style={{ display: 'block', fontSize: 11, lineHeight: '15px' }}>{option.label}</Typography.Text>
                            <Typography.Text strong style={{ display: 'block', lineHeight: '18px' }}>{option.format(aggregate.total[option.value])}</Typography.Text>
                        </button>)}
                    </div>
                    {selectedNutrientKey && selectedNutrientOption && <Box style={{ border: '1px solid rgba(212,136,6,0.18)', borderRadius: 8, background: '#fffaf0', padding: 10, marginTop: 10 }}>
                        <Stack justify='space-between' align='center' gap={8} wrap='wrap' style={{ marginBottom: 8 }}>
                            <div style={{ minWidth: 0 }}>
                                <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 13, lineHeight: '18px' }}>Chi tiết {selectedNutrientOption.label}</Typography.Text>
                                <Typography.Text type='secondary' style={{ display: 'block', fontSize: 11, lineHeight: '15px' }}>Theo từng nguyên liệu trong mỗi món đang tính.</Typography.Text>
                            </div>
                            <Button onClick={() => setSelectedNutrientKey(null)} style={{ height: 28, padding: '0 9px', fontSize: 11 }}>Đóng</Button>
                        </Stack>
                        <Stack direction='column' align='stretch' gap={8} style={{ width: '100%' }}>
                            {selectedNutrientBreakdown.map(({ result, rows, total }) => <Box key={result.entry.key} style={{ border: '1px solid rgba(15,23,42,0.07)', borderRadius: 8, background: '#fff', padding: 9 }}>
                                <Stack justify='space-between' align='flex-start' gap={8} wrap='wrap' style={{ marginBottom: 8 }}>
                                    <div style={{ minWidth: 0 }}>
                                        <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 12, lineHeight: '16px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{result.dish?.name ?? result.entry.dishId}</Typography.Text>
                                        <Typography.Text type='secondary' style={{ display: 'block', fontSize: 11, lineHeight: '15px' }}>{compactSourceLabel(result.entry.sourceLabel)}</Typography.Text>
                                    </div>
                                    <Tag color='gold' style={{ marginInlineEnd: 0 }}>{NutritionGoalHelper.formatNutrientValue(selectedNutrientKey, total)}</Tag>
                                </Stack>
                                {rows.length === 0 ? <Typography.Text type='secondary' style={{ fontSize: 11 }}>Không có dữ liệu nguyên liệu để hiển thị.</Typography.Text> : <Stack direction='column' align='stretch' gap={6} style={{ width: '100%' }}>
                                    {rows.map(row => {
                                        const value = row.total[selectedNutrientKey];
                                        const percent = typeof value === 'number' && typeof total === 'number' && total > 0 ? Math.round(value / total * 100) : 0;
                                        const label = row.missingReason === 'nutrition'
                                            ? 'Thiếu nutrition'
                                            : row.missingReason === 'conversion'
                                                ? 'Thiếu quy đổi'
                                                : NutritionGoalHelper.formatNutrientValue(selectedNutrientKey, value);
                                        return <div key={row.ingredientId} style={{ border: '1px solid #f3f4f6', borderRadius: 8, padding: '7px 8px', background: '#fcfcfd' }}>
                                            <Stack justify='space-between' align='center' gap={8} style={{ width: '100%' }}>
                                                <div style={{ minWidth: 0 }}>
                                                    <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 12, lineHeight: '16px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.ingredientName}</Typography.Text>
                                                    <Typography.Text type='secondary' style={{ display: 'block', fontSize: 11, lineHeight: '15px' }}>{row.amountLabel}</Typography.Text>
                                                </div>
                                                <Tag color={row.missingReason ? 'orange' : 'blue'} style={{ marginInlineEnd: 0, flexShrink: 0 }}>{label}</Tag>
                                            </Stack>
                                            {!row.missingReason && <div style={{ height: 5, borderRadius: 999, background: '#fff7e6', overflow: 'hidden', marginTop: 6 }}>
                                                <div style={{ height: '100%', width: `${Math.max(4, Math.min(100, percent))}%`, borderRadius: 999, background: '#d48806' }} />
                                            </div>}
                                        </div>;
                                    })}
                                </Stack>}
                            </Box>)}
                        </Stack>
                    </Box>}
                    {aggregate.sourceNames.length > 0 && <Typography.Text type='secondary' style={{ display: 'block', marginTop: 8, fontSize: 11, lineHeight: '15px' }}>
                        Nguồn: {aggregate.sourceNames.slice(0, 4).join(', ')}{aggregate.sourceNames.length > 4 ? ` +${aggregate.sourceNames.length - 4}` : ''}
                    </Typography.Text>}
                </CalculatorPanel>
            </>}
        </Box>

        <Modal
            open={creationModal === 'shoppingList'}
            title={<Space><UnorderedListOutlined />Tạo lịch mua sắm</Space>}
            onCancel={() => setCreationModal(null)}
            footer={null}
            destroyOnClose
        >
            <DeferredModalContent active={creationModal === 'shoppingList'} minHeight={260}>
                <ShoppingListAddWidget
                    date={new Date()}
                    initialName={`Dinh dưỡng ${dayjs().format('DD/MM')}`}
                    dishIds={selectedDishIds}
                    initialDishServings={selectedDishServingsForCreation}
                    onDone={() => setCreationModal(null)}
                    onCreated={(shoppingList) => navigate(RootRoutes.AuthorizedRoutes.ShoppingListRoutes.Detail(shoppingList.id))}
                />
            </DeferredModalContent>
        </Modal>
    </>;
};

export const NutritionCalculatorWidget: React.FunctionComponent = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [open, setOpen] = useState(false);
    const routeOpen = searchParams.get('calculator') === '1';
    const initialSelection = useMemo(() => getInitialSelectionFromSearch(searchParams), [searchParams]);
    const modalOpen = open || routeOpen;

    const _close = () => {
        setOpen(false);
        if (!routeOpen) return;
        const nextParams = new URLSearchParams(searchParams);
        ['calculator', 'source', 'dishes', 'shoppingLists', 'scheduledMeals'].forEach(key => nextParams.delete(key));
        setSearchParams(nextParams, { replace: true });
    };

    return <>
        <Box style={{ border: '1px solid rgba(19,168,168,0.18)', borderRadius: 8, background: 'linear-gradient(135deg, #ffffff 0%, #f6fffb 50%, #fff7e6 100%)', padding: 13, boxShadow: '0 12px 28px rgba(15,23,42,0.08)', overflow: 'hidden' }}>
            <Stack justify='space-between' align='center' gap={12}>
                <Stack align='center' gap={10} style={{ minWidth: 0 }}>
                    <span style={{ width: 42, height: 42, borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#0f766e', background: '#ccfbf1', border: '1px solid #99f6e4', flexShrink: 0, fontSize: 18 }}>
                        <CalculatorOutlined />
                    </span>
                    <div style={{ minWidth: 0 }}>
                        <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 17, lineHeight: '22px' }}>Máy tính dinh dưỡng</Typography.Text>
                        <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '17px', marginTop: 2 }}>Tính tổng dinh dưỡng từ món ăn, lịch mua sắm hoặc thực đơn đã lên.</Typography.Text>
                    </div>
                </Stack>
                <Button type='primary' icon={<FireOutlined />} onClick={() => setOpen(true)} style={{ borderRadius: 999, fontWeight: 750, flexShrink: 0 }}>Tính</Button>
            </Stack>
        </Box>

        <Modal
            open={modalOpen}
            title={<Space><CalculatorOutlined />Máy tính dinh dưỡng</Space>}
            onCancel={_close}
            footer={null}
            width='min(980px, calc(100vw - 24px))'
            bodyStyle={{ maxHeight: 'calc(100vh - 128px)', overflowY: 'auto', padding: '22px 18px 18px' }}
            destroyOnClose
        >
            <DeferredModalContent active={modalOpen} minHeight={520}>
                <NutritionCalculatorModalContent key={routeOpen ? initialSelection.key : 'manual'} initialSelection={routeOpen ? initialSelection : undefined} />
            </DeferredModalContent>
        </Modal>
    </>;
};
