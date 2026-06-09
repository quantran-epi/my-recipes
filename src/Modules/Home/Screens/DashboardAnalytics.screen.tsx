import { BarChartOutlined, CalendarOutlined, CheckCircleOutlined, ClockCircleOutlined, DollarCircleOutlined, FireOutlined, QuestionCircleOutlined, WarningOutlined } from '@ant-design/icons';
import { CostEstimateHelper, CostEstimateSummary } from '@common/Helpers/CostEstimateHelper';
import { DateHelpers } from '@common/Helpers/DateHelper';
import { DishNutritionHelper, DishNutritionSummary } from '@common/Helpers/DishNutritionHelper';
import { IngredientNutritionHelper } from '@common/Helpers/IngredientNutritionHelper';
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
import { Dishes } from '@store/Models/Dishes';
import { Ingredient, IngredientInventory, IngredientUnit, InventoryBatch } from '@store/Models/Ingredient';
import { InventoryHealthConfig } from '@store/Models/SharedConfig';
import { ShoppingList, ShoppingListIngredientGroup } from '@store/Models/ShoppingList';
import { IngredientPriceHistoryEntry, IngredientPriceMemory } from '@store/Reducers/AppContextReducer';
import { selectDishes, selectIngredientPriceHistory, selectIngredientPriceMemory, selectIngredients, selectIngredientsById, selectInventory, selectInventoryHealthConfig, selectScheduledMeals, selectShoppingLists } from '@store/Selectors';
import moment from 'moment';
import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from 'recharts';

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
    doneCount: number;
    totalCount: number;
    remainingCount: number;
    costLabel: string;
    value: number;
}

type NutritionDishRow = {
    id: string;
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    coveragePercent: number;
    summary: DishNutritionSummary;
}

type NutritionAnalytics = {
    dishScopeCount: number;
    dishWithNutritionCount: number;
    dishCoveragePercent: number;
    ingredientWithNutritionCount: number;
    ingredientCoveragePercent: number;
    sourceCount: number;
    averageCalories: number;
    averageProtein: number;
    averageCarbs: number;
    averageFat: number;
    averageFiber: number;
    topProtein: NutritionDishRow[];
    topFiber: NutritionDishRow[];
    lightCalories: NutritionDishRow[];
}

type PriceHistoryRecentRow = {
    id: string;
    ingredientId: string;
    ingredientName: string;
    price: number;
    amount: number;
    unit: IngredientUnit;
    updatedAt: string;
    shoppingListName?: string;
}

type PriceTrendRow = {
    ingredientId: string;
    ingredientName: string;
    latestPrice: number;
    previousPrice: number;
    latestUnitPrice: number;
    previousUnitPrice: number;
    unit: IngredientUnit;
    changePercent: number;
    historyCount: number;
    updatedAt: string;
}

type PriceHistoryAnalytics = {
    entryCount: number;
    ingredientCount: number;
    totalRecordedSpend: number;
    last14DaysSpend: number;
    dayChartData: Array<{ label: string; value: number; count: number }>;
    recentEntries: PriceHistoryRecentRow[];
    trendRows: PriceTrendRow[];
}

type AnalyticsExpensiveMetrics = {
    shoppingCosts: ShoppingCostRow[];
    totalOpenShoppingCost: CostEstimateSummary;
    suggestions: ScoredDish[];
    nutrition: NutritionAnalytics;
}

const today = () => moment().startOf('day');

const formatHeaderDateLabel = (value = new Date()): string => {
    const day = String(value.getDate()).padStart(2, '0');
    const month = String(value.getMonth() + 1).padStart(2, '0');
    return `${day}, ${month} ${value.getFullYear()}`;
}

const truncateName = (value: string, maxLength = 24): string => {
    return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
}

const formatCostSummary = (summary: CostEstimateSummary): string => {
    if (!CostEstimateHelper.hasAny(summary)) return '0đ';
    if (!CostEstimateHelper.hasPrice(summary)) return 'Chưa có giá';
    return IngredientPriceHelper.formatRange(summary);
}

const createEmptyNutritionAnalytics = (): NutritionAnalytics => ({
    dishScopeCount: 0,
    dishWithNutritionCount: 0,
    dishCoveragePercent: 0,
    ingredientWithNutritionCount: 0,
    ingredientCoveragePercent: 0,
    sourceCount: 0,
    averageCalories: 0,
    averageProtein: 0,
    averageCarbs: 0,
    averageFat: 0,
    averageFiber: 0,
    topProtein: [],
    topFiber: [],
    lightCalories: [],
});

const average = (rows: NutritionDishRow[], pick: (row: NutritionDishRow) => number): number => {
    if (rows.length === 0) return 0;
    return DishNutritionHelper.roundOne(rows.reduce((sum, row) => sum + pick(row), 0) / rows.length);
}

const buildNutritionAnalytics = (dishes: Dishes[], ingredients: Ingredient[], ingredientsById: Map<string, Ingredient>): NutritionAnalytics => {
    const scopedDishes = dishes.filter(item => item.isCompleted);
    const dishScope = scopedDishes.length > 0 ? scopedDishes : dishes;
    const sourceNames = new Set<string>();
    const ingredientWithNutritionCount = ingredients.filter(ingredient => {
        const nutrition = IngredientNutritionHelper.getNutrition(ingredient);
        nutrition?.sources?.forEach(source => sourceNames.add(source.name));
        return Boolean(nutrition);
    }).length;
    const rows = dishScope
        .map(dish => {
            const summary = DishNutritionHelper.calculateDishNutrition(dish, dishes, ingredientsById);
            if (!summary.hasNutrition) return null;
            return {
                id: dish.id,
                name: dish.name,
                calories: summary.perServing.calories ?? 0,
                protein: summary.perServing.protein ?? 0,
                carbs: summary.perServing.carbs ?? 0,
                fat: summary.perServing.fat ?? 0,
                fiber: summary.perServing.fiber ?? 0,
                coveragePercent: summary.coveragePercent,
                summary,
            } as NutritionDishRow;
        })
        .filter((item): item is NutritionDishRow => item !== null);

    return {
        dishScopeCount: dishScope.length,
        dishWithNutritionCount: rows.length,
        dishCoveragePercent: dishScope.length > 0 ? Math.round(rows.length / dishScope.length * 100) : 0,
        ingredientWithNutritionCount,
        ingredientCoveragePercent: ingredients.length > 0 ? Math.round(ingredientWithNutritionCount / ingredients.length * 100) : 0,
        sourceCount: sourceNames.size,
        averageCalories: average(rows, row => row.calories),
        averageProtein: average(rows, row => row.protein),
        averageCarbs: average(rows, row => row.carbs),
        averageFat: average(rows, row => row.fat),
        averageFiber: average(rows, row => row.fiber),
        topProtein: [...rows].sort((a, b) => b.protein - a.protein).slice(0, 5),
        topFiber: [...rows].sort((a, b) => b.fiber - a.fiber).slice(0, 5),
        lightCalories: [...rows].filter(row => row.calories > 0).sort((a, b) => a.calories - b.calories).slice(0, 5),
    };
}

const flattenPriceHistory = (
    history: Record<string, IngredientPriceHistoryEntry[]>,
    memory: Record<string, IngredientPriceMemory>,
): IngredientPriceHistoryEntry[] => {
    const rows = Object.values(history).flatMap(items => items ?? []);
    Object.values(memory).forEach(item => {
        const hasSameSavedPrice = rows.some(row => row.ingredientId === item.ingredientId
            && row.updatedAt === item.updatedAt
            && row.price === item.price
            && row.amount === item.amount
            && row.unit === item.unit);
        if (!hasSameSavedPrice) {
            rows.push({
                ...item,
                id: `memory-${item.ingredientId}-${item.updatedAt}`,
            });
        }
    });
    return rows.filter(item => item.price > 0 && item.amount > 0);
}

const getPriceUnitValue = (entry: IngredientPriceHistoryEntry, ingredient: Ingredient | undefined): { value: number; unit: IngredientUnit } => {
    const unit = IngredientUnitHelper.getBaseUnit(ingredient, [entry.unit]);
    const amount = IngredientUnitHelper.toBaseAmount(ingredient, entry.amount, entry.unit, unit) ?? entry.amount;
    return { value: amount > 0 ? entry.price / amount : 0, unit };
}

const formatUnitPrice = (value: number, unit: IngredientUnit): string => {
    if (!isFinite(value) || value <= 0) return `0đ/${unit}`;
    const price = value >= 1 ? IngredientPriceHelper.formatCurrency(value) : `${Math.round(value * 10) / 10}đ`;
    return `${price}/${unit}`;
}

