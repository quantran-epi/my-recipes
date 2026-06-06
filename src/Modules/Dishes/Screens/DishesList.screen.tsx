import { CheckCircleOutlined, ClockCircleOutlined, CopyOutlined, DeleteOutlined, EditOutlined, ExclamationCircleOutlined, FileTextOutlined, HolderOutlined, PlusOutlined, FireOutlined } from "@ant-design/icons";
import { Button } from "@components/Button";
import { Dropdown } from "@components/Dropdown";
import { Input } from "@components/Form/Input";
import { Image } from "@components/Image";
import { Box } from "@components/Layout/Box";
import { Space } from "@components/Layout/Space";
import { Stack } from "@components/Layout/Stack";
import { List, scrollVirtualListToTop, VirtualListRowFrame, VirtualListScrollTopButton } from "@components/List";
import { useMessage } from "@components/Message";
import { DeferredModalContent, Modal } from "@components/Modal";
import { Popover } from "@components/Popover";
import { Tag } from "@components/Tag";
import { Typography } from "@components/Typography";
import { useScreenTitle, useToggle, useAdminMode, usePagedVirtualItems } from "@hooks";
import { useAppShellNavigation } from "@routing/AppShellNavigationContext";
import { DISH_TAGS, DishDuration, Dishes } from "@store/Models/Dishes";
import { Ingredient } from "@store/Models/Ingredient";
import { DishesDurationEditParams, duplicateDish, removeDishes, updateDishDuration } from "@store/Reducers/DishesReducer";
import { selectDishes, selectIngredients } from "@store/Selectors";
import { RootRoutes } from "@routing/RootRoutes";
import { debounce, sortBy } from "lodash";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { List as VirtualList, useDynamicRowHeight, type ListImperativeAPI, type RowComponentProps } from "react-window";
import Clock2Icon from "../../../../assets/icons/clock (2).png";
import NoodlesIcon from "../../../../assets/icons/noodles.png";
import { DishesAddWidget } from "./DishesAdd.widget";
import { DishesExportWidget } from "./DishesExport.widget";
import { DishesEditWidget } from "./DishesEdit.widget";
import { DishesDetailWidget } from "./DishesManageIngredient/DishDetail.widget";
import { DishImageWidget } from "./DishesManageIngredient/DishImage.widget";
import { DishDurationWidget } from "./DishesManageIngredient/DishDuration.widget";
import { CookingSessionWidget } from "./CookingSession.widget";
import moment from "moment";
import 'moment/locale/vi';

type DishListItemSummary = {
    ingredientCount: number;
    stepCount: number;
    requiredIngredientCount: number;
    optionalIngredientCount: number;
    includedDishCount: number;
};

type DishIngredientCounts = {
    total: number;
    required: number;
    optional: number;
};

type DishRowProps = {
    items: Dishes[];
    allDishes: Dishes[];
    allIngredients: Ingredient[];
    summaries: Record<string, DishListItemSummary>;
    onDelete: (item: Dishes) => void;
    onDuplicate: (item: Dishes) => void;
    isAdmin: boolean;
};

type DishStatusFilter = "all" | "ready" | "needs_update" | "has_ingredients" | "has_steps";

const DISH_STATUS_FILTERS: { value: DishStatusFilter; label: string }[] = [
    { value: "all", label: "Tất cả" },
    { value: "ready", label: "Hoàn thiện" },
    { value: "needs_update", label: "Cần cập nhật" },
    { value: "has_ingredients", label: "Có nguyên liệu" },
    { value: "has_steps", label: "Có bước nấu" },
];

const filterRowStyle: React.CSSProperties = {
    display: "flex",
    gap: 6,
    overflowX: "auto",
    padding: "6px 0 2px",
    scrollbarWidth: "none",
};

