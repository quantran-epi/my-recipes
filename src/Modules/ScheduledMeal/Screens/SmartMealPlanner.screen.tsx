import { AppstoreOutlined, BarChartOutlined, CalendarOutlined, CheckCircleOutlined, ClockCircleOutlined, DollarCircleOutlined, ExclamationCircleOutlined, EyeOutlined, FilterOutlined, MinusOutlined, MoreOutlined, PlayCircleOutlined, PlusOutlined, QuestionCircleOutlined, ShoppingCartOutlined, SlidersOutlined, StopOutlined, TeamOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { DateHelpers } from '@common/Helpers/DateHelper';
import { DishDurationHelper } from '@common/Helpers/DishDurationHelper';
import { DishServingHelper } from '@common/Helpers/DishServingHelper';
import { getHouseholdHealthStatusMeta } from '@common/Helpers/HouseholdHealthHelper';
import type { HouseholdDishSuitability } from '@common/Helpers/HouseholdSuitabilityHelper';
import { IngredientPriceHelper } from '@common/Helpers/IngredientPriceHelper';
import { NutritionGoalHelper, type NutritionGoalMatch } from '@common/Helpers/NutritionGoalHelper';
import { Button } from '@components/Button';
import { Collapse } from '@components/Collapse';
import { Dropdown } from '@components/Dropdown';
import { createSelectedOptionsDropdownRender, renderResponsiveTagPlaceholder } from '@components/Form/Select';
import { Image } from '@components/Image';
import { Box } from '@components/Layout/Box';
import { Stack } from '@components/Layout/Stack';
import { useMessage } from '@components/Message';
import { Modal } from '@components/Modal';
import { useModal } from '@components/Modal/ModalProvider';
import { Tag } from '@components/Tag';
import { Typography } from '@components/Typography';
import { useScreenTitle } from '@hooks';
import { DishImageWidget } from '@modules/Dishes/Screens/DishesManageIngredient/DishImage.widget';
import { ShoppingListAddWidget } from '@modules/ShoppingList/Screens/ShoppingListAdd.widget';
import { SmartPlannerEngine, type SmartPlannerCookNowCategory, type SmartPlannerDishRecommendation, type SmartPlannerMealSlot, type SmartPlannerMealSlotDishRanges, type SmartPlannerMealSlotTagRequirements, type SmartPlannerPlanResult, type SmartPlannerPlanSummary, type SmartPlannerPriority } from '@modules/ScheduledMeal/Helpers/SmartPlannerEngine';
import { Dishes } from '@store/Models/Dishes';
import { IngredientUnit } from '@store/Models/Ingredient';
import { ScheduledMeal } from '@store/Models/ScheduledMeal';
import { rememberScheduledMealName } from '@store/Reducers/AppContextReducer';
import { startCooking } from '@store/Reducers/CookingSessionReducer';
import { addScheduledMeal, editScheduledMeal } from '@store/Reducers/ScheduledMealReducer';
import { selectCookingSessions, selectDishes, selectDishesById, selectDishFeedback, selectHouseholdHealthProfiles, selectHouseholdMembers, selectIngredients, selectIngredientsById, selectInventory, selectInventoryHealthConfig, selectNutritionGoals, selectScheduledMeals, selectSelectedHouseholdMemberIds } from '@store/Selectors';
import { DatePicker, Empty, InputNumber, Select, Segmented, Spin, Switch } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { nanoid } from 'nanoid';
import React, { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import DietPlanIcon from '../../../../assets/icons/diet-plan.png';

// Static "how this criterion is calculated" help text, keyed by score detail
// label. Shown on demand behind a ? toggle, alongside the dynamic per-dish
// description the engine builds for each suggestion.
const SCORE_METHODOLOGY: Record<string, string> = {
    'Độ hợp bữa ăn': 'So khớp món với bữa đang lập. Bữa sáng ưu tiên tag Ăn sáng hoặc món nấu nhanh; bữa trưa và tối ưu tiên món chính, canh hoặc món dễ ghép bữa.',
    'Thời gian nấu': 'Món càng gần giới hạn thời gian người dùng chọn càng được ưu tiên. Thiếu thời gian nấu làm giảm độ tin cậy.',
    'Tồn kho và đồ sắp hết hạn': 'Tính nguyên liệu đang có, nguyên liệu luôn có và phần cần mua thêm. Nguyên liệu sắp hết hạn được cộng điểm khi bật ưu tiên dùng tồn kho.',
    'Ngân sách': 'So chi phí với ngân sách đang chọn. Khi bật tính theo tủ lạnh, planner dùng phần cần mua thêm sau khi trừ tồn kho.',
    'Mục tiêu dinh dưỡng': 'So sánh dinh dưỡng mỗi phần ăn với mục tiêu đã chọn. Thiếu dữ liệu dinh dưỡng làm giảm độ tin cậy.',
    'Độ hợp nhà mình': 'Tính hồ sơ các thành viên đang chọn và phản hồi nấu ăn đã lưu. Dị ứng và nguyên liệu chặn cứng được lọc trước khi chấm điểm.',
    'Đa dạng thực đơn': 'Dựa trên lịch nấu/lịch ăn gần đây và các món đã chọn trong lần lập hiện tại. Chế độ nhiều đa dạng trừ điểm lặp mạnh hơn.',
};

type PlannerScope = 'cook_now' | 'day' | 'week';
type MealSlot = 'breakfast' | 'lunch' | 'dinner';

type PlannerScoreDetail = {
    label: string;
    value: string;
    impact: number;
    description: string;
}

type ShoppingPreviewRow = {
    ingredientId: string;
    name: string;
    amount: number;
    unit: IngredientUnit;
    costLabel?: string;
    costAverage?: number;
}

type PlannedDish = {
    dish: Dishes;
    score: number;
    reasons: string[];
    warnings?: string[];
    costLabel?: string;
    costAverage?: number;
    shoppingCostLabel?: string;
    shoppingCostAverage?: number;
    missingIngredientCount?: number;
    missingRequiredIngredientCount?: number;
    missingRows?: ShoppingPreviewRow[];
    missingIngredientRows?: ShoppingPreviewRow[];
    dayCostLabel?: string;
    dayCostAverage?: number;
    dayShoppingCostLabel?: string;
    dayShoppingCostAverage?: number;
    dayBudget?: number;
    nutritionLabel?: string;
    nutritionGoalName?: string;
    nutritionMatch?: NutritionGoalMatch;
    suitabilityScore?: number;
    suitability?: HouseholdDishSuitability;
    totalMinutes?: number;
    urgentIngredientCount?: number;
    scoreDetails: PlannerScoreDetail[];
}

type PlannedDayItemsBySlot = Record<MealSlot, PlannedDish[]>;

type PlannedDayAlternative = {
    id: string;
    label: string;
    itemsBySlot?: PlannedDayItemsBySlot;
    breakfast?: PlannedDish;
    lunch?: PlannedDish;
    dinner?: PlannedDish;
    totalScore: number;
    totalCostAverage: number;
    totalCostLabel: string;
    shoppingCostAverage: number;
    shoppingCostLabel: string;
    nutritionScore?: number;
    suitabilityScore?: number;
    reasons: string[];
    warnings?: string[];
    missingRows: ShoppingPreviewRow[];
}

type PlannerDetailSelection = {
    item: PlannedDish;
    slot: MealSlot;
    date: Dayjs;
}

type PlannedDay = {
    date: Dayjs;
    alternatives?: PlannedDayAlternative[];
    selectedAlternativeId?: string;
    itemsBySlot?: PlannedDayItemsBySlot;
    breakfast?: PlannedDish;
    lunch?: PlannedDish;
    dinner?: PlannedDish;
}

type ShoppingPreviewSummary = {
    totalCostAverage: number;
    totalCostLabel: string;
    shoppingCostAverage: number;
    shoppingCostLabel: string;
    rows: ShoppingPreviewRow[];
}

type CookNowScheduleSelection = {
    item: SmartPlannerDishRecommendation;
    date: Dayjs;
    slot: MealSlot;
}

const mealSlotMeta: Record<MealSlot, { label: string; tone: string; background: string; border: string }> = {
    breakfast: { label: 'Sáng', tone: '#d48806', background: '#fffbe6', border: '#ffe58f' },
    lunch: { label: 'Trưa', tone: '#d46b08', background: '#fff7e6', border: '#ffd591' },
    dinner: { label: 'Tối', tone: '#531dab', background: '#f9f0ff', border: '#efdbff' },
};

const mealSlots: MealSlot[] = ['breakfast', 'lunch', 'dinner'];
const MEAL_SLOT_RANGE_MAX = 6;

const DEFAULT_MEAL_SLOT_DISH_RANGES: SmartPlannerMealSlotDishRanges = {
    breakfast: { min: 1, max: 1 },
    lunch: { min: 1, max: 1 },
    dinner: { min: 1, max: 1 },
};

const DEFAULT_MEAL_SLOT_TAG_REQUIREMENTS: SmartPlannerMealSlotTagRequirements = {
    breakfast: [],
    lunch: [],
    dinner: [],
};

const collectDishTagOptions = (dishes: Dishes[]): string[] => {
    const counts = new Map<string, number>();
    dishes.forEach(dish => {
        (dish.tags ?? []).forEach(tag => {
            const trimmed = tag.trim();
            if (!trimmed) return;
            counts.set(trimmed, (counts.get(trimmed) ?? 0) + 1);
        });
    });
    return Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'vi'))
        .map(([tag]) => tag);
};