const buildPriceHistoryAnalytics = (
    history: Record<string, IngredientPriceHistoryEntry[]>,
    memory: Record<string, IngredientPriceMemory>,
    ingredientsById: Map<string, Ingredient>,
): PriceHistoryAnalytics => {
    const entries = flattenPriceHistory(history, memory)
        .sort((a, b) => moment(b.updatedAt).valueOf() - moment(a.updatedAt).valueOf());
    const grouped = entries.reduce((result, entry) => {
        result[entry.ingredientId] = [...(result[entry.ingredientId] ?? []), entry];
        return result;
    }, {} as Record<string, IngredientPriceHistoryEntry[]>);
    const dayChartData = Array.from({ length: 14 }).map((_, index) => {
        const date = today().subtract(13 - index, 'days');
        const dayEntries = entries.filter(item => moment(item.updatedAt).isSame(date, 'day'));
        return {
            label: date.format('DD/MM'),
            value: dayEntries.reduce((sum, item) => sum + item.price, 0),
            count: dayEntries.length,
        };
    });
    const trendRows = Object.entries(grouped).flatMap(([ingredientId, rows]) => {
        const sortedRows = [...rows].sort((a, b) => moment(b.updatedAt).valueOf() - moment(a.updatedAt).valueOf());
        if (sortedRows.length < 2) return [];
        const ingredient = ingredientsById.get(ingredientId);
        const latest = sortedRows[0];
        const previous = sortedRows.slice(1).find(item => item.unit === latest.unit) ?? sortedRows[1];
        const latestUnit = getPriceUnitValue(latest, ingredient);
        const previousUnit = getPriceUnitValue(previous, ingredient);
        if (previousUnit.value <= 0 || latestUnit.value <= 0) return [];
        return [{
            ingredientId,
            ingredientName: ingredient?.name ?? ingredientId,
            latestPrice: latest.price,
            previousPrice: previous.price,
            latestUnitPrice: latestUnit.value,
            previousUnitPrice: previousUnit.value,
            unit: latestUnit.unit,
            changePercent: Math.round((latestUnit.value - previousUnit.value) / previousUnit.value * 100),
            historyCount: sortedRows.length,
            updatedAt: latest.updatedAt,
        }];
    }).sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent)).slice(0, 5);

    return {
        entryCount: entries.length,
        ingredientCount: Object.keys(grouped).length,
        totalRecordedSpend: entries.reduce((sum, item) => sum + item.price, 0),
        last14DaysSpend: dayChartData.reduce((sum, item) => sum + item.value, 0),
        dayChartData,
        recentEntries: entries.slice(0, 6).map(entry => ({
            id: entry.id,
            ingredientId: entry.ingredientId,
            ingredientName: ingredientsById.get(entry.ingredientId)?.name ?? entry.ingredientId,
            price: entry.price,
            amount: entry.amount,
            unit: entry.unit,
            updatedAt: entry.updatedAt,
            shoppingListName: entry.shoppingListName,
        })),
        trendRows,
    };
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

const createEmptyAnalyticsExpensiveMetrics = (): AnalyticsExpensiveMetrics => ({
    shoppingCosts: [],
    totalOpenShoppingCost: CostEstimateHelper.emptySummary(),
    suggestions: [],
    nutrition: createEmptyNutritionAnalytics(),
});

const chartPalette = ['#7436dc', '#1677ff', '#389e0d', '#fa8c16', '#eb2f96', '#13a8a8', '#d48806', '#531dab'];
const chartGridColor = '#f0edf8';
const chartAxisStyle = { fontSize: 11, fill: '#6b7280' };
const chartTooltipStyle: React.CSSProperties = {
    borderRadius: 8,
    border: '1px solid #e5e7eb',
    boxShadow: '0 10px 24px rgba(15,23,42,0.12)',
    fontSize: 12,
};

const analyticsHelp = {
    decisionSignals: [
        'Nó là gì: nhóm tín hiệu ưu tiên, gom các điểm đáng hành động nhất từ toàn bộ dữ liệu bếp thay vì lặp lại số tổng quan trên dashboard.',
        'Cách lấy dữ liệu: ngày bận nhất lấy từ thực đơn và lịch mua trong 7 ngày tới; danh sách tốn nhất lấy từ các lịch mua chưa hoàn tất và giá nguyên liệu; rủi ro hao hụt lấy từ lô tồn kho gần hết hạn; cân bằng bữa lấy từ món đã lên lịch trong 14 ngày; lỗ hổng dinh dưỡng lấy từ số món có thể tính nutrition.',
        'Dùng để làm gì: mở trang phân tích là biết ngay hôm nay nên xử lý việc nào trước: dời bớt lịch nấu, kiểm tra ngân sách mua, dùng nguyên liệu sắp hỏng, cân lại bữa ăn, hoặc bổ sung dữ liệu dinh dưỡng cho món còn thiếu.',
    ],
    planLoad: [
        'Nó là gì: biểu đồ tải chuẩn bị cho 7 ngày tới, không chỉ đếm sự kiện mà cho thấy ngày nào có cả thực đơn lẫn mua sắm dồn cùng lúc.',
        'Cách lấy dữ liệu: app quét toàn bộ thực đơn theo `plannedDate` và các lịch mua sắm chưa hoàn tất có `plannedDate`, gom theo từng ngày từ hôm nay đến 6 ngày sau. Cột tím là số thực đơn, cột xanh là số lịch mua sắm trong cùng ngày.',
        'Dùng để làm gì: nếu một ngày có cột cao, đó là ngày dễ quá tải. Bạn có thể chuẩn bị nguyên liệu trước, chuyển bớt lịch mua sang ngày khác, hoặc tạo shopping list sớm để tránh đến bữa mới phát hiện thiếu đồ.',
    ],
    mealBalance: [
        'Nó là gì: phân tích độ lệch giữa bữa sáng, trưa và tối trong 14 ngày tới, giúp nhìn ra khung bữa nào đang được lên lịch quá nhiều hoặc bị bỏ trống.',
        'Cách lấy dữ liệu: app lấy các thực đơn từ hôm nay đến trước ngày thứ 15, sau đó cộng số món trong `breakfast`, `lunch`, và `dinner`. Một món xuất hiện trong nhiều bữa được tính theo số lượt lên lịch, vì đây là phân tích tải nấu thực tế.',
        'Dùng để làm gì: nếu bữa tối cao hơn hẳn, bạn có thể chuẩn bị món batch-cook hoặc chuyển món nhẹ sang bữa trưa. Nếu bữa sáng thấp, đó là dấu hiệu cần thêm món nhanh hoặc món chuẩn bị trước.',
    ],
    inventoryCoverage: [
        'Nó là gì: phân tích độ phủ tồn kho theo nhóm nguyên liệu, cho biết nhóm nào có nhiều món đang sẵn và nhóm nào có nhiều khoảng trống cần bổ sung.',
        'Cách lấy dữ liệu: app duyệt danh sách nguyên liệu dùng chung, nhóm theo `category`, rồi kiểm tra tồn kho cá nhân. Nguyên liệu được tính là có sẵn nếu là loại luôn có sẵn hoặc có ít nhất một lô còn số lượng lớn hơn 0.',
        'Dùng để làm gì: dùng biểu đồ này trước khi lên thực đơn theo tuần. Nhóm thiếu nhiều là nơi dễ gây thiếu đồ khi nấu; nhóm đang phủ tốt là nhóm nên ưu tiên chọn món để tận dụng đồ đã có.',
    ],
    expiryRisk: [
        'Nó là gì: danh sách rủi ro hao hụt, tập trung vào các lô nguyên liệu đã quá hạn hoặc sắp hết hạn theo ngưỡng cấu hình tồn kho.',
        'Cách lấy dữ liệu: app kiểm tra từng batch tồn kho còn số lượng, tính ngày hết hạn bằng thông tin batch, shelf-life của nguyên liệu và cấu hình bảo quản. Những lô rơi vào ngưỡng khẩn cấp được sắp xếp từ nguy hiểm nhất đến ít nguy hiểm hơn.',
        'Dùng để làm gì: đây là danh sách nên xem trước khi quyết định nấu gì. Mở nguyên liệu ở đầu danh sách để nấu trước, điều chỉnh số lượng, hoặc loại bỏ lô đã hỏng nhằm giữ tồn kho sạch và giảm lãng phí.',
    ],
    shoppingBudget: [
        'Nó là gì: phân tích áp lực ngân sách cho các lịch mua sắm đang mở, tập trung vào phần còn cần mua thay vì tổng nguyên liệu ban đầu.',
        'Cách lấy dữ liệu: app lấy tối đa 6 lịch mua chưa hoàn tất theo thứ tự ngày, tính nguyên liệu còn thiếu sau khi trừ tồn kho hiện có, rồi dùng dữ liệu giá nguyên liệu để ước tính chi phí. Tiến độ phần trăm lấy từ số nhóm nguyên liệu đã đánh dấu xong.',
        'Dùng để làm gì: dùng để biết danh sách nào nên kiểm tra lại trước khi đi chợ. Danh sách có chi phí cao nhưng tiến độ thấp nên được rà soát giá, thay món hoặc kiểm tra tồn kho trước khi mua.',
    ],
    priceHistory: [
        'Nó là gì: lịch sử giá mua thực tế bạn nhập khi đánh dấu nguyên liệu đã mua, khác với giá tham khảo trong hồ sơ nguyên liệu.',
        'Cách lấy dữ liệu: mỗi lần lưu giá trong lịch mua sắm, app lưu giá đã trả, lượng mua, đơn vị, ngày lưu và tên danh sách mua vào dữ liệu cá nhân. Analytics gom dữ liệu này theo 14 ngày gần nhất và so lần mua mới nhất với lần trước của cùng nguyên liệu.',
        'Dùng để làm gì: xem tiền đã ghi nhận gần đây, phát hiện nguyên liệu nào đang tăng hoặc giảm giá theo đơn giá, và quyết định nên mua ít, đổi món, hoặc cập nhật lại giá tham khảo nếu giá thị trường đã thay đổi.',
    ],
    dataQuality: [
        'Nó là gì: phân tích chất lượng dữ liệu món ăn, đo xem dữ liệu hiện tại có đủ tin cậy để dùng cho lập kế hoạch, gợi ý và dinh dưỡng hay chưa.',
        'Cách lấy dữ liệu: app so sánh tỷ lệ món đã hoàn thiện hồ sơ, tỷ lệ món có thể tính dinh dưỡng, tỷ lệ nguyên liệu có thông tin nutrition và số nguồn tham chiếu nutrition đang được dùng.',
        'Dùng để làm gì: nếu tỷ lệ thấp, các gợi ý món và nutrition calculator sẽ kém chính xác. Hãy bổ sung nguyên liệu, đơn vị quy đổi hoặc nutrition source cho nhóm món quan trọng trước khi dùng dữ liệu để ra quyết định ăn uống.',
    ],
    nutritionProfile: [
        'Nó là gì: hồ sơ dinh dưỡng khẩu phần trung bình của các món có dữ liệu, quy đổi các chỉ số về thang tham chiếu để dễ so sánh trong cùng một biểu đồ.',
        'Cách lấy dữ liệu: app tính nutrition per serving cho từng món đã hoàn thiện nếu có dữ liệu dinh dưỡng, lấy trung bình kcal, đạm, tinh bột, béo và chất xơ. Các thanh phần trăm là tỷ lệ so với ngưỡng hiển thị nội bộ, còn nhãn bên dưới giữ giá trị thật.',
        'Dùng để làm gì: dùng để hiểu xu hướng cookbook hiện tại đang thiên về năng lượng, đạm, tinh bột hay chất xơ. Nếu trung bình kcal hoặc béo cao, cân nhắc thêm món nhẹ; nếu chất xơ thấp, thêm rau, đậu hoặc ngũ cốc vào thực đơn.',
    ],
    nutritionRanking: [
        'Nó là gì: bảng xếp hạng món theo mục tiêu dinh dưỡng cụ thể: giàu đạm, nhiều chất xơ và nhẹ kcal.',
        'Cách lấy dữ liệu: app dùng cùng kết quả nutrition per serving, sắp xếp món theo protein giảm dần, fiber giảm dần và calories tăng dần. Chỉ các món có dữ liệu nutrition đủ để tính mới xuất hiện ở đây.',
        'Dùng để làm gì: khi lập thực đơn, dùng nhóm giàu đạm cho bữa cần no lâu, nhóm nhiều chất xơ để tăng rau/chất xơ, và nhóm nhẹ kcal cho ngày muốn ăn nhẹ hơn mà vẫn dựa trên món thật trong cookbook.',
    ],
    inventorySuggestions: [
        'Nó là gì: phân tích món nên nấu dựa trên độ khớp với tồn kho hiện tại, không phải danh sách món phổ biến chung chung.',
        'Cách lấy dữ liệu: app chấm điểm từng món bằng DishScorer, so nguyên liệu món cần với tồn kho cá nhân, nguyên liệu thiếu và cấu hình tồn kho/hết hạn. Điểm cao nghĩa là món tận dụng được nhiều thứ đang có.',
        'Dùng để làm gì: dùng khi không biết nấu gì hoặc muốn giảm mua thêm. Món có điểm khớp cao giúp dùng đồ sẵn có, giảm thiếu nguyên liệu giữa chừng và hạn chế để nguyên liệu tồn lâu.',
    ],
};

