import { BarChartOutlined, CalendarOutlined, CheckCircleOutlined, ClockCircleOutlined, DollarCircleOutlined, FireOutlined, QuestionCircleOutlined, ShoppingCartOutlined, TagsOutlined, WarningOutlined } from '@ant-design/icons';
import { CostEstimateHelper, CostEstimateSummary } from '@common/Helpers/CostEstimateHelper';
import { IngredientPriceHelper } from '@common/Helpers/IngredientPriceHelper';
import { IngredientUnitHelper } from '@common/Helpers/IngredientUnitHelper';
import { InventoryHelper } from '@common/Helpers/InventoryHelper';
import { Button } from '@components/Button';
import { Empty } from '@components/Empty';
import { Box } from '@components/Layout/Box';
import { Stack } from '@components/Layout/Stack';
import { Tag } from '@components/Tag';
import { Typography } from '@components/Typography';
import { useScheduledCalculation, useScreenTitle } from '@hooks';
import { DishScorer, ScoredDish } from '@modules/DishSuggester/Helpers/DishScorer';
import { RootRoutes } from '@routing/RootRoutes';
import { Ingredient, IngredientInventory, IngredientUnit, InventoryBatch } from '@store/Models/Ingredient';
import { ShoppingList, ShoppingListIngredientGroup } from '@store/Models/ShoppingList';
import { selectCookingSessions, selectDishes, selectIngredients, selectIngredientsById, selectInventory, selectScheduledMeals, selectShoppingLists } from '@store/Selectors';
import moment from 'moment';
import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

type UrgentInventoryItem = {
    ingredientId: string;
    ingredientName: string;
    amount: number;
    unit: IngredientUnit;
    daysLeft: number;
    expiresAtLabel: string;
}

type ShoppingCostRow = {
    id: string;
    name: string;
    progress: number;
    costLabel: string;
    value: number;
}

type AnalyticsExpensiveMetrics = {
    shoppingCosts: ShoppingCostRow[];
    totalOpenShoppingCost: CostEstimateSummary;
    suggestions: ScoredDish[];
}

const today = () => moment().startOf('day');

const formatHeaderDateLabel = (value = new Date()): string => {
    const day = String(value.getDate()).padStart(2, '0');
    const month = String(value.getMonth() + 1).padStart(2, '0');
    return `${day}, ${month} ${value.getFullYear()}`;
}

const isSameDay = (value?: Date | string | null): boolean => {
    return Boolean(value) && moment(value).isSame(today(), 'day');
}

const truncateName = (value: string, maxLength = 24): string => {
    return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
}

const formatCostSummary = (summary: CostEstimateSummary): string => {
    if (!CostEstimateHelper.hasAny(summary)) return '0đ';
    if (!CostEstimateHelper.hasPrice(summary)) return 'Chưa có giá';
    return IngredientPriceHelper.formatRange(summary);
}

const getIngredientById = (ingredientsById: Map<string, Ingredient>, id: string): Ingredient | undefined => {
    return ingredientsById.get(id);
}

const getGroupNeedToBuy = (
    group: ShoppingListIngredientGroup,
    ingredient: Ingredient | undefined,
    inventory: IngredientInventory | undefined,
): { amount: number; unit: IngredientUnit } => {
    const unit = IngredientUnitHelper.getBaseUnit(ingredient, group.amounts.map(item => item.unit));
    const required = group.amounts.reduce((sum, item) => {
        const converted = IngredientUnitHelper.toBaseAmount(ingredient, item.amount, item.unit, unit);
        return sum + (converted ?? IngredientUnitHelper.parseAmount(item.amount));
    }, 0);
    const available = InventoryHelper.availableAmount(inventory, ingredient, required);
    return { amount: Math.max(0, required - available), unit };
}

const estimateShoppingListCart = (
    shoppingList: ShoppingList,
    ingredientsById: Map<string, Ingredient>,
    inventoryItems: Record<string, IngredientInventory>,
): CostEstimateSummary => {
    return shoppingList.ingredients.reduce((summary, group) => {
        const ingredient = getIngredientById(ingredientsById, group.ingredientId);
        if (InventoryHelper.isAlwaysAvailable(ingredient)) return summary;
        const need = getGroupNeedToBuy(group, ingredient, inventoryItems[group.ingredientId]);
        if (need.amount > 0) CostEstimateHelper.addAmount(summary, ingredient, need.amount, need.unit);
        return summary;
    }, CostEstimateHelper.emptySummary());
}

