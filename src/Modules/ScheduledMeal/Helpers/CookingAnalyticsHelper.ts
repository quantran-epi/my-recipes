import { DishDurationHelper } from '@common/Helpers/DishDurationHelper';
import { CookingMealFeedbackHistoryRecord, CookingSession, CookingSessionMemberFeedback, DishCookTimeStat } from '@store/Models/CookingSession';
import { Dishes } from '@store/Models/Dishes';
import { HouseholdMemberProfile, LeftoverTrackerItem } from '@store/Reducers/AppContextReducer';
import dayjs, { Dayjs } from 'dayjs';

export type AnalyticsTimeRange = '7d' | '30d' | '90d' | 'all';

export type AnalyticsFilters = {
    range: AnalyticsTimeRange;
    memberId?: string;
};

export type TopCookedDish = {
    dishId: string;
    dishName: string;
    cookCount: number;
    lastCookedAt: string;
    daysSinceLast: number;
};

export type StaleDish = {
    dishId: string;
    dishName: string;
    lastCookedAt?: string;
    daysSinceLast: number;
    completed: boolean;
};

export type CookTimeAccuracyRow = {
    dishId: string;
    dishName: string;
    plannedMinutes: number;
    actualAvgMinutes: number;
    samples: number;
    variancePct: number;
};

export type MemberFeedbackBreakdown = {
    memberId: string;
    memberName: string;
    liked: number;
    neutral: number;
    disliked: number;
    topDishes: Array<{ dishId: string; dishName: string; reaction: CookingSessionMemberFeedback }>;
};

export type CookingActivityCell = {
    date: string;
    sessionCount: number;
    finishedCount: number;
};

export type LeftoverEfficiencyWeek = {
    weekStart: string;
    finished: number;
    discarded: number;
    available: number;
    total: number;
    finishedPct: number;
};

const inRange = (dateValue: string | undefined, rangeStart: Dayjs | null): boolean => {
    if (!dateValue) return false;
    const date = dayjs(dateValue);
    if (!date.isValid()) return false;
    return !rangeStart || !date.isBefore(rangeStart, 'day');
};

const getSessionDate = (session: CookingSession): string => session.finishedAt ?? session.startedAt;

const matchesMemberFilter = (session: CookingSession, memberId?: string): boolean => {
    if (!memberId) return true;
    return (session.householdMemberIds ?? []).includes(memberId);
};

