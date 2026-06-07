import { BarChartOutlined, CalendarOutlined, CheckCircleOutlined, ClockCircleOutlined, DollarCircleOutlined, FireOutlined, RightOutlined, ShoppingCartOutlined, WarningOutlined } from '@ant-design/icons';
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
import { InventoryHealthConfig } from '@store/Models/SharedConfig';
import { CookingSession } from '@store/Models/CookingSession';
import { ScheduledMeal } from '@store/Models/ScheduledMeal';
import { ShoppingList, ShoppingListIngredientGroup } from '@store/Models/ShoppingList';
import { selectCookingSessions, selectDishes, selectIngredients, selectIngredientsById, selectInventory, selectInventoryHealthConfig, selectScheduledMeals, selectShoppingLists } from '@store/Selectors';
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

const today = () => moment().startOf('day');

const formatHeaderDateLabel = (value = new Date()): string => {
    const day = String(value.getDate()).padStart(2, '0');
    const month = String(value.getMonth() + 1).padStart(2, '0');
    return `${day}, ${month} ${value.getFullYear()}`;
}

const isSameDay = (value?: Date | string | null): boolean => {
    return Boolean(value) && moment(value).isSame(today(), 'day');
}

const formatCostSummary = (summary: CostEstimateSummary): string => {
    if (!CostEstimateHelper.hasAny(summary)) return '0đ';
    if (!CostEstimateHelper.hasPrice(summary)) return 'Chưa có giá';
    return IngredientPriceHelper.formatRange(summary);
}

const truncateName = (value: string, maxLength = 42): string => {
    return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
}

const formatNamePreview = (names: string[], emptyText: string, hiddenLabel = 'mục khác'): string => {
    if (names.length === 0) return emptyText;
    const shown = names.slice(0, 3).map(item => truncateName(item));
    const hiddenCount = names.length - shown.length;
    return hiddenCount > 0 ? `${shown.join(', ')} và ${hiddenCount} ${hiddenLabel}` : shown.join(', ');
}

const getIngredientById = (ingredientsById: Map<string, Ingredient>, id: string): Ingredient | undefined => {
    return ingredientsById.get(id);
}

const getGroupNeedToBuy = (
    group: ShoppingListIngredientGroup,
    ingredient: Ingredient | undefined,
    inventory: IngredientInventory | undefined,
    inventoryConfig?: InventoryHealthConfig,
): { amount: number; unit: IngredientUnit } => {
    const unit = IngredientUnitHelper.getBaseUnit(ingredient, group.amounts.map(item => item.unit));
    const required = group.amounts.reduce((sum, item) => {
        const converted = IngredientUnitHelper.toBaseAmount(ingredient, item.amount, item.unit, unit);
        return sum + (converted ?? IngredientUnitHelper.parseAmount(item.amount));
    }, 0);
    const available = InventoryHelper.availableAmount(inventory, ingredient, required, inventoryConfig);
    return { amount: Math.max(0, required - available), unit };
}