const filterChipStyle = (active: boolean): React.CSSProperties => ({
    border: active ? "1px solid #1677ff" : "1px solid #d9d9d9",
    background: active ? "#e6f4ff" : "#fff",
    color: active ? "#0958d9" : "#595959",
    borderRadius: 999,
    padding: "3px 10px",
    fontSize: 12,
    lineHeight: "18px",
    whiteSpace: "nowrap",
    cursor: "pointer",
});

const dishMatchesSearch = (dish: Dishes, normalizedSearch: string): boolean => {
    return dish.name.trim().toLowerCase().includes(normalizedSearch);
}

const dishMatchesTag = (dish: Dishes, tag: string | null): boolean => {
    return tag === null || dish.tags?.includes(tag) === true;
}

const dishMatchesStatus = (dish: Dishes, status: DishStatusFilter): boolean => {
    return status === "all"
        || (status === "ready" && dish.isCompleted)
        || (status === "needs_update" && !dish.isCompleted)
        || (status === "has_ingredients" && (dish.ingredients?.length ?? 0) > 0)
        || (status === "has_steps" && (dish.steps?.length ?? 0) > 0);
}

const EMPTY_DISH_SUMMARY: DishListItemSummary = {
    ingredientCount: 0,
    stepCount: 0,
    requiredIngredientCount: 0,
    optionalIngredientCount: 0,
    includedDishCount: 0,
};

const DISH_ROW_DEFAULT_HEIGHT = 184;
const DISH_LOAD_MORE_THRESHOLD = 8;

const DISH_DURATION_LABELS: Record<keyof DishDuration, string> = {
    unfreeze: 'Rã đông',
    prepare: 'Sơ chế',
    cooking: 'Nấu nướng',
    serve: 'Trình bày',
    cooldown: 'Để nguội',
};

const DishDurationDetail: React.FunctionComponent<{ duration: DishDuration }> = ({ duration }) => {
    return <List size="small" dataSource={Object.entries(duration)} renderItem={item => <List.Item style={{ paddingInline: 0 }}>
        <Stack fullwidth justify="space-between">
            <Typography.Text style={{ fontSize: 16 }}>{DISH_DURATION_LABELS[item[0] as keyof DishDuration]}:</Typography.Text>
            {Boolean(item[1]) && <Tag>{moment.duration(item[1], "minutes").locale("vi").humanize()}</Tag>}
        </Stack>
    </List.Item>} />;
};

const buildDishListSummaries = (allDishes: Dishes[], visibleDishes: Dishes[] = allDishes): Record<string, DishListItemSummary> => {
    const dishById = new Map(allDishes.map(dish => [dish.id, dish]));
    const ingredientCountCache = new Map<string, DishIngredientCounts>();
    const stepCountCache = new Map<string, number>();

    const collectIngredientCounts = (dish: Dishes, visiting = new Set<string>()): DishIngredientCounts => {
        const cached = ingredientCountCache.get(dish.id);
        if (cached) return cached;
        if (visiting.has(dish.id)) return { total: 0, required: 0, optional: 0 };

        visiting.add(dish.id);
        const ownIngredients = dish.ingredients ?? [];
        const counts = ownIngredients.reduce((result, item) => {
            result.total += 1;
            if (item.required === false) result.optional += 1;
            else result.required += 1;
            return result;
        }, { total: 0, required: 0, optional: 0 } as DishIngredientCounts);

        (dish.includeDishes ?? []).forEach(id => {
            const found = dishById.get(id);
            if (!found) return;
            const included = collectIngredientCounts(found, visiting);
            counts.total += included.total;
            counts.required += included.required;
            counts.optional += included.optional;
        });
        visiting.delete(dish.id);
        ingredientCountCache.set(dish.id, counts);
        return counts;
    };

    const collectStepCount = (dish: Dishes, visiting = new Set<string>()): number => {
        const cached = stepCountCache.get(dish.id);
        if (cached !== undefined) return cached;
        if (visiting.has(dish.id)) return 0;

        visiting.add(dish.id);
        let count = dish.steps?.length ?? 0;
        (dish.includeDishes ?? []).forEach(id => {
            const found = dishById.get(id);
            if (found) count += collectStepCount(found, visiting);
        });
        visiting.delete(dish.id);
        stepCountCache.set(dish.id, count);
        return count;
    };

    return visibleDishes.reduce((result, dish) => {
        const ingredients = collectIngredientCounts(dish);
        result[dish.id] = {
            ingredientCount: ingredients.total,
            stepCount: collectStepCount(dish),
            requiredIngredientCount: ingredients.required,
            optionalIngredientCount: ingredients.optional,
            includedDishCount: (dish.includeDishes ?? []).filter(id => dishById.has(id)).length,
        };
        return result;
    }, {} as Record<string, DishListItemSummary>);
};

