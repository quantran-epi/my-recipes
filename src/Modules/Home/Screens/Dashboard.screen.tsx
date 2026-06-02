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
import { ShoppingList, ShoppingListIngredientGroup } from '@store/Models/ShoppingList';
import { selectCookingSessions, selectDishes, selectIngredients, selectInventory, selectScheduledMeals, selectShoppingLists } from '@store/Selectors';
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

const getIngredientById = (ingredients: Ingredient[], id: string): Ingredient | undefined => {
    return ingredients.find(item => item.id === id);
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
    ingredients: Ingredient[],
    inventoryItems: Record<string, IngredientInventory>,
): CostEstimateSummary => {
    return shoppingList.ingredients.reduce((summary, group) => {
        const ingredient = getIngredientById(ingredients, group.ingredientId);
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
    ingredients: Ingredient[],
): UrgentInventoryItem[] => {
    return Object.entries(inventoryItems).flatMap(([ingredientId, inventory]) => {
        const ingredient = getIngredientById(ingredients, ingredientId);
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
    return <Box style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: 8, padding: 12 }}>
        <Stack justify='space-between' align='center' style={{ marginBottom: 10 }}>
            <Typography.Text strong style={{ fontSize: 16 }}>{title}</Typography.Text>
            {action}
        </Stack>
        {children}
    </Box>;
}

const Metric: React.FunctionComponent<{ icon: React.ReactNode; label: string; value: string | number; detail?: React.ReactNode; tone?: string }> = ({ icon, label, value, detail, tone }) => {
    return <Box style={{ padding: '10px 12px', border: '1px solid #f0f0f0', borderRadius: 8, background: '#fafafa', minWidth: 0 }}>
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

const EmptySection: React.FunctionComponent<{ text: string }> = ({ text }) => {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<Typography.Text type='secondary'>{text}</Typography.Text>} />;
}

const UrgentRow: React.FunctionComponent<{ item: UrgentInventoryItem; onOpen: () => void }> = ({ item, onOpen }) => {
    const badge = InventoryHelper.expiryBadge(item.daysLeft);
    return <button onClick={onOpen} style={{ width: '100%', border: 0, background: 'transparent', padding: 0, textAlign: 'left', cursor: 'pointer' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 8, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f5f5f5' }}>
            <div style={{ minWidth: 0 }}>
                <Typography.Text strong style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.ingredientName}</Typography.Text>
                <Typography.Text type='secondary' style={{ fontSize: 12 }}>
                    {IngredientUnitHelper.formatAmount(item.amount)} {item.unit} · Hạn {item.expiresAtLabel}
                </Typography.Text>
            </div>
            {badge && <Tag color={item.daysLeft < 0 ? 'red' : item.daysLeft <= 1 ? 'volcano' : 'orange'} style={{ marginInlineEnd: 0 }}>{badge.label}</Tag>}
        </div>
    </button>;
}

const SuggestionRow: React.FunctionComponent<{ item: ScoredDish; onOpen: () => void }> = ({ item, onOpen }) => {
    const matchPercent = Math.round(item.score * 100);
    return <button onClick={onOpen} style={{ width: '100%', border: 0, background: 'transparent', padding: 0, textAlign: 'left', cursor: 'pointer' }}>
        <div style={{ padding: '8px 0', borderBottom: '1px solid #f5f5f5' }}>
            <Stack justify='space-between' align='flex-start' gap={8}>
                <div style={{ minWidth: 0, flex: 1 }}>
                    <Typography.Text strong style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.dish.name}</Typography.Text>
                    <Typography.Text type='secondary' style={{ fontSize: 12 }}>
                        {item.matchedIngredientIds.length} đủ · {item.partialIngredientIds?.length ?? 0} còn một phần · {item.missingIngredientIds.length} thiếu
                    </Typography.Text>
                </div>
                <Tag color={matchPercent >= 100 ? 'green' : matchPercent >= 50 ? 'gold' : 'orange'} style={{ marginInlineEnd: 0 }}>{matchPercent}%</Tag>
            </Stack>
            <Stack wrap='wrap' gap={5} style={{ marginTop: 6 }}>
                {(item.urgentIngredients?.length ?? 0) > 0 && <Tag color='volcano' style={{ marginInlineEnd: 0 }}>Cần dùng sớm</Tag>}
                {item.extraShoppingCost && <Tag color='blue' style={{ marginInlineEnd: 0 }}>Mua thêm {IngredientPriceHelper.formatRange(item.extraShoppingCost)}</Tag>}
                {(item.missingPriceCount ?? 0) > 0 && <Tag style={{ marginInlineEnd: 0 }}>{item.missingPriceCount} thiếu giá</Tag>}
            </Stack>
        </div>
    </button>;
}

const ShoppingListRow: React.FunctionComponent<{ item: ShoppingList; cost: string; onOpen: () => void }> = ({ item, cost, onOpen }) => {
    const progress = getProgress(item);
    const plannedLabel = item.plannedDate ? moment(item.plannedDate).format('DD/MM/YYYY') : 'Chưa có ngày';
    const overdue = item.plannedDate && moment(item.plannedDate).isBefore(today(), 'day');

    return <button onClick={onOpen} style={{ width: '100%', border: 0, background: 'transparent', padding: 0, textAlign: 'left', cursor: 'pointer' }}>
        <div style={{ padding: '8px 0', borderBottom: '1px solid #f5f5f5' }}>
            <Stack justify='space-between' align='flex-start' gap={8}>
                <div style={{ minWidth: 0, flex: 1 }}>
                    <Typography.Text strong style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</Typography.Text>
                    <Typography.Text type={overdue ? 'danger' : 'secondary'} style={{ fontSize: 12 }}>
                        {plannedLabel} · {progress.done}/{progress.total} nguyên liệu
                    </Typography.Text>
                </div>
                <Typography.Text strong style={{ color: '#0958d9', whiteSpace: 'nowrap' }}>{cost}</Typography.Text>
            </Stack>
            <div style={{ height: 5, borderRadius: 5, background: '#f0f0f0', overflow: 'hidden', marginTop: 8 }}>
                <div style={{ height: '100%', width: `${progress.percent}%`, background: progress.percent === 100 ? '#52c41a' : '#1677ff' }} />
            </div>
        </div>
    </button>;
}

export const DashboardScreen = () => {
    const navigate = useNavigate();
    const ingredients = useSelector(selectIngredients);
    const dishes = useSelector(selectDishes);
    const inventoryItems = useSelector(selectInventory);
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
    const urgentInventory = useMemo(() => buildUrgentInventory(inventoryItems, ingredients), [inventoryItems, ingredients]);
    const suggestions = useMemo(() => DishScorer.scoreWithInventory(dishes, inventoryItems, dishes, ingredients).slice(0, 4), [dishes, inventoryItems, ingredients]);
    const shoppingListCosts = useMemo(() => {
        return openShoppingLists.reduce((result, item) => {
            result[item.id] = formatCostSummary(estimateShoppingListCart(item, ingredients, inventoryItems));
            return result;
        }, {} as Record<string, string>);
    }, [openShoppingLists, ingredients, inventoryItems]);

    const expiredCount = urgentInventory.filter(item => item.daysLeft < 0).length;
    const todayDishCount = todayMeals.reduce((sum, meal) => sum + Object.values(meal.meals).flat().length, 0);
    const completedDishes = dishes.filter(item => item.isCompleted);
    const incompleteDishes = dishes.filter(item => !item.isCompleted);
    const stockedIngredientCount = Object.entries(inventoryItems).filter(([, inventory]) => (inventory.batches ?? []).some(batch => batch.amount > 0)).length;
    const stockedBatchCount = Object.values(inventoryItems).reduce((sum, inventory) => sum + (inventory.batches ?? []).filter(batch => batch.amount > 0).length, 0);

    return <Box style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 }}>
            <Metric icon={<CalendarOutlined />} label='Món trong thực đơn' value={todayDishCount} detail={`${todayMeals.length} lịch ăn trong hôm nay`} tone='#1677ff' />
            <Metric icon={<ShoppingCartOutlined />} label='Lịch mua hôm nay' value={todayShoppingLists.length} detail='Danh sách có ngày mua là hôm nay' tone='#0958d9' />
            <Metric icon={<WarningOutlined />} label='Lô hết hạn' value={expiredCount} detail='Lô tồn kho đã quá hạn sử dụng' tone='#cf1322' />
            <Metric icon={<FireOutlined />} label='Đang nấu' value={activeSessions.length} detail='Phiên nấu chưa kết thúc' tone='#fa8c16' />
        </div>

        <Section
            title='Hôm nay'
            action={<Button type='link' onClick={() => navigate(RootRoutes.AuthorizedRoutes.ScheduledMealRoutes.List())}>Mở thực đơn</Button>}
        >
            {activeSessions.length === 0 && todayMeals.length === 0 && todayShoppingLists.length === 0
                ? <EmptySection text='Không có việc nào được lên lịch hôm nay.' />
                : <Stack direction='column' align='stretch' gap={8}>
                    {activeSessions.slice(0, 2).map(session => <Box key={session.id} style={{ padding: '8px 10px', border: '1px solid #fff1b8', borderRadius: 8, background: '#fffbe6' }}>
                        <Stack justify='space-between' align='center'>
                            <Typography.Text strong><FireOutlined style={{ color: '#fa8c16' }} /> {session.dishName}</Typography.Text>
                            <Typography.Text type='secondary' style={{ fontSize: 12 }}>Bước {(session.currentStepIndex ?? 0) + 1}/{session.steps.length || 1}</Typography.Text>
                        </Stack>
                    </Box>)}
                    {todayMeals.slice(0, 3).map(meal => <Box key={meal.id} style={{ padding: '8px 0', borderBottom: '1px solid #f5f5f5' }}>
                        <Typography.Text strong style={{ display: 'block' }}>{meal.name}</Typography.Text>
                        <Typography.Text type='secondary' style={{ fontSize: 12 }}>{Object.values(meal.meals).flat().length} món · {moment(meal.plannedDate).format('DD/MM/YYYY')}</Typography.Text>
                    </Box>)}
                    {todayShoppingLists.slice(0, 2).map(list => <ShoppingListRow key={list.id} item={list} cost={shoppingListCosts[list.id] ?? '0đ'} onOpen={() => navigate(RootRoutes.AuthorizedRoutes.ShoppingListRoutes.Detail(list.id))} />)}
                </Stack>}
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

        <Box style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 }}>
            <Metric icon={<CheckCircleOutlined />} label='Món đã hoàn thiện' value={completedDishes.length} detail='Đã bật trạng thái hoàn thiện' tone='#389e0d' />
            <Metric icon={<ClockCircleOutlined />} label='Món chưa hoàn thiện' value={incompleteDishes.length} detail={incompleteDishes.length > 0 ? `Chưa bật hoàn thiện: ${formatNamePreview(incompleteDishes.map(item => item.name), 'Không có món nào', 'món khác')}` : 'Không có món cần cập nhật'} tone='#d46b08' />
            <Metric icon={<DollarCircleOutlined />} label='Danh sách đang mở' value={openShoppingLists.length} detail={openShoppingLists.length > 0 ? `Chưa bấm hoàn tất: ${formatNamePreview(openShoppingLists.map(item => item.name), 'Không có danh sách nào', 'danh sách khác')}` : 'Không có danh sách đang mở'} tone='#0958d9' />
            <Metric icon={<RightOutlined />} label='Nguyên liệu có tồn kho' value={stockedIngredientCount} detail={`${stockedBatchCount} lô còn số lượng trong kho`} tone='#722ed1' />
        </Box>
    </Box>;
}
