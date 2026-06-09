import { BarChartOutlined, CalendarOutlined, CheckCircleOutlined, DollarCircleOutlined, PlusOutlined, TeamOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { CostEstimateHelper } from '@common/Helpers/CostEstimateHelper';
import { DishDurationHelper } from '@common/Helpers/DishDurationHelper';
import { DishNutritionHelper } from '@common/Helpers/DishNutritionHelper';
import { HouseholdSuitabilityHelper } from '@common/Helpers/HouseholdSuitabilityHelper';
import { IngredientPriceHelper } from '@common/Helpers/IngredientPriceHelper';
import { NutritionGoalHelper } from '@common/Helpers/NutritionGoalHelper';
import { Button } from '@components/Button';
import { Image } from '@components/Image';
import { Box } from '@components/Layout/Box';
import { Stack } from '@components/Layout/Stack';
import { useMessage } from '@components/Message';
import { Tag } from '@components/Tag';
import { Typography } from '@components/Typography';
import { useScreenTitle } from '@hooks';
import { DishImageWidget } from '@modules/Dishes/Screens/DishesManageIngredient/DishImage.widget';
import { Dishes } from '@store/Models/Dishes';
import { ScheduledMeal } from '@store/Models/ScheduledMeal';
import { rememberScheduledMealName } from '@store/Reducers/AppContextReducer';
import { addScheduledMeal } from '@store/Reducers/ScheduledMealReducer';
import { selectDishes, selectHouseholdMembers, selectIngredients, selectIngredientsById, selectNutritionGoals, selectSelectedHouseholdMemberIds } from '@store/Selectors';
import { DatePicker, Empty, InputNumber, Select, Segmented } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { nanoid } from 'nanoid';
import React, { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import MealsIcon from '../../../../assets/icons/meals.png';

type PlannerScope = 'day' | 'week';
type MealSlot = 'breakfast' | 'lunch' | 'dinner';
type CriteriaKey = 'budget' | 'nutrition' | 'member';

type PlannedDish = {
    dish: Dishes;
    score: number;
    reasons: string[];
    costLabel?: string;
    nutritionLabel?: string;
    suitabilityScore?: number;
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
    max-width: 1120px;
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
    grid-template-columns: minmax(260px, 340px) minmax(0, 1fr);
    gap: 12px;
}
.smart-planner-panel {
    border-radius: 8px;
    border: 1px solid rgba(15,23,42,0.08);
    background: #fff;
    box-shadow: 0 10px 24px rgba(15,23,42,0.06);
    padding: 12px;
}
@media (max-width: 860px) {
    .smart-planner-grid {
        grid-template-columns: minmax(0, 1fr);
    }
}
`;

const criteriaOptions: Array<{ value: CriteriaKey; label: string }> = [
    { value: 'budget', label: 'Ngân sách' },
    { value: 'nutrition', label: 'Dinh dưỡng' },
    { value: 'member', label: 'Khẩu vị nhà' },
];

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

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
    useScreenTitle({ value: 'Smart Meal Planner', deps: [] });
    const dispatch = useDispatch();
    const message = useMessage();
    const dishes = useSelector(selectDishes);
    const ingredients = useSelector(selectIngredients);
    const ingredientsById = useSelector(selectIngredientsById);
    const members = useSelector(selectHouseholdMembers);
    const selectedHouseholdMemberIds = useSelector(selectSelectedHouseholdMemberIds);
    const nutritionGoals = useSelector(selectNutritionGoals);
    const [scope, setScope] = useState<PlannerScope>('day');
    const [startDate, setStartDate] = useState<Dayjs>(() => dayjs().startOf('day'));
    const [dailyBudget, setDailyBudget] = useState<number>(150000);
    const [nutritionGoalId, setNutritionGoalId] = useState<string | undefined>(() => nutritionGoals[0]?.id);
    const [memberIds, setMemberIds] = useState<string[]>(() => selectedHouseholdMemberIds);
    const [criteria, setCriteria] = useState<CriteriaKey[]>(['budget', 'nutrition', 'member']);

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

    const plannedDays = useMemo<PlannedDay[]>(() => {
        const usedDishIds = new Set<string>();
        const enabledCriteria = new Set(criteria);

        const scoreDish = (dish: Dishes, slot: MealSlot): PlannedDish => {
            const reasons: string[] = [];
            let score = 46;
            const slotScore = getSlotScore(dish, slot);
            score += slotScore.score;
            if (slotScore.reason) reasons.push(slotScore.reason);

            const minutes = DishDurationHelper.getTotalMinutes(dish.duration);
            if (minutes > 0 && minutes <= 45) score += 5;
            if (minutes > 90) score -= 7;
            if (minutes > 0) reasons.push(DishDurationHelper.formatMinutes(minutes));

            const cost = getAverageCost(dish, ingredients, dishes);
            if (enabledCriteria.has('budget')) {
                const mealBudget = Math.max(1, dailyBudget / 3);
                if (cost) {
                    if (cost.average <= mealBudget) {
                        score += 17;
                        reasons.push('vừa ngân sách');
                    } else {
                        score -= Math.min(24, (cost.average / mealBudget - 1) * 18);
                    }
                } else {
                    score -= 3;
                    reasons.push('thiếu giá');
                }
            }

            let nutritionLabel: string | undefined;
            if (enabledCriteria.has('nutrition') && selectedNutritionGoal) {
                const nutrition = DishNutritionHelper.calculateDishNutrition(dish, dishes, ingredientsById, { targetServings });
                if (nutrition.hasNutrition) {
                    const match = NutritionGoalHelper.score(nutrition, selectedNutritionGoal);
                    score += Math.round(match.score * 20);
                    nutritionLabel = `${match.matchedCriteriaCount}/${match.totalCriteriaCount} điều`;
                    if (match.score >= 0.7) reasons.push(selectedNutritionGoal.name);
                } else {
                    reasons.push('thiếu dinh dưỡng');
                }
            }

            let suitabilityScore: number | undefined;
            if (enabledCriteria.has('member') && selectedMembers.length > 0) {
                const suitability = HouseholdSuitabilityHelper.evaluateDishForMembers(dish, selectedMembers, dishes, ingredientsById, nutritionGoals);
                suitabilityScore = suitability.averageScore;
                score += Math.round((suitability.averageScore - 50) * 0.35);
                if (suitability.warningCount > 0) reasons.push(`${suitability.warningCount} lưu ý nhà mình`);
                else if (suitability.positiveCount > 0) reasons.push('hợp nhà mình');
            }

            if (usedDishIds.has(dish.id)) score -= 42;

            return {
                dish,
                score: clamp(score),
                reasons: Array.from(new Set(reasons)).slice(0, 4),
                costLabel: cost ? IngredientPriceHelper.formatRange(cost) : undefined,
                nutritionLabel,
                suitabilityScore,
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
            const name = `Smart Meal Planner - ${day.date.format('DD/MM')}`;
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

    const PlannerDishCard = ({ item, slot }: { item?: PlannedDish; slot: MealSlot }) => {
        const meta = mealSlotMeta[slot];
        if (!item) return <Box style={{ border: `1px dashed ${meta.border}`, borderRadius: 8, padding: 10, background: '#fafafa' }}>
            <Typography.Text type='secondary'>Chưa có gợi ý</Typography.Text>
        </Box>;
        return <Box style={{ border: `1px solid ${meta.border}`, borderRadius: 8, padding: 10, background: meta.background, minWidth: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '46px minmax(0, 1fr)', gap: 9, alignItems: 'start' }}>
                <DishImageWidget src={item.dish.image} width={46} height={46} borderRadius={8} fallbackIconSize={24} showBrokenLabel={false} />
                <div style={{ minWidth: 0 }}>
                    <Stack justify='space-between' align='flex-start' gap={8}>
                        <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 14, lineHeight: '19px', overflowWrap: 'anywhere' }}>{item.dish.name}</Typography.Text>
                        <Tag color={item.score >= 76 ? 'green' : item.score >= 58 ? 'blue' : 'orange'} style={{ marginRight: 0 }}>{item.score}%</Tag>
                    </Stack>
                    <Stack wrap='wrap' gap={5} style={{ marginTop: 6 }}>
                        {item.costLabel && <Tag color='gold' style={{ marginRight: 0 }}>{item.costLabel}</Tag>}
                        {item.nutritionLabel && <Tag color='cyan' style={{ marginRight: 0 }}>{item.nutritionLabel}</Tag>}
                        {item.suitabilityScore !== undefined && <Tag color={item.suitabilityScore >= 70 ? 'green' : 'volcano'} style={{ marginRight: 0 }}>Nhà mình {item.suitabilityScore}%</Tag>}
                    </Stack>
                    {item.reasons.length > 0 && <Typography.Text type='secondary' style={{ display: 'block', fontSize: 11, lineHeight: '16px', marginTop: 6 }}>{item.reasons.join(' · ')}</Typography.Text>}
                </div>
            </div>
        </Box>;
    };

    return <Box className='smart-planner-page' data-testid='smart-meal-planner-page'>
        <style>{pageCss}</style>
        <Box className='smart-planner-hero'>
            <Stack justify='space-between' align='center' gap={12} wrap='wrap'>
                <Stack align='center' gap={10} style={{ minWidth: 0 }}>
                    <span style={{ width: 44, height: 44, borderRadius: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#e6fffb', color: '#13a8a8', border: '1px solid #87e8de', flexShrink: 0 }}>
                        <Image src={MealsIcon} preview={false} width={26} alt='' />
                    </span>
                    <div style={{ minWidth: 0 }}>
                        <Typography.Text style={{ display: 'block', color: '#13a8a8', fontSize: 12, lineHeight: '16px', fontWeight: 800 }}>Smart Meal Planner</Typography.Text>
                        <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 24, lineHeight: '31px' }}>Lập thực đơn thông minh</Typography.Text>
                        <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '18px', marginTop: 3 }}>Gợi ý bữa ngày hoặc tuần theo ngân sách, dinh dưỡng và khẩu vị từng thành viên.</Typography.Text>
                    </div>
                </Stack>
                <Button type='primary' icon={<PlusOutlined />} disabled={plannedDishCount === 0} onClick={_createScheduledMeals}>Tạo thực đơn</Button>
            </Stack>
        </Box>

        <div className='smart-planner-grid'>
            <Box className='smart-planner-panel'>
                <Stack direction='column' gap={12}>
                    <div>
                        <Typography.Text strong style={{ display: 'block', marginBottom: 6 }}>Khoảng lập</Typography.Text>
                        <Segmented block value={scope} onChange={value => setScope(value as PlannerScope)} options={[{ value: 'day', label: 'Một ngày' }, { value: 'week', label: 'Một tuần' }]} />
                    </div>
                    <div>
                        <Typography.Text strong style={{ display: 'block', marginBottom: 6 }}>Ngày bắt đầu</Typography.Text>
                        <DatePicker value={startDate} onChange={value => value && setStartDate(value.startOf('day'))} format='DD/MM/YYYY' style={{ width: '100%' }} />
                    </div>
                    <div>
                        <Typography.Text strong style={{ display: 'block', marginBottom: 6 }}><DollarCircleOutlined /> Ngân sách mỗi ngày</Typography.Text>
                        <InputNumber min={0} step={10000} value={dailyBudget} addonAfter='VND' onChange={value => setDailyBudget(Number(value ?? 0))} style={{ width: '100%' }} />
                    </div>
                    <div>
                        <Typography.Text strong style={{ display: 'block', marginBottom: 6 }}><BarChartOutlined /> Mục tiêu dinh dưỡng</Typography.Text>
                        <Select allowClear value={nutritionGoalId} onChange={setNutritionGoalId} options={nutritionGoals.map(goal => ({ value: goal.id, label: goal.name }))} placeholder='Chọn mục tiêu' style={{ width: '100%' }} />
                    </div>
                    <div>
                        <Typography.Text strong style={{ display: 'block', marginBottom: 6 }}><TeamOutlined /> Thành viên ăn cùng</Typography.Text>
                        <Select mode='multiple' allowClear maxTagCount='responsive' value={memberIds} onChange={setMemberIds} options={members.map(member => ({ value: member.id, label: member.name }))} placeholder='Tất cả thành viên' style={{ width: '100%' }} />
                    </div>
                    <div>
                        <Typography.Text strong style={{ display: 'block', marginBottom: 6 }}><ThunderboltOutlined /> Tiêu chí ưu tiên</Typography.Text>
                        <Select mode='multiple' value={criteria} onChange={setCriteria} options={criteriaOptions} style={{ width: '100%' }} />
                    </div>
                    <Box style={{ border: '1px solid #e6fffb', background: '#f6ffed', borderRadius: 8, padding: 10 }}>
                        <Stack wrap='wrap' gap={6}>
                            <Tag color='green' style={{ marginRight: 0 }}>{plannedDishCount} lượt món</Tag>
                            <Tag color='blue' style={{ marginRight: 0 }}>{targetServings} phần/bữa</Tag>
                            <Tag color='cyan' style={{ marginRight: 0 }}>{selectedMembers.length || members.length} thành viên</Tag>
                        </Stack>
                    </Box>
                </Stack>
            </Box>

            <Box className='smart-planner-panel'>
                {dishes.length === 0 ? <Empty description='Chưa có món ăn để lập thực đơn' /> : <Stack direction='column' gap={12}>
                    {plannedDays.map(day => <Box key={day.date.format('YYYY-MM-DD')} style={{ border: '1px solid rgba(19,168,168,0.12)', borderRadius: 8, padding: 10, background: '#fff' }}>
                        <Stack align='center' gap={8} style={{ marginBottom: 10 }}>
                            <CalendarOutlined style={{ color: '#13a8a8' }} />
                            <Typography.Text strong style={{ color: '#111827', fontSize: 15 }}>{day.date.format('dddd, DD/MM/YYYY')}</Typography.Text>
                        </Stack>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 8 }}>
                            {(['breakfast', 'lunch', 'dinner'] as MealSlot[]).map(slot => <div key={slot}>
                                <Typography.Text strong style={{ display: 'block', color: mealSlotMeta[slot].tone, fontSize: 12, lineHeight: '16px', marginBottom: 5 }}>{mealSlotMeta[slot].label}</Typography.Text>
                                <PlannerDishCard item={day[slot]} slot={slot} />
                            </div>)}
                        </div>
                    </Box>)}
                    <Button fullwidth type='primary' icon={<CheckCircleOutlined />} disabled={plannedDishCount === 0} onClick={_createScheduledMeals}>Tạo {scope === 'week' ? 'thực đơn tuần' : 'thực đơn ngày'}</Button>
                </Stack>}
            </Box>
        </div>
    </Box>;
};

export default SmartMealPlannerScreen;
