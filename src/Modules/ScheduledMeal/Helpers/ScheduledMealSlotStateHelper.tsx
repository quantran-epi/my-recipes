import React from 'react';
import { RestOutlined, ShopOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { ScheduledMeal, ScheduledMealSkipReason, ScheduledMealSlotKey } from '@store/Models/ScheduledMeal';

export type ScheduledMealSlotState = 'planned' | 'skipped' | 'empty';

export type ScheduledMealSkipReasonMeta = {
    label: string;
    icon: React.ReactNode;
    description: string;
    color: string;
    background: string;
    border: string;
};

export const SCHEDULED_MEAL_SLOT_LABELS: Record<ScheduledMealSlotKey, string> = {
    breakfast: 'bữa sáng',
    lunch: 'bữa trưa',
    dinner: 'bữa tối',
};

export const SCHEDULED_MEAL_SKIP_REASON_META: Record<ScheduledMealSkipReason, ScheduledMealSkipReasonMeta> = {
    eatOut: {
        label: 'Ăn ngoài',
        icon: React.createElement(ShopOutlined),
        description: 'Hôm nay nhà mình ăn ngoài.',
        color: '#1677ff',
        background: '#e6f4ff',
        border: '#91caff',
    },
    leftover: {
        label: 'Dùng đồ thừa',
        icon: React.createElement(RestOutlined),
        description: 'Bữa này dùng phần còn lại từ bữa cũ.',
        color: '#389e0d',
        background: '#f6ffed',
        border: '#b7eb8f',
    },
};

export const ScheduledMealSlotStateHelper = {
    getSlotState(meal: ScheduledMeal, slot: ScheduledMealSlotKey): ScheduledMealSlotState {
        if (meal.skipMeals?.[slot]) return 'skipped';
        if ((meal.meals?.[slot] ?? []).length > 0) return 'planned';
        return 'empty';
    },

    getReasonMeta(reason: ScheduledMealSkipReason): ScheduledMealSkipReasonMeta {
        return SCHEDULED_MEAL_SKIP_REASON_META[reason];
    },

    getSlotLabel(slot: ScheduledMealSlotKey): string {
        return SCHEDULED_MEAL_SLOT_LABELS[slot];
    },

    formatMarkedAt(value?: string): string {
        if (!value) return '';
        return dayjs(value).format('HH:mm DD/MM');
    },
};

// One meal-plan's contribution to a slot, used by both the slot summary card and the slot detail modal.
export type SlotPlanItem = {
    meal: ScheduledMeal;
    dishIds: string[];                      // planned dishes for this slot (preserved even when skipped)
    state: ScheduledMealSlotState;
    cooked: boolean;
    eaten: boolean;
};

// Aggregation of one slot across every meal plan on a day.
export type DaySlotAggregate = {
    slot: ScheduledMealSlotKey;
    items: SlotPlanItem[];                  // only plans that have this slot planned or skipped
    allDishIds: string[];                   // de-duplicated dish ids pooled across plans (skipped excluded)
    planCount: number;                      // number of contributing plans
    cookedCount: number;                    // plans marked cooked for this slot
    eatenCount: number;                     // plans marked eaten for this slot
    skippedCount: number;                   // plans marked not-self-cooked for this slot
};

export type DaySlotAggregates = Record<ScheduledMealSlotKey, DaySlotAggregate>;

const DAY_SLOT_KEYS: ScheduledMealSlotKey[] = ['breakfast', 'lunch', 'dinner'];

// Build per-slot aggregation for one day's meal plans. A plan contributes to a slot if it has
// dishes planned there or the slot is marked skipped. Skipped slots keep their dish ids (for the
// planned-vs-reality view) but are excluded from the pooled cook list (allDishIds).
export const buildDaySlotAggregates = (meals: ScheduledMeal[]): DaySlotAggregates => {
    const result = {} as DaySlotAggregates;
    DAY_SLOT_KEYS.forEach(slot => {
        const items: SlotPlanItem[] = [];
        const pooled: string[] = [];
        let cookedCount = 0;
        let eatenCount = 0;
        let skippedCount = 0;
        meals.forEach(meal => {
            const state = ScheduledMealSlotStateHelper.getSlotState(meal, slot);
            if (state === 'empty') return;
            const dishIds = meal.meals?.[slot] ?? [];
            const cooked = Boolean(meal.cookedSlots?.[slot]);
            const eaten = Boolean(meal.eatenSlots?.[slot]);
            items.push({ meal, dishIds, state, cooked, eaten });
            if (cooked) cookedCount += 1;
            if (eaten) eatenCount += 1;
            if (state === 'skipped') skippedCount += 1;
            else dishIds.forEach(id => { if (id) pooled.push(id); });
        });
        result[slot] = {
            slot,
            items,
            allDishIds: Array.from(new Set(pooled)),
            planCount: items.length,
            cookedCount,
            eatenCount,
            skippedCount,
        };
    });
    return result;
};
