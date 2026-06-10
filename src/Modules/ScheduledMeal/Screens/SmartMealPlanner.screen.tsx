import { AppstoreOutlined, BarChartOutlined, CalendarOutlined, CheckCircleOutlined, ClockCircleOutlined, DollarCircleOutlined, EyeOutlined, FilterOutlined, HeartOutlined, PlayCircleOutlined, QuestionCircleOutlined, ShoppingCartOutlined, SlidersOutlined, StopOutlined, TeamOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { DateHelpers } from '@common/Helpers/DateHelper';
import { DishDurationHelper } from '@common/Helpers/DishDurationHelper';
import { DishServingHelper } from '@common/Helpers/DishServingHelper';
import type { HouseholdDishSuitability } from '@common/Helpers/HouseholdSuitabilityHelper';
import { IngredientPriceHelper } from '@common/Helpers/IngredientPriceHelper';
import { InventoryHelper } from '@common/Helpers/InventoryHelper';
import { NutritionGoalHelper, type NutritionGoalMatch } from '@common/Helpers/NutritionGoalHelper';
import { Button } from '@components/Button';
import { Collapse } from '@components/Collapse';
import { Image } from '@components/Image';
import { Box } from '@components/Layout/Box';
import { Stack } from '@components/Layout/Stack';
import { useMessage } from '@components/Message';
import { Modal } from '@components/Modal';
import { Popover } from '@components/Popover';
import { Tag } from '@components/Tag';
import { Typography } from '@components/Typography';
import { useScreenTitle } from '@hooks';
import { DishImageWidget } from '@modules/Dishes/Screens/DishesManageIngredient/DishImage.widget';
import { ShoppingListAddWidget } from '@modules/ShoppingList/Screens/ShoppingListAdd.widget';
import { SmartPlannerEngine, type SmartPlannerCookNowCategory, type SmartPlannerDishRecommendation, type SmartPlannerMealSlot, type SmartPlannerPlanResult, type SmartPlannerPlanSummary, type SmartPlannerPreset, type SmartPlannerShoppingMode, type SmartPlannerVarietyMode } from '@modules/ScheduledMeal/Helpers/SmartPlannerEngine';
import { DISH_TAGS, Dishes } from '@store/Models/Dishes';
import { IngredientUnit } from '@store/Models/Ingredient';
import { ScheduledMeal } from '@store/Models/ScheduledMeal';
import { rememberScheduledMealName } from '@store/Reducers/AppContextReducer';
import { startCooking } from '@store/Reducers/CookingSessionReducer';
import { addScheduledMeal, editScheduledMeal } from '@store/Reducers/ScheduledMealReducer';
import { selectCookingSessions, selectDishes, selectDishesById, selectHouseholdMembers, selectIngredients, selectIngredientsById, selectInventory, selectInventoryHealthConfig, selectNutritionGoals, selectScheduledMeals, selectSelectedHouseholdMemberIds } from '@store/Selectors';
import { DatePicker, Empty, InputNumber, Select, Segmented, Spin, Switch } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { nanoid } from 'nanoid';
import React, { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import DietPlanIcon from '../../../../assets/icons/diet-plan.png';

type PlannerScope = 'cook_now' | 'day' | 'week';
type MealSlot = 'breakfast' | 'lunch' | 'dinner';
type CriteriaKey = 'budget' | 'nutrition' | 'member';

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

type PlannedDayAlternative = {
    id: string;
    label: string;
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
.smart-planner-title {
    display: block;
    color: #111827;
    font-size: 24px;
    line-height: 30px;
    overflow-wrap: anywhere;
}
@media (max-width: 560px) {
    .smart-planner-title {
        font-size: 21px;
        line-height: 27px;
    }
}
`;

const criteriaOptions: Array<{ value: CriteriaKey; label: string }> = [
    { value: 'budget', label: 'Ngân sách' },
    { value: 'nutrition', label: 'Dinh dưỡng' },
    { value: 'member', label: 'Khẩu vị nhà' },
];

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

const shoppingModeOptions: Array<{ value: SmartPlannerShoppingMode; label: string }> = [
    { value: 'normal', label: 'Đi mua bình thường' },
    { value: 'small_top_up', label: 'Mua bổ sung ít' },
    { value: 'no_shopping', label: 'Không đi mua' },
];

const presetOptions: Array<{ value: SmartPlannerPreset; label: string; icon: React.ReactNode; hint: string }> = [
    { value: 'balanced', label: 'Cân bằng', icon: <AppstoreOutlined />, hint: 'Cân đối mọi tiêu chí' },
    { value: 'quick', label: 'Nhanh', icon: <ClockCircleOutlined />, hint: 'Ưu tiên món nấu nhanh' },
    { value: 'budget', label: 'Tiết kiệm', icon: <DollarCircleOutlined />, hint: 'Ưu tiên chi phí thấp' },
    { value: 'healthy', label: 'Lành mạnh', icon: <BarChartOutlined />, hint: 'Ưu tiên hợp dinh dưỡng' },
    { value: 'family_fit', label: 'Hợp gia đình', icon: <TeamOutlined />, hint: 'Ưu tiên khẩu vị cả nhà' },
    { value: 'use_inventory', label: 'Dùng đồ sẵn có', icon: <ShoppingCartOutlined />, hint: 'Ưu tiên đồ đang có trong kho' },
    { value: 'more_variety', label: 'Đa dạng hơn', icon: <ThunderboltOutlined />, hint: 'Tăng đa dạng, tránh lặp món' },
];

const varietyModeOptions: Array<{ value: SmartPlannerVarietyMode; label: string }> = [
    { value: 'familiar', label: 'Quen thuộc' },
    { value: 'balanced', label: 'Cân bằng' },
    { value: 'more_variety', label: 'Đa dạng hơn' },
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

const getAlternativeItems = (alternative: PlannedDayAlternative): PlannedDish[] => [alternative.breakfast, alternative.lunch, alternative.dinner].filter((item): item is PlannedDish => Boolean(item));

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
    const [searchParams] = useSearchParams();
    const dishes = useSelector(selectDishes);
    const ingredients = useSelector(selectIngredients);
    const ingredientsById = useSelector(selectIngredientsById);
    const inventoryItems = useSelector(selectInventory);
    const inventoryConfig = useSelector(selectInventoryHealthConfig);
    const members = useSelector(selectHouseholdMembers);
    const selectedHouseholdMemberIds = useSelector(selectSelectedHouseholdMemberIds);
    const nutritionGoals = useSelector(selectNutritionGoals);
    const scheduledMeals = useSelector(selectScheduledMeals);
    const cookingSessions = useSelector(selectCookingSessions);
    const dishesById = useSelector(selectDishesById);
    const [scope, setScope] = useState<PlannerScope>('cook_now');
    const routeDateValue = searchParams.get('date');
    const [startDate, setStartDate] = useState<Dayjs>(() => parseRouteDate(routeDateValue));
    const [dailyBudget, setDailyBudget] = useState<number>(150000);
    const [weeklyBudget, setWeeklyBudget] = useState<number | undefined>();
    const [inventoryAwareBudget, setInventoryAwareBudget] = useState(true);
    const [hardConstraintsEnabled, setHardConstraintsEnabled] = useState(false);
    const [maxCookingMinutes, setMaxCookingMinutes] = useState<number | undefined>();
    const [maxExtraSpend, setMaxExtraSpend] = useState<number | undefined>(100000);
    const [shoppingMode, setShoppingMode] = useState<SmartPlannerShoppingMode>('normal');
    const [preset, setPreset] = useState<SmartPlannerPreset>('balanced');
    const [varietyMode, setVarietyMode] = useState<SmartPlannerVarietyMode>('balanced');
    const [preferExpiring, setPreferExpiring] = useState(false);
    const [cookNowMealSlot, setCookNowMealSlot] = useState<SmartPlannerMealSlot>('any');
    const [avoidIngredientIds, setAvoidIngredientIds] = useState<string[]>([]);
    const [requiredExpiringIngredientIds, setRequiredExpiringIngredientIds] = useState<string[]>([]);
    const [requiredTags, setRequiredTags] = useState<string[]>([]);
    const [nutritionGoalId, setNutritionGoalId] = useState<string | undefined>(() => nutritionGoals[0]?.id);
    const [memberIds, setMemberIds] = useState<string[]>(() => selectedHouseholdMemberIds);
    const [criteria, setCriteria] = useState<CriteriaKey[]>(['budget', 'nutrition', 'member']);
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

    React.useEffect(() => {
        if (!nutritionGoalId && nutritionGoals[0]?.id) setNutritionGoalId(nutritionGoals[0].id);
    }, [nutritionGoalId, nutritionGoals]);

    const selectedMembers = useMemo(() => {
        const ids = memberIds.length > 0 ? new Set(memberIds) : new Set(selectedHouseholdMemberIds);
        const selected = members.filter(member => ids.has(member.id));
        return selected.length > 0 ? selected : members;
    }, [memberIds, members, selectedHouseholdMemberIds]);

    const selectedNutritionGoal = useMemo(() => nutritionGoals.find(goal => goal.id === nutritionGoalId), [nutritionGoalId, nutritionGoals]);
    const ingredientOptions = useMemo(() => ingredients.map(ingredient => ({ value: ingredient.id, label: ingredient.name })), [ingredients]);
    const tagOptions = useMemo(() => {
        const tags = new Set<string>(DISH_TAGS);
        dishes.forEach(dish => dish.tags?.forEach(tag => tags.add(tag)));
        return Array.from(tags).sort((a, b) => a.localeCompare(b)).map(tag => ({ value: tag, label: tag }));
    }, [dishes]);
    const expiringIngredientOptions = useMemo(() => ingredients
        .filter(ingredient => {
            const expiry = InventoryHelper.nearestExpiryBatch(inventoryItems[ingredient.id], ingredient, inventoryConfig);
            return InventoryHelper.isUrgentExpiry(expiry?.daysLeft, inventoryConfig);
        })
        .map(ingredient => {
            const expiry = InventoryHelper.nearestExpiryBatch(inventoryItems[ingredient.id], ingredient, inventoryConfig);
            const badge = InventoryHelper.expiryBadge(expiry?.daysLeft ?? null);
            return { value: ingredient.id, label: badge ? `${ingredient.name} (${badge.label})` : ingredient.name };
        }), [ingredients, inventoryConfig, inventoryItems]);
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

    const plannedDishCount = plannedDays.reduce((sum, day) => sum + (day.breakfast ? 1 : 0) + (day.lunch ? 1 : 0) + (day.dinner ? 1 : 0), 0);
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

    const _buildSmartPlannerResult = React.useCallback((): SmartPlannerPlanResult => SmartPlannerEngine.buildSmartPlannerResult({
        scope,
        startDate,
        memberIds: selectedMembers.map(member => member.id),
        mealSlots: scope === 'cook_now' ? [cookNowMealSlot] : ['breakfast', 'lunch', 'dinner'],
        dailyBudget,
        weeklyBudget,
        maxExtraSpend,
        maxCookMinutes: maxCookingMinutes,
        strictTime: Boolean(maxCookingMinutes) && (hardConstraintsEnabled || scope === 'cook_now'),
        shoppingMode,
        nutritionGoalId,
        preferExpiring,
        varietyMode,
        preset,
        requiredTags: hardConstraintsEnabled ? requiredTags : [],
        avoidedIngredientIds: hardConstraintsEnabled ? avoidIngredientIds : [],
        requiredExpiringIngredientIds: hardConstraintsEnabled ? requiredExpiringIngredientIds : [],
        criteria,
        inventoryAwareBudget,
        dishes,
        ingredients,
        ingredientsById,
        inventoryItems,
        inventoryConfig,
        members: selectedMembers,
        nutritionGoals,
        scheduledMeals,
        cookingSessions,
    }), [avoidIngredientIds, cookNowMealSlot, cookingSessions, criteria, dailyBudget, dishes, hardConstraintsEnabled, ingredients, ingredientsById, inventoryAwareBudget, inventoryConfig, inventoryItems, maxCookingMinutes, maxExtraSpend, nutritionGoalId, nutritionGoals, preferExpiring, preset, requiredExpiringIngredientIds, requiredTags, scheduledMeals, scope, selectedMembers, shoppingMode, startDate, varietyMode, weeklyBudget]);

    const visibleCookNowRecommendations = useMemo(() => {
        const dismissed = new Set(dismissedDishIds);
        return rankedRecommendations.filter(item => !dismissed.has(item.dish.id));
    }, [dismissedDishIds, rankedRecommendations]);

    const visibleCookNowCategories = useMemo(() => SmartPlannerEngine.buildCookNowCategories(visibleCookNowRecommendations), [visibleCookNowRecommendations]);

    const _suggestMeals = () => {
        setIsSuggesting(true);
        setHasSuggested(true);
        setShoppingPreviewOpen(false);
        setScheduleSelection(undefined);
        setShoppingRecommendation(undefined);
        window.setTimeout(() => {
            const result = _buildSmartPlannerResult();
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

    const _onShoppingModeChange = (value: SmartPlannerShoppingMode) => {
        setShoppingMode(value);
        _clearSuggestions();
    };

    const _onPresetChange = (value: SmartPlannerPreset) => {
        setPreset(value);
        _clearSuggestions();
    };

    const _selectAlternative = (date: Dayjs, alternativeId: string) => {
        setPlannedDays(days => days.map(day => {
            if (!day.date.isSame(date, 'day')) return day;
            const selected = day.alternatives?.find(alternative => alternative.id === alternativeId);
            if (!selected) return day;
            return {
                ...day,
                selectedAlternativeId: alternativeId,
                breakfast: selected.breakfast,
                lunch: selected.lunch,
                dinner: selected.dinner,
            };
        }));
    };

    const _appendToScheduledMeal = (date: Dayjs, itemsBySlot: Partial<Record<MealSlot, { dish: Dishes }>>): 'created' | 'updated' | 'empty' => {
        const dishIds = (['breakfast', 'lunch', 'dinner'] as MealSlot[]).flatMap(slot => itemsBySlot[slot] ? [itemsBySlot[slot]!.dish.id] : []);
        if (dishIds.length === 0) return 'empty';

        const dishServings = dishIds.reduce((result, dishId) => ({ ...result, [dishId]: targetServings }), {} as Record<string, number>);
        const existing = scheduledMeals.find(meal => dayjs(meal.plannedDate).isSame(date, 'day'));
        if (existing) {
            const nextMeals = (['breakfast', 'lunch', 'dinner'] as MealSlot[]).reduce((result, slot) => {
                const current = existing.meals?.[slot] ?? [];
                const nextDishId = itemsBySlot[slot]?.dish.id;
                result[slot] = nextDishId ? Array.from(new Set([...current, nextDishId])) : current;
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
            breakfast: itemsBySlot.breakfast ? [itemsBySlot.breakfast.dish.id] : [],
            lunch: itemsBySlot.lunch ? [itemsBySlot.lunch.dish.id] : [],
            dinner: itemsBySlot.dinner ? [itemsBySlot.dinner.dish.id] : [],
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
            const result = _appendToScheduledMeal(day.date, {
                breakfast: day.breakfast,
                lunch: day.lunch,
                dinner: day.dinner,
            });
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

    const _scheduleCookNowSelection = () => {
        if (!scheduleSelection) return;
        const itemsBySlot: Partial<Record<MealSlot, { dish: Dishes }>> = { [scheduleSelection.slot]: scheduleSelection.item };
        const result = _appendToScheduledMeal(scheduleSelection.date, itemsBySlot);
        setScheduleSelection(undefined);
        if (result === 'updated') message.success('Đã thêm món vào thực đơn có sẵn');
        if (result === 'created') message.success('Đã tạo thực đơn từ gợi ý');
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

    const PlannerInfoTag = ({ color, title, description, children }: { color: string; title: React.ReactNode; description: React.ReactNode; children: React.ReactNode }) => <Popover
        trigger='click'
        placement='top'
        title={title}
        content={<Typography.Text style={{ display: 'block', maxWidth: 260, fontSize: 12, lineHeight: '18px' }}>{description}</Typography.Text>}
    >
        <span
            role='button'
            tabIndex={0}
            onClick={event => event.stopPropagation()}
            onKeyDown={event => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                event.stopPropagation();
                event.currentTarget.click();
            }}
            style={{ display: 'inline-flex', cursor: 'pointer' }}
        >
            <Tag color={color} style={{ marginRight: 0, cursor: 'pointer' }}>{children}</Tag>
        </span>
    </Popover>;

    const DetailSection = ({ title, description, children }: { title: React.ReactNode; description: React.ReactNode; children: React.ReactNode }) => <Box style={{ border: '1px solid rgba(15,23,42,0.08)', borderRadius: 8, padding: 12, background: '#fff' }}>
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
            style={{ border: `1px solid ${meta.border}`, borderRadius: 8, padding: 10, background: meta.background, minWidth: 0, cursor: 'pointer' }}
        >
            <div style={{ display: 'grid', gridTemplateColumns: '46px minmax(0, 1fr)', gap: 9, alignItems: 'start' }}>
                <DishImageWidget src={item.dish.image} width={46} height={46} borderRadius={8} fallbackIconSize={24} showBrokenLabel={false} />
                <div style={{ minWidth: 0 }}>
                    <Stack justify='space-between' align='flex-start' gap={8}>
                        <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 14, lineHeight: '19px', overflowWrap: 'anywhere' }}>{item.dish.name}</Typography.Text>
                        <PlannerInfoTag
                            color={getScoreColor(item.score)}
                            title='Điểm gợi ý'
                            description='Điểm tổng hợp dùng để xếp món trong thực đơn thông minh. Điểm này cộng trừ theo bữa ăn, thời gian nấu, tổng ngân sách ngày, dinh dưỡng, khẩu vị nhà mình và tránh lặp món.'
                        >{item.score}%</PlannerInfoTag>
                    </Stack>
                    <Stack wrap='wrap' gap={5} style={{ marginTop: 6 }}>
                        {item.costLabel && <PlannerInfoTag
                            color='gold'
                            title='Ước tính chi phí'
                            description='Khoảng tiền ước tính từ giá nguyên liệu đã lưu cho món này. Nếu một số nguyên liệu chưa có giá, con số có thể thấp hơn thực tế.'
                        >{item.costLabel}</PlannerInfoTag>}
                        {item.shoppingCostLabel && <PlannerInfoTag
                            color='green'
                            title='Cần mua thêm'
                            description='Số tiền ước tính cần mua thêm sau khi trừ nguyên liệu đang có trong kho. Nếu là 0đ, dữ liệu kho cho thấy món này đã đủ nguyên liệu.'
                        >Mua {item.shoppingCostLabel}</PlannerInfoTag>}
                        {item.nutritionLabel && <PlannerInfoTag
                            color='cyan'
                            title='Khớp mục tiêu dinh dưỡng'
                            description={selectedNutritionGoal ? `${item.nutritionLabel} là số tiêu chí món này khớp trong mục tiêu "${selectedNutritionGoal.name}". App tính từ dữ liệu dinh dưỡng nguyên liệu và khẩu phần đang chọn.` : `${item.nutritionLabel} là số tiêu chí dinh dưỡng món này đang khớp trong mục tiêu đã chọn.`}
                        >{item.nutritionLabel}</PlannerInfoTag>}
                        {item.suitabilityScore !== undefined && <PlannerInfoTag
                            color={item.suitabilityScore >= 70 ? 'green' : 'volcano'}
                            title='Độ hợp nhà mình'
                            description='Điểm trung bình cho các thành viên đang chọn, dựa trên món thích, món tránh, nguyên liệu thích/tránh, tag món và mục tiêu riêng của từng người.'
                        >Nhà mình {item.suitabilityScore}%</PlannerInfoTag>}
                    </Stack>
                    {item.reasons.length > 0 && <Typography.Text type='secondary' style={{ display: 'block', fontSize: 11, lineHeight: '16px', marginTop: 6 }}>{item.reasons.join(' · ')}</Typography.Text>}
                </div>
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
        style={{ border: selected ? '1px solid #13a8a8' : '1px solid rgba(15,23,42,0.08)', borderRadius: 8, padding: 10, background: selected ? '#e6fffb' : '#fff', cursor: 'pointer', minWidth: 0 }}
    >
        <Stack justify='space-between' align='flex-start' gap={8} style={{ width: '100%' }}>
            <div style={{ minWidth: 0 }}>
                <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 13, lineHeight: '18px' }}>{alternative.label}</Typography.Text>
                <Typography.Text type='secondary' style={{ display: 'block', fontSize: 11, lineHeight: '16px', marginTop: 2 }}>{getAlternativeItems(alternative).map(item => item.dish.name).join(' · ')}</Typography.Text>
            </div>
            <Tag color={getScoreColor(alternative.totalScore)} style={{ marginRight: 0 }}>{alternative.totalScore}%</Tag>
        </Stack>
        <Stack wrap='wrap' gap={5} style={{ marginTop: 8 }}>
            <Tag color='gold' style={{ marginRight: 0 }}>Tổng {alternative.totalCostLabel}</Tag>
            <Tag color='green' style={{ marginRight: 0 }}>Cần mua {alternative.shoppingCostLabel}</Tag>
            {alternative.nutritionScore !== undefined && <Tag color='cyan' style={{ marginRight: 0 }}>Dinh dưỡng {alternative.nutritionScore}%</Tag>}
            {alternative.suitabilityScore !== undefined && <Tag color='blue' style={{ marginRight: 0 }}>Nhà mình {alternative.suitabilityScore}%</Tag>}
        </Stack>
        {alternative.reasons.length > 0 && <Typography.Text type='secondary' style={{ display: 'block', fontSize: 11, lineHeight: '16px', marginTop: 7 }}>{alternative.reasons.join(' · ')}</Typography.Text>}
    </Box>;

    const CookNowRecommendationCard = ({ item, category }: { item?: SmartPlannerDishRecommendation; category?: SmartPlannerCookNowCategory }) => {
        if (!item) return <Box style={{ border: '1px dashed rgba(15,23,42,0.14)', borderRadius: 8, background: '#fafafa', padding: 10, minHeight: 132 }}>
            <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 13, lineHeight: '18px' }}>{category?.label ?? 'Gợi ý'}</Typography.Text>
            <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '18px', marginTop: 6 }}>Chưa có món phù hợp</Typography.Text>
        </Box>;

        return <Box style={{ border: '1px solid rgba(19,168,168,0.14)', borderRadius: 8, background: '#fff', padding: 10, minWidth: 0 }}>
            {category && <Typography.Text strong style={{ display: 'block', color: '#13a8a8', fontSize: 12, lineHeight: '16px', marginBottom: 7 }}>{category.label}</Typography.Text>}
            <div style={{ display: 'grid', gridTemplateColumns: '52px minmax(0, 1fr)', gap: 10, alignItems: 'start' }}>
                <DishImageWidget src={item.dish.image} width={52} height={52} borderRadius={8} fallbackIconSize={26} showBrokenLabel={false} />
                <div style={{ minWidth: 0 }}>
                    <Stack justify='space-between' align='flex-start' gap={8}>
                        <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 14, lineHeight: '19px', overflowWrap: 'anywhere' }}>{item.dish.name}</Typography.Text>
                        <Tag color={getScoreColor(item.score)} style={{ marginRight: 0 }}>{item.score}%</Tag>
                    </Stack>
                    <Stack wrap='wrap' gap={5} style={{ marginTop: 6 }}>
                        {item.totalMinutes !== undefined && item.totalMinutes > 0 && <Tag color='blue' style={{ marginRight: 0 }}>{DishDurationHelper.formatMinutes(item.totalMinutes)}</Tag>}
                        {item.shoppingCostLabel && <Tag color='green' style={{ marginRight: 0 }}>Mua {item.shoppingCostLabel}</Tag>}
                        {item.nutritionLabel && <Tag color='cyan' style={{ marginRight: 0 }}>{item.nutritionLabel}</Tag>}
                        {item.suitabilityScore !== undefined && <Tag color={item.suitabilityScore >= 70 ? 'green' : 'orange'} style={{ marginRight: 0 }}>Nhà mình {item.suitabilityScore}%</Tag>}
                    </Stack>
                    {item.reasons.length > 0 && <Typography.Text type='secondary' style={{ display: 'block', fontSize: 11, lineHeight: '16px', marginTop: 6 }}>{item.reasons.join(' · ')}</Typography.Text>}
                    {(item.warnings ?? []).length > 0 && <Typography.Text type='secondary' style={{ display: 'block', color: '#ad4e00', fontSize: 11, lineHeight: '16px', marginTop: 4 }}>{(item.warnings ?? []).slice(0, 2).join(' · ')}</Typography.Text>}
                </div>
            </div>
            <Stack wrap='wrap' gap={6} style={{ marginTop: 10 }}>
                <Button icon={<PlayCircleOutlined />} onClick={() => _startCookingRecommendation(item)}>Nấu</Button>
                <Button icon={<CalendarOutlined />} onClick={() => setScheduleSelection({ item, date: startDate, slot: _displaySlotFromCookNow() })}>Lên lịch</Button>
                <Button icon={<ShoppingCartOutlined />} disabled={(item.missingIngredientCount ?? 0) === 0} onClick={() => setShoppingRecommendation(item)}>Mua thiếu</Button>
                <Button icon={<EyeOutlined />} onClick={() => _openRecommendationDetail(item)}>Chi tiết</Button>
                <Button type='text' icon={<StopOutlined />} onClick={() => _dismissRecommendation(item)}>Ẩn</Button>
            </Stack>
        </Box>;
    };

    const suggestionDetailModal = detailSelection ? <Modal
        open={Boolean(detailSelection)}
        onCancel={() => setDetailSelection(undefined)}
        title='Chi tiết gợi ý món'
        width={760}
        destroyOnClose
        footer={<Button onClick={() => setDetailSelection(undefined)}>Đóng</Button>}
        bodyStyle={{ background: '#f8fafc' }}
    >
        <Stack direction='column' gap={12} style={{ width: '100%' }}>
            <Box data-testid='smart-planner-suggestion-detail-modal' style={{ display: 'grid', gridTemplateColumns: '56px minmax(0, 1fr)', gap: 12, alignItems: 'start' }}>
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

            <DetailSection
                title='Cách tính điểm'
                description='Mỗi dòng là một dữ liệu planner đã dùng để gợi ý món. Cột điểm cho biết dữ liệu đó làm món tăng, giảm hoặc giữ nguyên điểm xếp hạng.'
            >
                <Stack direction='column' gap={8} style={{ width: '100%' }}>
                    {detailSelection.item.scoreDetails.map(detail => <Box key={`${detail.label}-${detail.value}`} style={{ border: '1px solid rgba(15,23,42,0.07)', borderRadius: 8, background: '#f8fafc', padding: 10 }}>
                        <Stack justify='space-between' align='flex-start' gap={8} wrap='wrap' style={{ width: '100%' }}>
                            <div style={{ minWidth: 0, flex: '1 1 220px' }}>
                                <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 13, lineHeight: '18px' }}>{detail.label}</Typography.Text>
                                <Typography.Text style={{ display: 'block', color: '#334155', fontSize: 12, lineHeight: '17px', marginTop: 2 }}>{detail.value}</Typography.Text>
                            </div>
                            <Tag color={getImpactColor(detail.impact)} style={{ marginRight: 0 }}>{formatImpact(detail.impact)}</Tag>
                        </Stack>
                        <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '18px', marginTop: 7 }}>{detail.description}</Typography.Text>
                    </Box>)}
                </Stack>
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
                <Stack direction='column' gap={8} style={{ width: '100%' }}>
                    <Stack wrap='wrap' gap={6}>
                        <Tag color='cyan' style={{ marginRight: 0 }}>{detailSelection.item.nutritionLabel}</Tag>
                        <Tag color='blue' style={{ marginRight: 0 }}>{formatRatioPercent(detailSelection.item.nutritionMatch.score)} gần mục tiêu</Tag>
                    </Stack>
                    {detailSelection.item.nutritionMatch.criteria.map(row => {
                        const actual = NutritionGoalHelper.formatNutrientValue(row.criterion.nutrient, row.value);
                        return <Box key={`${row.criterion.nutrient}-${row.label}`} style={{ border: '1px solid rgba(15,23,42,0.07)', borderRadius: 8, background: '#f8fafc', padding: 10 }}>
                            <Stack justify='space-between' align='flex-start' gap={8} wrap='wrap' style={{ width: '100%' }}>
                                <div style={{ minWidth: 0, flex: '1 1 220px' }}>
                                    <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 13, lineHeight: '18px' }}>{row.label}</Typography.Text>
                                    <Typography.Text style={{ display: 'block', color: '#334155', fontSize: 12, lineHeight: '17px', marginTop: 2 }}>Giá trị món: {actual}</Typography.Text>
                                </div>
                                <Tag color={row.matched ? 'green' : 'orange'} style={{ marginRight: 0 }}>{row.matched ? 'Đạt' : `${formatRatioPercent(row.score)} gần đạt`}</Tag>
                            </Stack>
                            <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '18px', marginTop: 7 }}>Tiêu chí này so giá trị thực tế của món với ngưỡng mục tiêu. Nếu chưa đạt, phần trăm cho biết món đang gần ngưỡng đến mức nào.</Typography.Text>
                        </Box>;
                    })}
                </Stack>
            </DetailSection>}

            {detailSelection.item.suitability && <DetailSection
                title='Khẩu vị nhà mình'
                description='Mỗi thành viên được chấm riêng từ hồ sơ gia đình. Điểm trung bình của các thành viên đang chọn được đưa vào điểm gợi ý.'
            >
                <Stack direction='column' gap={8} style={{ width: '100%' }}>
                    <Stack wrap='wrap' gap={6}>
                        <Tag color={detailSelection.item.suitability.averageScore >= 70 ? 'green' : 'orange'} style={{ marginRight: 0 }}>{formatPercent(detailSelection.item.suitability.averageScore)} trung bình</Tag>
                        <Tag color={detailSelection.item.suitability.warningCount > 0 ? 'volcano' : 'green'} style={{ marginRight: 0 }}>{detailSelection.item.suitability.warningCount} lưu ý</Tag>
                    </Stack>
                    {detailSelection.item.suitability.members.map(memberResult => <Box key={memberResult.member.id} style={{ border: '1px solid rgba(15,23,42,0.07)', borderRadius: 8, background: '#f8fafc', padding: 10 }}>
                        <Stack justify='space-between' align='flex-start' gap={8} wrap='wrap' style={{ width: '100%' }}>
                            <div style={{ minWidth: 0, flex: '1 1 220px' }}>
                                <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 13, lineHeight: '18px' }}>{memberResult.member.name}</Typography.Text>
                                <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '18px', marginTop: 2 }}>Điểm này so món với món thích/tránh, nguyên liệu thích/tránh, tag món và mục tiêu riêng của thành viên.</Typography.Text>
                            </div>
                            <Tag color={memberResult.tone === 'success' ? 'green' : memberResult.tone === 'warning' ? 'orange' : 'blue'} style={{ marginRight: 0 }}>{formatPercent(memberResult.score)}</Tag>
                        </Stack>
                        <Stack wrap='wrap' gap={5} style={{ marginTop: 8 }}>
                            {(memberResult.positives.length > 0 ? memberResult.positives : ['Không có điểm cộng rõ ràng']).map(text => <Tag key={`positive-${text}`} color='green' style={{ marginRight: 0 }}>{text}</Tag>)}
                            {memberResult.warnings.map(text => <Tag key={`warning-${text}`} color='volcano' style={{ marginRight: 0 }}>{text}</Tag>)}
                            {memberResult.notes.map(text => <Tag key={`note-${text}`} color='default' style={{ marginRight: 0 }}>{text}</Tag>)}
                        </Stack>
                    </Box>)}
                </Stack>
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
        <Stack direction='column' gap={12} style={{ width: '100%' }}>
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
        <Stack direction='column' gap={12} style={{ width: '100%' }}>
            <Box style={{ border: '1px solid rgba(15,23,42,0.08)', borderRadius: 8, background: '#f8fafc', padding: 10 }}>
                <Typography.Text strong style={{ display: 'block', color: '#111827', lineHeight: '20px' }}>{scheduleSelection.item.dish.name}</Typography.Text>
                <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '18px', marginTop: 3 }}>{targetServings} phần · {scheduleSelection.item.shoppingCostLabel ? `mua thêm ${scheduleSelection.item.shoppingCostLabel}` : 'chưa có chi phí mua thêm'}</Typography.Text>
            </Box>
            <div>
                <Typography.Text strong style={{ display: 'block', marginBottom: 6 }}>Ngày</Typography.Text>
                <DatePicker value={scheduleSelection.date} onChange={value => value && setScheduleSelection(current => current ? { ...current, date: value.startOf('day') } : current)} format='DD/MM/YYYY' style={{ width: '100%' }} />
            </div>
            <div>
                <Typography.Text strong style={{ display: 'block', marginBottom: 6 }}>Bữa</Typography.Text>
                <Segmented block value={scheduleSelection.slot} onChange={value => setScheduleSelection(current => current ? { ...current, slot: value as MealSlot } : current)} options={([
                    { value: 'breakfast', label: 'Sáng' },
                    { value: 'lunch', label: 'Trưa' },
                    { value: 'dinner', label: 'Tối' },
                ] as Array<{ value: MealSlot; label: string }>)} />
            </div>
        </Stack>
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

    return <Box className='smart-planner-page' data-testid='smart-meal-planner-page'>
        <style>{pageCss}</style>
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
                                <Select mode='multiple' allowClear maxTagCount='responsive' value={memberIds} onChange={value => { setMemberIds(value); _clearSuggestions(); }} options={members.map(member => ({ value: member.id, label: member.name }))} placeholder='Tất cả thành viên' style={{ width: '100%' }} />
                            </div>
                        </div>
                    </div>

                    <div className='smart-planner-section'>
                        <div className='smart-planner-section-title'><ThunderboltOutlined /> Ưu tiên theo</div>
                        <Typography.Text type='secondary' style={{ display: 'block', fontSize: 11, lineHeight: '16px', marginBottom: 10 }}>Chọn một mẫu là đủ cho hầu hết trường hợp. Mẫu chỉ đổi cách xếp hạng, không loại món nào.</Typography.Text>
                        <div className='smart-planner-presets'>
                            {presetOptions.map(option => <button
                                key={option.value}
                                type='button'
                                aria-pressed={preset === option.value}
                                className={`smart-planner-preset${preset === option.value ? ' is-active' : ''}`}
                                onClick={() => _onPresetChange(option.value)}
                            >
                                <span className='smart-planner-preset-name'>{option.icon} {option.label}</span>
                                <span className='smart-planner-preset-hint'>{option.hint}</span>
                            </button>)}
                        </div>
                    </div>

                    <Collapse
                        ghost
                        className='smart-planner-advanced'
                        items={[{
                            key: 'advanced',
                            label: <span className='smart-planner-section-title' style={{ marginBottom: 0 }}><SlidersOutlined /> Tinh chỉnh nâng cao</span>,
                            children: <>
                                <div className='smart-planner-adv-group'>
                                    <p className='smart-planner-adv-group-title'>Ngân sách</p>
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
                                            <PlannerFieldLabel helpKey='extra-spend' label='Mua thêm tối đa'>Dùng cho Nấu ngay và chế độ mua bổ sung ít để ưu tiên món cần mua ít sau khi trừ tồn kho.</PlannerFieldLabel>
                                            <InputNumber min={0} step={10000} value={maxExtraSpend} addonAfter='đ' onChange={value => { setMaxExtraSpend(value === null ? undefined : Number(value)); _clearSuggestions(); }} placeholder='Không giới hạn' style={{ width: '100%' }} />
                                        </div>
                                    </div>
                                    <Box style={{ marginTop: 10 }}>
                                        <PlannerFieldLabel helpKey='inventory-aware' label={<><ShoppingCartOutlined /> Tính ngân sách theo tủ lạnh</>}>Khi bật, ngân sách ưu tiên số tiền cần mua thêm sau khi trừ nguyên liệu đã có trong kho. Khi tắt, ngân sách dùng tổng chi phí món.</PlannerFieldLabel>
                                        <div className='smart-planner-toggle-row'>
                                            <Typography.Text style={{ fontSize: 12, lineHeight: '18px', color: '#334155' }}>{inventoryAwareBudget ? 'Đang dùng chi phí cần mua' : 'Đang dùng tổng chi phí món'}</Typography.Text>
                                            <Switch checked={inventoryAwareBudget} onChange={checked => { setInventoryAwareBudget(checked); _clearSuggestions(); }} />
                                        </div>
                                    </Box>
                                </div>

                                <div className='smart-planner-adv-group'>
                                    <p className='smart-planner-adv-group-title'>Sở thích &amp; cách mua</p>
                                    <div className='smart-planner-adv-grid'>
                                        <div>
                                            <PlannerFieldLabel helpKey='shopping-mode' label={<><ShoppingCartOutlined /> Cách mua sắm</>}>Không đi mua sẽ loại món thiếu nguyên liệu bắt buộc. Mua bổ sung ít ưu tiên phần cần mua thêm thấp.</PlannerFieldLabel>
                                            <Select value={shoppingMode} onChange={_onShoppingModeChange} options={shoppingModeOptions} style={{ width: '100%' }} />
                                        </div>
                                        <div>
                                            <PlannerFieldLabel helpKey='variety' label='Độ đa dạng'>Càng đa dạng, planner càng trừ điểm món, nguyên liệu chính hoặc cách nấu bị lặp gần đây.</PlannerFieldLabel>
                                            <Select value={varietyMode} onChange={value => { setVarietyMode(value); _clearSuggestions(); }} options={varietyModeOptions} style={{ width: '100%' }} />
                                        </div>
                                        <div>
                                            <PlannerFieldLabel helpKey='nutrition' label={<><BarChartOutlined /> Mục tiêu dinh dưỡng</>}>Nếu bật tiêu chí dinh dưỡng, món gần với mục tiêu đã chọn sẽ được ưu tiên hơn.</PlannerFieldLabel>
                                            <Select allowClear value={nutritionGoalId} onChange={value => { setNutritionGoalId(value); _clearSuggestions(); }} options={nutritionGoals.map(goal => ({ value: goal.id, label: goal.name }))} placeholder='Chọn mục tiêu' style={{ width: '100%' }} />
                                        </div>
                                        <div>
                                            <PlannerFieldLabel helpKey='criteria' label={<><HeartOutlined /> Tiêu chí tính điểm</>}>Bật hoặc tắt nhóm dữ liệu được phép tham gia chấm điểm. Mẫu ưu tiên chỉ đổi trọng số của các tiêu chí đang bật; tiêu chí đã tắt sẽ không cộng hoặc trừ điểm.</PlannerFieldLabel>
                                            <Select mode='multiple' value={criteria} onChange={value => { setCriteria(value); _clearSuggestions(); }} options={criteriaOptions} style={{ width: '100%' }} />
                                        </div>
                                    </div>
                                    <Box style={{ marginTop: 10 }}>
                                        <PlannerFieldLabel helpKey='prefer-expiring' label='Ưu tiên đồ sắp hết hạn'>Khi bật, món dùng nguyên liệu gần hết hạn trong kho sẽ được cộng điểm rõ hơn.</PlannerFieldLabel>
                                        <div className='smart-planner-toggle-row'>
                                            <Typography.Text style={{ fontSize: 12, lineHeight: '18px', color: '#334155' }}>{preferExpiring ? 'Đang ưu tiên dùng sớm' : 'Ưu tiên bình thường'}</Typography.Text>
                                            <Switch checked={preferExpiring} onChange={checked => { setPreferExpiring(checked); _clearSuggestions(); }} />
                                        </div>
                                    </Box>
                                </div>

                                <div className='smart-planner-adv-group'>
                                    <p className='smart-planner-adv-group-title'>Bộ lọc bắt buộc</p>
                                    <Box style={{ border: '1px solid rgba(15,23,42,0.08)', background: hardConstraintsEnabled ? '#fff7e6' : '#f8fafc', borderRadius: 8, padding: 10 }}>
                                        <PlannerFieldLabel helpKey='hard-constraints' label={<><FilterOutlined /> Bật bộ lọc bắt buộc</>}>Khi bật, các điều kiện dưới đây là bộ lọc bắt buộc. Món không đạt sẽ bị loại hẳn, không chỉ bị trừ điểm. Dị ứng và nguyên liệu chặn cứng từ hồ sơ gia đình luôn được áp dụng kể cả khi tắt bộ lọc này.</PlannerFieldLabel>
                                        <div className='smart-planner-toggle-row'>
                                            <Typography.Text style={{ fontSize: 12, lineHeight: '18px', color: '#334155' }}>{hardConstraintsEnabled ? 'Đang lọc bắt buộc' : 'Đang tắt bộ lọc cứng'}</Typography.Text>
                                            <Switch checked={hardConstraintsEnabled} onChange={checked => { setHardConstraintsEnabled(checked); _clearSuggestions(); }} />
                                        </div>
                                    </Box>
                                    {hardConstraintsEnabled && <div className='smart-planner-adv-grid' style={{ marginTop: 10 }}>
                                        <div>
                                            <PlannerFieldLabel helpKey='max-time' label='Thời gian nấu tối đa'>Món không có thời gian nấu hoặc vượt số phút này sẽ bị loại.</PlannerFieldLabel>
                                            <InputNumber min={5} step={5} value={maxCookingMinutes} addonAfter='phút' onChange={value => { setMaxCookingMinutes(value === null ? undefined : Number(value)); _clearSuggestions(); }} placeholder='Không giới hạn' style={{ width: '100%' }} />
                                        </div>
                                        <div>
                                            <PlannerFieldLabel helpKey='avoid-ingredients' label='Tránh nguyên liệu'>Món chứa bất kỳ nguyên liệu nào ở đây sẽ bị loại.</PlannerFieldLabel>
                                            <Select mode='multiple' allowClear maxTagCount='responsive' value={avoidIngredientIds} onChange={value => { setAvoidIngredientIds(value); _clearSuggestions(); }} options={ingredientOptions} placeholder='Chọn nguyên liệu cần tránh' style={{ width: '100%' }} />
                                        </div>
                                        <div>
                                            <PlannerFieldLabel helpKey='expiring-ingredients' label='Bắt buộc đồ sắp hết hạn'>Món phải dùng các nguyên liệu sắp hết hạn đã chọn.</PlannerFieldLabel>
                                            <Select mode='multiple' allowClear maxTagCount='responsive' value={requiredExpiringIngredientIds} onChange={value => { setRequiredExpiringIngredientIds(value); _clearSuggestions(); }} options={expiringIngredientOptions} placeholder='Chọn nguyên liệu sắp hết hạn' style={{ width: '100%' }} />
                                        </div>
                                        <div>
                                            <PlannerFieldLabel helpKey='required-tags' label='Bắt buộc tag món'>Món phải có các tag này. Có thể nhập tag như Vegetarian hoặc Low-carb nếu món đã dùng tag đó.</PlannerFieldLabel>
                                            <Select mode='tags' allowClear maxTagCount='responsive' value={requiredTags} onChange={value => { setRequiredTags(value); _clearSuggestions(); }} options={tagOptions} placeholder='Ví dụ: Salad, Vegetarian, Low-carb' style={{ width: '100%' }} />
                                        </div>
                                    </div>}
                                </div>
                            </>,
                        }]}
                    />

                    <Box style={{ border: '1px solid #e6fffb', background: '#f6ffed', borderRadius: 8, padding: 10 }}>
                        <Stack wrap='wrap' gap={6}>
                            <Tag color='blue' style={{ marginRight: 0 }}>{targetServings} phần/bữa</Tag>
                            <Tag color='cyan' style={{ marginRight: 0 }}>{selectedMembers.length || members.length} thành viên</Tag>
                            {hasSuggested && <Tag color='green' style={{ marginRight: 0 }}>{scope === 'cook_now' ? visibleCookNowRecommendations.length : plannedDishCount} lượt món</Tag>}
                        </Stack>
                    </Box>
                    <Button type='primary' icon={<ThunderboltOutlined />} loading={isSuggesting} disabled={dishes.length === 0} onClick={_suggestMeals}>{scope === 'cook_now' ? 'Gợi ý món nấu ngay' : 'Gợi ý thực đơn'}</Button>
                </div>
            </Box>

            <Box className='smart-planner-panel'>
                {dishes.length === 0 ? <Empty description='Chưa có món ăn để lập thực đơn' /> : isSuggesting ? <Box style={{ minHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Spin tip='Đang gợi ý thực đơn...' />
                </Box> : !hasSuggested ? <Empty description='Chọn tiêu chí rồi nhấn Gợi ý' image={Empty.PRESENTED_IMAGE_SIMPLE} /> : <Stack direction='column' gap={12}>
                    {planSummary && <Box style={{ border: '1px solid rgba(19,168,168,0.12)', borderRadius: 8, background: '#f6ffed', padding: 10 }}>
                        <Stack wrap='wrap' gap={6}>
                            <Tag color={getScoreColor(planSummary.totalScore)} style={{ marginRight: 0 }}>Điểm {planSummary.totalScore}%</Tag>
                            <Tag color='gold' style={{ marginRight: 0 }}>Tổng {planSummary.totalCostLabel}</Tag>
                            <Tag color='green' style={{ marginRight: 0 }}>Cần mua {planSummary.shoppingCostLabel}</Tag>
                            {planSummary.averageNutritionScore !== undefined && <Tag color='cyan' style={{ marginRight: 0 }}>Dinh dưỡng {planSummary.averageNutritionScore}%</Tag>}
                            {planSummary.averageHouseholdScore !== undefined && <Tag color='blue' style={{ marginRight: 0 }}>Nhà mình {planSummary.averageHouseholdScore}%</Tag>}
                            <Tag color={planSummary.confidence >= 76 ? 'green' : 'orange'} style={{ marginRight: 0 }}>Tin cậy {planSummary.confidence}%</Tag>
                        </Stack>
                        {planSummary.warnings.length > 0 && <Typography.Text type='secondary' style={{ display: 'block', color: '#ad4e00', fontSize: 12, lineHeight: '18px', marginTop: 7 }}>{planSummary.warnings.slice(0, 4).join(' · ')}</Typography.Text>}
                    </Box>}

                    {scope === 'cook_now' ? <React.Fragment>
                        {visibleCookNowRecommendations.length === 0 ? <Empty description='Không có món phù hợp ràng buộc hiện tại' image={Empty.PRESENTED_IMAGE_SIMPLE} /> : <React.Fragment>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(238px, 1fr))', gap: 10 }}>
                                {visibleCookNowCategories.map(category => <CookNowRecommendationCard key={category.key} category={category} item={category.recommendation} />)}
                            </div>
                            <Box style={{ border: '1px solid rgba(15,23,42,0.08)', borderRadius: 8, background: '#fff', padding: 10 }}>
                                <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 14, lineHeight: '19px', marginBottom: 8 }}>Xếp hạng món phù hợp</Typography.Text>
                                <Stack direction='column' gap={8} style={{ width: '100%' }}>
                                    {visibleCookNowRecommendations.slice(0, 12).map(item => <CookNowRecommendationCard key={item.dish.id} item={item} />)}
                                </Stack>
                            </Box>
                        </React.Fragment>}
                    </React.Fragment> : <React.Fragment>
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
                                    {(['breakfast', 'lunch', 'dinner'] as MealSlot[]).map(slot => <div key={slot}>
                                        <Typography.Text strong style={{ display: 'block', color: mealSlotMeta[slot].tone, fontSize: 12, lineHeight: '16px', marginBottom: 5 }}>{mealSlotMeta[slot].label}</Typography.Text>
                                        <PlannerDishCard item={day[slot]} slot={slot} date={day.date} />
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
