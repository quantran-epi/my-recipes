import { CalendarOutlined, CheckCircleOutlined, ClockCircleOutlined, DollarCircleOutlined, FireOutlined, RightOutlined, ShoppingCartOutlined, WarningOutlined } from '@ant-design/icons';
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
import { useScreenTitle } from '@hooks';
import { DishScorer, ScoredDish } from '@modules/DishSuggester/Helpers/DishScorer';
import { RootRoutes } from '@routing/RootRoutes';
import { Ingredient, IngredientInventory, IngredientUnit, InventoryBatch } from '@store/Models/Ingredient';
import { CookingSession } from '@store/Models/CookingSession';
import { ScheduledMeal } from '@store/Models/ScheduledMeal';
import { ShoppingList, ShoppingListIngredientGroup } from '@store/Models/ShoppingList';
import { selectCookingSessions, selectDishes, selectIngredients, selectIngredientsById, selectInventory, selectScheduledMeals, selectShoppingLists } from '@store/Selectors';
import moment from 'moment';
import React, { useEffect, useMemo, useState } from 'react';
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

const isSameDay = (value?: Date | string | null): boolean => {
    return Boolean(value) && moment(value).isSame(today(), 'day');
}

const formatCostSummary = (summary: CostEstimateSummary): string => {
    if (!CostEstimateHelper.hasAny(summary)) return '0đ';
    if (!CostEstimateHelper.hasPrice(summary)) return 'Chưa có giá';
    return IngredientPriceHelper.formatRange(summary);
}

const truncateName = (value: string, maxLength = 28): string => {
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

const Section: React.FunctionComponent<{ title: string; action?: React.ReactNode; children: React.ReactNode }> = ({ title, action, children }) => {
    return <section>
        <Stack justify='space-between' align='center' style={{ marginBottom: 8 }}>
            <Typography.Text strong style={{ fontSize: 16 }}>{title}</Typography.Text>
            {action}
        </Stack>
        <Stack direction='column' align='stretch' gap={8}>{children}</Stack>
    </section>;
}

const EmptySection: React.FunctionComponent<{ text: string }> = ({ text }) => {
    return <Box style={{ padding: '18px 8px', background: '#fff', border: '1px dashed #d9d9d9', borderRadius: 8 }}>
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<Typography.Text type='secondary'>{text}</Typography.Text>} />
    </Box>;
}

