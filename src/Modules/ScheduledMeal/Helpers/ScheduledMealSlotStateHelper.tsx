import React from 'react';
import { CoffeeOutlined, EllipsisOutlined, RestOutlined, ShopOutlined } from '@ant-design/icons';
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
    skip: {
        label: 'Nghỉ tự nấu',
        icon: React.createElement(CoffeeOutlined),
        description: 'Không nấu bữa này.',
        color: '#fa8c16',
        background: '#fff7e6',
        border: '#ffd591',
    },
    other: {
        label: 'Khác',
        icon: React.createElement(EllipsisOutlined),
        description: 'Lý do khác.',
        color: '#8c8c8c',
        background: '#fafafa',
        border: '#d9d9d9',
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
