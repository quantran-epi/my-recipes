import { PayloadAction, createSlice } from '@reduxjs/toolkit';
import { nanoid } from 'nanoid';
import { removeHouseholdMemberProfile } from './AppContextReducer';

export type HouseholdHealthStatus = 'neutral' | 'healthy' | 'sick' | 'recovering';
export type HouseholdHealthRecordType = 'sickness' | 'treatment';
export type HouseholdHealthSeverity = 'mild' | 'medium' | 'high';

export type HouseholdMemberHealthProfile = {
    memberId: string;
    heightCm?: number;
    weightKg?: number;
    status: HouseholdHealthStatus;
    statusNote?: string;
    updatedAt: string;
}

export type HouseholdHealthRecord = {
    id: string;
    memberId: string;
    type: HouseholdHealthRecordType;
    title: string;
    startedAt: string;
    endedAt?: string;
    severity?: HouseholdHealthSeverity;
    notes?: string;
    provider?: string;
    dosage?: string;
    createdAt: string;
    updatedAt: string;
}

export interface HouseholdHealthState {
    profiles: Record<string, HouseholdMemberHealthProfile>;
    records: HouseholdHealthRecord[];
}

const MAX_HEALTH_RECORDS = 200;

const initialState: HouseholdHealthState = {
    profiles: {},
    records: [],
};

const normalizeString = (value: unknown): string => String(value ?? '').trim();

const normalizePositiveDecimal = (value: unknown, max: number): number | undefined => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
    return Math.min(max, Math.round(parsed * 10) / 10);
};

const normalizeDate = (value: unknown, fallback: string): string => {
    const normalized = normalizeString(value);
    if (!normalized) return fallback;
    const parsed = new Date(normalized);
    return Number.isNaN(parsed.valueOf()) ? fallback : parsed.toISOString();
};

const normalizeOptionalDate = (value: unknown): string | undefined => {
    const normalized = normalizeString(value);
    if (!normalized) return undefined;
    const parsed = new Date(normalized);
    return Number.isNaN(parsed.valueOf()) ? undefined : parsed.toISOString();
};

export const normalizeHealthStatus = (value: unknown): HouseholdHealthStatus => {
    if (value === 'healthy' || value === 'sick' || value === 'recovering') return value;
    return 'neutral';
};

const normalizeRecordType = (value: unknown): HouseholdHealthRecordType => value === 'treatment' ? 'treatment' : 'sickness';

const normalizeSeverity = (value: unknown): HouseholdHealthSeverity | undefined => {
    if (value === 'mild' || value === 'medium' || value === 'high') return value;
    return undefined;
};

export const normalizeHealthProfile = (profile?: Partial<HouseholdMemberHealthProfile> | null): HouseholdMemberHealthProfile | null => {
    const memberId = normalizeString(profile?.memberId);
    if (!memberId) return null;
    return {
        memberId,
        heightCm: normalizePositiveDecimal(profile?.heightCm, 260),
        weightKg: normalizePositiveDecimal(profile?.weightKg, 500),
        status: normalizeHealthStatus(profile?.status),
        statusNote: normalizeString(profile?.statusNote) || undefined,
        updatedAt: normalizeDate(profile?.updatedAt, new Date().toISOString()),
    };
};

export const normalizeHealthRecord = (record?: Partial<HouseholdHealthRecord> | null): HouseholdHealthRecord | null => {
    const now = new Date().toISOString();
    const memberId = normalizeString(record?.memberId);
    if (!memberId) return null;
    const title = normalizeString(record?.title) || (record?.type === 'treatment' ? 'Điều trị' : 'Sức khỏe');
    const createdAt = normalizeDate(record?.createdAt, now);
    return {
        id: normalizeString(record?.id) || nanoid(10),
        memberId,
        type: normalizeRecordType(record?.type),
        title,
        startedAt: normalizeDate(record?.startedAt, now),
        endedAt: normalizeOptionalDate(record?.endedAt),
        severity: normalizeSeverity(record?.severity),
        notes: normalizeString(record?.notes) || undefined,
        provider: normalizeString(record?.provider) || undefined,
        dosage: normalizeString(record?.dosage) || undefined,
        createdAt,
        updatedAt: normalizeDate(record?.updatedAt, now),
    };
};

export const normalizeHealthRecords = (records?: Partial<HouseholdHealthRecord>[] | null): HouseholdHealthRecord[] => {
    if (!Array.isArray(records)) return [];
    return records
        .map(normalizeHealthRecord)
        .filter((record): record is HouseholdHealthRecord => Boolean(record))
        .sort((a, b) => new Date(b.startedAt).valueOf() - new Date(a.startedAt).valueOf())
        .slice(0, MAX_HEALTH_RECORDS);
};

export const normalizeHouseholdHealthState = (state?: Partial<HouseholdHealthState> | null): HouseholdHealthState => {
    const entries = Object.entries(state?.profiles ?? {})
        .map(([memberId, profile]) => normalizeHealthProfile({ ...(profile as Partial<HouseholdMemberHealthProfile>), memberId }))
        .filter((profile): profile is HouseholdMemberHealthProfile => Boolean(profile));
    return {
        profiles: Object.fromEntries(entries.map(profile => [profile.memberId, profile])),
        records: normalizeHealthRecords(state?.records),
    };
};

export const householdHealthSlice = createSlice({
    name: 'householdHealth',
    initialState,
    reducers: {
        setMemberHealthStatus: (state, action: PayloadAction<{ memberId: string; status: HouseholdHealthStatus; statusNote?: string }>) => {
            const memberId = normalizeString(action.payload.memberId);
            if (!memberId) return;
            const current = normalizeHealthProfile(state.profiles[memberId]) ?? {
                memberId,
                status: 'neutral' as HouseholdHealthStatus,
                updatedAt: new Date().toISOString(),
            };
            const next = normalizeHealthProfile({
                ...current,
                status: action.payload.status,
                statusNote: action.payload.statusNote !== undefined ? action.payload.statusNote : current.statusNote,
                updatedAt: new Date().toISOString(),
            });
            if (next) state.profiles[memberId] = next;
        },
        upsertMemberHealthProfile: (state, action: PayloadAction<Partial<HouseholdMemberHealthProfile>>) => {
            const current = action.payload.memberId ? state.profiles[action.payload.memberId] : undefined;
            const next = normalizeHealthProfile({
                ...current,
                ...action.payload,
                updatedAt: new Date().toISOString(),
            });
            if (next) state.profiles[next.memberId] = next;
        },
        upsertHealthRecord: (state, action: PayloadAction<Partial<HouseholdHealthRecord>>) => {
            const current = action.payload.id ? state.records.find(record => record.id === action.payload.id) : undefined;
            const next = normalizeHealthRecord({
                ...current,
                ...action.payload,
                createdAt: current?.createdAt ?? action.payload.createdAt,
                updatedAt: new Date().toISOString(),
            });
            if (!next) return;
            state.records = normalizeHealthRecords([next, ...state.records.filter(record => record.id !== next.id)]);
        },
        removeHealthRecord: (state, action: PayloadAction<string>) => {
            state.records = state.records.filter(record => record.id !== action.payload);
        },
    },
    extraReducers: builder => {
        builder.addCase(removeHouseholdMemberProfile, (state, action) => {
            delete state.profiles[action.payload];
            state.records = state.records.filter(record => record.memberId !== action.payload);
        });
    },
});

export const {
    setMemberHealthStatus,
    upsertMemberHealthProfile,
    upsertHealthRecord,
    removeHealthRecord,
} = householdHealthSlice.actions;

export default householdHealthSlice.reducer;