const StatusChip: React.FunctionComponent<{ icon: React.ReactNode; label: string; value: string | number; tone: string }> = ({ icon, label, value, tone }) => {
    return <Box style={{ minWidth: 0, border: `1px solid ${tone}26`, background: `${tone}0f`, borderRadius: 8, padding: '8px 10px' }}>
        <Stack align='center' gap={7} style={{ minWidth: 0 }}>
            <span style={{ color: tone, flexShrink: 0 }}>{icon}</span>
            <div style={{ minWidth: 0 }}>
                <Typography.Text strong style={{ display: 'block', color: tone, lineHeight: '17px' }}>{value}</Typography.Text>
                <Typography.Text type='secondary' style={{ display: 'block', fontSize: 11, lineHeight: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</Typography.Text>
            </div>
        </Stack>
    </Box>;
}

const DataMetric: React.FunctionComponent<{ icon: React.ReactNode; label: string; value: string | number; detail?: React.ReactNode; tone?: string }> = ({ icon, label, value, detail, tone }) => {
    return <Box style={{ padding: '10px 12px', border: '1px solid #f0f0f0', borderRadius: 8, background: '#fff', minWidth: 0 }}>
        <Stack align='flex-start' gap={8}>
            <span style={{ color: tone ?? '#1677ff', flexShrink: 0 }}>{icon}</span>
            <div style={{ minWidth: 0 }}>
                <Typography.Text strong style={{ display: 'block', lineHeight: '18px' }}>{value}</Typography.Text>
                <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '16px' }}>{label}</Typography.Text>
                {detail && <Typography.Text type='secondary' style={{ display: 'block', fontSize: 11, lineHeight: '15px', marginTop: 4, overflowWrap: 'anywhere' }}>{detail}</Typography.Text>}
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

const PriorityPanel: React.FunctionComponent<{ item: PriorityAction }> = ({ item }) => {
    return <Box style={{ background: '#fff', border: `1px solid ${item.tone}33`, borderRadius: 8, overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '5px minmax(0, 1fr)', minHeight: 92 }}>
            <div style={{ background: item.tone }} />
            <div style={{ padding: 12, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 12, alignItems: 'center' }}>
                <div style={{ minWidth: 0 }}>
                    <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '16px', marginBottom: 3 }}>Cần xử lý ngay</Typography.Text>
                    <Typography.Text strong style={{ display: 'block', fontSize: 17, lineHeight: '22px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <span style={{ color: item.tone, marginRight: 6 }}>{item.icon}</span>{item.title}
                    </Typography.Text>
                    <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '17px', marginTop: 3, overflowWrap: 'anywhere' }}>{item.description}</Typography.Text>
                    {item.tags && <Stack wrap='wrap' gap={5} style={{ marginTop: 8 }}>{item.tags}</Stack>}
                </div>
                {item.onOpen && <Button type='primary' onClick={item.onOpen}>{item.actionLabel}</Button>}
            </div>
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
    return <button data-testid={testId} onClick={onOpen} style={{ width: '100%', border: 0, background: 'transparent', padding: 0, textAlign: 'left', cursor: 'pointer' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '5px minmax(0, 1fr)', border: '1px solid #f0f0f0', borderRadius: 8, background: '#fff', overflow: 'hidden' }}>
            <div style={{ background: accent }} />
            <div style={{ padding: '10px 11px', minWidth: 0 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 8, alignItems: 'start' }}>
                    <div style={{ minWidth: 0 }}>
                        <Typography.Text strong style={{ display: 'block', lineHeight: '19px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {icon && <span style={{ color: accent, marginRight: 6 }}>{icon}</span>}{title}
                        </Typography.Text>
                        <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '16px', marginTop: 2 }}>{description}</Typography.Text>
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
    const ingredients = useSelector(selectIngredients);
    const ingredientsById = useSelector(selectIngredientsById);
    const dishes = useSelector(selectDishes);
    const inventoryItems = useSelector(selectInventory);
    const shoppingLists = useSelector(selectShoppingLists);
    const scheduledMeals = useSelector(selectScheduledMeals);
    const cookingSessions = useSelector(selectCookingSessions);
    const [expensiveMetricsReady, setExpensiveMetricsReady] = useState(false);
    useScreenTitle({ value: 'Tổng quan', deps: [] });

    useEffect(() => {
        setExpensiveMetricsReady(false);
        let firstFrame: number | undefined;
        let secondFrame: number | undefined;
        const schedule = window.requestAnimationFrame ?? ((callback: FrameRequestCallback) => window.setTimeout(callback, 0) as unknown as number);
        const cancel = window.cancelAnimationFrame ?? window.clearTimeout;

        firstFrame = schedule(() => {
            secondFrame = schedule(() => setExpensiveMetricsReady(true));
        });

        return () => {
            if (firstFrame !== undefined) cancel(firstFrame);
            if (secondFrame !== undefined) cancel(secondFrame);
        };
    }, [dishes, inventoryItems, ingredients]);

    const activeSessions = useMemo(() => cookingSessions.filter(item => item.status === 'cooking'), [cookingSessions]);
    const todayMeals = useMemo(() => scheduledMeals.filter(item => isSameDay(item.plannedDate)), [scheduledMeals]);
    const openShoppingLists = useMemo(() => shoppingLists
        .filter(item => !item.completedAt)
        .sort((a, b) => moment(a.plannedDate ?? a.createdDate).valueOf() - moment(b.plannedDate ?? b.createdDate).valueOf()), [shoppingLists]);
    const todayShoppingLists = useMemo(() => openShoppingLists.filter(item => isSameDay(item.plannedDate)), [openShoppingLists]);
    const urgentInventory = useMemo(() => buildUrgentInventory(inventoryItems, ingredientsById), [inventoryItems, ingredientsById]);
    const suggestions = useMemo(() => expensiveMetricsReady
        ? DishScorer.scoreWithInventory(dishes, inventoryItems, dishes, ingredients).slice(0, 4)
        : [], [expensiveMetricsReady, dishes, inventoryItems, ingredients]);
    const shoppingListCosts = useMemo(() => {
        if (!expensiveMetricsReady) return {} as Record<string, string>;
        return openShoppingLists.reduce((result, item) => {
            result[item.id] = formatCostSummary(estimateShoppingListCart(item, ingredientsById, inventoryItems));
            return result;
        }, {} as Record<string, string>);
    }, [expensiveMetricsReady, openShoppingLists, ingredientsById, inventoryItems]);

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
            onOpen: () => navigate(RootRoutes.AuthorizedRoutes.IngredientRoutes.Detail(firstUrgentInventory.ingredientId)),
            tags: <Tag color={firstUrgentInventory.daysLeft < 0 ? 'red' : 'orange'} style={{ marginInlineEnd: 0 }}>{InventoryHelper.expiryBadge(firstUrgentInventory.daysLeft)?.label}</Tag>,
        }
        : firstActiveSession
            ? {
                icon: <FireOutlined />,
                title: 'Tiếp tục phiên nấu',
                description: `${firstActiveSession.dishName} · bước ${(firstActiveSession.currentStepIndex ?? 0) + 1}/${firstActiveSession.steps.length || 1}`,
                actionLabel: 'Mở món',
                tone: '#fa8c16',
                onOpen: () => navigate(RootRoutes.AuthorizedRoutes.DishesRoutes.ManageIngredient(firstActiveSession.dishId)),
            }
            : firstTodayShoppingList
                ? {
                    icon: <ShoppingCartOutlined />,
                    title: 'Hoàn tất mua sắm hôm nay',
                    description: `${firstTodayShoppingList.name} · ${getProgress(firstTodayShoppingList).done}/${getProgress(firstTodayShoppingList).total} nguyên liệu · ${shoppingListCosts[firstTodayShoppingList.id] ?? '0đ'}`,
                    actionLabel: 'Mở danh sách',
                    tone: '#0958d9',
                    onOpen: () => navigate(RootRoutes.AuthorizedRoutes.ShoppingListRoutes.Detail(firstTodayShoppingList.id)),
                }
                : firstTodayMeal
                    ? {
                        icon: <CalendarOutlined />,
                        title: 'Kiểm tra thực đơn hôm nay',
                        description: `${firstTodayMeal.name} · ${Object.values(firstTodayMeal.meals).flat().length} món`,
                        actionLabel: 'Mở thực đơn',
                        tone: '#1677ff',
                        onOpen: () => navigate(RootRoutes.AuthorizedRoutes.ScheduledMealRoutes.List()),
                    }
                    : firstSuggestion
                        ? {
                            icon: <FireOutlined />,
                            title: 'Có món phù hợp với tồn kho',
                            description: `${firstSuggestion.dish.name} · khớp ${Math.round(firstSuggestion.score * 100)}% nguyên liệu`,
                            actionLabel: 'Mở món',
                            tone: '#389e0d',
                            onOpen: () => navigate(RootRoutes.AuthorizedRoutes.DishesRoutes.ManageIngredient(firstSuggestion.dish.id)),
                        }
                        : {
                            icon: <CheckCircleOutlined />,
                            title: 'Không có việc gấp',
                            description: 'Tồn kho, lịch mua sắm và thực đơn hôm nay chưa có mục cần xử lý ngay.',
                            actionLabel: 'Mở món ăn',
                            tone: '#389e0d',
                            onOpen: () => navigate(RootRoutes.AuthorizedRoutes.DishesRoutes.List()),
                        };

    return <Box data-testid="dashboard" style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 12 }}>
        <PriorityPanel item={priorityAction} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', gap: 8 }}>
            <StatusChip icon={<CalendarOutlined />} label='món hôm nay' value={todayDishCount} tone='#1677ff' />
            <StatusChip icon={<ShoppingCartOutlined />} label='lịch mua' value={todayShoppingLists.length} tone='#0958d9' />
            <StatusChip icon={<WarningOutlined />} label='lô quá hạn' value={expiredCount} tone='#cf1322' />
            <StatusChip icon={<FireOutlined />} label='đang nấu' value={activeSessions.length} tone='#fa8c16' />
        </div>

        <Section
            title='Hôm nay'
            action={<Button type='link' onClick={() => navigate(RootRoutes.AuthorizedRoutes.ScheduledMealRoutes.List())}>Mở thực đơn</Button>}
        >
            {activeSessions.length === 0 && todayMeals.length === 0 && todayShoppingLists.length === 0
                ? <EmptySection text='Không có việc nào được lên lịch hôm nay.' />
                : <>
                    {activeSessions.slice(0, 2).map(session => <CookingRow key={session.id} item={session} onOpen={() => navigate(RootRoutes.AuthorizedRoutes.DishesRoutes.ManageIngredient(session.dishId))} />)}
                    {todayMeals.slice(0, 3).map(meal => <TodayMealRow key={meal.id} item={meal} onOpen={() => navigate(RootRoutes.AuthorizedRoutes.ScheduledMealRoutes.List())} />)}
                    {todayShoppingLists.slice(0, 2).map(list => <ShoppingListRow key={list.id} item={list} cost={shoppingListCosts[list.id] ?? '0đ'} onOpen={() => navigate(RootRoutes.AuthorizedRoutes.ShoppingListRoutes.Detail(list.id))} />)}
                </>}
        </Section>

        <Section
            title='Nguyên liệu cần dùng sớm'
            action={<Button type='link' onClick={() => navigate(RootRoutes.AuthorizedRoutes.IngredientRoutes.List())}>Mở kho</Button>}
        >
            {urgentInventory.length === 0
                ? <EmptySection text='Chưa có lô nào hết hạn hoặc sắp hết hạn trong 3 ngày.' />
                : urgentInventory.slice(0, 6).map(item => <UrgentRow key={`${item.ingredientId}-${item.expiresAtLabel}-${item.amount}`} item={item} onOpen={() => navigate(RootRoutes.AuthorizedRoutes.IngredientRoutes.Detail(item.ingredientId))} />)}
        </Section>

        <Section
            title='Gợi ý món nên nấu'
            action={<Button type='link' onClick={() => navigate(RootRoutes.AuthorizedRoutes.DishesRoutes.List())}>Mở món ăn</Button>}
        >
            {suggestions.length === 0
                ? <EmptySection text='Chưa có đủ dữ liệu tồn kho để gợi ý món.' />
                : suggestions.map(item => <SuggestionRow key={item.dish.id} item={item} onOpen={() => navigate(RootRoutes.AuthorizedRoutes.DishesRoutes.ManageIngredient(item.dish.id))} />)}
        </Section>

        <Section
            title='Danh sách mua sắm đang mở'
            action={<Button type='link' onClick={() => navigate(RootRoutes.AuthorizedRoutes.ShoppingListRoutes.List())}>Mở mua sắm</Button>}
        >
            {openShoppingLists.length === 0
                ? <EmptySection text='Không có danh sách mua sắm đang mở.' />
                : openShoppingLists.slice(0, 5).map(item => <ShoppingListRow key={item.id} item={item} cost={shoppingListCosts[item.id] ?? '0đ'} onOpen={() => navigate(RootRoutes.AuthorizedRoutes.ShoppingListRoutes.Detail(item.id))} />)}
        </Section>

        <Section title='Tổng quan dữ liệu'>
            <Box style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 }}>
                <DataMetric icon={<CheckCircleOutlined />} label='Món đã hoàn thiện' value={completedDishes.length} detail='Đã bật trạng thái hoàn thiện' tone='#389e0d' />
                <DataMetric icon={<ClockCircleOutlined />} label='Món chưa hoàn thiện' value={incompleteDishes.length} detail={incompleteDishes.length > 0 ? `Chưa bật hoàn thiện: ${formatNamePreview(incompleteDishes.map(item => item.name), 'Không có món nào', 'món khác')}` : 'Không có món cần cập nhật'} tone='#d46b08' />
                <DataMetric icon={<DollarCircleOutlined />} label='Danh sách đang mở' value={openShoppingLists.length} detail={openShoppingLists.length > 0 ? `Chưa bấm hoàn tất: ${formatNamePreview(openShoppingLists.map(item => item.name), 'Không có danh sách nào', 'danh sách khác')}` : 'Không có danh sách đang mở'} tone='#0958d9' />
                <DataMetric icon={<RightOutlined />} label='Nguyên liệu có tồn kho' value={stockedIngredientCount} detail={`${stockedBatchCount} lô còn số lượng trong kho`} tone='#722ed1' />
            </Box>
        </Section>
    </Box>;
}