const pageCss = `
.smart-planner-page {
    width: min(1180px, calc(100vw - 24px));
    margin: 0 auto;
    padding: 0 0 96px;
}
.smart-planner-hero {
    border-radius: 8px;
    border: 1px solid rgba(19,168,168,0.14);
    background: linear-gradient(135deg, #ffffff 0%, #e6fffb 44%, #f6ffed 100%);
    box-shadow: 0 12px 28px rgba(15,23,42,0.08);
    padding: 14px;
    margin-bottom: 12px;
}
.smart-planner-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;
}
.smart-planner-controls {
    display: flex;
    flex-direction: column;
    gap: 12px;
}
.smart-planner-section {
    border: 1px solid rgba(15,23,42,0.07);
    border-radius: 10px;
    background: #fff;
    padding: 12px;
}
.smart-planner-section-title {
    display: flex;
    align-items: center;
    gap: 7px;
    color: #0f172a;
    font-size: 13px;
    font-weight: 700;
    margin-bottom: 10px;
}
.smart-planner-section-title .anticon {
    color: #13a8a8;
}
.smart-planner-primary {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
    gap: 10px;
    align-items: end;
}
.smart-planner-presets {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(134px, 1fr));
    gap: 8px;
}
.smart-planner-preset {
    text-align: left;
    border: 1px solid rgba(15,23,42,0.1);
    border-radius: 10px;
    background: #fff;
    padding: 9px 10px;
    cursor: pointer;
    transition: border-color .15s ease, background .15s ease, box-shadow .15s ease;
}
.smart-planner-preset:hover {
    border-color: #87e8de;
}
.smart-planner-preset.is-active {
    border-color: #13a8a8;
    background: #e6fffb;
    box-shadow: inset 0 0 0 1px #13a8a8;
}
.smart-planner-preset-name {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #0f172a;
    font-size: 13px;
    font-weight: 600;
}
.smart-planner-preset-name .anticon {
    color: #13a8a8;
}
.smart-planner-preset-hint {
    display: block;
    color: #64748b;
    font-size: 11px;
    line-height: 15px;
    margin-top: 3px;
}
.smart-planner-advanced.ant-collapse {
    border: 1px solid rgba(15,23,42,0.08);
    border-radius: 10px;
    background: #fbfdfd;
    overflow: hidden;
}
.smart-planner-advanced .ant-collapse-item {
    border-bottom: none;
}
.smart-planner-advanced > .ant-collapse-item > .ant-collapse-header {
    padding: 11px 14px;
    align-items: center;
    transition: background .15s ease;
}
.smart-planner-advanced > .ant-collapse-item > .ant-collapse-header:hover {
    background: #f1f5f9;
}
.smart-planner-advanced > .ant-collapse-item-active > .ant-collapse-header {
    background: #ecfdf5;
    box-shadow: inset 0 -1px 0 rgba(15,23,42,0.06);
}
.smart-planner-advanced .ant-collapse-expand-icon {
    color: #13a8a8;
}
.smart-planner-advanced > .ant-collapse-item > .ant-collapse-content > .ant-collapse-content-box {
    padding: 14px;
}
.smart-planner-advanced-head {
    display: flex;
    flex-direction: column;
    gap: 2px;
}
.smart-planner-advanced-title {
    display: flex;
    align-items: center;
    gap: 7px;
    color: #0f172a;
    font-size: 13px;
    font-weight: 700;
}
.smart-planner-advanced-title .anticon {
    color: #13a8a8;
}
.smart-planner-advanced-sub {
    color: #64748b;
    font-size: 11px;
    line-height: 15px;
}
.smart-planner-field-help ul {
    margin: 6px 0 0;
    padding-left: 18px;
}
.smart-planner-field-help li + li {
    margin-top: 3px;
}
.smart-planner-adv-group + .smart-planner-adv-group {
    margin-top: 14px;
    padding-top: 14px;
    border-top: 1px dashed rgba(15,23,42,0.1);
}
.smart-planner-adv-group-title {
    color: #475569;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .04em;
    margin: 0 0 9px;
}
.smart-planner-adv-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
    gap: 10px;
    align-items: end;
}
.smart-planner-toggle-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
}
.smart-planner-field-label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 6px;
}
.smart-planner-field-help {
    border: 1px solid rgba(19,168,168,0.12);
    border-radius: 8px;
    background: #f6ffed;
    color: #52616b;
    font-size: 12px;
    line-height: 17px;
    padding: 7px 9px;
    margin: 7px 0 0;
}
.smart-planner-panel {
    border-radius: 8px;
    border: 1px solid rgba(15,23,42,0.08);
    background: #fff;
    box-shadow: 0 10px 24px rgba(15,23,42,0.06);
    padding: 12px;
}
.smart-planner-page .ant-space-vertical {
    width: 100%;
}
.smart-planner-page .ant-space-vertical > .ant-space-item {
    width: 100%;
}
.smart-planner-title {
    display: block;
    color: #111827;
    font-size: 24px;
    line-height: 30px;
    overflow-wrap: anywhere;
}
.smart-planner-summary {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid rgba(19,168,168,0.18);
    border-radius: 12px;
    background: linear-gradient(180deg, #f0fdfa 0%, #ffffff 100%);
    padding: 14px;
}
.smart-planner-detail-modal {
    width: 100%;
}
.smart-planner-detail-modal > .ant-space-item {
    width: 100%;
}
.smart-planner-detail-section {
    width: 100%;
    box-sizing: border-box;
}
.smart-planner-ranking-head {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
    padding-bottom: 9px;
    border-bottom: 2px solid #13a8a8;
}
.smart-planner-ranking-head .anticon {
    color: #13a8a8;
    font-size: 16px;
}
.smart-planner-ranking-title {
    color: #0f172a;
    font-size: 15px;
    font-weight: 800;
    letter-spacing: .01em;
    margin-right: auto;
}
.smart-planner-preview .ant-space-vertical {
    width: 100%;
}
.smart-planner-preview .ant-space-vertical > .ant-space-item {
    width: 100%;
}
.smart-planner-summary-head {
    display: flex;
    align-items: center;
    gap: 12px;
}
.smart-planner-summary-headtext {
    min-width: 0;
    flex: 1 1 auto;
}
.smart-planner-summary-help {
    border: 1px solid rgba(19,168,168,0.16);
    border-radius: 8px;
    background: #f0fdfa;
    color: #475569;
    font-size: 12px;
    line-height: 17px;
    padding: 9px 11px;
    margin-top: 11px;
}
.smart-planner-summary-help dt {
    color: #0f172a;
    font-weight: 700;
}
.smart-planner-summary-help dd {
    margin: 0 0 7px;
}
.smart-planner-summary-help dd:last-child {
    margin-bottom: 0;
}
.smart-planner-summary-score {
    color: #0f766e;
    font-size: 30px;
    font-weight: 800;
    line-height: 1;
}
.smart-planner-summary-verdict {
    color: #0f172a;
    font-size: 15px;
    font-weight: 700;
}
.smart-planner-summary-caption {
    color: #64748b;
    font-size: 11px;
    line-height: 14px;
    margin-top: 2px;
}
.smart-planner-summary-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(96px, 1fr));
    gap: 10px;
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid rgba(15,23,42,0.07);
}
.smart-planner-stat-label {
    display: block;
    color: #64748b;
    font-size: 11px;
    line-height: 14px;
}
.smart-planner-stat-value {
    display: block;
    color: #0f172a;
    font-size: 15px;
    font-weight: 700;
    line-height: 20px;
    margin-top: 2px;
}
.smart-planner-summary-warn {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    color: #b45309;
    font-size: 12px;
    line-height: 17px;
    margin-top: 11px;
    padding-top: 11px;
    border-top: 1px solid rgba(180,83,9,0.16);
}
.smart-planner-summary-warn .anticon {
    margin-top: 2px;
}
.smart-planner-result-card {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid rgba(15,23,42,0.1);
    border-radius: 10px;
    background: #fff;
    padding: 11px;
    min-width: 0;
}
.smart-planner-result-main {
    display: grid;
    grid-template-columns: 48px minmax(0, 1fr) auto;
    gap: 10px;
    align-items: start;
}
.smart-planner-result-name {
    color: #111827;
    font-size: 14px;
    font-weight: 700;
    line-height: 19px;
    overflow-wrap: anywhere;
}
.smart-planner-result-facts {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 8px;
    color: #475569;
    font-size: 12px;
    line-height: 16px;
    margin-top: 4px;
}
.smart-planner-result-facts .anticon {
    color: #0f766e;
    margin-right: 3px;
}
.smart-planner-result-reason {
    display: block;
    color: #64748b;
    font-size: 11px;
    line-height: 16px;
    margin-top: 5px;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
}
.smart-planner-result-actions {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 10px;
}
.smart-planner-result-actions .smart-planner-result-primary {
    flex: 1 1 auto;
}
.smart-planner-result-score {
    display: inline-flex;
    align-items: center;
    gap: 4px;
}
@media (max-width: 560px) {
    .smart-planner-title {
        font-size: 21px;
        line-height: 27px;
    }
}
`;

const plannerModeOptions: Array<{ value: PlannerScope; label: string }> = [
    { value: 'cook_now', label: 'Nấu ngay' },
    { value: 'day', label: 'Một ngày' },
    { value: 'week', label: 'Một tuần' },
];

const cookNowSlotOptions: Array<{ value: SmartPlannerMealSlot; label: string }> = [
    { value: 'any', label: 'Bất kỳ' },
    { value: 'breakfast', label: 'Sáng' },
    { value: 'lunch', label: 'Trưa' },
    { value: 'dinner', label: 'Tối' },
    { value: 'snack', label: 'Ăn nhẹ' },
];

const priorityOptions: Array<{ value: SmartPlannerPriority; label: string; icon: React.ReactNode; hint: string }> = [
    { value: 'budget', label: 'Tiết kiệm', icon: <DollarCircleOutlined />, hint: 'Mua ít nhất hoặc chi phí thấp' },
    { value: 'time', label: 'Nhanh', icon: <ClockCircleOutlined />, hint: 'Ưu tiên món nấu nhanh' },
    { value: 'nutrition', label: 'Lành mạnh', icon: <BarChartOutlined />, hint: 'Theo mục tiêu dinh dưỡng thành viên' },
    { value: 'household', label: 'Hợp khẩu vị nhà', icon: <TeamOutlined />, hint: 'Ưu tiên khẩu vị cả nhà' },
    { value: 'inventory', label: 'Dùng đồ sẵn có', icon: <ShoppingCartOutlined />, hint: 'Có sẵn và gần hết hạn trước' },
    { value: 'variety', label: 'Đa dạng món', icon: <ThunderboltOutlined />, hint: 'Ít lặp trong ngày hoặc tuần' },
];

const formatImpact = (value: number): string => {
    const rounded = Math.round(value);
    if (rounded > 0) return `+${rounded} điểm`;
    if (rounded < 0) return `${rounded} điểm`;
    return '0 điểm';
};

const getImpactColor = (value: number): string => {
    if (value > 0) return 'green';
    if (value < 0) return 'volcano';
    return 'default';
};

const getScoreColor = (score: number): string => score >= 76 ? 'green' : score >= 58 ? 'blue' : 'orange';

const getScoreVerdict = (score: number): string => score >= 76 ? 'Thực đơn tốt' : score >= 58 ? 'Thực đơn ổn' : 'Cần cân nhắc';

const getConfidenceVerdict = (value: number): string => value >= 76 ? `Cao (${Math.round(value)}%)` : value >= 50 ? `Vừa (${Math.round(value)}%)` : `Thấp (${Math.round(value)}%)`;

const formatPercent = (value: number): string => `${Math.round(value)}%`;

const formatRatioPercent = (value: number): string => `${Math.round(value * 100)}%`;

const parseRouteDate = (value: string | null): Dayjs => {
    const parsed = value ? dayjs(value) : dayjs();
    return (parsed.isValid() ? parsed : dayjs()).startOf('day');
};

const aggregateShoppingRows = (rows: ShoppingPreviewRow[]): ShoppingPreviewRow[] => {
    const grouped = new Map<string, ShoppingPreviewRow>();
    rows.forEach(row => {
        const key = `${row.ingredientId}-${row.unit}`;
        const current = grouped.get(key);
        if (!current) {
            grouped.set(key, { ...row });
            return;
        }

        current.amount = Math.round((current.amount + row.amount) * 10) / 10;
        current.costAverage = (current.costAverage ?? 0) + (row.costAverage ?? 0);
        current.costLabel = current.costAverage ? IngredientPriceHelper.formatCurrency(current.costAverage) : current.costLabel;
    });

    return Array.from(grouped.values()).sort((a, b) => a.name.localeCompare(b.name));
};

const createEmptyPlannedDayItemsBySlot = (): PlannedDayItemsBySlot => ({ breakfast: [], lunch: [], dinner: [] });

const normalizePlannedDayItemsBySlot = (source?: Partial<Record<MealSlot, PlannedDish | PlannedDish[]>>): PlannedDayItemsBySlot => mealSlots.reduce((result, slot) => {
    const raw = source?.[slot];
    result[slot] = Array.isArray(raw) ? raw.filter(Boolean) : raw ? [raw] : [];
    return result;
}, createEmptyPlannedDayItemsBySlot());

const getAlternativeItemsBySlot = (alternative: PlannedDayAlternative): PlannedDayItemsBySlot => {
    if (alternative.itemsBySlot) return normalizePlannedDayItemsBySlot(alternative.itemsBySlot);
    return normalizePlannedDayItemsBySlot({ breakfast: alternative.breakfast, lunch: alternative.lunch, dinner: alternative.dinner });
};

const getAlternativeItems = (alternative: PlannedDayAlternative): PlannedDish[] => mealSlots.flatMap(slot => getAlternativeItemsBySlot(alternative)[slot]);

const getDayItemsBySlot = (day: PlannedDay): PlannedDayItemsBySlot => {
    if (day.itemsBySlot) return normalizePlannedDayItemsBySlot(day.itemsBySlot);
    return normalizePlannedDayItemsBySlot({ breakfast: day.breakfast, lunch: day.lunch, dinner: day.dinner });
};

const getMealSlotRangeError = (ranges: SmartPlannerMealSlotDishRanges): string | null => {
    const hasAnyDish = mealSlots.some(slot => ranges[slot].max > 0);
    if (!hasAnyDish) return 'Cần chọn ít nhất một bữa có số món lớn hơn 0.';
    const invalidSlot = mealSlots.find(slot => ranges[slot].min < 0 || ranges[slot].max < ranges[slot].min || ranges[slot].max > MEAL_SLOT_RANGE_MAX);
    if (invalidSlot) return `${mealSlotMeta[invalidSlot].label} cần có min >= 0, max >= min và max không quá ${MEAL_SLOT_RANGE_MAX}.`;
    return null;
};

const collectAllSteps = (dish: Dishes, dishesById: Map<string, Dishes>, visited = new Set<string>()): string[] => {
    if (visited.has(dish.id)) return [];
    visited.add(dish.id);
    const fromIncluded = (dish.includeDishes ?? []).flatMap(id => {
        const included = dishesById.get(id);
        return included ? collectAllSteps(included, dishesById, visited) : [];
    });
    return [...fromIncluded, ...(dish.steps ?? []).map(step => step.content)];
};