const analyticsCss = `
.analytics-section-card {
    transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
}
.analytics-section-card:hover {
    border-color: rgba(116,54,220,0.20);
    box-shadow: 0 16px 34px rgba(74, 48, 130, 0.13);
}
`;

const SectionCard: React.FunctionComponent<{ title: string; subtitle: string; helpText: string | string[]; icon: React.ReactNode; tone: string; children: React.ReactNode }> = ({ title, subtitle, helpText, icon, tone, children }) => {
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
            {showHelp && <Box style={{ marginBottom: 12, padding: '10px 11px', borderRadius: 8, border: `1px solid ${tone}24`, background: `${tone}0d` }}>
                {(Array.isArray(helpText) ? helpText : [helpText]).map((line, index) => <Typography.Text key={index} style={{ display: 'block', color: '#2f2545', fontSize: 12, lineHeight: '18px', marginTop: index === 0 ? 0 : 7 }}>{line}</Typography.Text>)}
            </Box>}
            {children}
        </div>
    </section>;
}

const ChartFrame: React.FunctionComponent<{ height?: number; children: React.ReactNode }> = ({ height = 188, children }) => {
    return <Box style={{ height, minWidth: 0, border: '1px solid rgba(116,54,220,0.08)', borderRadius: 8, background: '#fff', padding: '8px 6px 4px', overflow: 'hidden' }}>
        {children}
    </Box>;
}

const ChartSummaryRow: React.FunctionComponent<{ items: Array<{ label: string; value: string | number; color: string }> }> = ({ items }) => {
    return <Stack wrap='wrap' gap={6} style={{ marginTop: 8 }}>
        {items.map(item => <span key={item.label} style={{ borderRadius: 999, padding: '3px 8px', background: `${item.color}12`, color: item.color, border: `1px solid ${item.color}24`, fontSize: 11, lineHeight: '16px', fontWeight: 700, whiteSpace: 'nowrap' }}>
            {item.label}: {item.value}
        </span>)}
    </Stack>;
}

const EmptyAnalytics: React.FunctionComponent<{ text: string }> = ({ text }) => {
    return <Box style={{ padding: '20px 8px', borderRadius: 8, border: '1px dashed rgba(116,54,220,0.16)', background: '#fbf9ff' }}>
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<Typography.Text type='secondary'>{text}</Typography.Text>} />
    </Box>;
}

const InsightCard: React.FunctionComponent<{ title: string; value: string; detail: string; icon: React.ReactNode; tone: string; actionLabel?: string; onOpen?: () => void }> = ({ title, value, detail, icon, tone, actionLabel, onOpen }) => {
    return <Box style={{ border: `1px solid ${tone}1f`, borderRadius: 8, background: '#fff', padding: 11, minWidth: 0, boxShadow: '0 8px 20px rgba(15,23,42,0.06)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: actionLabel && onOpen ? '32px minmax(0, 1fr) auto' : '32px minmax(0, 1fr)', gap: 9, alignItems: 'start', marginBottom: 8 }}>
            <span style={{ width: 32, height: 32, borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: tone, background: `${tone}14`, border: `1px solid ${tone}24`, flexShrink: 0 }}>{icon}</span>
            <div style={{ minWidth: 0 }}>
                <Typography.Text type='secondary' style={{ display: 'block', fontSize: 11, lineHeight: '15px' }}>{title}</Typography.Text>
                <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 15, lineHeight: '19px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</Typography.Text>
            </div>
            {actionLabel && onOpen && <Button size='small' onClick={onOpen} style={{ height: 28, padding: '0 9px', borderRadius: 999, color: tone, borderColor: `${tone}33`, fontWeight: 650, fontSize: 11, lineHeight: '16px', alignSelf: 'center' }}>{actionLabel}</Button>}
        </div>
        <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '17px', minHeight: 34 }}>{detail}</Typography.Text>
    </Box>;
}

