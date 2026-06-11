import { DISH_TAGS, Dishes } from '@store/Models/Dishes';

const normalizeTag = (tag: unknown): string => String(tag ?? '').trim();

export const DishTagHelper = {
    normalizeTags(tags?: unknown[]): string[] {
        return Array.from(new Set((tags ?? []).map(normalizeTag).filter(Boolean)));
    },

    getAllTags(dishes: Dishes[]): string[] {
        const tagSet = new Set<string>();
        dishes.forEach(dish => dish.tags?.forEach(tag => {
            const normalized = normalizeTag(tag);
            if (normalized) tagSet.add(normalized);
        }));

        const builtInTags = DISH_TAGS.filter(tag => tagSet.has(tag));
        const customTags = Array.from(tagSet)
            .filter(tag => !DISH_TAGS.includes(tag))
            .sort((a, b) => a.localeCompare(b));

        return [...builtInTags, ...customTags];
    },

    getTagOptions(dishes: Dishes[]): Array<{ label: string; value: string }> {
        const tagSet = new Set<string>(DISH_TAGS);
        DishTagHelper.getAllTags(dishes).forEach(tag => tagSet.add(tag));
        return Array.from(tagSet).map(tag => ({ label: tag, value: tag }));
    },
};