const getProgress = (shoppingList: ShoppingList): { done: number; total: number; percent: number } => {
    const total = shoppingList.ingredients.length;
    const done = shoppingList.ingredients.filter(item => item.isDone).length;
    return { done, total, percent: total > 0 ? Math.round(done / total * 100) : 0 };
}

const buildUrgentInventory = (
    inventoryItems: Record<string, IngredientInventory>,
    ingredientsById: Map<string, Ingredient>,
): UrgentInventoryItem[] => {
    return Object.entries(inventoryItems).flatMap(([ingredientId, inventory]) => {
        const ingredient = getIngredientById(ingredientsById, ingredientId);
        if (InventoryHelper.isAlwaysAvailable(ingredient)) return [];
        const batches = inventory.batches ?? [];
        return batches
            .filter(batch => batch.amount > 0)
            .map(batch => {
                const daysLeft = InventoryHelper.daysUntilBatchExpiry(batch, ingredient);
                const expiry = InventoryHelper.batchExpiry(batch, ingredient);
                if (daysLeft === null || daysLeft > 3) return null;
                return {
                    ingredientId,
                    ingredientName: ingredient?.name ?? ingredientId,
                    amount: batch.amount,
                    unit: IngredientUnitHelper.getBatchUnit(inventory, batch as InventoryBatch, ingredient),
                    daysLeft,
                    expiresAtLabel: expiry ? expiry.format('DD/MM/YYYY') : 'Không rõ',
                };
            })
            .filter((item): item is UrgentInventoryItem => item !== null);
    }).sort((a, b) => a.daysLeft - b.daysLeft);
}

const createEmptyAnalyticsExpensiveMetrics = (): AnalyticsExpensiveMetrics => ({
    shoppingCosts: [],
    totalOpenShoppingCost: CostEstimateHelper.emptySummary(),
    suggestions: [],
});

const analyticsCss = `
.analytics-section-card {
    transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
}
.analytics-section-card:hover {
    border-color: rgba(116,54,220,0.20);
    box-shadow: 0 16px 34px rgba(74, 48, 130, 0.13);
}
`;

const SectionCard: React.FunctionComponent<{ title: string; subtitle: string; helpText: string; icon: React.ReactNode; tone: string; children: React.ReactNode }> = ({ title, subtitle, helpText, icon, tone, children }) => {
    const [showHelp, setShowHelp] = React.useState(false);

    return <section className='analytics-section-card' style={{ border: '1px solid rgba(116,54,220,0.10)', borderRadius: 8, background: '#fff', boxShadow: '0 10px 28px rgba(74,48,130,0.09)', overflow: 'hidden' }}>
        <div style={{ padding: 12 }}>
            <Stack justify='space-between' align='flex-start' gap={8} style={{ marginBottom: 12 }}>
                <Stack align='flex-start' gap={9} style={{ minWidth: 0 }}>
                    <span style={{ width: 36, height: 36, borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: tone, background: `${tone}14`, border: `1px solid ${tone}24`, flexShrink: 0 }}>{icon}</span>
                    <div style={{ minWidth: 0 }}>
                        <Typography.Text strong style={{ display: 'block', fontSize: 17, lineHeight: '22px', color: '#111827' }}>{title}</Typography.Text>
                        <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '16px', marginTop: 2 }}>{subtitle}</Typography.Text>
                    </div>
                </Stack>
                <button
                    type='button'
                    aria-label={`Mô tả ${title}`}
                    aria-expanded={showHelp}
                    onClick={() => setShowHelp(value => !value)}
                    style={{
                        width: 32,
                        height: 32,
                        borderRadius: 999,
                        border: `1px solid ${tone}2e`,
                        background: showHelp ? `${tone}16` : '#fff',
                        color: tone,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        flexShrink: 0,
                    }}
                >
                    <QuestionCircleOutlined />
                </button>
            </Stack>
            {showHelp && <Box style={{ marginBottom: 12, padding: '9px 10px', borderRadius: 8, border: `1px solid ${tone}24`, background: `${tone}0d` }}>
                <Typography.Text style={{ display: 'block', color: '#2f2545', fontSize: 12, lineHeight: '17px' }}>{helpText}</Typography.Text>
            </Box>}
            {children}
        </div>
    </section>;
}

