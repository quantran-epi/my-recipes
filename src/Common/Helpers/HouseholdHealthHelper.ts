import type { HouseholdHealthStatus } from '@store/Reducers/HouseholdHealthReducer';

export const HOUSEHOLD_HEALTH_STATUS_META: Record<HouseholdHealthStatus, { label: string; color: string; tone: string }> = {
    neutral: { label: 'Bình thường', color: 'default', tone: '#64748b' },
    healthy: { label: 'Khỏe', color: 'green', tone: '#15803d' },
    sick: { label: 'Đang bệnh', color: 'volcano', tone: '#dc2626' },
    recovering: { label: 'Đang hồi phục', color: 'gold', tone: '#b45309' },
};

export const getHouseholdHealthStatusMeta = (status?: HouseholdHealthStatus) => HOUSEHOLD_HEALTH_STATUS_META[status ?? 'neutral'];
