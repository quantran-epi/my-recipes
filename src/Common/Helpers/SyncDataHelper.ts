// Canonical, key-order-independent serialization for sync comparisons.
// Objects with identical data but different key insertion order must produce
// the same string, otherwise change-detection reports false "modified" rows.
const sortKeysDeep = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(sortKeysDeep);
    if (value && typeof value === "object") {
        return Object.keys(value as Record<string, unknown>)
            .sort()
            .reduce((acc, key) => {
                acc[key] = sortKeysDeep((value as Record<string, unknown>)[key]);
                return acc;
            }, {} as Record<string, unknown>);
    }
    return value;
};

export const stableJson = (value: unknown): string => JSON.stringify(sortKeysDeep(value ?? null), null, 2);

export const countCollection = (value: unknown): number => {
    if (Array.isArray(value)) return value.length;
    if (value && typeof value === "object") return Object.keys(value as Record<string, unknown>).length;
    return value == null ? 0 : 1;
};

export const hashString = async (value: string): Promise<string> => {
    try {
        if (crypto?.subtle && typeof TextEncoder !== "undefined") {
            const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
            return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, "0")).join("");
        }
    } catch { }

    let hash = 0;
    for (let i = 0; i < value.length; i++) {
        hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
    }
    return `fallback-${Math.abs(hash)}`;
};

export const hashJson = (value: unknown): Promise<string> => hashString(stableJson(value));
