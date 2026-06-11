import { DishDuration, DishDurationPhaseKey, Dishes } from "@store/Models/Dishes";

export type DishDurationPhase = {
    key: DishDurationPhaseKey;
    label: string;
    shortLabel: string;
    description: string;
    color: string;
    background: string;
    border: string;
    defaultMinutes: number;
}

export type DishDurationPreset = {
    label: string;
    description: string;
    duration: DishDuration;
}

export type DishDurationBreakdownItem = {
    dishId: string;
    dishName: string;
    depth: number;
    duration: DishDuration;
    activeItems: Array<{ phase: DishDurationPhase; minutes: number }>;
    ownMinutes: number;
}

export type DishDurationBreakdown = {
    totalMinutes: number;
    items: DishDurationBreakdownItem[];
}

const phase = (
    key: DishDurationPhaseKey,
    label: string,
    shortLabel: string,
    description: string,
    color: string,
    background: string,
    border: string,
    defaultMinutes: number,
): DishDurationPhase => ({ key, label, shortLabel, description, color, background, border, defaultMinutes });

const create = (duration: Partial<Record<DishDurationPhaseKey, number | null>>): DishDuration => ({
    unfreeze: duration.unfreeze ?? null,
    prepare: duration.prepare ?? null,
    cooking: duration.cooking ?? null,
    serve: duration.serve ?? null,
    cooldown: duration.cooldown ?? null,
});

const hasUsableNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value > 0;

const emptyBreakdown = (): DishDurationBreakdown => ({ totalMinutes: 0, items: [] });

export const DISH_DURATION_PHASES: DishDurationPhase[] = [
    phase("unfreeze", "Rã đông", "Rã đông", "Thời gian chờ nguyên liệu mềm trước khi sơ chế.", "#1677ff", "#e6f4ff", "#91caff", 15),
    phase("prepare", "Sơ chế", "Sơ chế", "Rửa, cắt, ướp, chuẩn bị nguyên liệu và dụng cụ.", "#13a8a8", "#e6fffb", "#87e8de", 10),
    phase("cooking", "Nấu chính", "Nấu", "Thời gian đứng bếp hoặc xử lý nhiệt chính.", "#fa541c", "#fff2e8", "#ffbb96", 20),
    phase("serve", "Hoàn thiện", "Hoàn thiện", "Nêm, bày món, trang trí hoặc chia phần.", "#722ed1", "#f9f0ff", "#d3adf7", 5),
    phase("cooldown", "Nghỉ / nguội", "Nghỉ", "Thời gian để món nghỉ, nguội, thấm vị hoặc an toàn để dùng.", "#389e0d", "#f6ffed", "#b7eb8f", 10),
];

export const DISH_DURATION_PRESETS: DishDurationPreset[] = [
    { label: "Món nhanh", description: "Sơ chế ít, nấu gọn", duration: create({ prepare: 10, cooking: 15, serve: 5 }) },
    { label: "Bữa thường", description: "Phù hợp đa số món gia đình", duration: create({ prepare: 15, cooking: 25, serve: 5 }) },
    { label: "Nấu lâu", description: "Có chờ, ninh hoặc nghỉ món", duration: create({ prepare: 20, cooking: 45, cooldown: 15 }) },
];

const formatMinutes = (minutes: number): string => {
    if (!Number.isFinite(minutes) || minutes <= 0) return "0 phút";
    const rounded = Math.round(minutes);
    const hours = Math.floor(rounded / 60);
    const rest = rounded % 60;
    if (hours <= 0) return `${rounded} phút`;
    if (rest <= 0) return `${hours} giờ`;
    return `${hours} giờ ${rest} phút`;
};

export const DishDurationHelper = {
    phases: DISH_DURATION_PHASES,
    presets: DISH_DURATION_PRESETS,

    createEmpty(): DishDuration {
        return create({});
    },

    normalize(duration?: Partial<Record<DishDurationPhaseKey, number | null>> | null): DishDuration {
        return DISH_DURATION_PHASES.reduce((result, item) => {
            const value = duration?.[item.key];
            result[item.key] = hasUsableNumber(value) ? Math.round(value) : null;
            return result;
        }, create({}));
    },

    getPhase(key: DishDurationPhaseKey): DishDurationPhase {
        return DISH_DURATION_PHASES.find(item => item.key === key) ?? DISH_DURATION_PHASES[0];
    },

    getActiveItems(duration?: Partial<Record<DishDurationPhaseKey, number | null>> | null) {
        const normalized = DishDurationHelper.normalize(duration);
        return DISH_DURATION_PHASES
            .map(item => ({ phase: item, minutes: normalized[item.key] ?? 0 }))
            .filter(item => item.minutes > 0);
    },

    getTotalMinutes(duration?: Partial<Record<DishDurationPhaseKey, number | null>> | null): number {
        return DishDurationHelper.getActiveItems(duration).reduce((sum, item) => sum + item.minutes, 0);
    },

    hasDuration(duration?: Partial<Record<DishDurationPhaseKey, number | null>> | null): boolean {
        return DishDurationHelper.getTotalMinutes(duration) > 0;
    },

    getBreakdown(dish?: Dishes | null, dishesById?: Map<string, Dishes>, visited = new Set<string>(), depth = 0): DishDurationBreakdown {
        if (!dish || visited.has(dish.id)) return emptyBreakdown();

        visited.add(dish.id);
        const duration = DishDurationHelper.normalize(dish.duration);
        const activeItems = DishDurationHelper.getActiveItems(duration);
        const ownMinutes = DishDurationHelper.getTotalMinutes(duration);
        const ownItems: DishDurationBreakdownItem[] = ownMinutes > 0 ? [{
            dishId: dish.id,
            dishName: dish.name,
            depth,
            duration,
            activeItems,
            ownMinutes,
        }] : [];

        const includedBreakdown = (dish.includeDishes ?? []).reduce((result, id) => {
            const includedDish = dishesById?.get(id);
            if (!includedDish) return result;
            const breakdown = DishDurationHelper.getBreakdown(includedDish, dishesById, visited, depth + 1);
            result.totalMinutes += breakdown.totalMinutes;
            result.items.push(...breakdown.items);
            return result;
        }, emptyBreakdown());

        return {
            totalMinutes: ownMinutes + includedBreakdown.totalMinutes,
            items: [...ownItems, ...includedBreakdown.items],
        };
    },

    getTotalMinutesForDish(dish?: Dishes | null, dishesById?: Map<string, Dishes>): number {
        return DishDurationHelper.getBreakdown(dish, dishesById).totalMinutes;
    },

    hasDurationForDish(dish?: Dishes | null, dishesById?: Map<string, Dishes>): boolean {
        return DishDurationHelper.getTotalMinutesForDish(dish, dishesById) > 0;
    },

    formatMinutes,

    getTempo(totalMinutes: number) {
        if (totalMinutes <= 0) return { label: "Chưa có", color: "#8c8c8c", background: "#fafafa", border: "#d9d9d9" };
        if (totalMinutes <= 25) return { label: "Nhanh", color: "#389e0d", background: "#f6ffed", border: "#b7eb8f" };
        if (totalMinutes <= 60) return { label: "Vừa", color: "#1677ff", background: "#e6f4ff", border: "#91caff" };
        return { label: "Lâu", color: "#d46b08", background: "#fff7e6", border: "#ffd591" };
    },
};
