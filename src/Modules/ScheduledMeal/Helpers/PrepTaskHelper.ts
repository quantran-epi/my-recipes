import dayjs, { Dayjs } from 'dayjs';
import { DishDurationHelper } from '@common/Helpers/DishDurationHelper';
import { DishDurationPhaseKey, Dishes } from '@store/Models/Dishes';
import { ScheduledMeal, ScheduledMealSlotKey } from '@store/Models/ScheduledMeal';
import { DEFAULT_MEAL_SLOT_TIMES, MealSlotTimeKey, MealSlotTimes } from '@store/Reducers/AppContextReducer';

export type PrepTaskKind = 'unfreeze' | 'prepare';

export type PrepTask = {
    id: string;
    scheduledMealId: string;
    mealName: string;
    mealDate: string;
    slot: MealSlotTimeKey;
    slotLabel: string;
    dishId: string;
    dishName: string;
    phaseKey: DishDurationPhaseKey;
    phaseLabel: string;
    kind: PrepTaskKind;
    startAt: Dayjs;
    minutes: number;
    leadMinutes: number;
    description: string;
    methodology: string;
};

const TASK_PHASE_KEYS: PrepTaskKind[] = ['unfreeze', 'prepare'];
const PHASE_ORDER: DishDurationPhaseKey[] = ['unfreeze', 'prepare', 'cooking', 'serve', 'cooldown'];
const SLOT_LABELS: Record<ScheduledMealSlotKey, string> = {
    breakfast: 'Bữa sáng',
    lunch: 'Bữa trưa',
    dinner: 'Bữa tối',
};

const formatClock = (value: Dayjs) => value.format('HH:mm');

const formatDate = (value: Dayjs) => value.format('DD/MM');

const getPhaseMinutes = (dish: Dishes, dishesById: Map<string, Dishes>): Record<DishDurationPhaseKey, number> => {
    const totals = PHASE_ORDER.reduce((result, key) => ({ ...result, [key]: 0 }), {} as Record<DishDurationPhaseKey, number>);
    const breakdown = DishDurationHelper.getBreakdown(dish, dishesById);
    breakdown.items.forEach(item => {
        item.activeItems.forEach(active => {
            totals[active.phase.key] += active.minutes;
        });
    });
    return totals;
};

export const PrepTaskHelper = {
    getSlotDateTime(date: Date | string, slot: MealSlotTimeKey, times: MealSlotTimes = DEFAULT_MEAL_SLOT_TIMES): Dayjs {
        const clock = times[slot] ?? DEFAULT_MEAL_SLOT_TIMES[slot];
        return dayjs(date).startOf('day').hour(clock.hour).minute(clock.minute).second(0).millisecond(0);
    },

    getDishPhaseStartTimes(
        dish: Dishes,
        slotAt: Dayjs,
        dishesById: Map<string, Dishes>,
    ): Record<DishDurationPhaseKey, { startAt: Dayjs; minutes: number; leadMinutes: number }> {
        const phaseMinutes = getPhaseMinutes(dish, dishesById);
        const result = {} as Record<DishDurationPhaseKey, { startAt: Dayjs; minutes: number; leadMinutes: number }>;
        let cursor = slotAt;
        PHASE_ORDER.slice().reverse().forEach(key => {
            const minutes = phaseMinutes[key] ?? 0;
            const startAt = cursor.subtract(minutes, 'minute');
            if (minutes > 0) {
                result[key] = {
                    startAt,
                    minutes,
                    leadMinutes: slotAt.diff(startAt, 'minute'),
                };
            }
            cursor = startAt;
        });
        return result;
    },

    buildPrepTasks(
        scheduledMeals: ScheduledMeal[],
        dishesById: Map<string, Dishes>,
        windowStart: Dayjs,
        windowEnd: Dayjs,
        slotTimes: MealSlotTimes = DEFAULT_MEAL_SLOT_TIMES,
    ): PrepTask[] {
        const staleCutoff = windowStart.subtract(1, 'hour');
        const tasks = scheduledMeals.flatMap(meal => {
            return (Object.keys(SLOT_LABELS) as ScheduledMealSlotKey[]).flatMap(slot => {
                if (meal.skipMeals?.[slot]) return [];
                const slotAt = PrepTaskHelper.getSlotDateTime(meal.plannedDate, slot, slotTimes);
                if (slotAt.isBefore(windowStart, 'minute') || slotAt.isAfter(windowEnd, 'minute')) return [];
                return (meal.meals?.[slot] ?? []).flatMap(dishId => {
                    const dish = dishesById.get(dishId);
                    if (!dish) return [];
                    const phaseStarts = PrepTaskHelper.getDishPhaseStartTimes(dish, slotAt, dishesById);
                    return TASK_PHASE_KEYS.flatMap(phaseKey => {
                        const phase = DishDurationHelper.getPhase(phaseKey);
                        const timing = phaseStarts[phaseKey];
                        if (!timing || timing.minutes < 5) return [];
                        if (timing.startAt.isBefore(staleCutoff, 'minute') || timing.startAt.isAfter(windowEnd, 'minute')) return [];
                        const mealDate = dayjs(meal.plannedDate).format('YYYY-MM-DD');
                        const phaseList = PHASE_ORDER
                            .map(key => ({ key, minutes: phaseStarts[key]?.minutes ?? 0, label: DishDurationHelper.getPhase(key).shortLabel }))
                            .filter(item => item.minutes > 0)
                            .map(item => `${item.label} ${DishDurationHelper.formatMinutes(item.minutes)}`)
                            .join(' · ');
                        return [{
                            id: `${mealDate}:${meal.id}:${slot}:${dish.id}:${phaseKey}`,
                            scheduledMealId: meal.id,
                            mealName: meal.name,
                            mealDate,
                            slot,
                            slotLabel: SLOT_LABELS[slot],
                            dishId: dish.id,
                            dishName: dish.name,
                            phaseKey,
                            phaseLabel: phase.shortLabel,
                            kind: phaseKey,
                            startAt: timing.startAt,
                            minutes: timing.minutes,
                            leadMinutes: timing.leadMinutes,
                            description: `${phase.shortLabel} ${dish.name} (${SLOT_LABELS[slot]} · ${DishDurationHelper.formatMinutes(timing.leadMinutes)} trước bữa)`,
                            methodology: `${SLOT_LABELS[slot]} dự kiến lúc ${formatClock(slotAt)} ngày ${formatDate(slotAt)}. Món ${dish.name} cần ${phaseList}. Trừ ngược chuỗi này nên bắt đầu ${phase.shortLabel.toLowerCase()} lúc ${formatClock(timing.startAt)}.`,
                        }];
                    });
                });
            });
        });

        return tasks.sort((a, b) => a.startAt.valueOf() - b.startAt.valueOf() || a.dishName.localeCompare(b.dishName, 'vi'));
    },

    groupTasksByDate(tasks: PrepTask[]): Array<{ date: string; label: string; tasks: PrepTask[] }> {
        const groups = new Map<string, PrepTask[]>();
        tasks.forEach(task => {
            groups.set(task.mealDate, [...(groups.get(task.mealDate) ?? []), task]);
        });
        return Array.from(groups.entries()).map(([date, items]) => {
            const value = dayjs(date);
            const label = value.isSame(dayjs(), 'day') ? 'Hôm nay' : value.isSame(dayjs().add(1, 'day'), 'day') ? 'Ngày mai' : value.format('DD/MM');
            return { date, label, tasks: items };
        }).sort((a, b) => a.date.localeCompare(b.date));
    },
};