export const SmartMealPlannerScreen: React.FC = () => {
    useScreenTitle({ value: 'Lập thực đơn', deps: [] });
    const dispatch = useDispatch();
    const message = useMessage();
    const modal = useModal();
    const [searchParams] = useSearchParams();
    const dishes = useSelector(selectDishes);
    const ingredients = useSelector(selectIngredients);
    const ingredientsById = useSelector(selectIngredientsById);
    const inventoryItems = useSelector(selectInventory);
    const inventoryConfig = useSelector(selectInventoryHealthConfig);
    const members = useSelector(selectHouseholdMembers);
    const healthProfiles = useSelector(selectHouseholdHealthProfiles);
    const selectedHouseholdMemberIds = useSelector(selectSelectedHouseholdMemberIds);
    const nutritionGoals = useSelector(selectNutritionGoals);
    const scheduledMeals = useSelector(selectScheduledMeals);
    const cookingSessions = useSelector(selectCookingSessions);
    const dishFeedback = useSelector(selectDishFeedback);
    const dishesById = useSelector(selectDishesById);
    const [scope, setScope] = useState<PlannerScope>('cook_now');
    const routeDateValue = searchParams.get('date');
    const [startDate, setStartDate] = useState<Dayjs>(() => parseRouteDate(routeDateValue));
    const [dailyBudget, setDailyBudget] = useState<number>(150000);
    const [weeklyBudget, setWeeklyBudget] = useState<number | undefined>();
    const [advancedEnabled, setAdvancedEnabled] = useState(false);
    const [inventoryAwareBudget, setInventoryAwareBudget] = useState(true);
    const [maxExtraSpend, setMaxExtraSpend] = useState<number | undefined>(100000);
    const [cookNowMealSlot, setCookNowMealSlot] = useState<SmartPlannerMealSlot>('any');
    const [avoidDishIds, setAvoidDishIds] = useState<string[]>([]);
    const [avoidIngredientIds, setAvoidIngredientIds] = useState<string[]>([]);
    const [mealSlotDishRanges, setMealSlotDishRanges] = useState<SmartPlannerMealSlotDishRanges>(DEFAULT_MEAL_SLOT_DISH_RANGES);
    const [mealSlotTagRequirements, setMealSlotTagRequirements] = useState<SmartPlannerMealSlotTagRequirements>(DEFAULT_MEAL_SLOT_TAG_REQUIREMENTS);
    const [mealRangeModalOpen, setMealRangeModalOpen] = useState(false);
    const [pendingShuffleAlternatives, setPendingShuffleAlternatives] = useState(false);
    const [memberIds, setMemberIds] = useState<string[]>(() => selectedHouseholdMemberIds);
    const [priorities, setPriorities] = useState<SmartPlannerPriority[]>([]);
    const [plannedDays, setPlannedDays] = useState<PlannedDay[]>([]);
    const [rankedRecommendations, setRankedRecommendations] = useState<SmartPlannerDishRecommendation[]>([]);
    const [planSummary, setPlanSummary] = useState<SmartPlannerPlanSummary>();
    const [dismissedDishIds, setDismissedDishIds] = useState<string[]>([]);
    const [hasSuggested, setHasSuggested] = useState(false);
    const [isSuggesting, setIsSuggesting] = useState(false);
    const [openHelpKey, setOpenHelpKey] = useState<string>();
    const [detailSelection, setDetailSelection] = useState<PlannerDetailSelection>();
    const [shoppingPreviewOpen, setShoppingPreviewOpen] = useState(false);
    const [scheduleSelection, setScheduleSelection] = useState<CookNowScheduleSelection>();
    const [shoppingRecommendation, setShoppingRecommendation] = useState<SmartPlannerDishRecommendation>();

    const selectedMembers = useMemo(() => {
        const ids = memberIds.length > 0 ? new Set(memberIds) : new Set(selectedHouseholdMemberIds);
        const selected = members.filter(member => ids.has(member.id));
        return selected.length > 0 ? selected : members;
    }, [memberIds, members, selectedHouseholdMemberIds]);

    const selectedMemberHealth = useMemo(() => selectedMembers.map(member => ({
        member,
        profile: healthProfiles[member.id],
        meta: getHouseholdHealthStatusMeta(healthProfiles[member.id]?.status),
    })), [healthProfiles, selectedMembers]);

    const selectedNutritionGoalId = useMemo(() => selectedMembers.find(member => Boolean(member.nutritionGoalId))?.nutritionGoalId ?? nutritionGoals[0]?.id, [nutritionGoals, selectedMembers]);
    const memberOptions = useMemo(() => members.map(member => ({ value: member.id, label: member.name })), [members]);
    const dishOptions = useMemo(() => dishes.map(dish => ({ value: dish.id, label: dish.name })), [dishes]);
    const ingredientOptions = useMemo(() => ingredients.map(ingredient => ({ value: ingredient.id, label: ingredient.name })), [ingredients]);
    const tagRequirementOptions = useMemo(() => collectDishTagOptions(dishes), [dishes]);
    const targetServings = Math.max(1, Math.round(selectedMembers.reduce((sum, member) => sum + (member.portionPreference ?? 1), 0) || 2));

    const _clearSuggestions = React.useCallback(() => {
        setPlannedDays([]);
        setRankedRecommendations([]);
        setPlanSummary(undefined);
        setDismissedDishIds([]);
        setHasSuggested(false);
        setDetailSelection(undefined);
        setShoppingPreviewOpen(false);
        setScheduleSelection(undefined);
        setShoppingRecommendation(undefined);
    }, []);

    React.useEffect(() => {
        const routeDate = parseRouteDate(routeDateValue);
        setStartDate(current => {
            if (current.isSame(routeDate, 'day')) return current;
            _clearSuggestions();
            return routeDate;
        });
    }, [routeDateValue, _clearSuggestions]);

    const plannedDishCount = plannedDays.reduce((sum, day) => sum + mealSlots.reduce((slotSum, slot) => slotSum + getDayItemsBySlot(day)[slot].length, 0), 0);
    const scheduleSelectionExistingMeals = useMemo(() => {
        if (!scheduleSelection) return [];
        return scheduledMeals.filter(item => dayjs(item.plannedDate).isSame(scheduleSelection.date, 'day'));
    }, [scheduleSelection, scheduledMeals]);
    const selectedAlternatives = useMemo(() => plannedDays
        .map(day => day.alternatives?.find(alternative => alternative.id === day.selectedAlternativeId) ?? day.alternatives?.[0])
        .filter((alternative): alternative is PlannedDayAlternative => Boolean(alternative)), [plannedDays]);
    const shoppingPreviewSummary = useMemo<ShoppingPreviewSummary>(() => {
        const totalCostAverage = selectedAlternatives.reduce((sum, alternative) => sum + alternative.totalCostAverage, 0);
        const shoppingCostAverage = selectedAlternatives.reduce((sum, alternative) => sum + alternative.shoppingCostAverage, 0);
        const rows = aggregateShoppingRows(selectedAlternatives.flatMap(alternative => alternative.missingRows));
        return {
            totalCostAverage,
            totalCostLabel: IngredientPriceHelper.formatCurrency(totalCostAverage),
            shoppingCostAverage,
            shoppingCostLabel: IngredientPriceHelper.formatCurrency(shoppingCostAverage),
            rows,
        };
    }, [selectedAlternatives]);

    const _buildSmartPlannerResult = React.useCallback((shuffleAlternatives = false): SmartPlannerPlanResult => SmartPlannerEngine.buildSmartPlannerResult({
        scope,
        startDate,
        memberIds: selectedMembers.map(member => member.id),
        mealSlots: scope === 'cook_now' ? [cookNowMealSlot] : ['breakfast', 'lunch', 'dinner'],
        dailyBudget: advancedEnabled ? dailyBudget : undefined,
        weeklyBudget: advancedEnabled ? weeklyBudget : undefined,
        maxExtraSpend: advancedEnabled ? maxExtraSpend : undefined,
        maxCookMinutes: undefined,
        strictTime: false,
        shoppingMode: 'normal',
        nutritionGoalId: selectedNutritionGoalId,
        priorities,
        requiredTags: [],
        avoidedDishIds: advancedEnabled ? avoidDishIds : [],
        avoidedIngredientIds: advancedEnabled ? avoidIngredientIds : [],
        requiredExpiringIngredientIds: [],
        inventoryAwareBudget: advancedEnabled ? inventoryAwareBudget : true,
        advancedEnabled,
        mealSlotDishRanges,
        mealSlotTagRequirements,
        shuffleAlternatives,
        dishes,
        ingredients,
        ingredientsById,
        inventoryItems,
        inventoryConfig,
        members: selectedMembers,
        nutritionGoals,
        scheduledMeals,
        cookingSessions,
        dishFeedback,
    }), [advancedEnabled, avoidDishIds, avoidIngredientIds, cookNowMealSlot, cookingSessions, dishFeedback, dailyBudget, dishes, ingredients, ingredientsById, inventoryAwareBudget, inventoryConfig, inventoryItems, maxExtraSpend, mealSlotDishRanges, mealSlotTagRequirements, nutritionGoals, priorities, scheduledMeals, scope, selectedMembers, selectedNutritionGoalId, startDate, weeklyBudget]);

    const visibleCookNowRecommendations = useMemo(() => {
        const dismissed = new Set(dismissedDishIds);
        return rankedRecommendations.filter(item => !dismissed.has(item.dish.id));
    }, [dismissedDishIds, rankedRecommendations]);

    const visibleCookNowCategories = useMemo(() => SmartPlannerEngine.buildCookNowCategories(visibleCookNowRecommendations), [visibleCookNowRecommendations]);

    const _runSuggestion = (shuffleAlternatives = false) => {
        setIsSuggesting(true);
        setHasSuggested(true);
        setShoppingPreviewOpen(false);
        setScheduleSelection(undefined);
        setShoppingRecommendation(undefined);
        window.setTimeout(() => {
            const result = _buildSmartPlannerResult(shuffleAlternatives);
            setPlanSummary(result.summary);
            if (scope === 'cook_now') {
                setPlannedDays([]);
                setRankedRecommendations(result.rankedRecommendations ?? []);
            } else {
                setRankedRecommendations([]);
                setPlannedDays((result.plannedDays ?? []) as PlannedDay[]);
            }
            setIsSuggesting(false);
        }, 250);
    };

    const _suggestMeals = (shuffleAlternatives = false) => {
        if (scope !== 'cook_now' && (!shuffleAlternatives || !hasSuggested)) {
            setPendingShuffleAlternatives(shuffleAlternatives);
            setMealRangeModalOpen(true);
            return;
        }

        _runSuggestion(shuffleAlternatives);
    };

    const _updateMealSlotDishRange = (slot: MealSlot, key: 'min' | 'max', value: number | null) => {
        const nextValue = Math.max(0, Math.min(MEAL_SLOT_RANGE_MAX, Math.round(Number(value ?? 0))));
        setMealSlotDishRanges(current => {
            const currentRange = current[slot];
            const nextRange = key === 'min'
                ? { min: nextValue, max: Math.max(nextValue, currentRange.max) }
                : { min: Math.min(currentRange.min, nextValue), max: nextValue };
            return { ...current, [slot]: nextRange };
        });
        _clearSuggestions();
    };

    const _stepMealSlotDishRange = (slot: MealSlot, key: 'min' | 'max', delta: number) => {
        const current = mealSlotDishRanges[slot][key];
        _updateMealSlotDishRange(slot, key, current + delta);
    };

    const _setSlotTagRequirement = (slot: MealSlot, tag: string, min: number) => {
        const safeMin = Math.max(0, Math.min(MEAL_SLOT_RANGE_MAX, Math.round(Number(min))));
        setMealSlotTagRequirements(current => {
            const list = current[slot] ?? [];
            const existing = list.find(item => item.tag === tag);
            const nextList = safeMin <= 0
                ? list.filter(item => item.tag !== tag)
                : existing
                    ? list.map(item => item.tag === tag ? { ...item, min: safeMin } : item)
                    : [...list, { tag, min: safeMin }];
            return { ...current, [slot]: nextList };
        });
        _clearSuggestions();
    };

    const _stepSlotTagRequirement = (slot: MealSlot, tag: string, delta: number) => {
        const list = mealSlotTagRequirements[slot] ?? [];
        const current = list.find(item => item.tag === tag)?.min ?? 0;
        _setSlotTagRequirement(slot, tag, current + delta);
    };

    const _confirmMealRangeModal = () => {
        const error = getMealSlotRangeError(mealSlotDishRanges);
        if (error) {
            message.error(error);
            return;
        }

        setMealRangeModalOpen(false);
        _runSuggestion(pendingShuffleAlternatives);
    };

    const _onPriorityToggle = (value: SmartPlannerPriority) => {
        setPriorities(current => current.includes(value) ? current.filter(item => item !== value) : [...current, value]);
        _clearSuggestions();
    };

    const _selectAlternative = (date: Dayjs, alternativeId: string) => {
        setPlannedDays(days => days.map(day => {
            if (!day.date.isSame(date, 'day')) return day;
            const selected = day.alternatives?.find(alternative => alternative.id === alternativeId);
            if (!selected) return day;
            const itemsBySlot = getAlternativeItemsBySlot(selected);
            return {
                ...day,
                selectedAlternativeId: alternativeId,
                itemsBySlot,
                breakfast: itemsBySlot.breakfast[0],
                lunch: itemsBySlot.lunch[0],
                dinner: itemsBySlot.dinner[0],
            };
        }));
    };

    const _appendToScheduledMeal = (date: Dayjs, itemsBySlot: Partial<Record<MealSlot, Array<{ dish: Dishes }>>>): 'created' | 'updated' | 'empty' => {
        const dishIds = mealSlots.flatMap(slot => itemsBySlot[slot]?.map(item => item.dish.id) ?? []);
        if (dishIds.length === 0) return 'empty';

        const dishServings = dishIds.reduce((result, dishId) => ({ ...result, [dishId]: targetServings }), {} as Record<string, number>);
        const existing = scheduledMeals.find(meal => dayjs(meal.plannedDate).isSame(date, 'day'));
        if (existing) {
            const nextMeals = mealSlots.reduce((result, slot) => {
                const current = existing.meals?.[slot] ?? [];
                const nextDishIds = itemsBySlot[slot]?.map(item => item.dish.id) ?? [];
                result[slot] = nextDishIds.length > 0 ? Array.from(new Set([...current, ...nextDishIds])) : current;
                return result;
            }, { breakfast: [], lunch: [], dinner: [] } as ScheduledMeal['meals']);
            dispatch(editScheduledMeal({
                ...existing,
                meals: nextMeals,
                dishServings: {
                    ...(existing.dishServings ?? {}),
                    ...dishServings,
                },
            }));
            return 'updated';
        }

        const meals: ScheduledMeal['meals'] = {
            breakfast: itemsBySlot.breakfast?.map(item => item.dish.id) ?? [],
            lunch: itemsBySlot.lunch?.map(item => item.dish.id) ?? [],
            dinner: itemsBySlot.dinner?.map(item => item.dish.id) ?? [],
        };
        const name = `Thực đơn thông minh - ${date.format('DD/MM')}`;
        dispatch(addScheduledMeal({
            id: `smart-${nanoid(10)}`,
            name,
            meals,
            dishServings,
            plannedDate: date.toDate(),
            createdDate: new Date(),
        }));
        dispatch(rememberScheduledMealName(name));
        return 'created';
    };

    const _createScheduledMeals = () => {
        let created = 0;
        let updated = 0;
        plannedDays.forEach(day => {
            const selected = day.alternatives?.find(alternative => alternative.id === day.selectedAlternativeId) ?? day.alternatives?.[0];
            const result = _appendToScheduledMeal(day.date, selected ? getAlternativeItemsBySlot(selected) : getDayItemsBySlot(day));
            if (result === 'created') created += 1;
            if (result === 'updated') updated += 1;
        });
        setShoppingPreviewOpen(false);
        message.success(`Đã áp dụng ${created + updated} ngày (${created} mới, ${updated} cập nhật)`);
    };

    const _displaySlotFromCookNow = (): MealSlot => {
        if (cookNowMealSlot === 'breakfast' || cookNowMealSlot === 'lunch' || cookNowMealSlot === 'dinner') return cookNowMealSlot;
        return 'dinner';
    };

    const _openRecommendationDetail = (item: SmartPlannerDishRecommendation) => {
        setDetailSelection({ item: item as PlannedDish, slot: _displaySlotFromCookNow(), date: startDate });
    };

    const _startCookingRecommendation = (item: SmartPlannerDishRecommendation) => {
        const ingredientIds = Array.from(new Set(DishServingHelper.collectIngredientAmounts(item.dish, dishes, { targetServings }).map(row => row.ingredientId)));
        dispatch(startCooking({
            dishId: item.dish.id,
            dishName: item.dish.name,
            baseServings: DishServingHelper.getBaseServings(item.dish),
            targetServings,
            steps: collectAllSteps(item.dish, dishesById),
            ingredientIds,
            householdMemberIds: selectedMembers.map(member => member.id),
        }));
        message.success(`Đã bắt đầu nấu ${item.dish.name}`);
    };

    const _confirmStartCookingRecommendation = (item: SmartPlannerDishRecommendation) => {
        modal.confirm({
            title: 'Bắt đầu nấu món này?',
            content: <Typography.Text style={{ fontSize: 13, lineHeight: '19px' }}>Sẽ tạo phiên nấu cho "{item.dish.name}". Bạn có thể theo dõi các bước nấu trong phiên này.</Typography.Text>,
            okText: 'Bắt đầu',
            cancelText: 'Hủy',
            icon: <PlayCircleOutlined />,
            onOk: () => _startCookingRecommendation(item),
        });
    };

    const _scheduleCookNowSelection = () => {
        if (!scheduleSelection) return;
        const itemsBySlot: Partial<Record<MealSlot, Array<{ dish: Dishes }>>> = { [scheduleSelection.slot]: [scheduleSelection.item] };
        const result = _appendToScheduledMeal(scheduleSelection.date, itemsBySlot);
        setScheduleSelection(undefined);
        if (result === 'updated') message.success('Đã thêm món vào thực đơn có sẵn');
        if (result === 'created') message.success('Đã tạo thực đơn từ gợi ý');
    };

    const _getExistingScheduleDishNames = (slot: MealSlot) => {
        return scheduleSelectionExistingMeals.flatMap(item => (item.meals?.[slot] ?? []).map(dishId => dishesById.get(dishId)?.name ?? dishId));
    };

    const _dismissRecommendation = (item: SmartPlannerDishRecommendation) => {
        setDismissedDishIds(current => Array.from(new Set([...current, item.dish.id])));
    };

    const _toggleHelp = (key: string) => setOpenHelpKey(current => current === key ? undefined : key);

    const PlannerFieldLabel = ({ helpKey, label, children }: { helpKey: string; label: React.ReactNode; children: React.ReactNode }) => <>
        <div className='smart-planner-field-label'>
            <Typography.Text strong>{label}</Typography.Text>
            <Button type='text' aria-label={`Giải thích ${String(label)}`} icon={<QuestionCircleOutlined />} onClick={() => _toggleHelp(helpKey)} style={{ width: 28, height: 28, paddingInline: 0, borderRadius: 999, color: openHelpKey === helpKey ? '#13a8a8' : '#6b7280' }} />
        </div>
        {openHelpKey === helpKey && <div className='smart-planner-field-help'>{children}</div>}
    </>;

    const DetailSection = ({ title, description, children }: { title: React.ReactNode; description: React.ReactNode; children: React.ReactNode }) => <Box className='smart-planner-detail-section' style={{ border: '1px solid rgba(15,23,42,0.08)', borderRadius: 8, padding: 12, background: '#fff' }}>
        <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 14, lineHeight: '19px' }}>{title}</Typography.Text>
        <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '18px', marginTop: 3 }}>{description}</Typography.Text>
        <div style={{ marginTop: 10 }}>{children}</div>
    </Box>;

    const PlannerDishCard = ({ item, slot, date }: { item?: PlannedDish; slot: MealSlot; date: Dayjs }) => {
        const meta = mealSlotMeta[slot];
        if (!item) return <Box style={{ border: `1px dashed ${meta.border}`, borderRadius: 8, padding: 10, background: '#fafafa' }}>
            <Typography.Text type='secondary'>Chưa có gợi ý</Typography.Text>
        </Box>;
        return <Box
            role='button'
            tabIndex={0}
            aria-label={`Xem chi tiết gợi ý ${item.dish.name}`}
            data-testid={`smart-planner-suggestion-${slot}-${item.dish.id}`}
            onClick={() => setDetailSelection({ item, slot, date })}
            onKeyDown={event => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                setDetailSelection({ item, slot, date });
            }}
            style={{ width: '100%', boxSizing: 'border-box', border: `1px solid ${meta.border}`, borderRadius: 8, padding: 10, background: meta.background, minWidth: 0, cursor: 'pointer' }}
        >
            <div style={{ display: 'grid', gridTemplateColumns: '46px minmax(0, 1fr) auto', gap: 9, alignItems: 'start' }}>
                <DishImageWidget src={item.dish.image} width={46} height={46} borderRadius={8} fallbackIconSize={24} showBrokenLabel={false} />
                <div style={{ minWidth: 0 }}>
                    <span className='smart-planner-result-name'>{item.dish.name}</span>
                    <div className='smart-planner-result-facts'>
                        {item.totalMinutes !== undefined && item.totalMinutes > 0 && <span><ClockCircleOutlined />{DishDurationHelper.formatMinutes(item.totalMinutes)}</span>}
                        {item.shoppingCostLabel && <span><ShoppingCartOutlined />Mua {item.shoppingCostLabel}</span>}
                    </div>
                    {item.reasons.length > 0 && <span className='smart-planner-result-reason'>{item.reasons.join(' · ')}</span>}
                </div>
                <Tag color={getScoreColor(item.score)} style={{ marginRight: 0 }}>{item.score}%</Tag>
            </div>
        </Box>;
    };

    const PlannerAlternativeCard = ({ alternative, date, selected }: { alternative: PlannedDayAlternative; date: Dayjs; selected: boolean }) => <Box
        role='button'
        tabIndex={0}
        aria-label={`Chọn ${alternative.label}`}
        onClick={() => _selectAlternative(date, alternative.id)}
        onKeyDown={event => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            _selectAlternative(date, alternative.id);
        }}
        style={{ width: '100%', boxSizing: 'border-box', border: selected ? '1px solid #13a8a8' : '1px solid rgba(15,23,42,0.08)', borderRadius: 8, padding: 10, background: selected ? '#e6fffb' : '#fff', cursor: 'pointer', minWidth: 0 }}
    >
        <Stack justify='space-between' align='flex-start' gap={8} style={{ width: '100%' }}>
            <div style={{ minWidth: 0 }}>
                <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 13, lineHeight: '18px' }}>{alternative.label}</Typography.Text>
                <Typography.Text type='secondary' style={{ display: 'block', fontSize: 11, lineHeight: '16px', marginTop: 2 }}>{getAlternativeItems(alternative).map(item => item.dish.name).join(' · ')}</Typography.Text>
            </div>
            <Tag color={getScoreColor(alternative.totalScore)} style={{ marginRight: 0 }}>{alternative.totalScore}%</Tag>
        </Stack>
        <div className='smart-planner-result-facts' style={{ marginTop: 8 }}>
            <span><DollarCircleOutlined />Tổng {alternative.totalCostLabel}</span>
            <span><ShoppingCartOutlined />Cần mua {alternative.shoppingCostLabel}</span>
        </div>
    </Box>;

    const CookNowRecommendationCard = ({ item, category }: { item?: SmartPlannerDishRecommendation; category?: SmartPlannerCookNowCategory }) => {
        if (!item) return <Box style={{ border: '1px dashed rgba(15,23,42,0.14)', borderRadius: 10, background: '#fafafa', padding: 11, minHeight: 110 }}>
            <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 13, lineHeight: '18px' }}>{category?.label ?? 'Gợi ý'}</Typography.Text>
            <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '18px', marginTop: 6 }}>Chưa có món phù hợp</Typography.Text>
        </Box>;

        const moreActions = (key: string) => {
            if (key === 'schedule') setScheduleSelection({ item, date: startDate, slot: _displaySlotFromCookNow() });
            if (key === 'shop') setShoppingRecommendation(item);
            if (key === 'detail') _openRecommendationDetail(item);
            if (key === 'dismiss') Modal.confirm({
                title: 'Ẩn món này khỏi gợi ý?',
                content: `"${item.dish.name}" sẽ không xuất hiện trong các gợi ý nấu ngay của lần này. Bạn có thể gợi ý lại để hiện lại món.`,
                okText: 'Ẩn món',
                cancelText: 'Hủy',
                okButtonProps: { danger: true },
                onOk: () => _dismissRecommendation(item),
            });
        };

        return <Box className='smart-planner-result-card'>
            {category && <Typography.Text strong style={{ display: 'block', color: '#13a8a8', fontSize: 12, lineHeight: '16px', marginBottom: 8 }}>{category.label}</Typography.Text>}
            <div className='smart-planner-result-main'>
                <DishImageWidget src={item.dish.image} width={48} height={48} borderRadius={8} fallbackIconSize={24} showBrokenLabel={false} />
                <div style={{ minWidth: 0 }}>
                    <span className='smart-planner-result-name'>{item.dish.name}</span>
                    <div className='smart-planner-result-facts'>
                        {item.totalMinutes !== undefined && item.totalMinutes > 0 && <span><ClockCircleOutlined />{DishDurationHelper.formatMinutes(item.totalMinutes)}</span>}
                        {item.shoppingCostLabel && <span><ShoppingCartOutlined />Mua {item.shoppingCostLabel}</span>}
                    </div>
                    {item.reasons.length > 0 && <span className='smart-planner-result-reason'>{item.reasons.join(' · ')}</span>}
                </div>
                <Tag color={getScoreColor(item.score)} style={{ marginRight: 0 }}>{item.score}%</Tag>
            </div>
            <div className='smart-planner-result-actions'>
                <Button className='smart-planner-result-primary' type='primary' icon={<PlayCircleOutlined />} onClick={() => _confirmStartCookingRecommendation(item)}>Nấu</Button>
                <Dropdown
                    placement='bottomRight'
                    menu={{
                        onClick: ({ key }) => moreActions(key),
                        items: [
                            { key: 'schedule', label: 'Lên lịch', icon: <CalendarOutlined /> },
                            { key: 'shop', label: 'Mua thiếu', icon: <ShoppingCartOutlined />, disabled: (item.missingIngredientCount ?? 0) === 0 },
                            { key: 'detail', label: 'Chi tiết', icon: <EyeOutlined /> },
                            { type: 'divider' },
                            { key: 'dismiss', label: 'Ẩn món này', icon: <StopOutlined />, danger: true },
                        ],
                    }}
                >
                    <Button aria-label={`Thao tác cho ${item.dish.name}`} type='text' icon={<MoreOutlined />} />
                </Dropdown>
            </div>
        </Box>;
    };

    const suggestionDurationBreakdown = detailSelection ? DishDurationHelper.getBreakdown(detailSelection.item.dish, dishesById) : undefined;
    const suggestionOwnDurationItem = suggestionDurationBreakdown?.items.find(item => item.dishId === detailSelection?.item.dish.id);
    const suggestionIncludedDurationItems = suggestionDurationBreakdown?.items.filter(item => item.dishId !== detailSelection?.item.dish.id) ?? [];

    const suggestionDetailModal = detailSelection ? <Modal
        open={Boolean(detailSelection)}
        onCancel={() => setDetailSelection(undefined)}
        title='Chi tiết gợi ý món'
        width={760}
        destroyOnClose
        footer={<Button onClick={() => setDetailSelection(undefined)}>Đóng</Button>}
        bodyStyle={{ background: '#f8fafc' }}
    >
        <Stack className='smart-planner-detail-modal' direction='column' gap={12} fullwidth>
            <Box data-testid='smart-planner-suggestion-detail-modal' style={{ display: 'grid', gridTemplateColumns: '56px minmax(0, 1fr)', gap: 12, alignItems: 'start', width: '100%', boxSizing: 'border-box' }}>
                <DishImageWidget src={detailSelection.item.dish.image} width={56} height={56} borderRadius={8} fallbackIconSize={28} showBrokenLabel={false} />
                <div style={{ minWidth: 0 }}>
                    <Stack wrap='wrap' align='center' gap={6}>
                        <Tag color={getScoreColor(detailSelection.item.score)} style={{ marginRight: 0 }}>{detailSelection.item.score}%</Tag>
                        <Tag color='blue' style={{ marginRight: 0 }}>{mealSlotMeta[detailSelection.slot].label}</Tag>
                        <Tag color='cyan' style={{ marginRight: 0 }}>{detailSelection.date.format('DD/MM/YYYY')}</Tag>
                    </Stack>
                    <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 18, lineHeight: '24px', marginTop: 6, overflowWrap: 'anywhere' }}>{detailSelection.item.dish.name}</Typography.Text>
                    <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '18px', marginTop: 4 }}>Món này được xếp hạng cho bữa {mealSlotMeta[detailSelection.slot].label.toLowerCase()} bằng cách bắt đầu từ điểm nền, rồi cộng/trừ theo từng tiêu chí đang bật. Ngân sách được tính theo tổng cả ngày, không chia đều cho từng bữa. Điểm cuối cùng được giới hạn trong khoảng 0-100.</Typography.Text>
                </div>
            </Box>

            {suggestionDurationBreakdown && suggestionDurationBreakdown.items.length > 0 && <DetailSection
                title='Thời lượng'
                description='Tổng thời lượng bao gồm món chính và các món được ghép vào. Mỗi món vẫn được tách riêng để kiểm tra nhanh.'
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
                    <Stack wrap='wrap' gap={6}>
                        <Tag color='blue' style={{ marginRight: 0 }}>Tổng {DishDurationHelper.formatMinutes(suggestionDurationBreakdown.totalMinutes)}</Tag>
                    </Stack>
                    {suggestionOwnDurationItem && <Box style={{ width: '100%', boxSizing: 'border-box', border: '1px solid rgba(15,23,42,0.07)', borderRadius: 8, background: '#f8fafc', padding: 10 }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, width: '100%', marginBottom: 7 }}>
                            <Typography.Text strong style={{ color: '#111827', fontSize: 13, lineHeight: '18px' }}>Món chính</Typography.Text>
                            <Tag style={{ marginRight: 0, flexShrink: 0 }}>{DishDurationHelper.formatMinutes(suggestionOwnDurationItem.ownMinutes)}</Tag>
                        </div>
                        <Stack wrap='wrap' gap={5}>
                            {suggestionOwnDurationItem.activeItems.map(active => <Tag key={`${suggestionOwnDurationItem.dishId}-${active.phase.key}`} style={{ marginRight: 0, borderColor: active.phase.border, background: '#fff', color: active.phase.color }}>
                                {active.phase.shortLabel}: {DishDurationHelper.formatMinutes(active.minutes)}
                            </Tag>)}
                        </Stack>
                    </Box>}
                    {suggestionIncludedDurationItems.map(item => <Box key={item.dishId} style={{ width: `calc(100% - ${Math.min(item.depth, 3) * 8}px)`, boxSizing: 'border-box', border: '1px solid rgba(15,23,42,0.07)', borderRadius: 8, background: '#f8fafc', padding: 10, marginLeft: Math.min(item.depth, 3) * 8 }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, width: '100%', marginBottom: 7 }}>
                            <Typography.Text strong style={{ color: '#111827', fontSize: 13, lineHeight: '18px', overflowWrap: 'anywhere' }}>{item.dishName}</Typography.Text>
                            <Tag style={{ marginRight: 0, flexShrink: 0 }}>{DishDurationHelper.formatMinutes(item.ownMinutes)}</Tag>
                        </div>
                        <Stack wrap='wrap' gap={5}>
                            {item.activeItems.map(active => <Tag key={`${item.dishId}-${active.phase.key}`} style={{ marginRight: 0, borderColor: active.phase.border, background: '#fff', color: active.phase.color }}>
                                {active.phase.shortLabel}: {DishDurationHelper.formatMinutes(active.minutes)}
                            </Tag>)}
                        </Stack>
                    </Box>)}
                </div>
            </DetailSection>}

            <DetailSection
                title='Cách tính điểm'
                description='Mỗi dòng là một dữ liệu planner đã dùng để gợi ý món. Cột điểm cho biết dữ liệu đó làm món tăng, giảm hoặc giữ nguyên điểm xếp hạng.'
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
                    {detailSelection.item.scoreDetails.map(detail => {
                        const methodologyKey = `score-method-${detail.label}`;
                        const methodology = SCORE_METHODOLOGY[detail.label];
                        return <Box key={`${detail.label}-${detail.value}`} style={{ width: '100%', boxSizing: 'border-box', border: '1px solid rgba(15,23,42,0.07)', borderRadius: 8, background: '#f8fafc', padding: 10 }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 8, width: '100%' }}>
                                <div style={{ minWidth: 0, flex: '1 1 220px' }}>
                                    <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 13, lineHeight: '18px' }}>{detail.label}</Typography.Text>
                                    <Typography.Text style={{ display: 'block', color: '#334155', fontSize: 12, lineHeight: '17px', marginTop: 2 }}>{detail.value}</Typography.Text>
                                </div>
                                <Stack align='center' gap={4} style={{ flexShrink: 0 }}>
                                    <Tag color={getImpactColor(detail.impact)} style={{ marginRight: 0 }}>{formatImpact(detail.impact)}</Tag>
                                    {methodology && <Button type='text' aria-label={`Cách tính ${detail.label}`} icon={<QuestionCircleOutlined />} onClick={() => _toggleHelp(methodologyKey)} style={{ width: 28, height: 28, paddingInline: 0, borderRadius: 999, color: openHelpKey === methodologyKey ? '#13a8a8' : '#9ca3af' }} />}
                                </Stack>
                            </div>
                            <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '18px', marginTop: 7 }}>{detail.description}</Typography.Text>
                            {methodology && openHelpKey === methodologyKey && <Box style={{ marginTop: 8, padding: '8px 10px', borderRadius: 6, background: 'rgba(19,168,168,0.08)', border: '1px solid rgba(19,168,168,0.18)' }}>
                                <Typography.Text style={{ display: 'block', fontSize: 11, fontWeight: 650, color: '#0f766e', lineHeight: '15px', marginBottom: 3 }}>Cách tính tiêu chí này</Typography.Text>
                                <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '18px' }}>{methodology}</Typography.Text>
                            </Box>}
                        </Box>;
                    })}
                </div>
            </DetailSection>

            {(detailSelection.item.warnings ?? []).length > 0 && <DetailSection
                title='Lưu ý và dữ liệu thiếu'
                description='Các cảnh báo này làm giảm độ tin cậy hoặc điểm gợi ý, nhưng không phải ràng buộc an toàn đã bị chặn trước đó.'
            >
                <Stack wrap='wrap' gap={6}>
                    {(detailSelection.item.warnings ?? []).map(warning => <Tag key={warning} color='orange' style={{ marginRight: 0 }}>{warning}</Tag>)}
                </Stack>
            </DetailSection>}

            {detailSelection.item.nutritionMatch && <DetailSection
                title={`Dinh dưỡng: ${detailSelection.item.nutritionGoalName}`}
                description='Các dòng dưới đây là từng tiêu chí trong mục tiêu dinh dưỡng. Giá trị món được tính theo mỗi phần ăn từ dữ liệu dinh dưỡng của nguyên liệu.'
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
                    <Stack wrap='wrap' gap={6}>
                        <Tag color='cyan' style={{ marginRight: 0 }}>{detailSelection.item.nutritionLabel}</Tag>
                        <Tag color='blue' style={{ marginRight: 0 }}>{formatRatioPercent(detailSelection.item.nutritionMatch.score)} gần mục tiêu</Tag>
                    </Stack>
                    {detailSelection.item.nutritionMatch.criteria.map(row => {
                        const actual = NutritionGoalHelper.formatNutrientValue(row.criterion.nutrient, row.value);
                        return <Box key={`${row.criterion.nutrient}-${row.label}`} style={{ width: '100%', boxSizing: 'border-box', border: '1px solid rgba(15,23,42,0.07)', borderRadius: 8, background: '#f8fafc', padding: 10 }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 8, width: '100%' }}>
                                <div style={{ minWidth: 0, flex: '1 1 220px' }}>
                                    <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 13, lineHeight: '18px' }}>{row.label}</Typography.Text>
                                    <Typography.Text style={{ display: 'block', color: '#334155', fontSize: 12, lineHeight: '17px', marginTop: 2 }}>Giá trị món: {actual}</Typography.Text>
                                </div>
                                <Tag color={row.matched ? 'green' : 'orange'} style={{ marginRight: 0, flexShrink: 0 }}>{row.matched ? 'Đạt' : `${formatRatioPercent(row.score)} gần đạt`}</Tag>
                            </div>
                            <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '18px', marginTop: 7 }}>Tiêu chí này so giá trị thực tế của món với ngưỡng mục tiêu. Nếu chưa đạt, phần trăm cho biết món đang gần ngưỡng đến mức nào.</Typography.Text>
                        </Box>;
                    })}
                </div>
            </DetailSection>}

            {detailSelection.item.suitability && <DetailSection
                title='Khẩu vị nhà mình'
                description='Mỗi thành viên được chấm riêng từ hồ sơ gia đình. Điểm trung bình của các thành viên đang chọn được đưa vào điểm gợi ý.'
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
                    <Stack wrap='wrap' gap={6}>
                        <Tag color={detailSelection.item.suitability.averageScore >= 70 ? 'green' : 'orange'} style={{ marginRight: 0 }}>{formatPercent(detailSelection.item.suitability.averageScore)} trung bình</Tag>
                        <Tag color={detailSelection.item.suitability.warningCount > 0 ? 'volcano' : 'green'} style={{ marginRight: 0 }}>{detailSelection.item.suitability.warningCount} lưu ý</Tag>
                    </Stack>
                    {detailSelection.item.suitability.members.map(memberResult => <Box key={memberResult.member.id} style={{ width: '100%', boxSizing: 'border-box', border: '1px solid rgba(15,23,42,0.07)', borderRadius: 8, background: '#f8fafc', padding: 10 }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 8, width: '100%' }}>
                            <div style={{ minWidth: 0, flex: '1 1 220px' }}>
                                <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 13, lineHeight: '18px' }}>{memberResult.member.name}</Typography.Text>
                                <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '18px', marginTop: 2 }}>Điểm này so món với món thích/tránh, nguyên liệu thích/tránh, tag món và mục tiêu riêng của thành viên.</Typography.Text>
                            </div>
                            <Tag color={memberResult.tone === 'success' ? 'green' : memberResult.tone === 'warning' ? 'orange' : 'blue'} style={{ marginRight: 0, flexShrink: 0 }}>{formatPercent(memberResult.score)}</Tag>
                        </div>
                        <Stack wrap='wrap' gap={5} style={{ marginTop: 8 }}>
                            {(memberResult.positives.length > 0 ? memberResult.positives : ['Không có điểm cộng rõ ràng']).map(text => <Tag key={`positive-${text}`} color='green' style={{ marginRight: 0 }}>{text}</Tag>)}
                            {memberResult.warnings.map(text => <Tag key={`warning-${text}`} color='volcano' style={{ marginRight: 0 }}>{text}</Tag>)}
                            {memberResult.notes.map(text => <Tag key={`note-${text}`} color='default' style={{ marginRight: 0 }}>{text}</Tag>)}
                        </Stack>
                    </Box>)}
                </div>
            </DetailSection>}

            {detailSelection.item.reasons.length > 0 && <DetailSection
                title='Tóm tắt hiển thị trên thẻ'
                description='Đây là các lý do ngắn được rút gọn trên item gợi ý để người dùng quét nhanh trước khi mở modal chi tiết.'
            >
                <Stack wrap='wrap' gap={6}>
                    {detailSelection.item.reasons.map(reason => <Tag key={reason} color='blue' style={{ marginRight: 0 }}>{reason}</Tag>)}
                </Stack>
            </DetailSection>}
        </Stack>
    </Modal> : null;

    const shoppingPreviewModal = shoppingPreviewOpen ? <Modal
        open={shoppingPreviewOpen}
        onCancel={() => setShoppingPreviewOpen(false)}
        title='Xem trước mua sắm'
        width={720}
        destroyOnClose
        footer={<Stack justify='flex-end' gap={8}>
            <Button onClick={() => setShoppingPreviewOpen(false)}>Hủy</Button>
            <Button type='primary' icon={<CheckCircleOutlined />} onClick={_createScheduledMeals}>Tạo thực đơn</Button>
        </Stack>}
        bodyStyle={{ background: '#f8fafc' }}
    >
        <Stack className='smart-planner-preview' direction='column' gap={12} style={{ width: '100%' }}>
            <Box style={{ border: '1px solid rgba(15,23,42,0.08)', borderRadius: 8, background: '#fff', padding: 12 }}>
                <Stack wrap='wrap' gap={6}>
                    <Tag color='gold' style={{ marginRight: 0 }}>Tổng món {shoppingPreviewSummary.totalCostLabel}</Tag>
                    <Tag color='green' style={{ marginRight: 0 }}>Cần mua {shoppingPreviewSummary.shoppingCostLabel}</Tag>
                    <Tag color='blue' style={{ marginRight: 0 }}>{selectedAlternatives.length} ngày</Tag>
                </Stack>
                <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '18px', marginTop: 8 }}>Chi phí cần mua được tính sau khi trừ nguyên liệu đang có trong kho. Đây là phần nên kiểm tra trước khi tạo thực đơn.</Typography.Text>
            </Box>

            <DetailSection
                title='Phương án sẽ áp dụng'
                description='Các phương án đang được chọn cho từng ngày. Đổi phương án trong planner trước khi tạo nếu muốn thay bữa.'
            >
                <Stack direction='column' gap={8} style={{ width: '100%' }}>
                    {plannedDays.map(day => {
                        const selected = day.alternatives?.find(alternative => alternative.id === day.selectedAlternativeId) ?? day.alternatives?.[0];
                        if (!selected) return null;
                        return <Box key={day.date.format('YYYY-MM-DD')} style={{ border: '1px solid rgba(15,23,42,0.07)', borderRadius: 8, background: '#f8fafc', padding: 10 }}>
                            <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 13, lineHeight: '18px' }}>{DateHelpers.formatWithCapitalizedWeekday(day.date.toDate(), 'dddd, DD/MM')}</Typography.Text>
                            <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '18px', marginTop: 3 }}>{getAlternativeItems(selected).map(item => item.dish.name).join(' · ')}</Typography.Text>
                            <Stack wrap='wrap' gap={5} style={{ marginTop: 7 }}>
                                <Tag color='gold' style={{ marginRight: 0 }}>Tổng {selected.totalCostLabel}</Tag>
                                <Tag color='green' style={{ marginRight: 0 }}>Cần mua {selected.shoppingCostLabel}</Tag>
                                <Tag color={getScoreColor(selected.totalScore)} style={{ marginRight: 0 }}>{selected.totalScore}%</Tag>
                            </Stack>
                        </Box>;
                    })}
                </Stack>
            </DetailSection>

            <DetailSection
                title='Nguyên liệu cần mua thêm'
                description='Danh sách này gom phần còn thiếu từ các món đã chọn, dựa trên lượng tồn kho hiện tại.'
            >
                {shoppingPreviewSummary.rows.length === 0 ? <Empty description='Không cần mua thêm nguyên liệu theo dữ liệu kho hiện tại' image={Empty.PRESENTED_IMAGE_SIMPLE} /> : <Stack direction='column' gap={8} style={{ width: '100%' }}>
                    {shoppingPreviewSummary.rows.map(row => <Box key={`${row.ingredientId}-${row.unit}`} style={{ border: '1px solid rgba(15,23,42,0.07)', borderRadius: 8, background: '#f8fafc', padding: 10 }}>
                        <Stack justify='space-between' align='center' gap={8} wrap='wrap' style={{ width: '100%' }}>
                            <Typography.Text strong style={{ color: '#111827', fontSize: 13, lineHeight: '18px' }}>{row.name}</Typography.Text>
                            <Stack wrap='wrap' gap={5}>
                                <Tag color='blue' style={{ marginRight: 0 }}>{row.amount} {row.unit}</Tag>
                                {row.costLabel && <Tag color='gold' style={{ marginRight: 0 }}>{row.costLabel}</Tag>}
                            </Stack>
                        </Stack>
                    </Box>)}
                </Stack>}
            </DetailSection>
        </Stack>
    </Modal> : null;

    const scheduleCookNowModal = scheduleSelection ? <Modal
        open={Boolean(scheduleSelection)}
        onCancel={() => setScheduleSelection(undefined)}
        title='Lên lịch món gợi ý'
        width={520}
        destroyOnClose
        footer={<Stack justify='flex-end' gap={8}>
            <Button onClick={() => setScheduleSelection(undefined)}>Hủy</Button>
            <Button type='primary' icon={<CalendarOutlined />} onClick={_scheduleCookNowSelection}>Lên lịch</Button>
        </Stack>}
    >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
            <Box style={{ width: '100%', boxSizing: 'border-box', border: '1px solid rgba(15,23,42,0.08)', borderRadius: 8, background: '#f8fafc', padding: 10 }}>
                <Typography.Text strong style={{ display: 'block', color: '#111827', lineHeight: '20px' }}>{scheduleSelection.item.dish.name}</Typography.Text>
                <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '18px', marginTop: 3 }}>{targetServings} phần · {scheduleSelection.item.shoppingCostLabel ? `mua thêm ${scheduleSelection.item.shoppingCostLabel}` : 'chưa có chi phí mua thêm'}</Typography.Text>
            </Box>
            <div style={{ width: '100%' }}>
                <Typography.Text strong style={{ display: 'block', marginBottom: 6 }}>Ngày</Typography.Text>
                <DatePicker value={scheduleSelection.date} onChange={value => value && setScheduleSelection(current => current ? { ...current, date: value.startOf('day') } : current)} format='DD/MM/YYYY' style={{ width: '100%' }} />
            </div>
            <div style={{ width: '100%' }}>
                <Typography.Text strong style={{ display: 'block', marginBottom: 6 }}>Bữa</Typography.Text>
                <Segmented block value={scheduleSelection.slot} onChange={value => setScheduleSelection(current => current ? { ...current, slot: value as MealSlot } : current)} options={([
                    { value: 'breakfast', label: 'Sáng' },
                    { value: 'lunch', label: 'Trưa' },
                    { value: 'dinner', label: 'Tối' },
                ] as Array<{ value: MealSlot; label: string }>)} />
            </div>
            <Box style={{ display: 'block', width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box', alignSelf: 'stretch', justifySelf: 'stretch', marginInline: 0, textAlign: 'left', border: '1px solid #e6f4ff', borderRadius: 8, background: '#f8fbff', padding: 10 }}>
                <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 12, lineHeight: '17px', marginBottom: 8 }}>Thực đơn đã có trong ngày này</Typography.Text>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%', textAlign: 'left' }}>
                    {(['breakfast', 'lunch', 'dinner'] as MealSlot[]).map(slot => {
                        const meta = mealSlotMeta[slot];
                        const names = _getExistingScheduleDishNames(slot);
                        const active = scheduleSelection.slot === slot;
                        return <div key={slot} style={{ display: 'grid', gridTemplateColumns: '58px minmax(0, 1fr)', gap: 8, alignItems: 'start', width: '100%', boxSizing: 'border-box', textAlign: 'left', borderRadius: 6, padding: active ? '4px 6px' : 0, background: active ? meta.background : 'transparent' }}>
                            <Tag style={{ marginRight: 0, color: meta.tone, background: '#fff', borderColor: meta.border, textAlign: 'center' }}>{meta.label}</Tag>
                            <Typography.Text type={names.length > 0 ? undefined : 'secondary'} style={{ fontSize: 12, lineHeight: '18px', overflowWrap: 'anywhere' }}>
                                {names.length > 0 ? names.join(' · ') : 'Chưa có món'}
                            </Typography.Text>
                        </div>;
                    })}
                </div>
            </Box>
        </div>
    </Modal> : null;

    const recommendationShoppingModal = shoppingRecommendation ? <Modal
        open={Boolean(shoppingRecommendation)}
        onCancel={() => setShoppingRecommendation(undefined)}
        title='Tạo lịch mua sắm'
        width={620}
        destroyOnClose
        footer={null}
    >
        <ShoppingListAddWidget
            date={startDate.toDate()}
            initialName={`Mua cho ${shoppingRecommendation.dish.name}`}
            dishIds={[shoppingRecommendation.dish.id]}
            initialDishServings={{ [shoppingRecommendation.dish.id]: targetServings }}
            onDone={() => setShoppingRecommendation(undefined)}
        />
    </Modal> : null;

    const renderStepperControl = (label: string, value: number, onDecrement: () => void, onIncrement: () => void, decrementDisabled: boolean, incrementDisabled: boolean) => (
        <Stack align='center' gap={4} style={{ flexShrink: 0 }}>
            <Typography.Text style={{ fontSize: 12, lineHeight: '18px', color: '#475569' }}>{label}</Typography.Text>
            <Button aria-label={`Giảm ${label}`} icon={<MinusOutlined />} disabled={decrementDisabled} onClick={onDecrement} style={{ width: 30, height: 30, paddingInline: 0, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} />
            <Box style={{ minWidth: 32, textAlign: 'center', padding: '4px 8px', borderRadius: 6, border: '1px solid rgba(15,23,42,0.10)', background: '#f8fafc' }}>
                <Typography.Text strong style={{ fontSize: 13, lineHeight: '18px', color: '#111827' }}>{value}</Typography.Text>
            </Box>
            <Button aria-label={`Tăng ${label}`} icon={<PlusOutlined />} disabled={incrementDisabled} onClick={onIncrement} style={{ width: 30, height: 30, paddingInline: 0, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} />
        </Stack>
    );

    const mealRangeModal = <Modal
        open={mealRangeModalOpen}
        onCancel={() => setMealRangeModalOpen(false)}
        title='Chọn số món cho từng bữa'
        width={620}
        destroyOnClose
        footer={<Stack justify='flex-end' gap={8}>
            <Button onClick={() => setMealRangeModalOpen(false)}>Hủy</Button>
            <Button type='primary' icon={<ThunderboltOutlined />} onClick={_confirmMealRangeModal}>Gợi ý</Button>
        </Stack>}
        bodyStyle={{ background: '#f8fafc' }}
    >
        <Stack direction='column' gap={10} style={{ width: '100%' }}>
            <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '18px' }}>
                Planner sẽ chọn ngẫu nhiên số món trong khoảng min-max cho từng bữa mỗi ngày. Có thể yêu cầu mỗi bữa phải có ít nhất một số món thuộc loại nhất định, ví dụ trưa cần một món chính và một canh.
            </Typography.Text>
            {mealSlots.map(slot => {
                const meta = mealSlotMeta[slot];
                const range = mealSlotDishRanges[slot];
                const tagRequirements = mealSlotTagRequirements[slot] ?? [];
                const tagMinTotal = tagRequirements.reduce((sum, item) => sum + Math.max(0, item.min), 0);
                return <Box key={slot} style={{ border: `1px solid ${meta.border}`, borderRadius: 8, background: '#fff', padding: 12 }}>
                    <Stack justify='space-between' align='center' gap={10} wrap='wrap' style={{ width: '100%' }}>
                        <Stack align='center' gap={6} wrap='wrap' style={{ minWidth: 0 }}>
                            <Tag style={{ marginRight: 0, color: meta.tone, background: meta.background, borderColor: meta.border, minWidth: 52, textAlign: 'center' }}>{meta.label}</Tag>
                            <Tag color='blue' style={{ marginRight: 0 }}>{range.min}-{range.max} món</Tag>
                            {tagMinTotal > 0 && <Tag color='cyan' style={{ marginRight: 0 }}>{tagMinTotal} món bắt buộc</Tag>}
                        </Stack>
                        <Stack align='center' gap={10} wrap='wrap'>
                            {renderStepperControl('Min', range.min, () => _stepMealSlotDishRange(slot, 'min', -1), () => _stepMealSlotDishRange(slot, 'min', 1), range.min <= 0, range.min >= MEAL_SLOT_RANGE_MAX)}
                            {renderStepperControl('Max', range.max, () => _stepMealSlotDishRange(slot, 'max', -1), () => _stepMealSlotDishRange(slot, 'max', 1), range.max <= 0, range.max >= MEAL_SLOT_RANGE_MAX)}
                        </Stack>
                    </Stack>

                    <Collapse
                        ghost
                        size='small'
                        style={{ marginTop: 10, paddingTop: 8, borderTop: '1px dashed rgba(15,23,42,0.08)' }}
                        items={[{
                            key: `${slot}-tags`,
                            label: <Stack align='center' justify='space-between' gap={6} wrap='wrap' style={{ width: '100%' }}>
                                <Typography.Text strong style={{ fontSize: 12, lineHeight: '17px', color: '#334155' }}>Bắt buộc có loại món</Typography.Text>
                                <Typography.Text type='secondary' style={{ fontSize: 11, lineHeight: '16px' }}>Tổng yêu cầu: {tagMinTotal} món</Typography.Text>
                            </Stack>,
                            children: tagRequirementOptions.length === 0 ? <Typography.Text type='secondary' style={{ display: 'block', fontSize: 11, lineHeight: '16px' }}>Chưa có món nào gắn nhãn. Thêm tag cho món trong trang Món ăn để dùng tính năng này.</Typography.Text> : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 6 }}>
                                {tagRequirementOptions.map(tag => {
                                    const value = tagRequirements.find(item => item.tag === tag)?.min ?? 0;
                                    const active = value > 0;
                                    return <Stack key={tag} justify='space-between' align='center' gap={6} style={{ padding: '6px 8px', borderRadius: 6, border: `1px solid ${active ? 'rgba(19,168,168,0.40)' : 'rgba(15,23,42,0.08)'}`, background: active ? '#e6fffb' : '#f8fafc' }}>
                                        <Typography.Text style={{ fontSize: 12, lineHeight: '17px', color: active ? '#0f766e' : '#475569', overflowWrap: 'anywhere' }}>{tag}</Typography.Text>
                                        <Stack align='center' gap={3} style={{ flexShrink: 0 }}>
                                            <Button aria-label={`Giảm yêu cầu ${tag}`} icon={<MinusOutlined />} disabled={value <= 0} onClick={() => _stepSlotTagRequirement(slot, tag, -1)} style={{ width: 24, height: 24, paddingInline: 0, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} />
                                            <span style={{ minWidth: 18, textAlign: 'center', fontSize: 12, fontWeight: 700, color: active ? '#0f766e' : '#9ca3af' }}>{value}</span>
                                            <Button aria-label={`Tăng yêu cầu ${tag}`} icon={<PlusOutlined />} disabled={value >= MEAL_SLOT_RANGE_MAX} onClick={() => _stepSlotTagRequirement(slot, tag, 1)} style={{ width: 24, height: 24, paddingInline: 0, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} />
                                        </Stack>
                                    </Stack>;
                                })}
                            </div>,
                        }]}
                    />
                    {tagMinTotal > range.max && <Typography.Text style={{ display: 'block', color: '#ad4e00', fontSize: 11, lineHeight: '16px', marginTop: 6 }}>Yêu cầu loại món vượt quá max ({tagMinTotal} &gt; {range.max}) — planner sẽ tự nâng max khi gợi ý.</Typography.Text>}
                </Box>;
            })}
            {getMealSlotRangeError(mealSlotDishRanges) && <Box style={{ border: '1px solid #ffd591', borderRadius: 8, background: '#fff7e6', padding: 9 }}>
                <Typography.Text style={{ color: '#ad4e00', fontSize: 12, lineHeight: '18px' }}>{getMealSlotRangeError(mealSlotDishRanges)}</Typography.Text>
            </Box>}
        </Stack>
    </Modal>;

    return <Box className='smart-planner-page' data-testid='smart-meal-planner-page'>
        <style>{pageCss}</style>
        {mealRangeModal}
        {suggestionDetailModal}
        {shoppingPreviewModal}
        {scheduleCookNowModal}
        {recommendationShoppingModal}
        <Box className='smart-planner-hero'>
            <Stack justify='space-between' align='center' gap={12} wrap='wrap'>
                <Stack align='center' gap={10} style={{ minWidth: 0 }}>
                    <span style={{ width: 44, height: 44, borderRadius: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#e6fffb', color: '#13a8a8', border: '1px solid #87e8de', flexShrink: 0 }}>
                        <Image src={DietPlanIcon} preview={false} width={27} alt='' />
                    </span>
                    <div style={{ minWidth: 0, flex: '1 1 260px' }}>
                        <Typography.Text style={{ display: 'block', color: '#13a8a8', fontSize: 12, lineHeight: '16px', fontWeight: 800 }}>Lập thực đơn</Typography.Text>
                        <Typography.Text strong className='smart-planner-title'>Thực đơn thông minh</Typography.Text>
                        <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '18px', marginTop: 3 }}>Gợi ý món nấu ngay, bữa ngày hoặc tuần theo ngân sách, dinh dưỡng, tồn kho và khẩu vị từng thành viên.</Typography.Text>
                    </div>
                </Stack>
            </Stack>
        </Box>

        <div className='smart-planner-grid'>
            <Box className='smart-planner-panel'>
                <div className='smart-planner-controls'>
                    <div className='smart-planner-section'>
                        <div className='smart-planner-section-title'><AppstoreOutlined /> Bạn muốn lập gì?</div>
                        <Segmented block value={scope} onChange={value => { setScope(value as PlannerScope); _clearSuggestions(); }} options={plannerModeOptions} />
                        <Typography.Text type='secondary' style={{ display: 'block', fontSize: 11, lineHeight: '16px', marginTop: 6 }}>
                            {scope === 'cook_now' ? 'Gợi ý món tốt nhất để nấu ngay bây giờ.' : scope === 'day' ? 'Lập sáng, trưa, tối cho một ngày và áp vào lịch.' : 'Lập cả tuần với đa dạng món và xem trước mua sắm.'}
                        </Typography.Text>
                        <div className='smart-planner-primary' style={{ marginTop: 12 }}>
                            {scope === 'cook_now' && <div>
                                <PlannerFieldLabel helpKey='cook-now-slot' label='Bữa muốn nấu'>Bữa ăn giúp planner ưu tiên tag và thời gian phù hợp. Nếu chọn bất kỳ, món linh hoạt sẽ được giữ điểm tốt.</PlannerFieldLabel>
                                <Select value={cookNowMealSlot} onChange={value => { setCookNowMealSlot(value); _clearSuggestions(); }} options={cookNowSlotOptions} style={{ width: '100%' }} />
                            </div>}
                            <div>
                                <PlannerFieldLabel helpKey='date' label={scope === 'cook_now' ? 'Ngày' : 'Ngày bắt đầu'}>Ngày đầu tiên để gợi ý thực đơn. Nếu chọn một tuần, các ngày sau sẽ tự chạy tiếp từ ngày này.</PlannerFieldLabel>
                                <DatePicker value={startDate} onChange={value => { if (value) { setStartDate(value.startOf('day')); _clearSuggestions(); } }} format='DD/MM/YYYY' style={{ width: '100%' }} />
                            </div>
                            <div>
                                <PlannerFieldLabel helpKey='members' label={<><TeamOutlined /> Ăn cùng</>}>Chọn người ăn cùng để tính khẩu phần, món thích, món tránh và mục tiêu riêng của từng người.</PlannerFieldLabel>
                                <Select mode='multiple' allowClear maxTagCount='responsive' maxTagPlaceholder={renderResponsiveTagPlaceholder} dropdownRender={createSelectedOptionsDropdownRender({ mode: 'multiple', value: memberIds, options: memberOptions })} value={memberIds} onChange={value => { setMemberIds(value); _clearSuggestions(); }} options={memberOptions} placeholder='Tất cả thành viên' style={{ width: '100%' }} />
                                {selectedMemberHealth.length > 0 && <Stack wrap='wrap' gap={5} style={{ marginTop: 7 }}>
                                    {selectedMemberHealth.map(item => <Tag key={item.member.id} color={item.meta.color} style={{ marginRight: 0 }}>
                                        {item.member.name}: {item.meta.label}{(item.profile?.status === 'sick' || item.profile?.status === 'recovering') && item.profile.statusNote ? ` - ${item.profile.statusNote}` : ''}
                                    </Tag>)}
                                </Stack>}
                            </div>
                        </div>
                    </div>

                    <div className='smart-planner-section'>
                        <div className='smart-planner-section-title'><ThunderboltOutlined /> Ưu tiên theo</div>
                        <Typography.Text type='secondary' style={{ display: 'block', fontSize: 11, lineHeight: '16px', marginBottom: 10 }}>Chọn những điều bạn quan tâm để xếp hạng món theo đó. Bỏ chọn hết để cân bằng mọi tiêu chí. Không loại món nào.</Typography.Text>
                        <div className='smart-planner-presets'>
                            {priorityOptions.map(option => {
                                const active = priorities.includes(option.value);
                                return <button
                                    key={option.value}
                                    type='button'
                                    aria-pressed={active}
                                    className={`smart-planner-preset${active ? ' is-active' : ''}`}
                                    onClick={() => _onPriorityToggle(option.value)}
                                >
                                    <span className='smart-planner-preset-name'>{option.icon} {option.label}</span>
                                    <span className='smart-planner-preset-hint'>{option.hint}</span>
                                </button>;
                            })}
                        </div>
                    </div>

                    <Collapse
                        ghost
                        className='smart-planner-advanced'
                        items={[{
                            key: 'advanced',
                            label: <span className='smart-planner-advanced-head'>
                                <span className='smart-planner-advanced-title'><SlidersOutlined /> Tinh chỉnh nâng cao</span>
                                <span className='smart-planner-advanced-sub'>{advancedEnabled ? 'Đang dùng ngân sách, tồn kho và loại trừ món/nguyên liệu' : 'Đang tắt; planner bỏ qua toàn bộ thiết lập nâng cao'}</span>
                            </span>,
                            children: <>
                                <Box style={{ border: '1px solid rgba(19,168,168,0.16)', background: advancedEnabled ? '#ecfdf5' : '#f8fafc', borderRadius: 8, padding: 10, marginBottom: advancedEnabled ? 12 : 0 }}>
                                    <PlannerFieldLabel helpKey='advanced-enabled' label={<><SlidersOutlined /> Dùng thiết lập nâng cao</>}>Khi tắt, planner bỏ qua ngân sách ngày/tuần, giới hạn mua thêm, công tắc dùng dữ liệu tồn kho và danh sách loại trừ món/nguyên liệu trong phần này. Dị ứng và chặn cứng trong hồ sơ thành viên vẫn luôn được áp dụng.</PlannerFieldLabel>
                                    <div className='smart-planner-toggle-row'>
                                        <Typography.Text style={{ fontSize: 12, lineHeight: '18px', color: '#334155' }}>{advancedEnabled ? 'Đang áp dụng thiết lập nâng cao' : 'Đang bỏ qua thiết lập nâng cao'}</Typography.Text>
                                        <Switch checked={advancedEnabled} onChange={checked => { setAdvancedEnabled(checked); _clearSuggestions(); }} />
                                    </div>
                                </Box>

                                {advancedEnabled ? <>
                                    <div className='smart-planner-adv-group'>
                                        <p className='smart-planner-adv-group-title'>Ngân sách và tồn kho</p>
                                        <div className='smart-planner-adv-grid'>
                                            <div>
                                                <PlannerFieldLabel helpKey='budget' label={<><DollarCircleOutlined /> Ngân sách mỗi ngày</>}>Ngân sách được kiểm tra trên tổng cả ngày. Sáng, trưa và tối có thể dùng số tiền khác nhau, miễn tổng chi phí ước tính của ngày phù hợp ngân sách.</PlannerFieldLabel>
                                                <InputNumber min={0} step={10000} value={dailyBudget} addonAfter='đ' onChange={value => { setDailyBudget(Number(value ?? 0)); _clearSuggestions(); }} style={{ width: '100%' }} />
                                            </div>
                                            {scope === 'week' && <div>
                                                <PlannerFieldLabel helpKey='weekly-budget' label={<><DollarCircleOutlined /> Ngân sách tuần</>}>Nếu đặt ngân sách tuần, phần tổng kết sẽ cảnh báo khi chi phí cần mua của cả tuần vượt mức này.</PlannerFieldLabel>
                                                <InputNumber min={0} step={50000} value={weeklyBudget} addonAfter='đ' onChange={value => { setWeeklyBudget(value === null ? undefined : Number(value)); _clearSuggestions(); }} placeholder='Không giới hạn' style={{ width: '100%' }} />
                                            </div>}
                                            <div>
                                                <PlannerFieldLabel helpKey='extra-spend' label='Mua thêm tối đa'>Giới hạn tham chiếu cho phần cần mua thêm sau khi trừ tồn kho. Bật Tiết kiệm để giới hạn này có trọng lượng rõ hơn trong xếp hạng.</PlannerFieldLabel>
                                                <InputNumber min={0} step={10000} value={maxExtraSpend} addonAfter='đ' onChange={value => { setMaxExtraSpend(value === null ? undefined : Number(value)); _clearSuggestions(); }} placeholder='Không giới hạn' style={{ width: '100%' }} />
                                            </div>
                                        </div>
                                        <Box style={{ marginTop: 10 }}>
                                            <PlannerFieldLabel helpKey='inventory-aware' label={<><ShoppingCartOutlined /> Dùng dữ liệu tồn kho</>}>Khi bật, Tiết kiệm ưu tiên số tiền cần mua thêm và Inventory ưu tiên nguyên liệu đang có hoặc gần hết hạn. Khi tắt, Tiết kiệm dùng tổng chi phí món.</PlannerFieldLabel>
                                            <div className='smart-planner-toggle-row'>
                                                <Typography.Text style={{ fontSize: 12, lineHeight: '18px', color: '#334155' }}>{inventoryAwareBudget ? 'Đang dùng tồn kho và phần cần mua' : 'Đang bỏ qua dữ liệu tồn kho'}</Typography.Text>
                                                <Switch checked={inventoryAwareBudget} onChange={checked => { setInventoryAwareBudget(checked); _clearSuggestions(); }} />
                                            </div>
                                        </Box>
                                    </div>

                                    <div className='smart-planner-adv-group'>
                                        <p className='smart-planner-adv-group-title'>Loại trừ rõ ràng</p>
                                        <div className='smart-planner-adv-grid'>
                                            <div>
                                                <PlannerFieldLabel helpKey='avoid-dishes' label={<><StopOutlined /> Loại trừ món</>}>Món được chọn ở đây sẽ bị loại khỏi gợi ý. Nếu một món khác ghép món này vào công thức, món đó cũng bị loại.</PlannerFieldLabel>
                                                <Select mode='multiple' allowClear maxTagCount='responsive' maxTagPlaceholder={renderResponsiveTagPlaceholder} dropdownRender={createSelectedOptionsDropdownRender({ mode: 'multiple', value: avoidDishIds, options: dishOptions })} value={avoidDishIds} onChange={value => { setAvoidDishIds(value); _clearSuggestions(); }} options={dishOptions} placeholder='Chọn món cần loại trừ' style={{ width: '100%' }} />
                                            </div>
                                            <div>
                                                <PlannerFieldLabel helpKey='avoid-ingredients' label={<><FilterOutlined /> Loại trừ nguyên liệu</>}>Món chứa bất kỳ nguyên liệu nào ở đây sẽ bị loại khỏi gợi ý. Đây là bộ lọc rõ ràng của lần lập thực đơn này.</PlannerFieldLabel>
                                                <Select mode='multiple' allowClear maxTagCount='responsive' maxTagPlaceholder={renderResponsiveTagPlaceholder} dropdownRender={createSelectedOptionsDropdownRender({ mode: 'multiple', value: avoidIngredientIds, options: ingredientOptions })} value={avoidIngredientIds} onChange={value => { setAvoidIngredientIds(value); _clearSuggestions(); }} options={ingredientOptions} placeholder='Chọn nguyên liệu cần loại trừ' style={{ width: '100%' }} />
                                            </div>
                                        </div>
                                    </div>
                                </> : <Box style={{ marginTop: 10, border: '1px dashed rgba(15,23,42,0.14)', borderRadius: 8, background: '#fff', padding: 10 }}>
                                    <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '18px' }}>Các ưu tiên nhanh phía trên vẫn hoạt động. Riêng ngân sách nâng cao, giới hạn mua thêm, công tắc dùng tồn kho và loại trừ món/nguyên liệu đang được bỏ qua.</Typography.Text>
                                </Box>}
                            </>,
                        }]}
                    />

                    <Box style={{ border: '1px solid #e6fffb', background: '#f6ffed', borderRadius: 8, padding: 10 }}>
                        <Stack wrap='wrap' gap={6}>
                            <Tag color='blue' style={{ marginRight: 0 }}>{targetServings} phần/bữa</Tag>
                            <Tag color='cyan' style={{ marginRight: 0 }}>{selectedMembers.length || members.length} thành viên</Tag>
                            {scope !== 'cook_now' && mealSlots.map(slot => <Tag key={`range-${slot}`} color='default' style={{ marginRight: 0 }}>{mealSlotMeta[slot].label} {mealSlotDishRanges[slot].min}-{mealSlotDishRanges[slot].max} món</Tag>)}
                            {selectedMemberHealth.filter(item => item.profile?.status === 'sick' || item.profile?.status === 'recovering').map(item => <Tag key={`health-${item.member.id}`} color={item.meta.color} style={{ marginRight: 0 }}>{item.member.name}: {item.meta.label}</Tag>)}
                            {hasSuggested && <Tag color='green' style={{ marginRight: 0 }}>{scope === 'cook_now' ? visibleCookNowRecommendations.length : plannedDishCount} lượt món</Tag>}
                        </Stack>
                    </Box>
                    <Button type='primary' icon={<ThunderboltOutlined />} loading={isSuggesting} disabled={dishes.length === 0} onClick={() => _suggestMeals()}>{scope === 'cook_now' ? 'Gợi ý món nấu ngay' : 'Gợi ý thực đơn'}</Button>
                </div>
            </Box>

            <Box className='smart-planner-panel'>
                {dishes.length === 0 ? <Empty description='Chưa có món ăn để lập thực đơn' /> : isSuggesting ? <Box style={{ minHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Spin tip='Đang gợi ý thực đơn...' />
                </Box> : !hasSuggested ? <Empty description='Chọn tiêu chí rồi nhấn Gợi ý' image={Empty.PRESENTED_IMAGE_SIMPLE} /> : <Stack direction='column' gap={12}>
                    {planSummary && <Box className='smart-planner-summary'>
                        <div className='smart-planner-summary-head'>
                            <span className='smart-planner-summary-score' style={{ color: getScoreColor(planSummary.totalScore) === 'orange' ? '#c2410c' : '#0f766e' }}>{planSummary.totalScore}%</span>
                            <div className='smart-planner-summary-headtext'>
                                <div className='smart-planner-summary-verdict'>{getScoreVerdict(planSummary.totalScore)}</div>
                                <div className='smart-planner-summary-caption'>Điểm thực đơn · {scope === 'week' ? 'cả tuần' : 'cả ngày'}</div>
                            </div>
                            <Button type='text' aria-label='Giải thích các chỉ số tổng kết' icon={<QuestionCircleOutlined />} onClick={() => _toggleHelp('summary')} style={{ width: 28, height: 28, paddingInline: 0, borderRadius: 999, color: openHelpKey === 'summary' ? '#13a8a8' : '#6b7280', flexShrink: 0 }} />
                        </div>
                        <div className='smart-planner-summary-stats'>
                            <div>
                                <span className='smart-planner-stat-label'>Tổng chi phí</span>
                                <span className='smart-planner-stat-value'>{planSummary.totalCostLabel}</span>
                            </div>
                            <div>
                                <span className='smart-planner-stat-label'>Cần mua thêm</span>
                                <span className='smart-planner-stat-value'>{planSummary.shoppingCostLabel}</span>
                            </div>
                            {planSummary.averageNutritionScore !== undefined && <div>
                                <span className='smart-planner-stat-label'>Dinh dưỡng</span>
                                <span className='smart-planner-stat-value'>{planSummary.averageNutritionScore}%</span>
                            </div>}
                            {planSummary.averageHouseholdScore !== undefined && <div>
                                <span className='smart-planner-stat-label'>Khẩu vị nhà</span>
                                <span className='smart-planner-stat-value'>{planSummary.averageHouseholdScore}%</span>
                            </div>}
                            <div>
                                <span className='smart-planner-stat-label'>Độ tin cậy</span>
                                <span className='smart-planner-stat-value'>{getConfidenceVerdict(planSummary.confidence)}</span>
                            </div>
                        </div>
                        {openHelpKey === 'summary' && <dl className='smart-planner-summary-help'>
                            <dt>Điểm thực đơn</dt>
                            <dd>Điểm trung bình của các món đã chọn, tổng hợp từ mọi tiêu chí đang bật. Càng cao càng hợp các tiêu chí của bạn.</dd>
                            <dt>Tổng chi phí</dt>
                            <dd>Ước tính tiền nguyên liệu cho toàn bộ món trong {scope === 'week' ? 'cả tuần' : 'cả ngày'}, tính theo giá đã lưu.</dd>
                            <dt>Cần mua thêm</dt>
                            <dd>Phần tiền còn phải mua sau khi trừ nguyên liệu đang có trong kho.</dd>
                            <dt>Dinh dưỡng</dt>
                            <dd>Mức khớp trung bình với mục tiêu dinh dưỡng đã chọn. Chỉ hiện khi bật tiêu chí dinh dưỡng và đã chọn mục tiêu.</dd>
                            <dt>Khẩu vị nhà</dt>
                            <dd>Độ hợp trung bình với hồ sơ các thành viên đang chọn. Chỉ hiện khi bật tiêu chí khẩu vị nhà.</dd>
                            <dt>Độ tin cậy</dt>
                            <dd>Mức đầy đủ của dữ liệu (giá, dinh dưỡng, thời gian nấu). Thiếu dữ liệu làm giảm độ tin cậy dù điểm vẫn cao.</dd>
                        </dl>}
                        {planSummary.warnings.length > 0 && <div className='smart-planner-summary-warn'>
                            <ExclamationCircleOutlined />
                            <span>{planSummary.warnings.slice(0, 4).join(' · ')}</span>
                        </div>}
                    </Box>}

                    {scope === 'cook_now' ? <React.Fragment>
                        {visibleCookNowRecommendations.length === 0 ? <Empty description='Không có món phù hợp ràng buộc hiện tại' image={Empty.PRESENTED_IMAGE_SIMPLE} /> : <React.Fragment>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(238px, 1fr))', gap: 10 }}>
                                {visibleCookNowCategories.map(category => <CookNowRecommendationCard key={category.key} category={category} item={category.recommendation} />)}
                            </div>
                            <Box style={{ border: '1px solid rgba(15,23,42,0.08)', borderRadius: 8, background: '#fff', padding: 10 }}>
                                <div className='smart-planner-ranking-head'>
                                    <BarChartOutlined />
                                    <span className='smart-planner-ranking-title'>Xếp hạng món phù hợp</span>
                                    <Tag color='default' style={{ marginRight: 0 }}>{Math.min(12, visibleCookNowRecommendations.length)} món</Tag>
                                </div>
                                <Stack direction='column' gap={8} style={{ width: '100%' }}>
                                    {visibleCookNowRecommendations.slice(0, 12).map(item => <CookNowRecommendationCard key={item.dish.id} item={item} />)}
                                </Stack>
                            </Box>
                        </React.Fragment>}
                    </React.Fragment> : <React.Fragment>
                        <Stack justify='space-between' align='center' gap={8} wrap='wrap'>
                            <Typography.Text type='secondary' style={{ fontSize: 12, lineHeight: '18px' }}>Mỗi ngày có vài phương án. Bấm đổi để bốc tổ hợp món hợp lệ khác.</Typography.Text>
                            <Button icon={<ThunderboltOutlined />} loading={isSuggesting} onClick={() => _suggestMeals(true)}>Đổi phương án khác</Button>
                        </Stack>
                        {plannedDays.map(day => <Box key={day.date.format('YYYY-MM-DD')} style={{ border: '1px solid rgba(19,168,168,0.12)', borderRadius: 8, padding: 10, background: '#fff' }}>
                            <Stack align='center' gap={8} style={{ marginBottom: 10 }}>
                                <CalendarOutlined style={{ color: '#13a8a8' }} />
                                <Typography.Text strong style={{ color: '#111827', fontSize: 15 }}>{DateHelpers.formatWithCapitalizedWeekday(day.date.toDate(), 'dddd, DD/MM/YYYY')}</Typography.Text>
                            </Stack>
                            {(day.alternatives?.length ?? 0) === 0 ? <Empty description='Không có phương án phù hợp ràng buộc' image={Empty.PRESENTED_IMAGE_SIMPLE} /> : <>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 8, marginBottom: 10 }}>
                                    {day.alternatives?.map(alternative => <PlannerAlternativeCard key={alternative.id} alternative={alternative} date={day.date} selected={alternative.id === day.selectedAlternativeId} />)}
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 8 }}>
                                    {mealSlots.map(slot => <div key={slot} style={{ width: '100%', minWidth: 0 }}>
                                        <Typography.Text strong style={{ display: 'block', color: mealSlotMeta[slot].tone, fontSize: 12, lineHeight: '16px', marginBottom: 5 }}>{mealSlotMeta[slot].label}</Typography.Text>
                                        {getDayItemsBySlot(day)[slot].length === 0
                                            ? <PlannerDishCard slot={slot} date={day.date} />
                                            : <Stack direction='column' gap={6} style={{ width: '100%' }}>
                                                {getDayItemsBySlot(day)[slot].map(item => <PlannerDishCard key={`${slot}-${item.dish.id}`} item={item} slot={slot} date={day.date} />)}
                                            </Stack>}
                                    </div>)}
                                </div>
                            </>}
                        </Box>)}
                        <Button fullwidth type='primary' icon={<CheckCircleOutlined />} disabled={plannedDishCount === 0} onClick={() => setShoppingPreviewOpen(true)}>Áp dụng {scope === 'week' ? 'thực đơn tuần' : 'thực đơn ngày'}</Button>
                    </React.Fragment>}
                </Stack>}
            </Box>
        </div>
    </Box>;
};

export default SmartMealPlannerScreen;