const DishRow = ({ index, style, items, allDishes, allIngredients, summaries, onDelete, onDuplicate, isAdmin }: RowComponentProps<DishRowProps>) => {
    if (!items[index]) return null;
    const item = items[index];
    return <VirtualListRowFrame style={style} layout="dynamic">
        <DishesItem item={item} allDishes={allDishes} allIngredients={allIngredients} summary={summaries[item.id] ?? EMPTY_DISH_SUMMARY} onDelete={onDelete} onDuplicate={onDuplicate} isAdmin={isAdmin} />
    </VirtualListRowFrame>;
};

export const DishesListScreen = () => {
    const dishes = useSelector(selectDishes);
    const ingredients = useSelector(selectIngredients);
    const toggleAddModal = useToggle({ defaultValue: false });
    const [searchText, setSearchText] = useState<string>("");
    const [activeTag, setActiveTag] = useState<string | null>(null);
    const [activeStatus, setActiveStatus] = useState<DishStatusFilter>("all");
    const dispatch = useDispatch();
    const { } = useScreenTitle({ value: "Món ăn", deps: [] });
    const virtualListStyle = useMemo<React.CSSProperties>(() => ({
        height: "100%",
        overscrollBehavior: "contain",
        WebkitOverflowScrolling: "touch",
    }), []);
    const listRef = useRef<ListImperativeAPI | null>(null);
    const didMountScrollRef = useRef(false);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const { isAdmin } = useAdminMode();
    const normalizedSearch = searchText.trim().toLowerCase();

    const _onSearchChange = useMemo(() => debounce((event: React.ChangeEvent<HTMLInputElement>) => {
        const nextValue = event.target.value;
        React.startTransition(() => setSearchText(nextValue));
    }, 350), []);

    useEffect(() => () => _onSearchChange.cancel(), [_onSearchChange]);

    const _setScrollTopVisible = useCallback((nextVisible: boolean) => {
        setShowScrollTop(current => current === nextVisible ? current : nextVisible);
    }, []);

    const _setActiveStatus = useCallback((nextStatus: DishStatusFilter) => {
        React.startTransition(() => setActiveStatus(nextStatus));
    }, []);

    const _resetActiveTag = useCallback(() => {
        React.startTransition(() => setActiveTag(null));
    }, []);

    const _toggleActiveTag = useCallback((tag: string) => {
        React.startTransition(() => setActiveTag(current => current === tag ? null : tag));
    }, []);

    const _onListScroll = useCallback((event: React.UIEvent<HTMLElement>) => {
        _setScrollTopVisible(event.currentTarget.scrollTop > 180);
    }, [_setScrollTopVisible]);

    const allTags = useMemo<string[]>(() => {
        const tagSet = new Set<string>();
        dishes.forEach(d => d.tags?.forEach(t => tagSet.add(t)));
        return DISH_TAGS.filter(t => tagSet.has(t));
    }, [dishes]);

    const filterData = useMemo(() => {
        const statusCounts = DISH_STATUS_FILTERS.reduce((result, item) => {
            result[item.value] = 0;
            return result;
        }, {} as Record<DishStatusFilter, number>);
        const result: Record<string, number> = {
            __all: 0,
        };
        const tagSet = new Set(allTags);
        const filtered: Dishes[] = [];

        dishes.forEach(dish => {
            const matchesSearch = dishMatchesSearch(dish, normalizedSearch);
            if (!matchesSearch) return;

            if (dishMatchesTag(dish, activeTag)) {
                DISH_STATUS_FILTERS.forEach(item => {
                    if (dishMatchesStatus(dish, item.value)) statusCounts[item.value] += 1;
                });
            }

            if (dishMatchesStatus(dish, activeStatus)) {
                result.__all += 1;
                dish.tags?.forEach(tag => {
                    if (tagSet.has(tag)) result[tag] = (result[tag] ?? 0) + 1;
                });
            }

            if (dishMatchesTag(dish, activeTag) && dishMatchesStatus(dish, activeStatus)) {
                filtered.push(dish);
            }
        });

        allTags.forEach(tag => {
            result[tag] = result[tag] ?? 0;
        });

        return {
            filteredDishes: sortBy(filtered, "name"),
            statusCounts,
            tagCounts: result,
        };
    }, [dishes, normalizedSearch, activeTag, activeStatus, allTags]);

    const { filteredDishes, statusCounts, tagCounts } = filterData;
    const pagedDishesResetKey = `${activeStatus}|${activeTag ?? "all"}|${normalizedSearch}`;
    const {
        visibleItems: visibleDishes,
        loadedCount: loadedDishCount,
        totalCount: totalDishCount,
        hasMore: hasMoreDishes,
        loadMore: loadMoreDishes,
    } = usePagedVirtualItems({ items: filteredDishes, resetKey: pagedDishesResetKey });
    const rowHeight = useDynamicRowHeight({ defaultRowHeight: DISH_ROW_DEFAULT_HEIGHT, key: pagedDishesResetKey });
    const dishSummaries = useMemo(() => buildDishListSummaries(dishes, visibleDishes), [dishes, visibleDishes]);

    const _onDelete = useCallback((item: Dishes) => {
        dispatch(removeDishes([item.id]));
    }, [dispatch]);

    const _onDuplicate = useCallback((item: Dishes) => {
        dispatch(duplicateDish(item.id));
    }, [dispatch]);

    const dishRowProps = useMemo(() => ({
        items: visibleDishes,
        allDishes: dishes,
        allIngredients: ingredients,
        summaries: dishSummaries,
        onDelete: _onDelete,
        onDuplicate: _onDuplicate,
        isAdmin,
    }), [visibleDishes, dishes, ingredients, dishSummaries, _onDelete, _onDuplicate, isAdmin]);

    const _scrollToTop = useCallback(() => {
        const scrolled = scrollVirtualListToTop(listRef.current);
        if (scrolled) setShowScrollTop(false);
        return scrolled;
    }, []);

    const _onRowsRendered = useCallback((visibleRows: { startIndex: number; stopIndex: number }) => {
        _setScrollTopVisible(visibleRows.startIndex > 1);
        if (hasMoreDishes && visibleRows.stopIndex >= Math.max(0, loadedDishCount - DISH_LOAD_MORE_THRESHOLD)) {
            loadMoreDishes();
        }
    }, [_setScrollTopVisible, hasMoreDishes, loadedDishCount, loadMoreDishes]);

    useEffect(() => {
        if (!didMountScrollRef.current) {
            didMountScrollRef.current = true;
            return;
        }
        _scrollToTop();
    }, [_scrollToTop, activeStatus, activeTag, searchText]);

    return <React.Fragment>
        <div style={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
            <Stack.Compact>
                <Input allowClear data-testid="dish-search-input" placeholder="Tìm kiếm" onChange={_onSearchChange} />
                {isAdmin && <Button onClick={toggleAddModal.show} icon={<PlusOutlined />} />}
            </Stack.Compact>
            <div style={filterRowStyle}>
                {DISH_STATUS_FILTERS.map(item => (
                    <button key={item.value} type="button" data-testid={`dish-filter-${item.value}`} onClick={() => _setActiveStatus(item.value)} style={filterChipStyle(activeStatus === item.value)}>
                        {item.label} ({statusCounts[item.value] ?? 0})
                    </button>
                ))}
            </div>
            {allTags.length > 0 && (
                <div style={filterRowStyle}>
                    <button type="button" data-testid="dish-tag-filter-reset" onClick={_resetActiveTag} style={filterChipStyle(activeTag === null)}>
                        Tất cả tag ({tagCounts.__all ?? 0})
                    </button>
                    {allTags.map(tag => (
                        <button key={tag} type="button" onClick={() => _toggleActiveTag(tag)} style={filterChipStyle(activeTag === tag)}>
                            {tag} ({tagCounts[tag] ?? 0})
                        </button>
                    ))}
                </div>
            )}
            <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
                <VirtualList
                    listRef={listRef}
                    rowComponent={DishRow}
                    rowCount={visibleDishes.length}
                    rowHeight={rowHeight}
                    overscanCount={1}
                    onScroll={_onListScroll}
                    onRowsRendered={_onRowsRendered}
                    rowProps={dishRowProps}
                    style={virtualListStyle}
                    data-testid="dish-virtual-list"
                />
                {hasMoreDishes && <div data-testid="dish-list-page-status" style={{ position: "absolute", left: "50%", bottom: 10, transform: "translateX(-50%)", padding: "4px 10px", borderRadius: 999, background: "rgba(255,255,255,0.94)", border: "1px solid #f0f0f0", boxShadow: "0 4px 14px rgba(0,0,0,0.08)", fontSize: 12, color: "#595959", pointerEvents: "none" }}>
                    Đã tải {loadedDishCount}/{totalDishCount}
                </div>}
                <VirtualListScrollTopButton listRef={listRef} rowCount={visibleDishes.length} visible={showScrollTop} />
            </div>
        </div>
        <Modal open={toggleAddModal.value} title={
            <Space>
                <Image src={NoodlesIcon} preview={false} width={24} style={{ marginBottom: 3 }} />
                Thêm món ăn
            </Space>
        } destroyOnClose={true} onCancel={toggleAddModal.hide} footer={null}>
            <DeferredModalContent active={toggleAddModal.value}>
                <DishesAddWidget />
            </DeferredModalContent>
        </Modal>
    </React.Fragment>
}

type DishesItemProps = {
    item: Dishes;
    allDishes: Dishes[];
    allIngredients: Ingredient[];
    summary: DishListItemSummary;
    onDelete: (item: Dishes) => void;
    onDuplicate: (item: Dishes) => void;
    isAdmin: boolean;
}

moment.relativeTimeRounding((v) => parseFloat(v.toFixed(1)));
moment.relativeTimeThreshold('m', 60);

const DishesItemComponent: React.FunctionComponent<DishesItemProps> = (props) => {
    const toggleEdit = useToggle({ defaultValue: false });
    const toggleDishesDetail = useToggle();
    const toggleCooking = useToggle();
    const toggleEditDuration = useToggle();
    const [durationOpen, setDurationOpen] = useState(false);
    const message = useMessage();
    const dispatch = useDispatch();
    const { navigateWithFeedback } = useAppShellNavigation();
    const dishes = props.allDishes;
    const ingredients = props.allIngredients;

    const _onEdit = () => toggleEdit.show();
    const _onEditDuration = () => toggleEditDuration.show();
    const _onOpenDetailPage = () => {
        navigateWithFeedback(RootRoutes.AuthorizedRoutes.DishesRoutes.ManageIngredient(props.item.id), toggleDishesDetail.hide);
    }

    const _sumDuration = () => {
        return moment.duration(Object.values(props.item.duration).reduce((prev, cur) => prev + cur || 0, 0), "minutes").locale("vi").humanize();
    }

    const _hasDuration = () => {
        return Object.values(props.item.duration).some(e => e !== null);
    }

    const toggleExport = useToggle();
    const toggleDeleteConfirm = useToggle();

    const _referencingDishes = () => {
        return dishes.filter(d => d.id !== props.item.id && d.includeDishes?.includes(props.item.id));
    }

    const _onMoreActionClick = (e) => {
        switch (e.key) {
            case "edit": _onEdit(); break;
            case "duration": _onEditDuration(); break;
            case "duplicate": props.onDuplicate(props.item); break;
            case "cook": toggleCooking.show(); break;
            case "delete": {
                const refs = _referencingDishes();
                if (refs.length > 0) {
                    message.error(`Không thể xóa! Món ăn này đang được dùng trong: ${refs.map(d => d.name).join(", ")}.`);
                } else {
                    toggleDeleteConfirm.show();
                }
                break;
            }
        }
    }

    const _onSaveDuration = (value: DishesDurationEditParams) => {
        dispatch(updateDishDuration(value));
        toggleEditDuration.hide();
        message.success("Đã lưu thời gian món ăn");
    }

    const ingredientCount = props.summary.ingredientCount;
    const stepCount = props.summary.stepCount;
    const requiredIngredientCount = props.summary.requiredIngredientCount;
    const optionalIngredientCount = props.summary.optionalIngredientCount;
    const includedDishCount = props.summary.includedDishCount;
    const hasDuration = _hasDuration();
    const hasIngredients = ingredientCount > 0;
    const hasSteps = stepCount > 0;
    const visibleTags = props.item.tags?.slice(0, 3) ?? [];
    const extraTagCount = Math.max(0, (props.item.tags?.length ?? 0) - visibleTags.length);
    const baseServings = props.item.baseServings ?? 2;

    return <React.Fragment>
        <div data-testid={`dish-list-item-${props.item.id}`} style={{ padding: "6px 0 8px", boxSizing: "border-box" }}>
            <Box style={{
                display: "grid",
                gridTemplateColumns: "88px minmax(0, 1fr)",
                gap: 10,
                minHeight: 146,
                padding: 10,
                border: "1px solid #e8e8e8",
                borderRadius: 8,
                background: "#fff",
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                boxSizing: "border-box",
            }}>
                <div onClick={toggleDishesDetail.show} style={{ position: "relative", cursor: "pointer", width: 88, height: 122 }}>
                    <DishImageWidget src={props.item.image} width={88} height={122} borderRadius={8} fallbackIconSize={34} surface="list" testId={`dish-row-image-${props.item.id}`} />
                    <Popover title="Thời lượng" content={durationOpen ? <DishDurationDetail duration={props.item.duration} /> : null} open={durationOpen} onOpenChange={setDurationOpen}>
                        <button
                            type="button"
                            onClick={(event) => event.stopPropagation()}
                            style={{
                                position: "absolute",
                                left: 6,
                                right: 6,
                                bottom: 29,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 4,
                                minWidth: 0,
                                border: "1px solid rgba(255,255,255,0.28)",
                                borderRadius: 999,
                                padding: "2px 6px",
                                background: hasDuration ? "rgba(0,0,0,0.72)" : "rgba(89,89,89,0.78)",
                                color: "#fff",
                                boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                                fontSize: 11,
                                lineHeight: "16px",
                                cursor: "pointer",
                            }}
                        >
                            <ClockCircleOutlined style={{ fontSize: 11, flexShrink: 0 }} />
                            <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {hasDuration ? _sumDuration() : "Chưa set"}
                            </span>
                        </button>
                    </Popover>
                    <div style={{
                        position: "absolute",
                        left: 6,
                        right: 6,
                        bottom: 6,
                        padding: "2px 6px",
                        borderRadius: 8,
                        background: props.item.isCompleted ? "rgba(82,196,26,0.92)" : "rgba(250,140,22,0.94)",
                        color: "#fff",
                        fontSize: 11,
                        lineHeight: "16px",
                        textAlign: "center",
                        whiteSpace: "nowrap",
                    }}>
                        {props.item.isCompleted ? "Hoàn thiện" : "Cần cập nhật"}
                    </div>
                </div>

                <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 7 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 8, alignItems: "start" }}>
                        <div style={{ minWidth: 0 }}>
                            <Typography.Paragraph
                                onClick={toggleDishesDetail.show}
                                style={{ marginBottom: 2, color: !props.item.isCompleted ? "#d46b08" : undefined, cursor: "pointer", fontWeight: 650, lineHeight: "21px" }}
                                ellipsis={{ rows: 2, tooltip: props.item.name }}
                            >
                                {props.item.name}
                            </Typography.Paragraph>
                            <Space size={[4, 4]} wrap>
                                {visibleTags.map(tag => <Tag key={tag} color="geekblue" style={{ fontSize: 11, padding: "0 5px", marginInlineEnd: 0 }}>{tag}</Tag>)}
                                {extraTagCount > 0 && <Tag style={{ fontSize: 11, padding: "0 5px", marginInlineEnd: 0 }}>+{extraTagCount}</Tag>}
                                <Tag color="blue" style={{ fontSize: 11, padding: "0 5px", marginInlineEnd: 0 }}>{baseServings} phần</Tag>
                            </Space>
                        </div>

                        <Dropdown menu={{
                            items: [
                                { label: "Bắt đầu nấu", key: "cook", icon: <FireOutlined /> },
                                { label: "Xuất dữ liệu", key: "export", icon: <FileTextOutlined /> },
                                ...(props.isAdmin ? [
                                    { type: "divider" as const },
                                    { label: "Sửa món ăn", key: "edit", icon: <EditOutlined /> },
                                    { label: "Thời lượng", key: "duration", icon: <ClockCircleOutlined /> },
                                    { label: "Nhân bản", key: "duplicate", icon: <CopyOutlined /> },
                                    { type: "divider" as const },
                                    { label: "Xóa", key: "delete", icon: <DeleteOutlined />, danger: true },
                                ] : []),
                            ],
                            onClick: (e) => e.key === "export" ? toggleExport.show() : _onMoreActionClick(e)
                        }} placement="bottomRight">
                            <Button type="text" data-testid={`dish-row-menu-${props.item.id}`} icon={<HolderOutlined />} style={{ width: 32, paddingInline: 0 }} />
                        </Dropdown>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 6 }}>
                        <div style={{ border: "1px solid #f0f0f0", background: "#fafafa", borderRadius: 8, padding: "6px 7px", textAlign: "left", minWidth: 0 }}>
                            <Typography.Text type="secondary" style={{ display: "block", fontSize: 11, lineHeight: "14px" }}>Nguyên liệu</Typography.Text>
                            <Typography.Text strong style={{ display: "block", fontSize: 13, lineHeight: "18px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {hasIngredients ? `${ingredientCount} nguyên liệu` : "Chưa có"}
                            </Typography.Text>
                            {optionalIngredientCount > 0 && <Typography.Text type="secondary" style={{ display: "block", fontSize: 11, lineHeight: "14px" }}>{optionalIngredientCount} tùy chọn</Typography.Text>}
                        </div>

                        <div style={{ border: "1px solid #f0f0f0", background: "#fafafa", borderRadius: 8, padding: "6px 7px", textAlign: "left", minWidth: 0 }}>
                            <Typography.Text type="secondary" style={{ display: "block", fontSize: 11, lineHeight: "14px" }}>Quy trình</Typography.Text>
                            <Typography.Text strong style={{ display: "block", fontSize: 13, lineHeight: "18px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {hasSteps ? `${stepCount} bước` : "Chưa có"}
                            </Typography.Text>
                            {includedDishCount > 0 && <Typography.Text type="secondary" style={{ display: "block", fontSize: 11, lineHeight: "14px" }}>{includedDishCount} món kèm</Typography.Text>}
                        </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: "auto", flexWrap: "wrap" }}>
                        <Space size={6} style={{ minWidth: 0 }}>
                            {props.item.isCompleted
                                ? <Typography.Text style={{ color: "#389e0d", fontSize: 12 }}><CheckCircleOutlined /> Sẵn sàng</Typography.Text>
                                : <Typography.Text style={{ color: "#d46b08", fontSize: 12 }}><ExclamationCircleOutlined /> Cần cập nhật</Typography.Text>}
                            {requiredIngredientCount > 0 && <Typography.Text type="secondary" style={{ fontSize: 12 }}>{requiredIngredientCount} bắt buộc</Typography.Text>}
                        </Space>
                        <Space size={6}>
                            <Button type="primary" icon={<FireOutlined />} onClick={toggleCooking.show}>Nấu</Button>
                            <Button onClick={toggleDishesDetail.show}>Chi tiết</Button>
                        </Space>
                    </div>
                </div>
            </Box>
        </div>
        {toggleDishesDetail.value && <Modal style={{ top: 50 }} open={toggleDishesDetail.value} title={
            <Space>
                <Image src={NoodlesIcon} preview={false} width={24} style={{ marginBottom: 3 }} />
                {props.item.name}
            </Space>
        } destroyOnClose={true} onCancel={toggleDishesDetail.hide} footer={<Space>
            <Button onClick={toggleDishesDetail.hide}>Đóng</Button>
            <Button type="primary" icon={<EditOutlined />} onClick={_onOpenDetailPage}>Mở trang chi tiết</Button>
        </Space>}>
            <Box style={{ maxHeight: 550, overflowY: "auto" }}>
                <DeferredModalContent active={toggleDishesDetail.value} minHeight={220}>
                    <DishesDetailWidget dish={props.item} />
                </DeferredModalContent>
            </Box>
        </Modal>}
        {toggleEdit.value && <Modal open={toggleEdit.value} title={
            <Space>
                <Image src={NoodlesIcon} preview={false} width={24} style={{ marginBottom: 3 }} />
                Chỉnh sửa món ăn
            </Space>
        } destroyOnClose={true} onCancel={toggleEdit.hide} footer={null}>
            <DeferredModalContent active={toggleEdit.value}>
                <DishesEditWidget item={props.item} onDone={() => toggleEdit.hide()} />
            </DeferredModalContent>
        </Modal>}
        {toggleEditDuration.value && <Modal open={toggleEditDuration.value} title={<Stack gap={0} direction="column" align="flex-start">
            <Space>
                <Image src={Clock2Icon} preview={false} width={24} style={{ marginBottom: 3 }} />
                <Typography.Title level={5} style={{ margin: 0 }}>Thời lượng</Typography.Title>
            </Space>
            <Typography.Text type="secondary">{props.item.name}</Typography.Text>
        </Stack>} destroyOnClose={true} onCancel={toggleEditDuration.hide} footer={null}>
            <DishDurationWidget dish={props.item} onSave={_onSaveDuration} />
        </Modal>}
        {toggleExport.value && <DishesExportWidget dish={props.item} allIngredients={ingredients} open={toggleExport.value} onClose={toggleExport.hide} />}
        {toggleDeleteConfirm.value && <Modal
            open={toggleDeleteConfirm.value}
            title={<Space><DeleteOutlined style={{ color: "red" }} />Xác nhận xóa</Space>}
            onCancel={toggleDeleteConfirm.hide}
            onOk={() => { props.onDelete(props.item); toggleDeleteConfirm.hide(); }}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
            destroyOnClose
        >
            Bạn có chắc muốn xóa món <b>{props.item.name}</b> không? Hành động này không thể hoàn tác.
        </Modal>}
        {toggleCooking.value && <Modal
            open={toggleCooking.value}
            title={<Space><FireOutlined style={{ color: "#fa8c16" }} />{props.item.name} — Bắt đầu nấu</Space>}
            destroyOnClose
            onCancel={toggleCooking.hide}
            footer={null}
        >
            <DeferredModalContent active={toggleCooking.value}>
                <CookingSessionWidget dish={props.item} onDone={toggleCooking.hide} />
            </DeferredModalContent>
        </Modal>}
    </React.Fragment>
}

export const DishesItem = React.memo(DishesItemComponent);