export const CookingAnalyticsHelper = {
    getRangeStart(range: AnalyticsTimeRange, now: Dayjs = dayjs()): Dayjs | null {
        if (range === '7d') return now.subtract(7, 'day').startOf('day');
        if (range === '30d') return now.subtract(30, 'day').startOf('day');
        if (range === '90d') return now.subtract(90, 'day').startOf('day');
        return null;
    },

    getTopCookedDishes(sessions: CookingSession[], dishesById: Map<string, Dishes>, filters: AnalyticsFilters, limit = 10): TopCookedDish[] {
        const rangeStart = CookingAnalyticsHelper.getRangeStart(filters.range);
        const grouped = new Map<string, { count: number; last: string }>();
        sessions
            .filter(session => session.status === 'finished' && inRange(getSessionDate(session), rangeStart) && matchesMemberFilter(session, filters.memberId))
            .forEach(session => {
                const current = grouped.get(session.dishId);
                const date = getSessionDate(session);
                grouped.set(session.dishId, {
                    count: (current?.count ?? 0) + 1,
                    last: !current || dayjs(date).isAfter(dayjs(current.last)) ? date : current.last,
                });
            });
        return Array.from(grouped.entries()).map(([dishId, row]) => ({
            dishId,
            dishName: dishesById.get(dishId)?.name ?? dishId,
            cookCount: row.count,
            lastCookedAt: row.last,
            daysSinceLast: dayjs().startOf('day').diff(dayjs(row.last).startOf('day'), 'day'),
        })).sort((a, b) => b.cookCount - a.cookCount || a.daysSinceLast - b.daysSinceLast).slice(0, limit);
    },

    getStaleDishes(dishes: Dishes[], sessions: CookingSession[], thresholdDays = 30): StaleDish[] {
        const lastByDish = new Map<string, string>();
        sessions.filter(session => session.status === 'finished').forEach(session => {
            const date = getSessionDate(session);
            const current = lastByDish.get(session.dishId);
            if (!current || dayjs(date).isAfter(dayjs(current))) lastByDish.set(session.dishId, date);
        });
        return dishes.filter(dish => dish.isCompleted).map(dish => {
            const last = lastByDish.get(dish.id);
            const daysSinceLast = last ? dayjs().startOf('day').diff(dayjs(last).startOf('day'), 'day') : 999;
            return { dishId: dish.id, dishName: dish.name, lastCookedAt: last, daysSinceLast, completed: Boolean(dish.isCompleted) };
        }).filter(row => row.daysSinceLast >= thresholdDays).sort((a, b) => b.daysSinceLast - a.daysSinceLast).slice(0, 10);
    },

    getCookTimeAccuracy(cookTimeStats: Record<string, DishCookTimeStat>, dishesById: Map<string, Dishes>, minSamples = 2): CookTimeAccuracyRow[] {
        return Object.values(cookTimeStats).flatMap(stat => {
            const dish = dishesById.get(stat.dishId);
            if (!dish || stat.samples < minSamples) return [];
            const plannedMinutes = DishDurationHelper.getTotalMinutesForDish(dish, dishesById);
            if (plannedMinutes <= 0) return [];
            return [{
                dishId: dish.id,
                dishName: dish.name,
                plannedMinutes,
                actualAvgMinutes: Math.round(stat.avgTotalMinutes),
                samples: stat.samples,
                variancePct: Math.round((stat.avgTotalMinutes - plannedMinutes) / plannedMinutes * 100),
            }];
        }).sort((a, b) => Math.abs(b.variancePct) - Math.abs(a.variancePct)).slice(0, 8);
    },

    getMemberFeedbackBreakdown(feedbackHistory: CookingMealFeedbackHistoryRecord[], members: HouseholdMemberProfile[], filters: AnalyticsFilters): MemberFeedbackBreakdown[] {
        const rangeStart = CookingAnalyticsHelper.getRangeStart(filters.range);
        const scoped = feedbackHistory.filter(record => inRange(record.createdAt, rangeStart));
        return members.map(member => {
            const dishScores = new Map<string, { dishName: string; liked: number; neutral: number; disliked: number }>();
            let liked = 0;
            let neutral = 0;
            let disliked = 0;
            scoped.forEach(record => {
                const reaction = record.memberFeedback[member.id];
                if (!reaction) return;
                if (reaction === 'liked') liked += 1;
                if (reaction === 'neutral') neutral += 1;
                if (reaction === 'disliked') disliked += 1;
                const current = dishScores.get(record.dishId) ?? { dishName: record.dishName, liked: 0, neutral: 0, disliked: 0 };
                current[reaction] += 1;
                dishScores.set(record.dishId, current);
            });
            const topDishes = Array.from(dishScores.entries())
                .sort((a, b) => b[1].liked - a[1].liked || a[1].disliked - b[1].disliked)
                .slice(0, 3)
                .map(([dishId, row]) => ({ dishId, dishName: row.dishName, reaction: 'liked' as CookingSessionMemberFeedback }));
            return { memberId: member.id, memberName: member.name, liked, neutral, disliked, topDishes };
        });
    },

    getCookingActivity(sessions: CookingSession[], filters: AnalyticsFilters): CookingActivityCell[] {
        const rangeStart = CookingAnalyticsHelper.getRangeStart(filters.range) ?? dayjs().subtract(90, 'day').startOf('day');
        const dayCount = Math.min(91, Math.max(7, dayjs().startOf('day').diff(rangeStart, 'day') + 1));
        return Array.from({ length: dayCount }).map((_, index) => {
            const date = dayjs().startOf('day').subtract(dayCount - 1 - index, 'day');
            const daySessions = sessions.filter(session => dayjs(getSessionDate(session)).isSame(date, 'day') && matchesMemberFilter(session, filters.memberId));
            return {
                date: date.format('YYYY-MM-DD'),
                sessionCount: daySessions.length,
                finishedCount: daySessions.filter(session => session.status === 'finished').length,
            };
        });
    },

    getLeftoverEfficiency(leftovers: LeftoverTrackerItem[], filters: AnalyticsFilters): LeftoverEfficiencyWeek[] {
        const rangeStart = CookingAnalyticsHelper.getRangeStart(filters.range);
        const grouped = new Map<string, LeftoverTrackerItem[]>();
        leftovers.filter(item => inRange(item.storedAt, rangeStart)).forEach(item => {
            const weekStart = dayjs(item.storedAt).startOf('week').format('YYYY-MM-DD');
            grouped.set(weekStart, [...(grouped.get(weekStart) ?? []), item]);
        });
        return Array.from(grouped.entries()).map(([weekStart, rows]) => {
            const finished = rows.filter(item => item.status === 'finished').length;
            const discarded = rows.filter(item => item.status === 'discarded').length;
            const available = rows.filter(item => item.status === 'available').length;
            const total = rows.length;
            return { weekStart, finished, discarded, available, total, finishedPct: total > 0 ? Math.round(finished / total * 100) : 0 };
        }).sort((a, b) => b.weekStart.localeCompare(a.weekStart)).slice(0, 8);
    },
};
