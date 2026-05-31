import { Dishes } from "@store/Models/Dishes";

export type ScoredDish = {
    dish: Dishes;
    score: number; // 0..1
    matchedIngredientIds: string[];
    missingIngredientIds: string[];
}

export type ScoredDishGroup = {
    label: string;
    minScore: number;
    maxScore: number;
    color: string;
    dishes: ScoredDish[];
}

// Recursively collect all unique ingredient IDs from a dish and its included dishes
const collectAllIngredientIds = (dish: Dishes, allDishes: Dishes[], visited = new Set<string>()): string[] => {
    if (visited.has(dish.id)) return [];
    visited.add(dish.id);
    const own = dish.ingredients.filter(i => i.required !== false).map(i => i.ingredientId);
    const fromIncluded = dish.includeDishes.flatMap(id => {
        const d = allDishes.find(d => d.id === id);
        return d ? collectAllIngredientIds(d, allDishes, visited) : [];
    });
    return Array.from(new Set([...own, ...fromIncluded]));
};

export const DishScorer = {
    score(dishes: Dishes[], selectedIngredientIds: string[], allDishes: Dishes[]): ScoredDish[] {
        if (selectedIngredientIds.length === 0) return [];

        return dishes
            .map(dish => {
                const allRequired = collectAllIngredientIds(dish, allDishes);
                if (allRequired.length === 0) return null;

                const matched = allRequired.filter(id => selectedIngredientIds.includes(id));
                const missing = allRequired.filter(id => !selectedIngredientIds.includes(id));
                const score = matched.length / allRequired.length;

                return {
                    dish,
                    score,
                    matchedIngredientIds: matched,
                    missingIngredientIds: missing,
                } as ScoredDish;
            })
            .filter((s): s is ScoredDish => s !== null && s.score > 0)
            .sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score;
                return a.missingIngredientIds.length - b.missingIngredientIds.length;
            });
    },

    group(scored: ScoredDish[]): ScoredDishGroup[] {
        const groups: ScoredDishGroup[] = [
            { label: "Nấu được ngay 🟢", minScore: 1, maxScore: 1, color: "#52c41a", dishes: [] },
            { label: "Gần đủ nguyên liệu 🟡", minScore: 0.5, maxScore: 1, color: "#faad14", dishes: [] },
            { label: "Có thể gợi ý 🟠", minScore: 0, maxScore: 0.5, color: "#fa8c16", dishes: [] },
        ];

        for (const s of scored) {
            if (s.score >= 1) {
                groups[0].dishes.push(s);
            } else if (s.score >= 0.5) {
                groups[1].dishes.push(s);
            } else {
                groups[2].dishes.push(s);
            }
        }

        return groups.filter(g => g.dishes.length > 0);
    }
};