const ExpenseSignalCard: React.FunctionComponent<{
    pending: boolean;
    highestShoppingCost?: ShoppingCostRow;
    totalOpenShoppingCost: CostEstimateSummary;
    shoppingCostCount: number;
    onOpenShopping: () => void;
    onOpenHighest?: () => void;
}> = ({ pending, highestShoppingCost, totalOpenShoppingCost, shoppingCostCount, onOpenShopping, onOpenHighest }) => {
    const [showHelp, setShowHelp] = React.useState(false);
    const hasShoppingCost = shoppingCostCount > 0;
    const totalLabel = pending ? 'Đang tính...' : hasShoppingCost ? formatCostSummary(totalOpenShoppingCost) : 'Chưa có dữ liệu';
    const highestLabel = highestShoppingCost ? `${highestShoppingCost.costLabel} · còn ${highestShoppingCost.remainingCount} nhóm` : 'Chưa có danh sách cần mua';

    return <Box style={{ border: '1px solid rgba(9,88,217,0.16)', borderRadius: 8, background: '#fff', padding: 11, minWidth: 0, boxShadow: '0 8px 20px rgba(15,23,42,0.06)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '32px minmax(0, 1fr) auto', gap: 9, alignItems: 'start', marginBottom: 8 }}>
            <span style={{ width: 32, height: 32, borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#0958d9', background: '#e6f4ff', border: '1px solid #bae0ff', flexShrink: 0 }}><DollarCircleOutlined /></span>
            <div style={{ minWidth: 0 }}>
                <Typography.Text type='secondary' style={{ display: 'block', fontSize: 11, lineHeight: '15px' }}>Chi phí còn cần mua</Typography.Text>
                <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 16, lineHeight: '20px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{totalLabel}</Typography.Text>
            </div>
            <button
                type='button'
                aria-label='Mô tả chi phí còn cần mua'
                aria-expanded={showHelp}
                onClick={() => setShowHelp(value => !value)}
                style={{ width: 30, height: 30, borderRadius: 999, border: '1px solid rgba(9,88,217,0.22)', background: showHelp ? '#e6f4ff' : '#fff', color: '#0958d9', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}
            >
                <QuestionCircleOutlined />
            </button>
        </div>

        <Box style={{ border: '1px solid #e6f4ff', borderRadius: 8, background: '#f7fbff', padding: '8px 9px', marginBottom: 8 }}>
            <Stack justify='space-between' align='flex-start' gap={8}>
                <div style={{ minWidth: 0 }}>
                    <Typography.Text strong style={{ display: 'block', color: '#0958d9', fontSize: 12, lineHeight: '16px' }}>Danh sách cao nhất</Typography.Text>
                    <Typography.Text style={{ display: 'block', color: '#111827', fontSize: 12, lineHeight: '17px', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {highestShoppingCost ? highestShoppingCost.name : 'Không có lịch mua đang mở'}
                    </Typography.Text>
                    <Typography.Text type='secondary' style={{ display: 'block', fontSize: 11, lineHeight: '15px', marginTop: 2 }}>{highestLabel}</Typography.Text>
                </div>
                <span style={{ flexShrink: 0, borderRadius: 999, padding: '2px 8px', background: '#fff', color: '#0958d9', border: '1px solid #bae0ff', fontSize: 11, lineHeight: '16px', fontWeight: 800 }}>
                    {highestShoppingCost ? `${highestShoppingCost.progress}% xong` : `${shoppingCostCount} danh sách`}
                </span>
            </Stack>
            {highestShoppingCost && <div style={{ height: 6, borderRadius: 999, background: '#e6f4ff', overflow: 'hidden', marginTop: 8 }}>
                <div style={{ height: '100%', width: `${Math.max(3, highestShoppingCost.progress)}%`, borderRadius: 999, background: highestShoppingCost.progress >= 100 ? '#389e0d' : '#0958d9' }} />
            </div>}
        </Box>

        {showHelp && <Box style={{ border: '1px solid rgba(9,88,217,0.14)', borderRadius: 8, background: '#f7fbff', padding: '8px 9px', marginBottom: 8 }}>
            <Typography.Text style={{ display: 'block', color: '#2f2545', fontSize: 12, lineHeight: '18px' }}>
                Đây là ước tính tiền cho phần nguyên liệu còn cần mua trong các danh sách chưa hoàn tất. App trừ tồn kho hiện tại và các nhóm đã đánh dấu mua xong, rồi dùng giá đã lưu ở nguyên liệu để tính khoảng tiền. Nó không phải tổng tiền đã chi.
            </Typography.Text>
        </Box>}

        <Stack gap={6} wrap='wrap' justify='flex-end'>
            {highestShoppingCost && onOpenHighest && <Button size='small' onClick={onOpenHighest} style={{ height: 28, padding: '0 9px', borderRadius: 999, color: '#0958d9', borderColor: 'rgba(9,88,217,0.30)', fontWeight: 650, fontSize: 11 }}>Mở cao nhất</Button>}
            <Button size='small' onClick={onOpenShopping} style={{ height: 28, padding: '0 9px', borderRadius: 999, color: '#0958d9', borderColor: 'rgba(9,88,217,0.30)', fontWeight: 650, fontSize: 11 }}>Mua sắm</Button>
        </Stack>
    </Box>;
}

export const DashboardAnalyticsScreen = () => {
    const navigate = useNavigate();
    const ingredients = useSelector(selectIngredients);
    const ingredientsById = useSelector(selectIngredientsById);
    const dishes = useSelector(selectDishes);
    const inventoryItems = useSelector(selectInventory);
    const inventoryConfig = useSelector(selectInventoryHealthConfig);
    const shoppingLists = useSelector(selectShoppingLists);
    const scheduledMeals = useSelector(selectScheduledMeals);
    const ingredientPriceMemory = useSelector(selectIngredientPriceMemory);
    const ingredientPriceHistory = useSelector(selectIngredientPriceHistory);
    useScreenTitle({ value: 'Phân tích', deps: [] });

    const openRoute = React.useCallback((href: string) => {
        React.startTransition(() => navigate(href));
    }, [navigate]);

    const openShoppingLists = useMemo(() => shoppingLists
        .filter(item => !item.completedAt)
        .sort((a, b) => moment(a.plannedDate ?? a.createdDate).valueOf() - moment(b.plannedDate ?? b.createdDate).valueOf()), [shoppingLists]);
    const urgentInventory = useMemo(() => buildUrgentInventory(inventoryItems, ingredientsById, inventoryConfig), [inventoryItems, ingredientsById, inventoryConfig]);
    const weekOverview = useMemo(() => Array.from({ length: 7 }).map((_, index) => {
        const date = today().add(index, 'day');
        return {
            label: index === 0 ? 'Hôm nay' : DateHelpers.capitalizeWeekdayLabel(date.format('dd')),
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
    const calculateExpensiveMetrics = React.useCallback((): AnalyticsExpensiveMetrics => {
        const totalOpenShoppingCost = CostEstimateHelper.emptySummary();
        const shoppingCosts = openShoppingLists.slice(0, 6).map(list => {
            const summary = estimateShoppingListCart(list, ingredientsById, inventoryItems, inventoryConfig);
            CostEstimateHelper.mergeSummary(totalOpenShoppingCost, summary);
            const progress = getProgress(list);
            return {
                id: list.id,
                name: list.name,
                progress: progress.percent,
                doneCount: progress.done,
                totalCount: progress.total,
                remainingCount: Math.max(0, progress.total - progress.done),
                costLabel: formatCostSummary(summary),
                value: CostEstimateHelper.hasPrice(summary) ? Math.max(summary.min, summary.max) : 0,
            };
        });

        return {
            shoppingCosts,
            totalOpenShoppingCost,
            suggestions: DishScorer.scoreWithInventory(dishes, inventoryItems, dishes, ingredients, inventoryConfig).slice(0, 5),
            nutrition: buildNutritionAnalytics(dishes, ingredients, ingredientsById),
        };
    }, [dishes, ingredients, ingredientsById, inventoryItems, inventoryConfig, openShoppingLists]);
    const { value: expensiveMetrics, pending: expensiveMetricsPending } = useScheduledCalculation(calculateExpensiveMetrics, {
        initialValue: createEmptyAnalyticsExpensiveMetrics,
    });
    const { shoppingCosts, totalOpenShoppingCost, suggestions, nutrition } = expensiveMetrics;
    const priceHistoryAnalytics = useMemo(() => buildPriceHistoryAnalytics(ingredientPriceHistory, ingredientPriceMemory, ingredientsById), [ingredientPriceHistory, ingredientPriceMemory, ingredientsById]);

    const completedDishes = dishes.filter(item => item.isCompleted).length;
    const dishCompletePercent = dishes.length > 0 ? Math.round(completedDishes / dishes.length * 100) : 0;
    const urgentExpiredCount = urgentInventory.filter(item => item.daysLeft < 0).length;
    const stockedIngredientCount = Object.entries(inventoryItems).filter(([, inventory]) => (inventory.batches ?? []).some(batch => batch.amount > 0)).length;
    const stockedIngredientPercent = ingredients.length > 0 ? Math.round(stockedIngredientCount / ingredients.length * 100) : 0;
    const topProteinMax = Math.max(1, ...nutrition.topProtein.map(item => item.protein));
    const topFiberMax = Math.max(1, ...nutrition.topFiber.map(item => item.fiber));
    const lightCalorieMax = Math.max(1, ...nutrition.lightCalories.map(item => item.calories));
    const mealSlotChartData = [
        { name: 'Sáng', value: mealSlotCounts.breakfast, fill: '#1677ff' },
        { name: 'Trưa', value: mealSlotCounts.lunch, fill: '#7436dc' },
        { name: 'Tối', value: mealSlotCounts.dinner, fill: '#fa8c16' },
    ];
    const inventoryCategoryChartData = inventoryByCategory.map(item => ({
        name: truncateName(item.category, 13),
        stockedPercent: item.total > 0 ? Math.round(item.stocked / item.total * 100) : 0,
        missingPercent: item.total > 0 ? Math.round(Math.max(0, item.total - item.stocked) / item.total * 100) : 0,
        stockedLabel: `${item.stocked}/${item.total}`,
        missingLabel: `${Math.max(0, item.total - item.stocked)}/${item.total}`,
        total: item.total,
    }));
    const shoppingCostChartData = shoppingCosts.map(item => ({
        name: truncateName(item.name, 14),
        value: item.value,
        progress: item.progress,
        costLabel: item.costLabel,
        remainingCount: item.remainingCount,
    }));
    const expiryRiskChartData = [
        { name: 'Quá hạn', value: urgentInventory.filter(item => item.daysLeft < 0).length, fill: '#cf1322' },
        { name: 'Hôm nay', value: urgentInventory.filter(item => item.daysLeft === 0).length, fill: '#fa541c' },
        { name: '1-3 ngày', value: urgentInventory.filter(item => item.daysLeft > 0).length, fill: '#fa8c16' },
    ].filter(item => item.value > 0);
    const expiryRiskPieData = expiryRiskChartData.length > 0 ? expiryRiskChartData : [{ name: 'Không rủi ro', value: 1, fill: '#b7eb8f' }];
    const dataQualityChartData = [
        { name: 'Hồ sơ món', percent: dishCompletePercent, label: `${completedDishes}/${dishes.length} món`, fill: '#389e0d' },
        { name: 'Món có nutrition', percent: nutrition.dishCoveragePercent, label: `${nutrition.dishWithNutritionCount}/${nutrition.dishScopeCount} món`, fill: '#7436dc' },
        { name: 'NL có nutrition', percent: nutrition.ingredientCoveragePercent, label: `${nutrition.ingredientWithNutritionCount}/${ingredients.length} nguyên liệu`, fill: '#1677ff' },
    ];
    const nutritionAverageChartData = [
        { name: 'Kcal', percent: Math.min(100, Math.round(nutrition.averageCalories / 800 * 100)), label: DishNutritionHelper.formatCalories(nutrition.averageCalories), fill: '#7436dc' },
        { name: 'Đạm', percent: Math.min(100, Math.round(nutrition.averageProtein / 36 * 100)), label: DishNutritionHelper.formatGram(nutrition.averageProtein), fill: '#1677ff' },
        { name: 'Tinh bột', percent: Math.min(100, Math.round(nutrition.averageCarbs / 80 * 100)), label: DishNutritionHelper.formatGram(nutrition.averageCarbs), fill: '#fa8c16' },
        { name: 'Béo', percent: Math.min(100, Math.round(nutrition.averageFat / 42 * 100)), label: DishNutritionHelper.formatGram(nutrition.averageFat), fill: '#d46b08' },
        { name: 'Xơ', percent: Math.min(100, Math.round(nutrition.averageFiber / 12 * 100)), label: DishNutritionHelper.formatGram(nutrition.averageFiber), fill: '#389e0d' },
    ];
    const priceHistoryDayChartData = priceHistoryAnalytics.dayChartData.map(item => ({
        ...item,
        valueLabel: IngredientPriceHelper.formatCurrency(item.value),
    }));
    const priceHistoryHasData = priceHistoryAnalytics.entryCount > 0;
    const busiestPlanDay = [...weekOverview]
        .map(item => ({ ...item, total: item.mealCount + item.shoppingCount }))
        .sort((a, b) => b.total - a.total)[0];
    const highestShoppingCost = [...shoppingCosts].sort((a, b) => b.value - a.value)[0];
    const mealSlotFocus = [...mealSlotChartData].sort((a, b) => b.value - a.value)[0];
    const nutritionGapCount = Math.max(0, nutrition.dishScopeCount - nutrition.dishWithNutritionCount);

    const NutritionRankGroup = ({ title, rows, tone, max, format, barValue }: { title: string; rows: NutritionDishRow[]; tone: string; max: number; format: (row: NutritionDishRow) => string; barValue: (row: NutritionDishRow) => number }) => {
        return <Box style={{ minWidth: 0, width: '100%', border: `1px solid ${tone}20`, borderRadius: 8, background: `${tone}08`, padding: 9, boxSizing: 'border-box' }}>
            <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 13, lineHeight: '17px', marginBottom: 8 }}>{title}</Typography.Text>
            <Stack direction='column' align='stretch' gap={8}>
                {rows.map(row => {
                    const width = Math.max(5, Math.round(barValue(row) / Math.max(1, max) * 100));
                    return <button key={`${title}-${row.id}`} type='button' onClick={() => openRoute(RootRoutes.AuthorizedRoutes.DishesRoutes.ManageIngredient(row.id))} style={{ width: '100%', minWidth: 0, boxSizing: 'border-box', border: '1px solid rgba(116,54,220,0.10)', borderRadius: 8, background: '#fff', padding: '9px 10px', textAlign: 'left', cursor: 'pointer', boxShadow: '0 6px 16px rgba(74,48,130,0.06)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 82px', gap: 8, alignItems: 'start' }}>
                            <div style={{ minWidth: 0, width: '100%' }}>
                                <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 12, lineHeight: '16px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.name}</Typography.Text>
                                <Typography.Text type='secondary' style={{ display: 'block', fontSize: 10, lineHeight: '14px', marginTop: 2 }}>{row.coveragePercent}% dữ liệu</Typography.Text>
                            </div>
                            <span style={{ width: 82, boxSizing: 'border-box', borderRadius: 999, padding: '2px 7px', background: `${tone}14`, color: tone, fontSize: 11, lineHeight: '16px', fontWeight: 800, whiteSpace: 'nowrap', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis' }}>{format(row)}</span>
                        </div>
                        <div style={{ height: 6, borderRadius: 999, background: '#f0edf8', overflow: 'hidden', marginTop: 8 }}>
                            <div style={{ height: '100%', width: `${width}%`, borderRadius: 999, background: tone, boxShadow: `0 6px 14px ${tone}33` }} />
                        </div>
                    </button>;
                })}
            </Stack>
        </Box>;
    };

    return <Box data-testid='dashboard-analytics' style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 0 14px', maxWidth: 980, margin: '0 auto' }}>
        <style>{analyticsCss}</style>
        <Box style={{ padding: '2px 2px 0' }}>
            <Stack justify='space-between' align='flex-start' gap={10}>
                <div style={{ minWidth: 0 }}>
                    <Typography.Text style={{ display: 'block', color: '#7436dc', fontSize: 12, lineHeight: '16px', fontWeight: 700 }}>My Recipes</Typography.Text>
                    <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 22, lineHeight: '28px' }}>Phân tích bếp nhà</Typography.Text>
                    <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '17px', marginTop: 3 }}>Dữ liệu để quyết định nên nấu gì, mua gì và bổ sung gì trong vài ngày tới.</Typography.Text>
                </div>
                <Stack align='center' gap={6} style={{ flexShrink: 0 }}>
                    <span style={{ borderRadius: 999, padding: '5px 10px', background: '#fbf9ff', border: '1px solid rgba(116,54,220,0.14)', color: '#5e2bbf', fontSize: 11, fontWeight: 750, whiteSpace: 'nowrap' }}>{formatHeaderDateLabel()}</span>
                </Stack>
            </Stack>
        </Box>

        <SectionCard title='Tín hiệu quyết định' subtitle='Những điểm nên nhìn trước khi lên lịch nấu hoặc đi chợ.' helpText={analyticsHelp.decisionSignals} icon={<QuestionCircleOutlined />} tone='#13a8a8'>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 9 }}>
                <InsightCard
                    title='Ngày bận nhất 7 ngày tới'
                    value={busiestPlanDay?.total > 0 ? `${busiestPlanDay.label} · ${busiestPlanDay.dateLabel}` : 'Chưa có tải lớn'}
                    detail={busiestPlanDay?.total > 0 ? `${busiestPlanDay.mealCount} thực đơn và ${busiestPlanDay.shoppingCount} danh sách mua sắm.` : 'Lịch tuần tới đang nhẹ, có thể lên thêm thực đơn.'}
                    icon={<CalendarOutlined />}
                    tone='#7436dc'
                    actionLabel='Mở'
                    onOpen={() => openRoute(RootRoutes.AuthorizedRoutes.ScheduledMealRoutes.List())}
                />
                <ExpenseSignalCard
                    pending={expensiveMetricsPending}
                    highestShoppingCost={highestShoppingCost}
                    totalOpenShoppingCost={totalOpenShoppingCost}
                    shoppingCostCount={shoppingCosts.length}
                    onOpenShopping={() => openRoute(RootRoutes.AuthorizedRoutes.ShoppingListRoutes.List())}
                    onOpenHighest={highestShoppingCost ? () => openRoute(RootRoutes.AuthorizedRoutes.ShoppingListRoutes.Detail(highestShoppingCost.id)) : undefined}
                />
                <InsightCard
                    title='Rủi ro hao hụt'
                    value={urgentInventory[0] ? urgentInventory[0].ingredientName : 'Kho ổn'}
                    detail={urgentInventory[0] ? `${InventoryHelper.expiryBadge(urgentInventory[0].daysLeft)?.label ?? 'Cần xem'} · hạn ${urgentInventory[0].expiresAtLabel}.` : 'Không có nguyên liệu hết hạn hoặc sắp hết hạn trong ngưỡng cấu hình.'}
                    icon={<WarningOutlined />}
                    tone={urgentExpiredCount > 0 ? '#cf1322' : '#fa8c16'}
                    actionLabel={urgentInventory[0] ? 'Mở' : undefined}
                    onOpen={urgentInventory[0] ? () => openRoute(RootRoutes.AuthorizedRoutes.IngredientRoutes.Detail(urgentInventory[0].ingredientId)) : undefined}
                />
                <InsightCard
                    title='Cân bằng bữa'
                    value={mealSlotFocus?.value > 0 ? `${mealSlotFocus.name} nhiều nhất` : 'Chưa có nhịp bữa'}
                    detail={mealSlotFocus?.value > 0 ? `${mealSlotFocus.value} món đã lên lịch trong 14 ngày tới, nên kiểm tra các bữa còn lại.` : 'Chưa đủ lịch để thấy bữa nào đang bị lệch.'}
                    icon={<ClockCircleOutlined />}
                    tone={mealSlotFocus?.fill ?? '#1677ff'}
                />
                <InsightCard
                    title='Lỗ hổng dinh dưỡng'
                    value={expensiveMetricsPending ? 'Đang tính...' : nutritionGapCount > 0 ? `${nutritionGapCount} món thiếu` : 'Dữ liệu ổn'}
                    detail={nutritionGapCount > 0 ? `${nutrition.dishWithNutritionCount}/${nutrition.dishScopeCount} món có thể phân tích dinh dưỡng.` : 'Các món trong phạm vi phân tích đã có dữ liệu dinh dưỡng.'}
                    icon={<CheckCircleOutlined />}
                    tone={nutritionGapCount > 0 ? '#d48806' : '#389e0d'}
                    actionLabel='Mở'
                    onOpen={() => openRoute(RootRoutes.AuthorizedRoutes.NutritionGoals())}
                />
            </div>
        </SectionCard>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
            <SectionCard title='Áp lực chuẩn bị 7 ngày' subtitle='Ngày nào đang dồn cả nấu ăn và mua sắm.' helpText={analyticsHelp.planLoad} icon={<BarChartOutlined />} tone='#7436dc'>
                <ChartFrame height={190}>
                    <ResponsiveContainer width='100%' height='100%'>
                        <BarChart data={weekOverview} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
                            <CartesianGrid stroke={chartGridColor} vertical={false} />
                            <XAxis dataKey='label' tick={chartAxisStyle} axisLine={false} tickLine={false} interval={0} />
                            <YAxis allowDecimals={false} tick={chartAxisStyle} axisLine={false} tickLine={false} width={30} />
                            <ChartTooltip contentStyle={chartTooltipStyle} formatter={(value: any, name: any) => [value, name]} labelFormatter={(label) => `${label}`} />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            <Bar dataKey='mealCount' name='Thực đơn' stackId='plan' fill='#7436dc' radius={[6, 6, 0, 0]} />
                            <Bar dataKey='shoppingCount' name='Mua sắm' stackId='plan' fill='#1677ff' radius={[6, 6, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartFrame>
                <ChartSummaryRow items={weekOverview.map(item => ({ label: item.dateLabel, value: item.mealCount + item.shoppingCount, color: item.mealCount + item.shoppingCount > 0 ? '#7436dc' : '#8c8c8c' }))} />
            </SectionCard>

            <SectionCard title='Cân bằng bữa 14 ngày' subtitle='Bữa nào đang được lên lịch nhiều hoặc ít bất thường.' helpText={analyticsHelp.mealBalance} icon={<ClockCircleOutlined />} tone='#1677ff'>
                <ChartFrame height={176}>
                    <ResponsiveContainer width='100%' height='100%'>
                        <BarChart data={mealSlotChartData} layout='vertical' margin={{ top: 6, right: 18, left: 8, bottom: 0 }}>
                            <CartesianGrid stroke={chartGridColor} horizontal={false} />
                            <XAxis type='number' allowDecimals={false} tick={chartAxisStyle} axisLine={false} tickLine={false} />
                            <YAxis type='category' dataKey='name' tick={chartAxisStyle} axisLine={false} tickLine={false} width={42} />
                            <ChartTooltip contentStyle={chartTooltipStyle} formatter={(value: any) => [`${value} món`, 'Số món']} />
                            <Bar dataKey='value' radius={[0, 8, 8, 0]}>
                                {mealSlotChartData.map(item => <Cell key={item.name} fill={item.fill} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </ChartFrame>
                <ChartSummaryRow items={mealSlotChartData.map(item => ({ label: item.name, value: `${item.value} món`, color: item.fill }))} />
            </SectionCard>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
            <SectionCard title='Độ phủ kho theo nhóm' subtitle={`${stockedIngredientPercent}% nguyên liệu có tồn kho hoặc luôn có sẵn.`} helpText={analyticsHelp.inventoryCoverage} icon={<BarChartOutlined />} tone='#fa8c16'>
                {inventoryByCategory.length === 0 ? <EmptyAnalytics text='Chưa có dữ liệu nguyên liệu để phân tích kho.' /> : <>
                    <ChartFrame height={220}>
                        <ResponsiveContainer width='100%' height='100%'>
                            <BarChart data={inventoryCategoryChartData} layout='vertical' margin={{ top: 6, right: 18, left: 10, bottom: 0 }}>
                                <CartesianGrid stroke={chartGridColor} horizontal={false} />
                                <XAxis type='number' domain={[0, 100]} allowDecimals={false} tick={chartAxisStyle} axisLine={false} tickLine={false} tickFormatter={(value) => `${value}%`} />
                                <YAxis type='category' dataKey='name' tick={chartAxisStyle} axisLine={false} tickLine={false} width={76} />
                                <ChartTooltip contentStyle={chartTooltipStyle} formatter={(value: any, name: any, props: any) => {
                                    const isStocked = props?.dataKey === 'stockedPercent';
                                    const label = isStocked ? props?.payload?.stockedLabel : props?.payload?.missingLabel;
                                    return [`${value}% · ${label}`, isStocked ? 'Có sẵn' : 'Cần bổ sung'];
                                }} />
                                <Legend wrapperStyle={{ fontSize: 11 }} />
                                <Bar dataKey='stockedPercent' name='Có sẵn' stackId='inventory' fill='#389e0d' radius={[0, 8, 8, 0]} />
                                <Bar dataKey='missingPercent' name='Cần bổ sung' stackId='inventory' fill='#fa8c16' radius={[0, 8, 8, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartFrame>
                    <ChartSummaryRow items={inventoryByCategory.slice(0, 4).map((item, index) => ({ label: item.category, value: `${item.stocked}/${item.total}`, color: chartPalette[index % chartPalette.length] }))} />
                </>}
            </SectionCard>

            <SectionCard title='Rủi ro hết hạn tồn kho' subtitle='Các lô đã quá hạn hoặc sắp hết hạn theo cấu hình kho.' helpText={analyticsHelp.expiryRisk} icon={<WarningOutlined />} tone={urgentExpiredCount > 0 ? '#cf1322' : '#fa8c16'}>
                {urgentInventory.length === 0 ? <EmptyAnalytics text='Không có nguyên liệu sắp hết hạn.' /> : <Stack direction='column' align='stretch' gap={10}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(118px, 0.8fr) minmax(0, 1.2fr)', gap: 10, alignItems: 'stretch' }}>
                        <ChartFrame height={176}>
                            <ResponsiveContainer width='100%' height='100%'>
                                <PieChart>
                                    <Pie data={expiryRiskPieData} dataKey='value' nameKey='name' innerRadius={38} outerRadius={62} paddingAngle={3}>
                                        {expiryRiskPieData.map(item => <Cell key={item.name} fill={item.fill} />)}
                                    </Pie>
                                    <ChartTooltip contentStyle={chartTooltipStyle} formatter={(value: any) => [`${value} lô`, 'Rủi ro']} />
                                    <Legend wrapperStyle={{ fontSize: 11 }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </ChartFrame>
                        <Box style={{ border: '1px solid rgba(250,140,22,0.16)', borderRadius: 8, background: '#fffaf2', padding: 11, minWidth: 0 }}>
                            <Typography.Text strong style={{ display: 'block', color: urgentExpiredCount > 0 ? '#cf1322' : '#fa8c16', fontSize: 24, lineHeight: '29px' }}>{urgentInventory.length}</Typography.Text>
                            <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '16px' }}>lô cần xử lý trong ngưỡng cấu hình</Typography.Text>
                            <ChartSummaryRow items={expiryRiskChartData.map(item => ({ label: item.name, value: item.value, color: item.fill }))} />
                        </Box>
                    </div>
                    <Stack direction='column' align='stretch' gap={8}>
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
                    </Stack>
                </Stack>}
            </SectionCard>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
            <SectionCard title='Áp lực ngân sách mua sắm' subtitle='Danh sách nào còn tốn tiền và còn nhiều món chưa mua.' helpText={analyticsHelp.shoppingBudget} icon={<DollarCircleOutlined />} tone='#0958d9'>
                {expensiveMetricsPending ? <EmptyAnalytics text='Đang tính chi phí mua sắm...' /> : shoppingCosts.length === 0 ? <EmptyAnalytics text='Không có danh sách mua sắm đang mở.' /> : <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
                    <ChartFrame height={206}>
                        <ResponsiveContainer width='100%' height='100%'>
                            <BarChart data={shoppingCostChartData} layout='vertical' margin={{ top: 6, right: 20, left: 12, bottom: 0 }}>
                                <CartesianGrid stroke={chartGridColor} horizontal={false} />
                                <XAxis type='number' tick={chartAxisStyle} axisLine={false} tickLine={false} tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} />
                                <YAxis type='category' dataKey='name' tick={chartAxisStyle} axisLine={false} tickLine={false} width={88} />
                                <ChartTooltip contentStyle={chartTooltipStyle} formatter={(value: any, name: any, props: any) => [props?.payload?.costLabel ?? value, name === 'value' ? 'Chi phí' : name]} />
                                <Bar dataKey='value' name='Chi phí' fill='#0958d9' radius={[0, 8, 8, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartFrame>
                    <ChartSummaryRow items={shoppingCosts.slice(0, 4).map(item => ({ label: truncateName(item.name, 14), value: `${item.remainingCount} cần mua`, color: item.progress >= 100 ? '#389e0d' : '#0958d9' }))} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7, width: '100%' }}>
                        {shoppingCosts.slice(0, 4).map(item => <button key={item.id} type='button' onClick={() => openRoute(RootRoutes.AuthorizedRoutes.ShoppingListRoutes.Detail(item.id))} style={{ width: '100%', boxSizing: 'border-box', border: '1px solid rgba(9,88,217,0.12)', borderRadius: 8, background: '#fff', padding: '9px 10px', textAlign: 'left', cursor: 'pointer' }}>
                            <Stack justify='space-between' gap={8} align='flex-start'>
                                <div style={{ minWidth: 0 }}>
                                    <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 12, lineHeight: '16px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</Typography.Text>
                                    <Typography.Text type='secondary' style={{ display: 'block', fontSize: 11, lineHeight: '15px', marginTop: 2 }}>{item.doneCount}/{item.totalCount} đã mua · còn {item.remainingCount} nhóm</Typography.Text>
                                </div>
                                <span style={{ flexShrink: 0, borderRadius: 999, padding: '2px 8px', background: '#e6f4ff', color: '#0958d9', border: '1px solid #bae0ff', fontSize: 11, lineHeight: '16px', fontWeight: 800 }}>{item.costLabel}</span>
                            </Stack>
                            <div style={{ height: 6, borderRadius: 999, background: '#e6f4ff', overflow: 'hidden', marginTop: 8 }}>
                                <div style={{ height: '100%', width: `${Math.max(3, item.progress)}%`, borderRadius: 999, background: item.progress >= 100 ? '#389e0d' : '#0958d9' }} />
                            </div>
                        </button>)}
                    </div>
                    <Button onClick={() => openRoute(RootRoutes.AuthorizedRoutes.ShoppingListRoutes.List())} style={{ borderRadius: 999, color: '#0958d9', borderColor: 'rgba(9,88,217,0.30)', fontWeight: 700 }}>Mở mua sắm</Button>
                </div>}
            </SectionCard>

            <SectionCard title='Lịch sử giá mua' subtitle={priceHistoryHasData ? `${priceHistoryAnalytics.entryCount} lần lưu giá cho ${priceHistoryAnalytics.ingredientCount} nguyên liệu.` : 'Lưu giá khi đánh dấu mua xong để app phân tích biến động.'} helpText={analyticsHelp.priceHistory} icon={<DollarCircleOutlined />} tone='#722ed1'>
                {!priceHistoryHasData ? <EmptyAnalytics text='Chưa có lịch sử giá mua. Mở danh sách mua sắm, đánh dấu nguyên liệu đã mua và lưu giá hôm nay để bắt đầu.' /> : <Stack direction='column' align='stretch' gap={10}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(118px, 1fr))', gap: 8 }}>
                        <Box style={{ border: '1px solid rgba(114,46,209,0.18)', borderRadius: 8, background: '#fbf9ff', padding: 10, minWidth: 0 }}>
                            <Typography.Text strong style={{ display: 'block', color: '#722ed1', fontSize: 20, lineHeight: '24px' }}>{IngredientPriceHelper.formatCurrency(priceHistoryAnalytics.last14DaysSpend)}</Typography.Text>
                            <Typography.Text type='secondary' style={{ display: 'block', fontSize: 11, lineHeight: '15px' }}>đã ghi nhận 14 ngày</Typography.Text>
                        </Box>
                        <Box style={{ border: '1px solid rgba(19,168,168,0.18)', borderRadius: 8, background: '#f0fffd', padding: 10, minWidth: 0 }}>
                            <Typography.Text strong style={{ display: 'block', color: '#13a8a8', fontSize: 20, lineHeight: '24px' }}>{priceHistoryAnalytics.ingredientCount}</Typography.Text>
                            <Typography.Text type='secondary' style={{ display: 'block', fontSize: 11, lineHeight: '15px' }}>nguyên liệu có giá thật</Typography.Text>
                        </Box>
                        <Box style={{ border: '1px solid rgba(250,140,22,0.18)', borderRadius: 8, background: '#fff7e6', padding: 10, minWidth: 0 }}>
                            <Typography.Text strong style={{ display: 'block', color: '#d46b08', fontSize: 20, lineHeight: '24px' }}>{IngredientPriceHelper.formatCurrency(priceHistoryAnalytics.totalRecordedSpend)}</Typography.Text>
                            <Typography.Text type='secondary' style={{ display: 'block', fontSize: 11, lineHeight: '15px' }}>tổng đã từng ghi nhận</Typography.Text>
                        </Box>
                    </div>

                    <ChartFrame height={190}>
                        <ResponsiveContainer width='100%' height='100%'>
                            <BarChart data={priceHistoryDayChartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                                <CartesianGrid stroke={chartGridColor} vertical={false} />
                                <XAxis dataKey='label' tick={chartAxisStyle} axisLine={false} tickLine={false} interval={2} />
                                <YAxis tick={chartAxisStyle} axisLine={false} tickLine={false} width={36} tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} />
                                <ChartTooltip contentStyle={chartTooltipStyle} formatter={(value: any, name: any, props: any) => [props?.payload?.valueLabel ?? value, 'Tiền đã lưu']} labelFormatter={(label) => `Ngày ${label}`} />
                                <Bar dataKey='value' name='Tiền đã lưu' fill='#722ed1' radius={[7, 7, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartFrame>
                    <ChartSummaryRow items={priceHistoryAnalytics.dayChartData.filter(item => item.count > 0).slice(-4).map(item => ({ label: item.label, value: `${item.count} giá`, color: '#722ed1' }))} />

                    {priceHistoryAnalytics.trendRows.length > 0 && <Box style={{ border: '1px solid rgba(114,46,209,0.12)', borderRadius: 8, background: '#fff', padding: 10 }}>
                        <Typography.Text strong style={{ display: 'block', fontSize: 13, lineHeight: '18px', marginBottom: 8 }}>Biến động đơn giá</Typography.Text>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                            {priceHistoryAnalytics.trendRows.map(row => {
                                const tone = row.changePercent > 0 ? '#cf1322' : row.changePercent < 0 ? '#389e0d' : '#8c8c8c';
                                return <div key={row.ingredientId} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 8, alignItems: 'center', padding: '8px 9px', border: '1px solid #f0f0f0', borderRadius: 8, background: '#fafafa' }}>
                                    <div style={{ minWidth: 0 }}>
                                        <Typography.Text strong style={{ display: 'block', fontSize: 12, lineHeight: '16px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.ingredientName}</Typography.Text>
                                        <Typography.Text type='secondary' style={{ display: 'block', fontSize: 11, lineHeight: '15px' }}>
                                            {formatUnitPrice(row.previousUnitPrice, row.unit)} → {formatUnitPrice(row.latestUnitPrice, row.unit)}
                                        </Typography.Text>
                                    </div>
                                    <span style={{ borderRadius: 999, padding: '2px 8px', background: `${tone}12`, color: tone, border: `1px solid ${tone}24`, fontSize: 11, lineHeight: '16px', fontWeight: 800, whiteSpace: 'nowrap' }}>
                                        {row.changePercent > 0 ? '+' : ''}{row.changePercent}%
                                    </span>
                                </div>;
                            })}
                        </div>
                    </Box>}

                    <Box style={{ border: '1px solid rgba(114,46,209,0.12)', borderRadius: 8, background: '#fff', padding: 10 }}>
                        <Typography.Text strong style={{ display: 'block', fontSize: 13, lineHeight: '18px', marginBottom: 8 }}>Giá vừa lưu</Typography.Text>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                            {priceHistoryAnalytics.recentEntries.map(entry => <div key={entry.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 8, alignItems: 'center', padding: '8px 9px', border: '1px solid #f0f0f0', borderRadius: 8, background: '#fafafa' }}>
                                <div style={{ minWidth: 0 }}>
                                    <Typography.Text strong style={{ display: 'block', fontSize: 12, lineHeight: '16px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.ingredientName}</Typography.Text>
                                    <Typography.Text type='secondary' style={{ display: 'block', fontSize: 11, lineHeight: '15px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {IngredientUnitHelper.formatAmount(entry.amount)}{entry.unit}{entry.shoppingListName ? ` · ${entry.shoppingListName}` : ''}
                                    </Typography.Text>
                                </div>
                                <div style={{ textAlign: 'right', minWidth: 72 }}>
                                    <Typography.Text strong style={{ display: 'block', color: '#722ed1', fontSize: 12, lineHeight: '16px' }}>{IngredientPriceHelper.formatCurrency(entry.price)}</Typography.Text>
                                    <Typography.Text type='secondary' style={{ display: 'block', fontSize: 10, lineHeight: '14px' }}>{moment(entry.updatedAt).format('DD/MM/YY')}</Typography.Text>
                                </div>
                            </div>)}
                        </div>
                    </Box>
                </Stack>}
            </SectionCard>

            <SectionCard title='Chất lượng dữ liệu món ăn' subtitle='Dữ liệu đã đủ tin cậy cho gợi ý, nutrition và lập kế hoạch chưa.' helpText={analyticsHelp.dataQuality} icon={<CheckCircleOutlined />} tone='#389e0d'>
                <Stack direction='column' align='stretch' gap={10}>
                    <ChartFrame height={210}>
                        <ResponsiveContainer width='100%' height='100%'>
                            <BarChart data={dataQualityChartData} layout='vertical' margin={{ top: 6, right: 18, left: 10, bottom: 0 }}>
                                <CartesianGrid stroke={chartGridColor} horizontal={false} />
                                <XAxis type='number' domain={[0, 100]} tick={chartAxisStyle} axisLine={false} tickLine={false} tickFormatter={(value) => `${value}%`} />
                                <YAxis type='category' dataKey='name' tick={chartAxisStyle} axisLine={false} tickLine={false} width={92} />
                                <ChartTooltip contentStyle={chartTooltipStyle} formatter={(value: any, name: any, props: any) => [props?.payload?.label ?? `${value}%`, 'Độ phủ']} />
                                <Bar dataKey='percent' name='Độ phủ' radius={[0, 8, 8, 0]}>
                                    {dataQualityChartData.map(item => <Cell key={item.name} fill={item.fill} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartFrame>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(118px, 1fr))', gap: 8 }}>
                        {dataQualityChartData.map(item => <Box key={item.name} style={{ border: `1px solid ${item.fill}20`, borderRadius: 8, background: `${item.fill}08`, padding: 10, minWidth: 0 }}>
                            <Typography.Text strong style={{ display: 'block', color: item.fill, fontSize: 20, lineHeight: '24px' }}>{item.percent}%</Typography.Text>
                            <Typography.Text style={{ display: 'block', color: '#111827', fontSize: 12, lineHeight: '16px', fontWeight: 700 }}>{item.name}</Typography.Text>
                            <Typography.Text type='secondary' style={{ display: 'block', fontSize: 11, lineHeight: '15px', marginTop: 2 }}>{item.label}</Typography.Text>
                        </Box>)}
                        <Box style={{ border: '1px solid rgba(19,168,168,0.18)', borderRadius: 8, background: '#f0fffd', padding: 10, minWidth: 0 }}>
                            <Typography.Text strong style={{ display: 'block', color: '#13a8a8', fontSize: 20, lineHeight: '24px' }}>{nutrition.sourceCount}</Typography.Text>
                            <Typography.Text style={{ display: 'block', color: '#111827', fontSize: 12, lineHeight: '16px', fontWeight: 700 }}>Nguồn nutrition</Typography.Text>
                            <Typography.Text type='secondary' style={{ display: 'block', fontSize: 11, lineHeight: '15px', marginTop: 2 }}>nguồn tham chiếu đang được dùng</Typography.Text>
                        </Box>
                    </div>
                </Stack>
            </SectionCard>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
            <SectionCard title='Hồ sơ dinh dưỡng khẩu phần' subtitle={`${nutrition.dishWithNutritionCount}/${nutrition.dishScopeCount} món tính được dinh dưỡng.`} helpText={analyticsHelp.nutritionProfile} icon={<BarChartOutlined />} tone='#7436dc'>
                {expensiveMetricsPending ? <EmptyAnalytics text='Đang tính dữ liệu dinh dưỡng...' /> : nutrition.dishWithNutritionCount === 0 ? <EmptyAnalytics text='Chưa có món nào đủ dữ liệu dinh dưỡng để phân tích.' /> : <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(118px, 1fr))', gap: 8, marginBottom: 12 }}>
                        <div style={{ borderRadius: 8, background: '#fbf9ff', border: '1px solid #ece5ff', padding: 10 }}>
                            <Typography.Text strong style={{ display: 'block', color: '#7436dc', fontSize: 20, lineHeight: '24px' }}>{nutrition.dishCoveragePercent}%</Typography.Text>
                            <Typography.Text type='secondary' style={{ display: 'block', fontSize: 11, lineHeight: '15px' }}>món có dinh dưỡng</Typography.Text>
                        </div>
                        <div style={{ borderRadius: 8, background: '#f6ffed', border: '1px solid #d9f7be', padding: 10 }}>
                            <Typography.Text strong style={{ display: 'block', color: '#389e0d', fontSize: 20, lineHeight: '24px' }}>{nutrition.ingredientCoveragePercent}%</Typography.Text>
                            <Typography.Text type='secondary' style={{ display: 'block', fontSize: 11, lineHeight: '15px' }}>nguyên liệu có dữ liệu</Typography.Text>
                        </div>
                        <div style={{ borderRadius: 8, background: '#e6f4ff', border: '1px solid #bae0ff', padding: 10 }}>
                            <Typography.Text strong style={{ display: 'block', color: '#0958d9', fontSize: 20, lineHeight: '24px' }}>{nutrition.sourceCount}</Typography.Text>
                            <Typography.Text type='secondary' style={{ display: 'block', fontSize: 11, lineHeight: '15px' }}>nguồn tham chiếu</Typography.Text>
                        </div>
                    </div>
                    <ChartFrame height={218}>
                        <ResponsiveContainer width='100%' height='100%'>
                            <BarChart data={nutritionAverageChartData} layout='vertical' margin={{ top: 6, right: 18, left: 8, bottom: 0 }}>
                                <CartesianGrid stroke={chartGridColor} horizontal={false} />
                                <XAxis type='number' domain={[0, 100]} tick={chartAxisStyle} axisLine={false} tickLine={false} tickFormatter={(value) => `${value}%`} />
                                <YAxis type='category' dataKey='name' tick={chartAxisStyle} axisLine={false} tickLine={false} width={58} />
                                <ChartTooltip contentStyle={chartTooltipStyle} formatter={(value: any, name: any, props: any) => [props?.payload?.label ?? `${value}%`, name === 'percent' ? 'Trung bình' : name]} />
                                <Bar dataKey='percent' name='Trung bình' radius={[0, 8, 8, 0]}>
                                    {nutritionAverageChartData.map(item => <Cell key={item.name} fill={item.fill} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartFrame>
                    <ChartSummaryRow items={nutritionAverageChartData.map(item => ({ label: item.name, value: item.label, color: item.fill }))} />
                </>}
            </SectionCard>

            <SectionCard title='Xếp hạng món theo mục tiêu' subtitle='Các món nổi bật theo đạm, chất xơ và kcal.' helpText={analyticsHelp.nutritionRanking} icon={<FireOutlined />} tone='#d48806'>
                {expensiveMetricsPending ? <EmptyAnalytics text='Đang xếp hạng món theo dinh dưỡng...' /> : nutrition.dishWithNutritionCount === 0 ? <EmptyAnalytics text='Chưa có đủ dữ liệu để xếp hạng dinh dưỡng.' /> : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(230px, 100%), 1fr))', gap: 10, alignItems: 'stretch' }}>
                    {nutrition.topProtein.length > 0 && <NutritionRankGroup title='Giàu đạm' rows={nutrition.topProtein} tone='#1677ff' max={topProteinMax} format={row => DishNutritionHelper.formatGram(row.protein)} barValue={row => row.protein} />}
                    {nutrition.topFiber.length > 0 && <NutritionRankGroup title='Nhiều chất xơ' rows={nutrition.topFiber} tone='#389e0d' max={topFiberMax} format={row => DishNutritionHelper.formatGram(row.fiber)} barValue={row => row.fiber} />}
                    {nutrition.lightCalories.length > 0 && <NutritionRankGroup title='Nhẹ kcal' rows={nutrition.lightCalories} tone='#7436dc' max={lightCalorieMax} format={row => DishNutritionHelper.formatCalories(row.calories)} barValue={row => Math.max(1, lightCalorieMax - row.calories + 1)} />}
                </div>}
            </SectionCard>
        </div>

        <SectionCard title='Món nên nấu để dùng kho' subtitle='Món phù hợp với tồn kho và nguyên liệu cần dùng sớm.' helpText={analyticsHelp.inventorySuggestions} icon={<FireOutlined />} tone='#389e0d'>
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