const StatCard: React.FunctionComponent<{ label: string; value: string | number; detail: string; tone: string; icon: React.ReactNode }> = ({ label, value, detail, tone, icon }) => {
    return <Box style={{ borderRadius: 8, background: '#fff', border: '1px solid rgba(255,255,255,0.70)', padding: 11, boxShadow: '0 10px 22px rgba(34,17,83,0.16)', minWidth: 0 }}>
        <Stack align='flex-start' gap={8}>
            <span style={{ width: 32, height: 32, borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: tone, background: `${tone}14`, flexShrink: 0 }}>{icon}</span>
            <div style={{ minWidth: 0 }}>
                <Typography.Text strong style={{ display: 'block', color: tone, fontSize: 20, lineHeight: '24px' }}>{value}</Typography.Text>
                <Typography.Text style={{ display: 'block', color: '#111827', fontSize: 12, lineHeight: '16px', fontWeight: 750 }}>{label}</Typography.Text>
                <Typography.Text type='secondary' style={{ display: 'block', fontSize: 11, lineHeight: '15px', marginTop: 2 }}>{detail}</Typography.Text>
            </div>
        </Stack>
    </Box>;
}

const HorizontalBar: React.FunctionComponent<{ label: string; value: number; max: number; color: string; detail?: string }> = ({ label, value, max, color, detail }) => {
    const width = Math.max(4, Math.round(value / Math.max(1, max) * 100));
    return <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 10, alignItems: 'center' }}>
        <div style={{ minWidth: 0 }}>
            <Stack justify='space-between' gap={8} style={{ marginBottom: 4 }}>
                <Typography.Text style={{ fontSize: 12, lineHeight: '16px', color: '#2f2545', fontWeight: 650, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</Typography.Text>
                <Typography.Text type='secondary' style={{ fontSize: 11, lineHeight: '15px', whiteSpace: 'nowrap' }}>{detail ?? value}</Typography.Text>
            </Stack>
            <div style={{ height: 8, borderRadius: 999, background: '#f0edf8', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${width}%`, borderRadius: 999, background: color, boxShadow: `0 6px 14px ${color}33` }} />
            </div>
        </div>
    </div>;
}

const EmptyAnalytics: React.FunctionComponent<{ text: string }> = ({ text }) => {
    return <Box style={{ padding: '20px 8px', borderRadius: 8, border: '1px dashed rgba(116,54,220,0.16)', background: '#fbf9ff' }}>
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<Typography.Text type='secondary'>{text}</Typography.Text>} />
    </Box>;
}

export const DashboardAnalyticsScreen = () => {
    const navigate = useNavigate();
    const ingredients = useSelector(selectIngredients);
    const ingredientsById = useSelector(selectIngredientsById);
    const dishes = useSelector(selectDishes);
    const inventoryItems = useSelector(selectInventory);
    const shoppingLists = useSelector(selectShoppingLists);
    const scheduledMeals = useSelector(selectScheduledMeals);
    const cookingSessions = useSelector(selectCookingSessions);
    useScreenTitle({ value: 'Phân tích', deps: [] });

    const openRoute = React.useCallback((href: string) => {
        React.startTransition(() => navigate(href));
    }, [navigate]);

    const activeSessions = useMemo(() => cookingSessions.filter(item => item.status === 'cooking'), [cookingSessions]);
    const todayMeals = useMemo(() => scheduledMeals.filter(item => isSameDay(item.plannedDate)), [scheduledMeals]);
    const openShoppingLists = useMemo(() => shoppingLists
        .filter(item => !item.completedAt)
        .sort((a, b) => moment(a.plannedDate ?? a.createdDate).valueOf() - moment(b.plannedDate ?? b.createdDate).valueOf()), [shoppingLists]);
    const todayShoppingLists = useMemo(() => openShoppingLists.filter(item => isSameDay(item.plannedDate)), [openShoppingLists]);
    const urgentInventory = useMemo(() => buildUrgentInventory(inventoryItems, ingredientsById), [inventoryItems, ingredientsById]);
    const weekOverview = useMemo(() => Array.from({ length: 7 }).map((_, index) => {
        const date = today().add(index, 'day');
        return {
            label: index === 0 ? 'Hôm nay' : date.format('dd'),
            dateLabel: date.format('DD/MM'),
            mealCount: scheduledMeals.filter(item => moment(item.plannedDate).isSame(date, 'day')).length,
            shoppingCount: openShoppingLists.filter(item => item.plannedDate && moment(item.plannedDate).isSame(date, 'day')).length,
        };
    }), [openShoppingLists, scheduledMeals]);
    const mealSlotCounts = useMemo(() => {
        const end = today().add(14, 'days');
        return scheduledMeals
            .filter(item => !moment(item.plannedDate).isBefore(today(), 'day') && moment(item.plannedDate).isBefore(end, 'day'))
            .reduce((result, item) => {
                result.breakfast += item.meals.breakfast.length;
                result.lunch += item.meals.lunch.length;
                result.dinner += item.meals.dinner.length;
                return result;
            }, { breakfast: 0, lunch: 0, dinner: 0 });
    }, [scheduledMeals]);
    const inventoryByCategory = useMemo(() => {
        const rows = ingredients.reduce((result, ingredient) => {
            const key = ingredient.category || 'Khác';
            if (!result[key]) result[key] = { category: key, total: 0, stocked: 0 };
            const inventory = inventoryItems[ingredient.id];
            const stocked = InventoryHelper.isAlwaysAvailable(ingredient) || (inventory?.batches ?? []).some(batch => batch.amount > 0);
            result[key].total += 1;
            result[key].stocked += stocked ? 1 : 0;
            return result;
        }, {} as Record<string, { category: string; total: number; stocked: number }>);
        return Object.values(rows).sort((a, b) => b.total - a.total).slice(0, 8);
    }, [ingredients, inventoryItems]);
    const dishTagRows = useMemo(() => {
        const tagCounts = dishes.flatMap(item => item.tags ?? []).reduce((result, tag) => {
            result[tag] = (result[tag] ?? 0) + 1;
            return result;
        }, {} as Record<string, number>);
        return Object.entries(tagCounts).map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count).slice(0, 8);
    }, [dishes]);
    const calculateExpensiveMetrics = React.useCallback((): AnalyticsExpensiveMetrics => {
        const totalOpenShoppingCost = CostEstimateHelper.emptySummary();
        const shoppingCosts = openShoppingLists.slice(0, 6).map(list => {
            const summary = estimateShoppingListCart(list, ingredientsById, inventoryItems);
            CostEstimateHelper.mergeSummary(totalOpenShoppingCost, summary);
            const progress = getProgress(list);
            return {
                id: list.id,
                name: list.name,
                progress: progress.percent,
                costLabel: formatCostSummary(summary),
                value: CostEstimateHelper.hasPrice(summary) ? Math.max(summary.min, summary.max) : 0,
            };
        });

        return {
            shoppingCosts,
            totalOpenShoppingCost,
            suggestions: DishScorer.scoreWithInventory(dishes, inventoryItems, dishes, ingredients).slice(0, 5),
        };
    }, [dishes, ingredients, ingredientsById, inventoryItems, openShoppingLists]);
    const { value: expensiveMetrics, pending: expensiveMetricsPending } = useScheduledCalculation(calculateExpensiveMetrics, {
        initialValue: createEmptyAnalyticsExpensiveMetrics,
    });
    const { shoppingCosts, totalOpenShoppingCost, suggestions } = expensiveMetrics;

    const todayDishCount = todayMeals.reduce((sum, meal) => sum + Object.values(meal.meals).flat().length, 0);
    const completedDishes = dishes.filter(item => item.isCompleted).length;
    const dishCompletePercent = dishes.length > 0 ? Math.round(completedDishes / dishes.length * 100) : 0;
    const urgentExpiredCount = urgentInventory.filter(item => item.daysLeft < 0).length;
    const stockedIngredientCount = Object.entries(inventoryItems).filter(([, inventory]) => (inventory.batches ?? []).some(batch => batch.amount > 0)).length;
    const weekMax = Math.max(1, ...weekOverview.map(item => item.mealCount + item.shoppingCount));
    const mealSlotMax = Math.max(1, mealSlotCounts.breakfast, mealSlotCounts.lunch, mealSlotCounts.dinner);
    const categoryMax = Math.max(1, ...inventoryByCategory.map(item => item.total));
    const tagMax = Math.max(1, ...dishTagRows.map(item => item.count));
    const shoppingCostMax = Math.max(1, ...shoppingCosts.map(item => item.value));

    return <Box data-testid='dashboard-analytics' style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 0 14px', maxWidth: 980, margin: '0 auto' }}>
        <style>{analyticsCss}</style>
        <Box style={{ borderRadius: 8, padding: 14, background: 'linear-gradient(135deg, #8f46f7 0%, #7436dc 58%, #5e2bbf 100%)', color: '#fff', boxShadow: '0 18px 36px rgba(74,48,130,0.24)' }}>
            <Stack justify='space-between' align='flex-start' gap={10} style={{ marginBottom: 12 }}>
                <div style={{ minWidth: 0 }}>
                    <Typography.Text style={{ display: 'block', color: 'rgba(255,255,255,0.82)', fontSize: 12, lineHeight: '16px', fontWeight: 650 }}>My Recipes</Typography.Text>
                    <Typography.Text strong style={{ display: 'block', color: '#fff', fontSize: 22, lineHeight: '28px' }}>Phân tích bếp nhà</Typography.Text>
                    <Typography.Text style={{ display: 'block', color: 'rgba(255,255,255,0.78)', fontSize: 12, lineHeight: '17px', marginTop: 2 }}>Dữ liệu thực đơn, mua sắm, tồn kho và món ăn trong một màn hình.</Typography.Text>
                </div>
                <Stack align='center' gap={6} style={{ flexShrink: 0 }}>
                    <span style={{ borderRadius: 999, padding: '5px 10px', background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.22)', color: '#fff', fontSize: 11, fontWeight: 750, whiteSpace: 'nowrap' }}>{formatHeaderDateLabel()}</span>
                    <Button onClick={() => openRoute(RootRoutes.AuthorizedRoutes.Root())} style={{ borderRadius: 999, background: '#fff', borderColor: '#fff', color: '#5e2bbf', fontWeight: 750, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>Tổng quan</Button>
                </Stack>
            </Stack>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(156px, 1fr))', gap: 8 }}>
                <StatCard label='Việc hôm nay' value={todayMeals.length + todayShoppingLists.length + activeSessions.length + urgentInventory.length} detail={`${todayDishCount} món trong thực đơn`} tone='#7436dc' icon={<CalendarOutlined />} />
                <StatCard label='Mua sắm mở' value={openShoppingLists.length} detail={expensiveMetricsPending ? 'Đang tính chi phí...' : formatCostSummary(totalOpenShoppingCost)} tone='#0958d9' icon={<ShoppingCartOutlined />} />
                <StatCard label='Kho cần chú ý' value={urgentInventory.length} detail={`${urgentExpiredCount} lô đã quá hạn`} tone={urgentExpiredCount > 0 ? '#cf1322' : '#fa8c16'} icon={<WarningOutlined />} />
                <StatCard label='Món hoàn thiện' value={`${dishCompletePercent}%`} detail={`${completedDishes}/${dishes.length} món`} tone='#389e0d' icon={<CheckCircleOutlined />} />
            </div>
        </Box>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
            <SectionCard title='Kế hoạch 7 ngày' subtitle='Thực đơn và danh sách mua sắm sắp tới.' helpText='Dùng để nhìn nhanh tuần tới có ngày nào nhiều việc bếp: cột tím là thực đơn, cột xanh là danh sách mua sắm. Ngày cột cao hơn cần chuẩn bị nhiều hơn.' icon={<BarChartOutlined />} tone='#7436dc'>
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${weekOverview.length}, minmax(0, 1fr))`, gap: 8, alignItems: 'end', minHeight: 156 }}>
                    {weekOverview.map(item => {
                        const total = item.mealCount + item.shoppingCount;
                        const height = Math.max(12, Math.round(total / weekMax * 100));
                        const mealHeight = total > 0 ? Math.max(6, Math.round(item.mealCount / total * height)) : 0;
                        const shoppingHeight = total > 0 ? Math.max(6, height - mealHeight) : 0;
                        return <div key={item.dateLabel} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 0 }}>
                            <div style={{ height: 108, display: 'flex', alignItems: 'flex-end' }}>
                                <div style={{ width: 22, height, borderRadius: 999, overflow: 'hidden', background: '#f1eef8', boxShadow: total > 0 ? '0 8px 16px rgba(116,54,220,0.18)' : 'none' }}>
                                    {shoppingHeight > 0 && <div style={{ height: shoppingHeight, background: '#48a6ff' }} />}
                                    {mealHeight > 0 && <div style={{ height: mealHeight, background: 'linear-gradient(180deg, #8f46f7 0%, #7436dc 100%)' }} />}
                                </div>
                            </div>
                            <Typography.Text style={{ fontSize: 11, lineHeight: '14px', color: '#6b7280', whiteSpace: 'nowrap' }}>{item.label}</Typography.Text>
                            <Typography.Text style={{ fontSize: 10, lineHeight: '13px', color: '#9ca3af', whiteSpace: 'nowrap' }}>{item.dateLabel}</Typography.Text>
                        </div>;
                    })}
                </div>
                <Stack wrap='wrap' gap={6} style={{ marginTop: 8 }}>
                    <Tag color='purple' style={{ marginInlineEnd: 0 }}>Thực đơn</Tag>
                    <Tag color='blue' style={{ marginInlineEnd: 0 }}>Mua sắm</Tag>
                </Stack>
            </SectionCard>

            <SectionCard title='Nhịp bữa ăn' subtitle='Các món đã lên lịch trong 14 ngày tới.' helpText='Dùng để xem bữa sáng, trưa hay tối đang được lên lịch nhiều nhất, giúp cân bằng kế hoạch nấu ăn và tránh dồn quá nhiều món vào một khung bữa.' icon={<ClockCircleOutlined />} tone='#1677ff'>
                <Stack direction='column' align='stretch' gap={11}>
                    <HorizontalBar label='Bữa sáng' value={mealSlotCounts.breakfast} max={mealSlotMax} color='#48a6ff' detail={`${mealSlotCounts.breakfast} món`} />
                    <HorizontalBar label='Bữa trưa' value={mealSlotCounts.lunch} max={mealSlotMax} color='#8f46f7' detail={`${mealSlotCounts.lunch} món`} />
                    <HorizontalBar label='Bữa tối' value={mealSlotCounts.dinner} max={mealSlotMax} color='#fa8c16' detail={`${mealSlotCounts.dinner} món`} />
                </Stack>
            </SectionCard>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
            <SectionCard title='Sức khoẻ tồn kho' subtitle={`${stockedIngredientCount} nguyên liệu đang có lô trong kho.`} helpText='Dùng để biết nhóm nguyên liệu nào có nhiều dữ liệu nhất và trong mỗi nhóm đang có bao nhiêu nguyên liệu còn sẵn trong kho.' icon={<WarningOutlined />} tone='#fa8c16'>
                {inventoryByCategory.length === 0 ? <EmptyAnalytics text='Chưa có dữ liệu nguyên liệu để phân tích kho.' /> : <Stack direction='column' align='stretch' gap={10}>
                    {inventoryByCategory.map((item, index) => <HorizontalBar
                        key={item.category}
                        label={item.category}
                        value={item.total}
                        max={categoryMax}
                        color={['#7436dc', '#48a6ff', '#52c41a', '#fa8c16', '#eb2f96', '#13c2c2', '#fadb14', '#722ed1'][index % 8]}
                        detail={`${item.stocked}/${item.total} có sẵn`}
                    />)}
                </Stack>}
            </SectionCard>

            <SectionCard title='Nguyên liệu khẩn cấp' subtitle='Các lô hết hạn hoặc còn tối đa 3 ngày.' helpText='Dùng để ưu tiên xử lý nguyên liệu sắp hết hạn hoặc đã quá hạn, từ đó quyết định nên nấu món nào trước hoặc bỏ lô nào khỏi kho.' icon={<WarningOutlined />} tone={urgentExpiredCount > 0 ? '#cf1322' : '#fa8c16'}>
                {urgentInventory.length === 0 ? <EmptyAnalytics text='Không có nguyên liệu sắp hết hạn.' /> : <Stack direction='column' align='stretch' gap={8}>
                    {urgentInventory.slice(0, 6).map(item => {
                        const badge = InventoryHelper.expiryBadge(item.daysLeft);
                        const tone = item.daysLeft < 0 ? '#cf1322' : item.daysLeft <= 1 ? '#fa541c' : '#fa8c16';
                        return <button key={`${item.ingredientId}-${item.expiresAtLabel}-${item.amount}`} type='button' onClick={() => openRoute(RootRoutes.AuthorizedRoutes.IngredientRoutes.Detail(item.ingredientId))} style={{ border: '1px solid rgba(116,54,220,0.10)', borderRadius: 8, background: '#fff', padding: '9px 10px', textAlign: 'left', cursor: 'pointer', boxShadow: '0 6px 18px rgba(74,48,130,0.06)' }}>
                            <Stack justify='space-between' gap={8}>
                                <div style={{ minWidth: 0 }}>
                                    <Typography.Text strong style={{ display: 'block', lineHeight: '18px', color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.ingredientName}</Typography.Text>
                                    <Typography.Text type='secondary' style={{ display: 'block', fontSize: 11, lineHeight: '15px' }}>{IngredientUnitHelper.formatAmount(item.amount)} {item.unit} · hạn {item.expiresAtLabel}</Typography.Text>
                                </div>
                                {badge && <Tag color={item.daysLeft < 0 ? 'red' : item.daysLeft <= 1 ? 'volcano' : 'orange'} style={{ marginInlineEnd: 0, color: tone }}>{badge.label}</Tag>}
                            </Stack>
                        </button>;
                    })}
                </Stack>}
            </SectionCard>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
            <SectionCard title='Chi phí mua sắm' subtitle='Ước tính các danh sách đang mở, ưu tiên theo ngày.' helpText='Dùng để xem danh sách mua sắm nào có chi phí dự kiến cao hơn và tiến độ mua của từng danh sách, giúp ưu tiên ngân sách trước khi đi chợ.' icon={<DollarCircleOutlined />} tone='#0958d9'>
                {expensiveMetricsPending ? <EmptyAnalytics text='Đang tính chi phí mua sắm...' /> : shoppingCosts.length === 0 ? <EmptyAnalytics text='Không có danh sách mua sắm đang mở.' /> : <Stack direction='column' align='stretch' gap={10}>
                    {shoppingCosts.map(item => <HorizontalBar key={item.id} label={truncateName(item.name, 26)} value={item.value} max={shoppingCostMax} color='#0958d9' detail={`${item.costLabel} · ${item.progress}%`} />)}
                    <Button onClick={() => openRoute(RootRoutes.AuthorizedRoutes.ShoppingListRoutes.List())} style={{ borderRadius: 999, color: '#0958d9', borderColor: 'rgba(9,88,217,0.30)', fontWeight: 700 }}>Mở mua sắm</Button>
                </Stack>}
            </SectionCard>

            <SectionCard title='Tình trạng món ăn' subtitle='Độ hoàn thiện và nhóm món đang nổi bật.' helpText='Dùng để theo dõi tỷ lệ món đã hoàn thiện thông tin và nhóm tag món ăn đang nhiều nhất, giúp biết phần dữ liệu món nào cần bổ sung.' icon={<TagsOutlined />} tone='#389e0d'>
                <div style={{ display: 'grid', gridTemplateColumns: '112px minmax(0, 1fr)', gap: 14, alignItems: 'center' }}>
                    <div style={{ width: 112, height: 112, borderRadius: '50%', background: `conic-gradient(#389e0d 0 ${dishCompletePercent}%, #f0edf8 ${dishCompletePercent}% 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 22px rgba(56,158,13,0.14)' }}>
                        <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                            <Typography.Text strong style={{ color: '#389e0d', fontSize: 20, lineHeight: '24px' }}>{dishCompletePercent}%</Typography.Text>
                            <Typography.Text type='secondary' style={{ fontSize: 10, lineHeight: '13px' }}>hoàn thiện</Typography.Text>
                        </div>
                    </div>
                    <Stack direction='column' align='stretch' gap={8}>
                        <HorizontalBar label='Đã hoàn thiện' value={completedDishes} max={Math.max(1, dishes.length)} color='#389e0d' detail={`${completedDishes} món`} />
                        <HorizontalBar label='Cần cập nhật' value={Math.max(0, dishes.length - completedDishes)} max={Math.max(1, dishes.length)} color='#d46b08' detail={`${Math.max(0, dishes.length - completedDishes)} món`} />
                    </Stack>
                </div>
                <Stack direction='column' align='stretch' gap={8} style={{ marginTop: 14 }}>
                    {dishTagRows.length === 0 ? <Typography.Text type='secondary' style={{ fontSize: 12 }}>Chưa có tag món ăn để phân tích.</Typography.Text> : dishTagRows.map((item, index) => <HorizontalBar key={item.tag} label={item.tag} value={item.count} max={tagMax} color={['#7436dc', '#48a6ff', '#52c41a', '#fa8c16', '#eb2f96', '#13c2c2', '#fadb14', '#722ed1'][index % 8]} detail={`${item.count} món`} />)}
                </Stack>
            </SectionCard>
        </div>

        <SectionCard title='Gợi ý từ dữ liệu hiện tại' subtitle='Món phù hợp với tồn kho và nguyên liệu cần dùng sớm.' helpText='Dùng để chọn món nên nấu dựa trên nguyên liệu đang có, nguyên liệu thiếu và mức độ khớp với tồn kho hiện tại.' icon={<FireOutlined />} tone='#389e0d'>
            {expensiveMetricsPending ? <EmptyAnalytics text='Đang tính gợi ý món...' /> : suggestions.length === 0 ? <EmptyAnalytics text='Chưa có đủ dữ liệu để gợi ý món.' /> : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 8 }}>
                {suggestions.map(item => {
                    const matchPercent = Math.round(item.score * 100);
                    const tone = matchPercent >= 100 ? '#389e0d' : matchPercent >= 50 ? '#d48806' : '#d46b08';
                    return <button key={item.dish.id} type='button' onClick={() => openRoute(RootRoutes.AuthorizedRoutes.DishesRoutes.ManageIngredient(item.dish.id))} style={{ border: '1px solid rgba(116,54,220,0.10)', borderRadius: 8, background: '#fff', padding: 11, textAlign: 'left', cursor: 'pointer', boxShadow: '0 6px 18px rgba(74,48,130,0.07)' }}>
                        <Typography.Text strong style={{ display: 'block', color: '#111827', lineHeight: '18px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.dish.name}</Typography.Text>
                        <Typography.Text type='secondary' style={{ display: 'block', fontSize: 11, lineHeight: '15px', marginTop: 3 }}>{item.matchedIngredientIds.length} đủ · {item.missingIngredientIds.length} thiếu</Typography.Text>
                        <div style={{ height: 6, borderRadius: 999, background: '#f0edf8', overflow: 'hidden', marginTop: 9 }}>
                            <div style={{ height: '100%', width: `${Math.max(4, matchPercent)}%`, borderRadius: 999, background: tone }} />
                        </div>
                        <Typography.Text strong style={{ display: 'block', color: tone, fontSize: 12, lineHeight: '16px', marginTop: 6 }}>{matchPercent}% khớp</Typography.Text>
                    </button>;
                })}
            </div>}
        </SectionCard>
    </Box>;
}
