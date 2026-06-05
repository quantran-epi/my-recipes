import React from "react";

type UsePagedVirtualItemsParams<T> = {
    items: T[];
    pageSize?: number;
    resetKey: string | number;
};

type UsePagedVirtualItemsResult<T> = {
    visibleItems: T[];
    loadedCount: number;
    totalCount: number;
    hasMore: boolean;
    loadMore: () => void;
    reset: () => void;
};

const DEFAULT_PAGE_SIZE = 40;

export const usePagedVirtualItems = <T,>({
    items,
    pageSize = DEFAULT_PAGE_SIZE,
    resetKey,
}: UsePagedVirtualItemsParams<T>): UsePagedVirtualItemsResult<T> => {
    const safePageSize = Math.max(1, pageSize);
    const [loadedCount, setLoadedCount] = React.useState(safePageSize);

    const reset = React.useCallback(() => {
        setLoadedCount(safePageSize);
    }, [safePageSize]);

    React.useEffect(() => {
        reset();
    }, [reset, resetKey]);

    React.useEffect(() => {
        setLoadedCount(current => Math.min(Math.max(current, safePageSize), Math.max(items.length, safePageSize)));
    }, [items.length, safePageSize]);

    const loadMore = React.useCallback(() => {
        setLoadedCount(current => Math.min(current + safePageSize, items.length));
    }, [items.length, safePageSize]);

    const visibleCount = Math.min(loadedCount, items.length);
    const visibleItems = React.useMemo(() => items.slice(0, visibleCount), [items, visibleCount]);

    return {
        visibleItems,
        loadedCount: visibleCount,
        totalCount: items.length,
        hasMore: visibleCount < items.length,
        loadMore,
        reset,
    };
};