const estimateShoppingListCart = (
    shoppingList: ShoppingList,
    ingredientsById: Map<string, Ingredient>,
    inventoryItems: Record<string, IngredientInventory>,
    inventoryConfig?: InventoryHealthConfig,
): CostEstimateSummary => {
    return shoppingList.ingredients.reduce((summary, group) => {
        const ingredient = getIngredientById(ingredientsById, group.ingredientId);
        if (InventoryHelper.isAlwaysAvailable(ingredient)) return summary;
        const need = getGroupNeedToBuy(group, ingredient, inventoryItems[group.ingredientId], inventoryConfig);
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
    inventoryConfig?: InventoryHealthConfig,
): UrgentInventoryItem[] => {
    return Object.entries(inventoryItems).flatMap(([ingredientId, inventory]) => {
        const ingredient = getIngredientById(ingredientsById, ingredientId);
        if (InventoryHelper.isAlwaysAvailable(ingredient)) return [];
        const batches = inventory.batches ?? [];
        return batches
            .filter(batch => batch.amount > 0)
            .map(batch => {
                const daysLeft = InventoryHelper.daysUntilBatchExpiry(batch, ingredient, inventoryConfig);
                const expiry = InventoryHelper.batchExpiry(batch, ingredient, inventoryConfig);
                if (!InventoryHelper.isUrgentExpiry(daysLeft, inventoryConfig)) return null;
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

const dashboardCss = `
.dashboard-section-card {
    transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
}
.dashboard-section-card:hover {
    border-color: rgba(116,54,220,0.20);
    box-shadow: 0 14px 34px rgba(74, 48, 130, 0.13);
}
.dashboard-action-row:hover .dashboard-action-card {
    border-color: rgba(116,54,220,0.18);
    box-shadow: 0 10px 24px rgba(74, 48, 130, 0.10);
    transform: translateY(-1px);
}
.dashboard-section-title {
    color: #111827;
    font-size: 19px;
    font-weight: 800;
    line-height: 25px;
}
.dashboard-section-subtitle {
    color: #667085;
    font-size: 12px;
    line-height: 17px;
}
`;

const Section: React.FunctionComponent<{ title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode; icon?: React.ReactNode; tone?: string }> = ({ title, subtitle, action, children, icon, tone = '#1677ff' }) => {
    return <section className='dashboard-section-card' style={{
        border: '1px solid rgba(116,54,220,0.10)',
        borderRadius: 8,
        background: 'rgba(255,255,255,0.96)',
        boxShadow: '0 10px 28px rgba(74, 48, 130, 0.10)',
        overflow: 'hidden',
    }}>
        <div style={{ padding: '13px 13px 11px', background: `linear-gradient(90deg, ${tone}12 0%, rgba(255,255,255,0.96) 72%)`, borderBottom: '1px solid rgba(116,54,220,0.09)' }}>
            <Stack justify='space-between' align='flex-start' gap={8}>
                <Stack align='flex-start' gap={9} style={{ minWidth: 0 }}>
                    {icon && <span style={{ width: 40, height: 40, borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: tone, background: `${tone}16`, border: `1px solid ${tone}28`, flexShrink: 0, fontSize: 19 }}>{icon}</span>}
                    <div style={{ minWidth: 0 }}>
                        <Typography.Text className='dashboard-section-title' style={{ display: 'block' }}>{title}</Typography.Text>
                        {subtitle && <Typography.Text className='dashboard-section-subtitle' style={{ display: 'block', marginTop: 2 }}>{subtitle}</Typography.Text>}
                    </div>
                </Stack>
                {action && <div style={{ borderRadius: 999, background: '#f7f4ff', border: '1px solid rgba(116,54,220,0.10)' }}>{action}</div>}
            </Stack>
        </div>
        <div style={{ padding: 12 }}>
            <Stack direction='column' align='stretch' gap={8}>{children}</Stack>
        </div>
    </section>;
}

const EmptySection: React.FunctionComponent<{ text: string }> = ({ text }) => {
    return <Box style={{ padding: '18px 8px', background: '#fbf9ff', border: '1px dashed rgba(116,54,220,0.16)', borderRadius: 8 }}>
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<Typography.Text type='secondary'>{text}</Typography.Text>} />
    </Box>;
}

const DataMetric: React.FunctionComponent<{ icon: React.ReactNode; label: string; value: string | number; detail?: React.ReactNode; tone?: string }> = ({ icon, label, value, detail, tone }) => {
    return <Box style={{ padding: '11px 12px', border: '1px solid rgba(116,54,220,0.10)', borderRadius: 8, background: '#fff', minWidth: 0, boxShadow: '0 6px 18px rgba(74,48,130,0.07)' }}>
        <Stack align='flex-start' gap={8}>
            <span style={{ width: 30, height: 30, borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: tone ?? '#1677ff', background: `${tone ?? '#1677ff'}12`, flexShrink: 0 }}>{icon}</span>
            <div style={{ minWidth: 0 }}>
                <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 18, lineHeight: '23px' }}>{value}</Typography.Text>
                <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '16px', fontWeight: 650 }}>{label}</Typography.Text>
                {detail && <Typography.Text type='secondary' style={{ display: 'block', fontSize: 11.5, lineHeight: '16px', marginTop: 4, overflowWrap: 'anywhere' }}>{detail}</Typography.Text>}
            </div>
        </Stack>
    </Box>;
}

type PriorityAction = {
    icon: React.ReactNode;
    title: string;
    description: string;
    actionLabel: string;
    tone: string;
    onOpen?: () => void;
    tags?: React.ReactNode;
}

type DashboardExpensiveMetrics = {
    suggestions: ScoredDish[];
    shoppingListCosts: Record<string, string>;
}

type WeekOverviewItem = {
    label: string;
    dateLabel: string;
    mealCount: number;
    shoppingCount: number;
}

const createEmptyDashboardExpensiveMetrics = (): DashboardExpensiveMetrics => ({
    suggestions: [],
    shoppingListCosts: {},
});

type DashboardHeroMetric = {
    key: string;
    label: string;
    value: string | number;
    detail: string;
    tone: string;
    detailTitle: string;
    detailItems: string[];
    emptyText: string;
    actionLabel: string;
    onOpen: () => void;
}

const DashboardHero: React.FunctionComponent<{
    item: PriorityAction;
    dateLabel: string;
    mainValue: number;
    mainLabel: string;
    metrics: DashboardHeroMetric[];
    onAnalyticsOpen: () => void;
}> = ({ item, dateLabel, mainValue, mainLabel, metrics, onAnalyticsOpen }) => {
    const [activeMetricKey, setActiveMetricKey] = React.useState(metrics[0]?.key ?? '');
    const activeMetric = metrics.find(metric => metric.key === activeMetricKey) ?? metrics[0];

    return <Box style={{
        borderRadius: 8,
        padding: 14,
        background: 'linear-gradient(135deg, #8f46f7 0%, #7436dc 58%, #5e2bbf 100%)',
        color: '#fff',
        boxShadow: '0 18px 36px rgba(74,48,130,0.24)',
        overflow: 'hidden',
        position: 'relative',
    }}>
        <div style={{ position: 'absolute', top: -34, right: -24, width: 112, height: 112, borderRadius: '50%', background: 'rgba(255,255,255,0.14)' }} />
        <div style={{ position: 'absolute', bottom: -48, left: -28, width: 128, height: 128, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
        <Stack justify='space-between' align='center' gap={8} style={{ position: 'relative', marginBottom: 12 }}>
            <div style={{ minWidth: 0 }}>
                <Typography.Text style={{ display: 'block', color: 'rgba(255,255,255,0.82)', fontSize: 12, lineHeight: '16px', fontWeight: 650 }}>My Recipes</Typography.Text>
                <Typography.Text strong style={{ display: 'block', color: '#fff', fontSize: 16, lineHeight: '21px' }}>Tổng quan bếp hôm nay</Typography.Text>
            </div>
            <Stack align='center' gap={6} style={{ flexShrink: 0 }}>
                <span style={{ borderRadius: 999, padding: '5px 10px', background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.22)', color: '#fff', fontSize: 11, fontWeight: 750, whiteSpace: 'nowrap' }}>{dateLabel}</span>
                <button
                    type='button'
                    aria-label='Mở phân tích dữ liệu'
                    onClick={onAnalyticsOpen}
                    style={{
                        width: 32,
                        height: 32,
                        borderRadius: 999,
                        border: '1px solid rgba(255,255,255,0.24)',
                        background: 'rgba(255,255,255,0.18)',
                        color: '#fff',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.16)',
                    }}
                >
                    <BarChartOutlined />
                </button>
            </Stack>
        </Stack>
        <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 10, alignItems: 'end', marginBottom: 12 }}>
            <div style={{ minWidth: 0 }}>
                <Typography.Text strong style={{ display: 'block', color: '#fff', fontSize: 36, lineHeight: '40px', letterSpacing: 0 }}>{mainValue}</Typography.Text>
                <Typography.Text style={{ display: 'block', color: 'rgba(255,255,255,0.84)', fontSize: 12, lineHeight: '17px' }}>{mainLabel}</Typography.Text>
            </div>
            {item.onOpen && <Button onClick={item.onOpen} style={{ borderRadius: 999, background: '#fff', borderColor: '#fff', color: '#5e2bbf', fontWeight: 750, boxShadow: '0 10px 22px rgba(34,17,83,0.18)' }}>{item.actionLabel}</Button>}
        </div>
        <Box style={{ position: 'relative', borderRadius: 8, padding: 10, background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.18)', marginBottom: 10 }}>
            <Typography.Text style={{ display: 'block', color: 'rgba(255,255,255,0.76)', fontSize: 11, lineHeight: '15px', marginBottom: 3 }}>Ưu tiên hiện tại</Typography.Text>
            <Typography.Text strong style={{ display: 'block', color: '#fff', fontSize: 15, lineHeight: '20px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                <span style={{ marginRight: 6 }}>{item.icon}</span>{item.title}
            </Typography.Text>
            <Typography.Text style={{ display: 'block', color: 'rgba(255,255,255,0.78)', fontSize: 12, lineHeight: '17px', marginTop: 2 }}>{item.description}</Typography.Text>
            {item.tags && <Stack wrap='wrap' gap={5} style={{ marginTop: 8 }}>{item.tags}</Stack>}
        </Box>
        <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
            {metrics.map(metric => {
                const active = activeMetric?.key === metric.key;
                return <button
                    key={metric.key}
                    type='button'
                    aria-expanded={active}
                    onClick={() => setActiveMetricKey(metric.key)}
                    style={{
                        minWidth: 0,
                        border: active ? `1px solid ${metric.tone}` : '1px solid transparent',
                        borderRadius: 8,
                        background: '#fff',
                        padding: '9px 8px',
                        boxShadow: active ? '0 10px 22px rgba(34,17,83,0.20)' : '0 8px 18px rgba(34,17,83,0.16)',
                        textAlign: 'left',
                        cursor: 'pointer',
                    }}
                >
                <Typography.Text strong style={{ display: 'block', color: metric.tone, fontSize: 16, lineHeight: '20px' }}>{metric.value}</Typography.Text>
                <Typography.Text style={{ display: 'block', color: '#111827', fontSize: 11, fontWeight: 750, lineHeight: '15px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{metric.label}</Typography.Text>
                <Typography.Text type='secondary' style={{ display: 'block', fontSize: 10, lineHeight: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{metric.detail}</Typography.Text>
                </button>
            })}
        </div>
        {activeMetric && <Box style={{ position: 'relative', marginTop: 8, borderRadius: 8, padding: 10, background: 'rgba(255,255,255,0.96)', border: '1px solid rgba(255,255,255,0.78)', boxShadow: '0 10px 22px rgba(34,17,83,0.12)' }}>
            <Stack justify='space-between' align='flex-start' gap={8}>
                <div style={{ minWidth: 0 }}>
                    <Typography.Text strong style={{ display: 'block', color: activeMetric.tone, fontSize: 13, lineHeight: '18px' }}>{activeMetric.detailTitle}</Typography.Text>
                    <Typography.Text type='secondary' style={{ display: 'block', fontSize: 11, lineHeight: '15px' }}>
                        {activeMetric.detailItems.length > 0 ? activeMetric.detailItems.slice(0, 3).join(' · ') : activeMetric.emptyText}
                    </Typography.Text>
                </div>
                <Button onClick={activeMetric.onOpen} style={{ flexShrink: 0, borderRadius: 999, color: activeMetric.tone, borderColor: `${activeMetric.tone}55`, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    {activeMetric.actionLabel}
                </Button>
            </Stack>
        </Box>}
    </Box>;
}

const WeeklyOverviewCard: React.FunctionComponent<{ items: WeekOverviewItem[] }> = ({ items }) => {
    const maxValue = Math.max(1, ...items.map(item => item.mealCount + item.shoppingCount));
    const totalMeals = items.reduce((sum, item) => sum + item.mealCount, 0);
    const totalShopping = items.reduce((sum, item) => sum + item.shoppingCount, 0);

    return <Box style={{
        borderRadius: 8,
        background: '#fff',
        border: '1px solid rgba(116,54,220,0.10)',
        boxShadow: '0 10px 28px rgba(74,48,130,0.10)',
        padding: 12,
    }}>
        <Stack justify='space-between' align='flex-start' gap={8} style={{ marginBottom: 12 }}>
            <div style={{ minWidth: 0 }}>
                <Typography.Text strong style={{ display: 'block', fontSize: 16, lineHeight: '21px', color: '#111827' }}>Kế hoạch 7 ngày</Typography.Text>
                <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '16px' }}>{totalMeals} thực đơn · {totalShopping} danh sách mua</Typography.Text>
            </div>
            <Stack.Compact>
                <span style={{ padding: '5px 10px', borderRadius: 999, background: '#f4efff', color: '#7436dc', fontSize: 11, fontWeight: 750 }}>Thực đơn</span>
                <span style={{ padding: '5px 10px', borderRadius: 999, background: '#eef7ff', color: '#0958d9', fontSize: 11, fontWeight: 750 }}>Mua sắm</span>
            </Stack.Compact>
        </Stack>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`, gap: 8, alignItems: 'end', minHeight: 126 }}>
            {items.map(item => {
                const total = item.mealCount + item.shoppingCount;
                const height = Math.max(12, Math.round(total / maxValue * 80));
                const mealHeight = total > 0 ? Math.max(6, Math.round(item.mealCount / Math.max(1, total) * height)) : 0;
                const shoppingHeight = total > 0 ? Math.max(6, height - mealHeight) : 0;
                return <div key={item.dateLabel} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 0 }}>
                    <div style={{ height: 86, display: 'flex', alignItems: 'flex-end' }}>
                        <div style={{ width: 20, height, borderRadius: 999, overflow: 'hidden', background: '#f1eef8', boxShadow: total > 0 ? '0 8px 16px rgba(116,54,220,0.16)' : 'none' }}>
                            {shoppingHeight > 0 && <div style={{ height: shoppingHeight, background: '#48a6ff' }} />}
                            {mealHeight > 0 && <div style={{ height: mealHeight, background: 'linear-gradient(180deg, #8f46f7 0%, #7436dc 100%)' }} />}
                        </div>
                    </div>
                    <Typography.Text style={{ fontSize: 11, lineHeight: '14px', color: '#6b7280', whiteSpace: 'nowrap' }}>{item.label}</Typography.Text>
                    <Typography.Text style={{ fontSize: 10, lineHeight: '13px', color: '#9ca3af', whiteSpace: 'nowrap' }}>{item.dateLabel}</Typography.Text>
                </div>
            })}
        </div>
    </Box>;
}

const ActionRow: React.FunctionComponent<{
    testId?: string;
    title: string;
    description: React.ReactNode;
    accent: string;
    icon?: React.ReactNode;
    right?: React.ReactNode;
    tags?: React.ReactNode;
    onOpen: () => void;
}> = ({ testId, title, description, accent, icon, right, tags, onOpen }) => {
    return <button className='dashboard-action-row' data-testid={testId} onClick={onOpen} style={{ width: '100%', border: 0, background: 'transparent', padding: 0, textAlign: 'left', cursor: 'pointer' }}>
        <div className='dashboard-action-card' style={{ display: 'grid', gridTemplateColumns: '5px minmax(0, 1fr)', border: '1px solid rgba(116,54,220,0.10)', borderRadius: 8, background: '#fff', overflow: 'hidden', boxShadow: '0 6px 18px rgba(74,48,130,0.07)', transition: 'border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease' }}>
            <div style={{ background: accent }} />
            <div style={{ padding: '10px 11px', minWidth: 0 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 8, alignItems: 'start' }}>
                    <div style={{ minWidth: 0 }}>
                        <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 14.5, lineHeight: '20px', overflowWrap: 'anywhere' }}>
                            {icon && <span style={{ color: accent, marginRight: 6 }}>{icon}</span>}{title}
                        </Typography.Text>
                        <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12.5, lineHeight: '17px', marginTop: 2, overflowWrap: 'anywhere' }}>{description}</Typography.Text>
                    </div>
                    <Stack align='center' gap={6} style={{ flexShrink: 0 }}>
                        {right}
                        <RightOutlined style={{ color: '#bfbfbf', fontSize: 12 }} />
                    </Stack>
                </div>
                {tags && <Stack wrap='wrap' gap={5} style={{ marginTop: 8 }}>{tags}</Stack>}
            </div>
        </div>
    </button>;
}

const UrgentRow: React.FunctionComponent<{ item: UrgentInventoryItem; onOpen: () => void }> = ({ item, onOpen }) => {
    const badge = InventoryHelper.expiryBadge(item.daysLeft);
    const accent = item.daysLeft < 0 ? '#cf1322' : item.daysLeft <= 1 ? '#fa541c' : '#fa8c16';
    return <ActionRow
        testId={`dashboard-urgent-${item.ingredientId}`}
        title={item.ingredientName}
        description={`${IngredientUnitHelper.formatAmount(item.amount)} ${item.unit} · Hạn ${item.expiresAtLabel}`}
        accent={accent}
        icon={<WarningOutlined />}
        right={badge && <Tag color={item.daysLeft < 0 ? 'red' : item.daysLeft <= 1 ? 'volcano' : 'orange'} style={{ marginInlineEnd: 0 }}>{badge.label}</Tag>}
        onOpen={onOpen}
    />;
}

const SuggestionRow: React.FunctionComponent<{ item: ScoredDish; onOpen: () => void }> = ({ item, onOpen }) => {
    const matchPercent = Math.round(item.score * 100);
    const accent = matchPercent >= 100 ? '#389e0d' : matchPercent >= 50 ? '#d48806' : '#d46b08';
    return <ActionRow
        testId={`dashboard-suggestion-${item.dish.id}`}
        title={item.dish.name}
        description={`${item.matchedIngredientIds.length} đủ · ${item.partialIngredientIds?.length ?? 0} còn một phần · ${item.missingIngredientIds.length} thiếu`}
        accent={accent}
        icon={<FireOutlined />}
        right={<Tag color={matchPercent >= 100 ? 'green' : matchPercent >= 50 ? 'gold' : 'orange'} style={{ marginInlineEnd: 0 }}>{matchPercent}%</Tag>}
        tags={<>
            {(item.urgentIngredients?.length ?? 0) > 0 && <Tag color='volcano' style={{ marginInlineEnd: 0 }}>Cần dùng sớm</Tag>}
            {item.extraShoppingCost && <Tag color='blue' style={{ marginInlineEnd: 0 }}>Mua thêm {IngredientPriceHelper.formatRange(item.extraShoppingCost)}</Tag>}
            {(item.missingPriceCount ?? 0) > 0 && <Tag style={{ marginInlineEnd: 0 }}>{item.missingPriceCount} thiếu giá</Tag>}
        </>}
        onOpen={onOpen}
    />;
}

const ShoppingListRow: React.FunctionComponent<{ item: ShoppingList; cost: string; onOpen: () => void }> = ({ item, cost, onOpen }) => {
    const progress = getProgress(item);
    const plannedLabel = item.plannedDate ? moment(item.plannedDate).format('DD/MM/YYYY') : 'Chưa có ngày';
    const overdue = item.plannedDate && moment(item.plannedDate).isBefore(today(), 'day');
    const accent = overdue ? '#cf1322' : progress.percent === 100 ? '#389e0d' : '#0958d9';

    return <ActionRow
        testId={`dashboard-shopping-list-${item.id}`}
        title={item.name}
        description={`${plannedLabel} · ${progress.done}/${progress.total} nguyên liệu`}
        accent={accent}
        icon={<ShoppingCartOutlined />}
        right={<Typography.Text strong style={{ color: accent, whiteSpace: 'nowrap' }}>{cost}</Typography.Text>}
        tags={<div style={{ height: 5, width: '100%', minWidth: 120, borderRadius: 5, background: '#f0f0f0', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress.percent}%`, background: accent }} />
        </div>}
        onOpen={onOpen}
    />;
}

const TodayMealRow: React.FunctionComponent<{ item: ScheduledMeal; onOpen: () => void }> = ({ item, onOpen }) => {
    const dishCount = Object.values(item.meals).flat().length;
    return <ActionRow
        title={item.name}
        description={`${dishCount} món · ${moment(item.plannedDate).format('DD/MM/YYYY')}`}
        accent='#1677ff'
        icon={<CalendarOutlined />}
        onOpen={onOpen}
    />;
}

const CookingRow: React.FunctionComponent<{ item: CookingSession; onOpen: () => void }> = ({ item, onOpen }) => {
    return <ActionRow
        title={item.dishName}
        description={`Bước ${(item.currentStepIndex ?? 0) + 1}/${item.steps.length || 1}`}
        accent='#fa8c16'
        icon={<FireOutlined />}
        onOpen={onOpen}
    />;
}

export const DashboardScreen = () => {
    const navigate = useNavigate();
    const openRoute = React.useCallback((href: string) => {
        React.startTransition(() => navigate(href));
    }, [navigate]);
    const ingredients = useSelector(selectIngredients);
    const ingredientsById = useSelector(selectIngredientsById);
    const dishes = useSelector(selectDishes);
    const inventoryItems = useSelector(selectInventory);
    const inventoryConfig = useSelector(selectInventoryHealthConfig);
    const shoppingLists = useSelector(selectShoppingLists);
    const scheduledMeals = useSelector(selectScheduledMeals);
    const cookingSessions = useSelector(selectCookingSessions);
    useScreenTitle({ value: 'Tổng quan', deps: [] });

    const activeSessions = useMemo(() => cookingSessions.filter(item => item.status === 'cooking'), [cookingSessions]);
    const todayMeals = useMemo(() => scheduledMeals.filter(item => isSameDay(item.plannedDate)), [scheduledMeals]);
    const openShoppingLists = useMemo(() => shoppingLists
        .filter(item => !item.completedAt)
        .sort((a, b) => moment(a.plannedDate ?? a.createdDate).valueOf() - moment(b.plannedDate ?? b.createdDate).valueOf()), [shoppingLists]);
    const todayShoppingLists = useMemo(() => openShoppingLists.filter(item => isSameDay(item.plannedDate)), [openShoppingLists]);
    const weekOverview = useMemo(() => Array.from({ length: 7 }).map((_, index) => {
        const date = today().add(index, 'day');
        return {
            label: index === 0 ? 'Hôm nay' : date.format('dd'),
            dateLabel: date.format('DD/MM'),
            mealCount: scheduledMeals.filter(item => moment(item.plannedDate).isSame(date, 'day')).length,
            shoppingCount: openShoppingLists.filter(item => item.plannedDate && moment(item.plannedDate).isSame(date, 'day')).length,
        };
    }), [openShoppingLists, scheduledMeals]);
    const urgentInventory = useMemo(() => buildUrgentInventory(inventoryItems, ingredientsById, inventoryConfig), [inventoryItems, ingredientsById, inventoryConfig]);
    const calculateExpensiveMetrics = React.useCallback((): DashboardExpensiveMetrics => {
        const shoppingListCosts = openShoppingLists.reduce((result, item) => {
            result[item.id] = formatCostSummary(estimateShoppingListCart(item, ingredientsById, inventoryItems, inventoryConfig));
            return result;
        }, {} as Record<string, string>);

        return {
            suggestions: DishScorer.scoreWithInventory(dishes, inventoryItems, dishes, ingredients, inventoryConfig).slice(0, 4),
            shoppingListCosts,
        };
    }, [dishes, ingredients, ingredientsById, inventoryItems, inventoryConfig, openShoppingLists]);
    const { value: expensiveMetrics, pending: expensiveMetricsPending } = useScheduledCalculation(calculateExpensiveMetrics, {
        initialValue: createEmptyDashboardExpensiveMetrics,
    });
    const { suggestions, shoppingListCosts } = expensiveMetrics;

    const expiredCount = urgentInventory.filter(item => item.daysLeft < 0).length;
    const todayDishCount = todayMeals.reduce((sum, meal) => sum + Object.values(meal.meals).flat().length, 0);
    const completedDishes = dishes.filter(item => item.isCompleted);
    const incompleteDishes = dishes.filter(item => !item.isCompleted);
    const stockedIngredientCount = Object.entries(inventoryItems).filter(([, inventory]) => (inventory.batches ?? []).some(batch => batch.amount > 0)).length;
    const stockedBatchCount = Object.values(inventoryItems).reduce((sum, inventory) => sum + (inventory.batches ?? []).filter(batch => batch.amount > 0).length, 0);
    const firstUrgentInventory = urgentInventory[0];
    const firstActiveSession = activeSessions[0];
    const firstTodayShoppingList = todayShoppingLists[0];
    const firstTodayMeal = todayMeals[0];
    const firstSuggestion = suggestions[0];
    const priorityAction: PriorityAction = firstUrgentInventory
        ? {
            icon: <WarningOutlined />,
            title: firstUrgentInventory.daysLeft < 0 ? 'Bỏ lô hết hạn' : 'Dùng nguyên liệu sớm',
            description: `${firstUrgentInventory.ingredientName} · ${IngredientUnitHelper.formatAmount(firstUrgentInventory.amount)} ${firstUrgentInventory.unit} · hạn ${firstUrgentInventory.expiresAtLabel}`,
            actionLabel: 'Mở kho',
            tone: firstUrgentInventory.daysLeft < 0 ? '#cf1322' : '#fa8c16',
            onOpen: () => openRoute(RootRoutes.AuthorizedRoutes.IngredientRoutes.Detail(firstUrgentInventory.ingredientId)),
            tags: <Tag color={firstUrgentInventory.daysLeft < 0 ? 'red' : 'orange'} style={{ marginInlineEnd: 0 }}>{InventoryHelper.expiryBadge(firstUrgentInventory.daysLeft)?.label}</Tag>,
        }
        : firstActiveSession
            ? {
                icon: <FireOutlined />,
                title: 'Tiếp tục phiên nấu',
                description: `${firstActiveSession.dishName} · bước ${(firstActiveSession.currentStepIndex ?? 0) + 1}/${firstActiveSession.steps.length || 1}`,
                actionLabel: 'Mở món',
                tone: '#fa8c16',
                onOpen: () => openRoute(RootRoutes.AuthorizedRoutes.DishesRoutes.ManageIngredient(firstActiveSession.dishId)),
            }
            : firstTodayShoppingList
                ? {
                    icon: <ShoppingCartOutlined />,
                    title: 'Hoàn tất mua sắm hôm nay',
                    description: `${firstTodayShoppingList.name} · ${getProgress(firstTodayShoppingList).done}/${getProgress(firstTodayShoppingList).total} nguyên liệu · ${expensiveMetricsPending ? '...' : shoppingListCosts[firstTodayShoppingList.id] ?? '0đ'}`,
                    actionLabel: 'Mở danh sách',
                    tone: '#0958d9',
                    onOpen: () => openRoute(RootRoutes.AuthorizedRoutes.ShoppingListRoutes.Detail(firstTodayShoppingList.id)),
                }
                : firstTodayMeal
                    ? {
                        icon: <CalendarOutlined />,
                        title: 'Kiểm tra thực đơn hôm nay',
                        description: `${firstTodayMeal.name} · ${Object.values(firstTodayMeal.meals).flat().length} món`,
                        actionLabel: 'Mở thực đơn',
                        tone: '#1677ff',
                        onOpen: () => openRoute(RootRoutes.AuthorizedRoutes.ScheduledMealRoutes.List()),
                    }
                    : firstSuggestion
                        ? {
                            icon: <FireOutlined />,
                            title: 'Có món phù hợp với tồn kho',
                            description: `${firstSuggestion.dish.name} · khớp ${Math.round(firstSuggestion.score * 100)}% nguyên liệu`,
                            actionLabel: 'Mở món',
                            tone: '#389e0d',
                            onOpen: () => openRoute(RootRoutes.AuthorizedRoutes.DishesRoutes.ManageIngredient(firstSuggestion.dish.id)),
                        }
                        : {
                            icon: <CheckCircleOutlined />,
                            title: 'Không có việc gấp',
                            description: 'Tồn kho, lịch mua sắm và thực đơn hôm nay chưa có mục cần xử lý ngay.',
                            actionLabel: 'Mở món ăn',
                            tone: '#389e0d',
                            onOpen: () => openRoute(RootRoutes.AuthorizedRoutes.DishesRoutes.List()),
                        };
    const dateLabel = formatHeaderDateLabel();
    const todayActionCount = todayMeals.length + todayShoppingLists.length + activeSessions.length + urgentInventory.length;
    const heroMetrics: DashboardHeroMetric[] = [
        {
            key: 'meals',
            label: 'Thực đơn',
            value: todayMeals.length,
            detail: `${todayDishCount} món`,
            tone: '#7436dc',
            detailTitle: 'Thực đơn hôm nay',
            detailItems: todayMeals.map(meal => `${meal.name}: ${Object.values(meal.meals).flat().length} món`),
            emptyText: 'Chưa có thực đơn nào cho hôm nay.',
            actionLabel: 'Mở thực đơn',
            onOpen: () => openRoute(RootRoutes.AuthorizedRoutes.ScheduledMealRoutes.List()),
        },
        {
            key: 'shopping',
            label: 'Mua sắm',
            value: todayShoppingLists.length,
            detail: `${openShoppingLists.length} đang mở`,
            tone: '#0958d9',
            detailTitle: 'Mua sắm cần theo dõi',
            detailItems: todayShoppingLists.length > 0
                ? todayShoppingLists.map(list => `${list.name}: ${getProgress(list).done}/${getProgress(list).total}`)
                : openShoppingLists.slice(0, 3).map(list => `${list.name}: đang mở`),
            emptyText: 'Không có danh sách mua sắm đang mở.',
            actionLabel: 'Mở mua sắm',
            onOpen: () => openRoute(RootRoutes.AuthorizedRoutes.ShoppingListRoutes.List()),
        },
        {
            key: 'inventory',
            label: 'Kho',
            value: urgentInventory.length,
            detail: `${expiredCount} quá hạn`,
            tone: expiredCount > 0 ? '#cf1322' : '#fa8c16',
            detailTitle: 'Nguyên liệu cần chú ý',
            detailItems: urgentInventory.slice(0, 3).map(item => `${item.ingredientName}: hạn ${item.expiresAtLabel}`),
            emptyText: 'Không có nguyên liệu hết hạn hoặc sắp hết hạn trong 3 ngày.',
            actionLabel: 'Mở kho',
            onOpen: () => openRoute(RootRoutes.AuthorizedRoutes.IngredientRoutes.List()),
        },
    ];

    return <Box data-testid="dashboard" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 0 14px', maxWidth: 760, margin: '0 auto' }}>
        <style>{dashboardCss}</style>
        <DashboardHero
            item={priorityAction}
            dateLabel={dateLabel}
            mainValue={todayActionCount}
            mainLabel='việc cần nhìn trong hôm nay'
            metrics={heroMetrics}
            onAnalyticsOpen={() => openRoute(RootRoutes.AuthorizedRoutes.Analytics())}
        />

        <WeeklyOverviewCard items={weekOverview} />

        <Section
            title='Hôm nay'
            subtitle='Phiên nấu, thực đơn và danh sách mua cần xem trước.'
            icon={<CalendarOutlined />}
            tone='#1677ff'
            action={<Button type='link' onClick={() => openRoute(RootRoutes.AuthorizedRoutes.ScheduledMealRoutes.List())}>Mở thực đơn</Button>}
        >
            {activeSessions.length === 0 && todayMeals.length === 0 && todayShoppingLists.length === 0
                ? <EmptySection text='Không có việc nào được lên lịch hôm nay.' />
                : <>
                    {activeSessions.slice(0, 2).map(session => <CookingRow key={session.id} item={session} onOpen={() => openRoute(RootRoutes.AuthorizedRoutes.DishesRoutes.ManageIngredient(session.dishId))} />)}
                    {todayMeals.slice(0, 3).map(meal => <TodayMealRow key={meal.id} item={meal} onOpen={() => openRoute(RootRoutes.AuthorizedRoutes.ScheduledMealRoutes.List())} />)}
                    {todayShoppingLists.slice(0, 2).map(list => <ShoppingListRow key={list.id} item={list} cost={expensiveMetricsPending ? '...' : shoppingListCosts[list.id] ?? '0đ'} onOpen={() => openRoute(RootRoutes.AuthorizedRoutes.ShoppingListRoutes.Detail(list.id))} />)}
                </>}
        </Section>

        <Section
            title='Nguyên liệu cần dùng sớm'
            subtitle='Ưu tiên nguyên liệu hết hạn hoặc còn tối đa 3 ngày.'
            icon={<WarningOutlined />}
            tone={expiredCount > 0 ? '#cf1322' : '#fa8c16'}
            action={<Button type='link' onClick={() => openRoute(RootRoutes.AuthorizedRoutes.IngredientRoutes.List())}>Mở kho</Button>}
        >
            {urgentInventory.length === 0
                ? <EmptySection text='Chưa có lô nào hết hạn hoặc sắp hết hạn trong 3 ngày.' />
                : urgentInventory.slice(0, 6).map(item => <UrgentRow key={`${item.ingredientId}-${item.expiresAtLabel}-${item.amount}`} item={item} onOpen={() => openRoute(RootRoutes.AuthorizedRoutes.IngredientRoutes.Detail(item.ingredientId))} />)}
        </Section>

        <Section
            title='Gợi ý món nên nấu'
            subtitle='Tính từ tồn kho hiện tại và nguyên liệu cần dùng sớm.'
            icon={<FireOutlined />}
            tone='#389e0d'
            action={<Button type='link' onClick={() => openRoute(RootRoutes.AuthorizedRoutes.DishesRoutes.List())}>Mở món ăn</Button>}
        >
            {expensiveMetricsPending
                ? <EmptySection text='Đang tính gợi ý từ tồn kho...' />
                : suggestions.length === 0
                ? <EmptySection text='Chưa có đủ dữ liệu tồn kho để gợi ý món.' />
                : suggestions.map(item => <SuggestionRow key={item.dish.id} item={item} onOpen={() => openRoute(RootRoutes.AuthorizedRoutes.DishesRoutes.ManageIngredient(item.dish.id))} />)}
        </Section>

        <Section
            title='Danh sách mua sắm đang mở'
            subtitle='Theo dõi tiến độ và chi phí còn cần mua.'
            icon={<ShoppingCartOutlined />}
            tone='#0958d9'
            action={<Button type='link' onClick={() => openRoute(RootRoutes.AuthorizedRoutes.ShoppingListRoutes.List())}>Mở mua sắm</Button>}
        >
            {openShoppingLists.length === 0
                ? <EmptySection text='Không có danh sách mua sắm đang mở.' />
                : openShoppingLists.slice(0, 5).map(item => <ShoppingListRow key={item.id} item={item} cost={expensiveMetricsPending ? '...' : shoppingListCosts[item.id] ?? '0đ'} onOpen={() => openRoute(RootRoutes.AuthorizedRoutes.ShoppingListRoutes.Detail(item.id))} />)}
        </Section>

        <Section title='Tổng quan dữ liệu' subtitle='Tình trạng dữ liệu chính trong app.' icon={<CheckCircleOutlined />} tone='#722ed1'>
            <Box style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 }}>
                <DataMetric icon={<CheckCircleOutlined />} label='Món đã hoàn thiện' value={completedDishes.length} detail='Đã bật trạng thái hoàn thiện' tone='#389e0d' />
                <DataMetric icon={<ClockCircleOutlined />} label='Món chưa hoàn thiện' value={incompleteDishes.length} detail={incompleteDishes.length > 0 ? `Chưa bật hoàn thiện: ${formatNamePreview(incompleteDishes.map(item => item.name), 'Không có món nào', 'món khác')}` : 'Không có món cần cập nhật'} tone='#d46b08' />
                <DataMetric icon={<DollarCircleOutlined />} label='Danh sách đang mở' value={openShoppingLists.length} detail={openShoppingLists.length > 0 ? `Chưa bấm hoàn tất: ${formatNamePreview(openShoppingLists.map(item => item.name), 'Không có danh sách nào', 'danh sách khác')}` : 'Không có danh sách đang mở'} tone='#0958d9' />
                <DataMetric icon={<RightOutlined />} label='Nguyên liệu có tồn kho' value={stockedIngredientCount} detail={`${stockedBatchCount} lô còn số lượng trong kho`} tone='#722ed1' />
            </Box>
        </Section>
    </Box>;
}
