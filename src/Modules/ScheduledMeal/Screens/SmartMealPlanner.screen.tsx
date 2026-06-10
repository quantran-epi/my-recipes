import { BarChartOutlined, CalendarOutlined, CheckCircleOutlined, DollarCircleOutlined, QuestionCircleOutlined, TeamOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { CostEstimateHelper } from '@common/Helpers/CostEstimateHelper';
import { DateHelpers } from '@common/Helpers/DateHelper';
import { DishDurationHelper } from '@common/Helpers/DishDurationHelper';
import { DishNutritionHelper } from '@common/Helpers/DishNutritionHelper';
import { HouseholdSuitabilityHelper, type HouseholdDishSuitability } from '@common/Helpers/HouseholdSuitabilityHelper';
import { IngredientPriceHelper } from '@common/Helpers/IngredientPriceHelper';
import { NutritionGoalHelper, type NutritionGoalMatch } from '@common/Helpers/NutritionGoalHelper';
import { Button } from '@components/Button';
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
import { Dishes } from '@store/Models/Dishes';
import { ScheduledMeal } from '@store/Models/ScheduledMeal';
import { rememberScheduledMealName } from '@store/Reducers/AppContextReducer';
import { addScheduledMeal } from '@store/Reducers/ScheduledMealReducer';
import { selectDishes, selectHouseholdMembers, selectIngredients, selectIngredientsById, selectNutritionGoals, selectSelectedHouseholdMemberIds } from '@store/Selectors';
import { DatePicker, Empty, InputNumber, Select, Segmented, Spin } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { nanoid } from 'nanoid';
import React, { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import DietPlanIcon from '../../../../assets/icons/diet-plan.png';

type PlannerScope = 'day' | 'week';
type MealSlot = 'breakfast' | 'lunch' | 'dinner';
type CriteriaKey = 'budget' | 'nutrition' | 'member';

type PlannerScoreDetail = {
    label: string;
    value: string;
    impact: number;
    description: string;
}

type PlannedDish = {
    dish: Dishes;
    score: number;
    reasons: string[];
    costLabel?: string;
    costAverage?: number;
    mealBudget?: number;
    nutritionLabel?: string;
    nutritionGoalName?: string;
    nutritionMatch?: NutritionGoalMatch;
    suitabilityScore?: number;
    suitability?: HouseholdDishSuitability;
    scoreDetails: PlannerScoreDetail[];
}

type PlannerDetailSelection = {
    item: PlannedDish;
    slot: MealSlot;
    date: Dayjs;
}

type PlannedDay = {
    date: Dayjs;
    breakfast?: PlannedDish;
    lunch?: PlannedDish;
    dinner?: PlannedDish;
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
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 12px;
    align-items: end;
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

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

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

const getAverageCost = (dish: Dishes, ingredients, dishes: Dishes[]) => {
    const estimate = CostEstimateHelper.estimateDish(dish, ingredients, dishes);
    if (!CostEstimateHelper.hasPrice(estimate.total)) return null;
    return { min: estimate.total.min, max: estimate.total.max, currency: estimate.total.currency, average: (estimate.total.min + estimate.total.max) / 2 };
};

const getSlotScore = (dish: Dishes, slot: MealSlot): { score: number; reason?: string } => {
    const tags = dish.tags ?? [];
    if (slot === 'breakfast') {
        if (tags.includes('Ăn sáng')) return { score: 16, reason: 'hợp bữa sáng' };
        const minutes = DishDurationHelper.getTotalMinutes(dish.duration);
        if (minutes > 0 && minutes <= 25) return { score: 9, reason: 'nấu nhanh buổi sáng' };
        return { score: -2 };
    }
    if (tags.includes('Món chính')) return { score: 12, reason: 'món chính' };
    if (tags.includes('Canh') || tags.includes('Xào')) return { score: 7, reason: 'dễ ghép bữa' };
    return { score: 0 };
};

export const SmartMealPlannerScreen: React.FC = () => {
    useScreenTitle({ value: 'Lập thực đơn', deps: [] });
    const dispatch = useDispatch();
    const message = useMessage();
    const [searchParams] = useSearchParams();
    const dishes = useSelector(selectDishes);
    const ingredients = useSelector(selectIngredients);
    const ingredientsById = useSelector(selectIngredientsById);
    const members = useSelector(selectHouseholdMembers);
    const selectedHouseholdMemberIds = useSelector(selectSelectedHouseholdMemberIds);
    const nutritionGoals = useSelector(selectNutritionGoals);
    const [scope, setScope] = useState<PlannerScope>('day');
    const routeDateValue = searchParams.get('date');
    const [startDate, setStartDate] = useState<Dayjs>(() => parseRouteDate(routeDateValue));
    const [dailyBudget, setDailyBudget] = useState<number>(150000);
    const [nutritionGoalId, setNutritionGoalId] = useState<string | undefined>(() => nutritionGoals[0]?.id);
    const [memberIds, setMemberIds] = useState<string[]>(() => selectedHouseholdMemberIds);
    const [criteria, setCriteria] = useState<CriteriaKey[]>(['budget', 'nutrition', 'member']);
    const [plannedDays, setPlannedDays] = useState<PlannedDay[]>([]);
    const [hasSuggested, setHasSuggested] = useState(false);
    const [isSuggesting, setIsSuggesting] = useState(false);
    const [openHelpKey, setOpenHelpKey] = useState<string>();
    const [detailSelection, setDetailSelection] = useState<PlannerDetailSelection>();

    React.useEffect(() => {
        if (!nutritionGoalId && nutritionGoals[0]?.id) setNutritionGoalId(nutritionGoals[0].id);
    }, [nutritionGoalId, nutritionGoals]);

    const selectedMembers = useMemo(() => {
        const ids = memberIds.length > 0 ? new Set(memberIds) : new Set(selectedHouseholdMemberIds);
        const selected = members.filter(member => ids.has(member.id));
        return selected.length > 0 ? selected : members;
    }, [memberIds, members, selectedHouseholdMemberIds]);

    const selectedNutritionGoal = useMemo(() => nutritionGoals.find(goal => goal.id === nutritionGoalId), [nutritionGoalId, nutritionGoals]);
    const dayCount = scope === 'week' ? 7 : 1;
    const targetServings = Math.max(1, Math.round(selectedMembers.reduce((sum, member) => sum + (member.portionPreference ?? 1), 0) || 2));

    const _clearSuggestions = React.useCallback(() => {
        setPlannedDays([]);
        setHasSuggested(false);
        setDetailSelection(undefined);
    }, []);

    React.useEffect(() => {
        const routeDate = parseRouteDate(routeDateValue);
        setStartDate(current => {
            if (current.isSame(routeDate, 'day')) return current;
            _clearSuggestions();
            return routeDate;
        });
    }, [routeDateValue, _clearSuggestions]);

    const _buildPlan = React.useCallback((): PlannedDay[] => {
        const usedDishIds = new Set<string>();
        const enabledCriteria = new Set(criteria);

        const scoreDish = (dish: Dishes, slot: MealSlot): PlannedDish => {
            const reasons: string[] = [];
            const scoreDetails: PlannerScoreDetail[] = [{
                label: 'Điểm nền',
                value: '46 điểm',
                impact: 46,
                description: 'Mỗi món bắt đầu từ một điểm nền để món chưa có nhiều dữ liệu vẫn có thể được xếp hạng. Các tiêu chí bên dưới sẽ cộng hoặc trừ thêm vào điểm này.',
            }];
            let score = 46;
            const slotScore = getSlotScore(dish, slot);
            score += slotScore.score;
            if (slotScore.reason) reasons.push(slotScore.reason);
            scoreDetails.push({
                label: 'Độ hợp bữa ăn',
                value: slotScore.reason ? `${mealSlotMeta[slot].label}: ${slotScore.reason}` : `${mealSlotMeta[slot].label}: không có tag phù hợp rõ ràng`,
                impact: slotScore.score,
                description: 'So khớp món với bữa đang lập. Bữa sáng ưu tiên tag Ăn sáng hoặc món nấu nhanh; bữa trưa và tối ưu tiên món chính, canh hoặc món dễ ghép bữa.',
            });

            const minutes = DishDurationHelper.getTotalMinutes(dish.duration);
            let durationImpact = 0;
            if (minutes > 0 && minutes <= 45) durationImpact += 5;
            if (minutes > 90) durationImpact -= 7;
            score += durationImpact;
            if (minutes > 0) reasons.push(DishDurationHelper.formatMinutes(minutes));
            scoreDetails.push({
                label: 'Thời gian nấu',
                value: minutes > 0 ? DishDurationHelper.formatMinutes(minutes) : 'Chưa có thời gian nấu',
                impact: durationImpact,
                description: 'Món nấu trong 45 phút hoặc ít hơn được cộng điểm vì dễ đưa vào lịch hằng ngày. Món trên 90 phút bị trừ điểm vì khó dùng cho bữa thông thường.',
            });

            const cost = getAverageCost(dish, ingredients, dishes);
            let costAverage: number | undefined;
            let mealBudget: number | undefined;
            if (enabledCriteria.has('budget')) {
                mealBudget = Math.max(1, dailyBudget / 3);
                if (cost) {
                    costAverage = cost.average;
                    if (cost.average <= mealBudget) {
                        score += 17;
                        scoreDetails.push({
                            label: 'Ngân sách',
                            value: `${IngredientPriceHelper.formatRange(cost)} so với mục tiêu ${IngredientPriceHelper.formatCurrency(mealBudget)}/bữa`,
                            impact: 17,
                            description: 'Món nằm trong phần ngân sách ước tính cho một bữa, nên được ưu tiên khi tiêu chí Ngân sách đang bật.',
                        });
                        reasons.push('vừa ngân sách');
                    } else {
                        const overBudgetImpact = -Math.min(24, (cost.average / mealBudget - 1) * 18);
                        score += overBudgetImpact;
                        scoreDetails.push({
                            label: 'Ngân sách',
                            value: `${IngredientPriceHelper.formatRange(cost)} so với mục tiêu ${IngredientPriceHelper.formatCurrency(mealBudget)}/bữa`,
                            impact: overBudgetImpact,
                            description: 'Món cao hơn phần ngân sách ước tính cho một bữa, nên bị trừ điểm theo mức vượt ngân sách.',
                        });
                    }
                } else {
                    score -= 3;
                    scoreDetails.push({
                        label: 'Ngân sách',
                        value: 'Thiếu dữ liệu giá',
                        impact: -3,
                        description: 'Không đủ giá nguyên liệu để tính chi phí món này. App trừ nhẹ vì không chắc món có phù hợp ngân sách hay không.',
                    });
                    reasons.push('thiếu giá');
                }
            } else {
                scoreDetails.push({
                    label: 'Ngân sách',
                    value: 'Không dùng để xếp hạng',
                    impact: 0,
                    description: 'Tiêu chí Ngân sách đang tắt, nên chi phí món không cộng hoặc trừ điểm gợi ý.',
                });
            }

            let nutritionLabel: string | undefined;
            let nutritionMatch: NutritionGoalMatch | undefined;
            let nutritionGoalName: string | undefined;
            if (enabledCriteria.has('nutrition') && selectedNutritionGoal) {
                const nutrition = DishNutritionHelper.calculateDishNutrition(dish, dishes, ingredientsById, { targetServings });
                if (nutrition.hasNutrition) {
                    const match = NutritionGoalHelper.score(nutrition, selectedNutritionGoal);
                    const nutritionImpact = Math.round(match.score * 20);
                    score += nutritionImpact;
                    nutritionLabel = `${match.matchedCriteriaCount}/${match.totalCriteriaCount} điều`;
                    nutritionMatch = match;
                    nutritionGoalName = selectedNutritionGoal.name;
                    scoreDetails.push({
                        label: 'Mục tiêu dinh dưỡng',
                        value: `${nutritionLabel} (${formatRatioPercent(match.score)} gần mục tiêu)`,
                        impact: nutritionImpact,
                        description: `So sánh dinh dưỡng mỗi phần ăn với mục tiêu "${selectedNutritionGoal.name}". Điểm càng cao khi nhiều tiêu chí đạt và dữ liệu dinh dưỡng có độ phủ tốt.`,
                    });
                    if (match.score >= 0.7) reasons.push(selectedNutritionGoal.name);
                } else {
                    scoreDetails.push({
                        label: 'Mục tiêu dinh dưỡng',
                        value: `Thiếu dữ liệu cho ${selectedNutritionGoal.name}`,
                        impact: 0,
                        description: 'Món chưa có đủ dữ liệu dinh dưỡng từ nguyên liệu, nên tiêu chí này không cộng điểm cho món.',
                    });
                    reasons.push('thiếu dinh dưỡng');
                }
            } else {
                scoreDetails.push({
                    label: 'Mục tiêu dinh dưỡng',
                    value: 'Không dùng để xếp hạng',
                    impact: 0,
                    description: 'Tiêu chí Dinh dưỡng đang tắt hoặc chưa chọn mục tiêu, nên dữ liệu dinh dưỡng không cộng hoặc trừ điểm gợi ý.',
                });
            }

            let suitabilityScore: number | undefined;
            let suitability: HouseholdDishSuitability | undefined;
            if (enabledCriteria.has('member') && selectedMembers.length > 0) {
                suitability = HouseholdSuitabilityHelper.evaluateDishForMembers(dish, selectedMembers, dishes, ingredientsById, nutritionGoals);
                suitabilityScore = suitability.averageScore;
                const suitabilityImpact = Math.round((suitability.averageScore - 50) * 0.35);
                score += suitabilityImpact;
                scoreDetails.push({
                    label: 'Độ hợp nhà mình',
                    value: `${suitability.averageScore}% trung bình cho ${selectedMembers.length} thành viên`,
                    impact: suitabilityImpact,
                    description: 'Tính trung bình từ hồ sơ các thành viên đang chọn, gồm món thích/tránh, nguyên liệu thích/tránh, tag món và mục tiêu dinh dưỡng riêng của từng người.',
                });
                if (suitability.warningCount > 0) reasons.push(`${suitability.warningCount} lưu ý nhà mình`);
                else if (suitability.positiveCount > 0) reasons.push('hợp nhà mình');
            } else {
                scoreDetails.push({
                    label: 'Độ hợp nhà mình',
                    value: 'Không dùng để xếp hạng',
                    impact: 0,
                    description: 'Tiêu chí Khẩu vị nhà đang tắt hoặc chưa có thành viên, nên hồ sơ gia đình không cộng hoặc trừ điểm gợi ý.',
                });
            }

            if (usedDishIds.has(dish.id)) {
                score -= 42;
                scoreDetails.push({
                    label: 'Tránh lặp món',
                    value: 'Món đã được chọn trong thực đơn này',
                    impact: -42,
                    description: 'Planner trừ mạnh nếu món đã xuất hiện ở bữa trước trong cùng lần gợi ý, để thực đơn đa dạng hơn.',
                });
            } else {
                scoreDetails.push({
                    label: 'Tránh lặp món',
                    value: 'Chưa bị dùng trong thực đơn này',
                    impact: 0,
                    description: 'Món chưa xuất hiện trong các bữa đã chọn trước đó, nên không bị trừ điểm lặp món.',
                });
            }

            return {
                dish,
                score: clamp(score),
                reasons: Array.from(new Set(reasons)).slice(0, 4),
                costLabel: cost ? IngredientPriceHelper.formatRange(cost) : undefined,
                costAverage,
                mealBudget,
                nutritionLabel,
                nutritionGoalName,
                nutritionMatch,
                suitabilityScore,
                suitability,
                scoreDetails,
            };
        };

        const pickDish = (slot: MealSlot): PlannedDish | undefined => {
            const ranked = dishes
                .filter(dish => dish.isCompleted !== false)
                .map(dish => scoreDish(dish, slot))
                .sort((a, b) => b.score - a.score || a.dish.name.localeCompare(b.dish.name));
            const fresh = ranked.find(item => !usedDishIds.has(item.dish.id));
            const picked = fresh ?? ranked[0];
            if (picked) usedDishIds.add(picked.dish.id);
            return picked;
        };

        return Array.from({ length: dayCount }).map((_, index) => ({
            date: startDate.add(index, 'day').startOf('day'),
            breakfast: pickDish('breakfast'),
            lunch: pickDish('lunch'),
            dinner: pickDish('dinner'),
        }));
    }, [criteria, dailyBudget, dayCount, dishes, ingredients, ingredientsById, nutritionGoals, selectedMembers, selectedNutritionGoal, startDate, targetServings]);

    const plannedDishCount = plannedDays.reduce((sum, day) => sum + (day.breakfast ? 1 : 0) + (day.lunch ? 1 : 0) + (day.dinner ? 1 : 0), 0);

    const _suggestMeals = () => {
        setIsSuggesting(true);
        setHasSuggested(true);
        window.setTimeout(() => {
            setPlannedDays(_buildPlan());
            setIsSuggesting(false);
        }, 250);
    };

    const _createScheduledMeals = () => {
        let created = 0;
        plannedDays.forEach(day => {
            const meals: ScheduledMeal['meals'] = {
                breakfast: day.breakfast ? [day.breakfast.dish.id] : [],
                lunch: day.lunch ? [day.lunch.dish.id] : [],
                dinner: day.dinner ? [day.dinner.dish.id] : [],
            };
            const dishIds = [...meals.breakfast, ...meals.lunch, ...meals.dinner];
            if (dishIds.length === 0) return;
            const name = `Thực đơn thông minh - ${day.date.format('DD/MM')}`;
            const dishServings = dishIds.reduce((result, dishId) => ({ ...result, [dishId]: targetServings }), {} as Record<string, number>);
            dispatch(addScheduledMeal({
                id: `smart-${nanoid(10)}`,
                name,
                meals,
                dishServings,
                plannedDate: day.date.toDate(),
                createdDate: new Date(),
            }));
            dispatch(rememberScheduledMealName(name));
            created += 1;
        });
        message.success(`Đã tạo ${created} thực đơn`);
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
                            description='Điểm tổng hợp dùng để xếp món trong thực đơn thông minh. Điểm này cộng trừ theo bữa ăn, thời gian nấu, ngân sách, dinh dưỡng, khẩu vị nhà mình và tránh lặp món.'
                        >{item.score}%</PlannerInfoTag>
                    </Stack>
                    <Stack wrap='wrap' gap={5} style={{ marginTop: 6 }}>
                        {item.costLabel && <PlannerInfoTag
                            color='gold'
                            title='Ước tính chi phí'
                            description='Khoảng tiền ước tính từ giá nguyên liệu đã lưu cho món này. Nếu một số nguyên liệu chưa có giá, con số có thể thấp hơn thực tế.'
                        >{item.costLabel}</PlannerInfoTag>}
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
                    <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '18px', marginTop: 4 }}>Món này được xếp hạng cho bữa {mealSlotMeta[detailSelection.slot].label.toLowerCase()} bằng cách bắt đầu từ điểm nền, rồi cộng/trừ theo từng tiêu chí đang bật. Điểm cuối cùng được giới hạn trong khoảng 0-100.</Typography.Text>
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

    return <Box className='smart-planner-page' data-testid='smart-meal-planner-page'>
        <style>{pageCss}</style>
        {suggestionDetailModal}
        <Box className='smart-planner-hero'>
            <Stack justify='space-between' align='center' gap={12} wrap='wrap'>
                <Stack align='center' gap={10} style={{ minWidth: 0 }}>
                    <span style={{ width: 44, height: 44, borderRadius: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#e6fffb', color: '#13a8a8', border: '1px solid #87e8de', flexShrink: 0 }}>
                        <Image src={DietPlanIcon} preview={false} width={27} alt='' />
                    </span>
                    <div style={{ minWidth: 0, flex: '1 1 260px' }}>
                        <Typography.Text style={{ display: 'block', color: '#13a8a8', fontSize: 12, lineHeight: '16px', fontWeight: 800 }}>Lập thực đơn</Typography.Text>
                        <Typography.Text strong className='smart-planner-title'>Thực đơn thông minh</Typography.Text>
                        <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '18px', marginTop: 3 }}>Gợi ý bữa ngày hoặc tuần theo ngân sách, dinh dưỡng và khẩu vị từng thành viên.</Typography.Text>
                    </div>
                </Stack>
            </Stack>
        </Box>

        <div className='smart-planner-grid'>
            <Box className='smart-planner-panel'>
                <div className='smart-planner-controls'>
                    <div>
                        <PlannerFieldLabel helpKey='scope' label='Khoảng lập'>Chọn gợi ý cho một ngày hoặc cả tuần. Một tuần sẽ tạo 7 ngày liên tiếp từ ngày bắt đầu.</PlannerFieldLabel>
                        <Segmented block value={scope} onChange={value => { setScope(value as PlannerScope); _clearSuggestions(); }} options={[{ value: 'day', label: 'Một ngày' }, { value: 'week', label: 'Một tuần' }]} />
                    </div>
                    <div>
                        <PlannerFieldLabel helpKey='date' label='Ngày bắt đầu'>Ngày đầu tiên để gợi ý thực đơn. Nếu chọn một tuần, các ngày sau sẽ tự chạy tiếp từ ngày này.</PlannerFieldLabel>
                        <DatePicker value={startDate} onChange={value => { if (value) { setStartDate(value.startOf('day')); _clearSuggestions(); } }} format='DD/MM/YYYY' style={{ width: '100%' }} />
                    </div>
                    <div>
                        <PlannerFieldLabel helpKey='budget' label={<><DollarCircleOutlined /> Ngân sách mỗi ngày</>}>Mỗi ngày được chia tương đối cho sáng, trưa và tối. Món vượt ngân sách sẽ bị giảm điểm.</PlannerFieldLabel>
                        <InputNumber min={0} step={10000} value={dailyBudget} addonAfter='đ' onChange={value => { setDailyBudget(Number(value ?? 0)); _clearSuggestions(); }} style={{ width: '100%' }} />
                    </div>
                    <div>
                        <PlannerFieldLabel helpKey='nutrition' label={<><BarChartOutlined /> Mục tiêu dinh dưỡng</>}>Nếu bật tiêu chí dinh dưỡng, món gần với mục tiêu đã chọn sẽ được ưu tiên hơn.</PlannerFieldLabel>
                        <Select allowClear value={nutritionGoalId} onChange={value => { setNutritionGoalId(value); _clearSuggestions(); }} options={nutritionGoals.map(goal => ({ value: goal.id, label: goal.name }))} placeholder='Chọn mục tiêu' style={{ width: '100%' }} />
                    </div>
                    <div>
                        <PlannerFieldLabel helpKey='members' label={<><TeamOutlined /> Thành viên ăn cùng</>}>Chọn người ăn cùng để tính khẩu phần, món thích, món tránh và mục tiêu riêng của từng người.</PlannerFieldLabel>
                        <Select mode='multiple' allowClear maxTagCount='responsive' value={memberIds} onChange={value => { setMemberIds(value); _clearSuggestions(); }} options={members.map(member => ({ value: member.id, label: member.name }))} placeholder='Tất cả thành viên' style={{ width: '100%' }} />
                    </div>
                    <div>
                        <PlannerFieldLabel helpKey='criteria' label={<><ThunderboltOutlined /> Tiêu chí ưu tiên</>}>Bật hoặc tắt tiêu chí chấm điểm. Có thể ưu tiên ngân sách, dinh dưỡng, khẩu vị nhà mình hoặc kết hợp cả ba.</PlannerFieldLabel>
                        <Select mode='multiple' value={criteria} onChange={value => { setCriteria(value); _clearSuggestions(); }} options={criteriaOptions} style={{ width: '100%' }} />
                    </div>
                    <Box style={{ border: '1px solid #e6fffb', background: '#f6ffed', borderRadius: 8, padding: 10 }}>
                        <Stack wrap='wrap' gap={6}>
                            <Tag color='blue' style={{ marginRight: 0 }}>{targetServings} phần/bữa</Tag>
                            <Tag color='cyan' style={{ marginRight: 0 }}>{selectedMembers.length || members.length} thành viên</Tag>
                            {hasSuggested && <Tag color='green' style={{ marginRight: 0 }}>{plannedDishCount} lượt món</Tag>}
                        </Stack>
                    </Box>
                    <Button type='primary' icon={<ThunderboltOutlined />} loading={isSuggesting} disabled={dishes.length === 0} onClick={_suggestMeals}>Gợi ý thực đơn</Button>
                </div>
            </Box>

            <Box className='smart-planner-panel'>
                {dishes.length === 0 ? <Empty description='Chưa có món ăn để lập thực đơn' /> : isSuggesting ? <Box style={{ minHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Spin tip='Đang gợi ý thực đơn...' />
                </Box> : !hasSuggested ? <Empty description='Chọn tiêu chí rồi nhấn Gợi ý thực đơn' image={Empty.PRESENTED_IMAGE_SIMPLE} /> : <Stack direction='column' gap={12}>
                    {plannedDays.map(day => <Box key={day.date.format('YYYY-MM-DD')} style={{ border: '1px solid rgba(19,168,168,0.12)', borderRadius: 8, padding: 10, background: '#fff' }}>
                        <Stack align='center' gap={8} style={{ marginBottom: 10 }}>
                            <CalendarOutlined style={{ color: '#13a8a8' }} />
                            <Typography.Text strong style={{ color: '#111827', fontSize: 15 }}>{DateHelpers.formatWithCapitalizedWeekday(day.date.toDate(), 'dddd, DD/MM/YYYY')}</Typography.Text>
                        </Stack>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 8 }}>
                            {(['breakfast', 'lunch', 'dinner'] as MealSlot[]).map(slot => <div key={slot}>
                                <Typography.Text strong style={{ display: 'block', color: mealSlotMeta[slot].tone, fontSize: 12, lineHeight: '16px', marginBottom: 5 }}>{mealSlotMeta[slot].label}</Typography.Text>
                                <PlannerDishCard item={day[slot]} slot={slot} date={day.date} />
                            </div>)}
                        </div>
                    </Box>)}
                    <Button fullwidth type='primary' icon={<CheckCircleOutlined />} disabled={plannedDishCount === 0} onClick={_createScheduledMeals}>Áp dụng {scope === 'week' ? 'thực đơn tuần' : 'thực đơn ngày'}</Button>
                </Stack>}
            </Box>
        </div>
    </Box>;
};

export default SmartMealPlannerScreen;
