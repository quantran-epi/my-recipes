import { DeleteOutlined, EditOutlined, PlusOutlined, DatabaseOutlined, FireOutlined, BarChartOutlined } from "@ant-design/icons";
import { Button } from "@components/Button";
import { Input } from "@components/Form/Input";
import { Image } from "@components/Image";
import { Space } from "@components/Layout/Space";
import { Stack } from "@components/Layout/Stack";
import { scrollVirtualListToTop, VirtualListRowFrame, VirtualListScrollTopButton } from "@components/List";
import { DeferredModalContent, Modal } from "@components/Modal";
import { Popconfirm } from "@components/Popconfirm";
import { Tooltip } from "@components/Tootip";
import { Typography } from "@components/Typography";
import { useScreenTitle, useToggle, useAdminMode, usePagedVirtualItems } from "@hooks";
import { InventoryHelper } from "@common/Helpers/InventoryHelper";
import { IngredientUnitHelper } from "@common/Helpers/IngredientUnitHelper";
import { Ingredient, IngredientInventory, INGREDIENT_CATEGORIES, INGREDIENT_PRESERVATION_OPTIONS, INGREDIENT_SHELF_LIFE_OPTIONS } from "@store/Models/Ingredient";
import { removeIngredient } from "@store/Reducers/IngredientReducer";
import { selectIngredients, selectInventory } from "@store/Selectors";
import { debounce, sortBy } from "lodash";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { List as VirtualList, useDynamicRowHeight, type ListImperativeAPI, type RowComponentProps } from "react-window";
import VegetablesIcon from "../../../../assets/icons/vegetable.png";
import { IngredientAddWidget } from "./IngredientAdd.widget";
import { IngredientEditWidget } from "./IngredientEdit.widget";
import { IngredientInventoryWidget } from "./IngredientInventory.widget";
import { UseFirstWidget } from "./UseFirst.widget";
import { IngredientStatsWidget } from "./IngredientStats.widget";

const LazyDishSuggesterScreen = React.lazy(() => import("@modules/DishSuggester/Screens/DishSuggester.screen").then(module => ({
    default: module.DishSuggesterScreen,
})));

type IngredientStockFilter = "all" | "in_stock" | "need_stock" | "low_stock" | "urgent" | "always_available";

const INGREDIENT_STOCK_FILTERS: { value: IngredientStockFilter; label: string }[] = [
    { value: "all", label: "Tất cả" },
    { value: "in_stock", label: "Đang có" },
    { value: "need_stock", label: "Cần nhập" },
    { value: "low_stock", label: "Sắp hết" },
    { value: "urgent", label: "Sắp hết hạn" },
    { value: "always_available", label: "Luôn có" },
];

const INGREDIENT_ROW_DEFAULT_HEIGHT = 166;
const INGREDIENT_LOAD_MORE_THRESHOLD = 8;

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

const ingredientMatchesSearch = (ingredient: Ingredient, normalizedSearch: string): boolean => {
    return ingredient.name.trim().toLowerCase().includes(normalizedSearch);
}

const ingredientMatchesCategory = (ingredient: Ingredient, category: string | null): boolean => {
    return category === null || ingredient.category === category;
}

type IngredientStockSnapshot = {
    usableAmount: number;
    urgent: boolean;
    hasInventory: boolean;
    nearestExpiry: ReturnType<typeof InventoryHelper.nearestExpiryBatch>;
}

const getIngredientStockSnapshot = (
    ingredient: Ingredient,
    inventoryItems: Record<string, IngredientInventory>,
): IngredientStockSnapshot => {
    const inventory = inventoryItems[ingredient.id];
    const snapshot = InventoryHelper.inventorySnapshot(inventory, ingredient);
    return {
        usableAmount: snapshot.usableAmount,
        hasInventory: snapshot.hasInventory,
        nearestExpiry: snapshot.nearestExpiry,
        urgent: Boolean(snapshot.nearestExpiry && snapshot.nearestExpiry.daysLeft <= 3),
    };
}

const ingredientMatchesStock = (
    ingredient: Ingredient,
    stockFilter: IngredientStockFilter,
    stock: IngredientStockSnapshot,
): boolean => {
    return stockFilter === "all"
        || (stockFilter === "in_stock" && (InventoryHelper.isAlwaysAvailable(ingredient) || stock.usableAmount > 0))
        || (stockFilter === "need_stock" && !InventoryHelper.isAlwaysAvailable(ingredient) && stock.usableAmount <= 0)
        || (stockFilter === "low_stock" && !InventoryHelper.isAlwaysAvailable(ingredient) && stock.usableAmount > 0 && stock.usableAmount <= 2)
        || (stockFilter === "urgent" && stock.urgent)
        || (stockFilter === "always_available" && InventoryHelper.isAlwaysAvailable(ingredient));
}

type IngredientRowProps = {
    items: Ingredient[];
    stockSnapshots: Record<string, IngredientStockSnapshot>;
    onDelete: (item: Ingredient) => void;
    isAdmin: boolean;
    onSuggest: (ids: string[]) => void;
    onOpenInventory: (item: Ingredient) => void;
};

const IngredientRow = ({ index, style, items, stockSnapshots, onDelete, isAdmin, onSuggest, onOpenInventory }: RowComponentProps<IngredientRowProps>) => {
    if (!items[index]) return null;
    return <VirtualListRowFrame style={style} layout="dynamic">
        <IngredientItem item={items[index]} stockSnapshot={stockSnapshots[items[index].id]} onDelete={onDelete} isAdmin={isAdmin} onSuggest={onSuggest} onOpenInventory={onOpenInventory} />
    </VirtualListRowFrame>;
};

export const IngredientListScreen = () => {
    const ingredients = useSelector(selectIngredients);
    const toggleAddModal = useToggle({ defaultValue: false });
    const [inventoryIngredient, setInventoryIngredient] = useState<Ingredient | null>(null);
    const dispatch = useDispatch();
    const { } = useScreenTitle({ value: "Nguyên liệu", deps: [] });
    const [searchText, setSearchText] = useState("");
    const [activeStockFilter, setActiveStockFilter] = useState<IngredientStockFilter>("all");
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const inventoryItems = useSelector(selectInventory);
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
        setSearchText(event.target.value);
    }, 350), []);

    useEffect(() => () => _onSearchChange.cancel(), [_onSearchChange]);

    const _setScrollTopVisible = useCallback((nextVisible: boolean) => {
        setShowScrollTop(current => current === nextVisible ? current : nextVisible);
    }, []);

    const _onListScroll = useCallback((event: React.UIEvent<HTMLElement>) => {
        _setScrollTopVisible(event.currentTarget.scrollTop > 180);
    }, [_setScrollTopVisible]);

    const stockSnapshots = useMemo(() => {
        return ingredients.reduce((result, ingredient) => {
            result[ingredient.id] = getIngredientStockSnapshot(ingredient, inventoryItems);
            return result;
        }, {} as Record<string, IngredientStockSnapshot>);
    }, [ingredients, inventoryItems]);

    const toggleUseFirst = useToggle({ defaultValue: false });
    const toggleStats = useToggle({ defaultValue: false });
    const toggleSuggester = useToggle({ defaultValue: false });
    const [suggestIds, setSuggestIds] = useState<string[]>([]);

    const _onSuggest = useCallback((ids: string[]) => {
        setSuggestIds(ids);
        toggleSuggester.show();
    }, [toggleSuggester]);

    const availableCategories = useMemo(() => {
        const categorySet = new Set(ingredients.map(item => item.category).filter(Boolean) as string[]);
        return INGREDIENT_CATEGORIES.filter(category => categorySet.has(category));
    }, [ingredients]);

    const filterData = useMemo(() => {
        const stockCounts = INGREDIENT_STOCK_FILTERS.reduce((result, item) => {
            result[item.value] = 0;
            return result;
        }, {} as Record<IngredientStockFilter, number>);
        const categoryCounts: Record<string, number> = { __all: 0 };
        const categorySet = new Set(availableCategories);
        const filtered: Ingredient[] = [];

        ingredients.forEach(ingredient => {
            const matchesSearch = ingredientMatchesSearch(ingredient, normalizedSearch);
            if (!matchesSearch) return;
            const stock = stockSnapshots[ingredient.id];

            if (ingredientMatchesCategory(ingredient, activeCategory)) {
                INGREDIENT_STOCK_FILTERS.forEach(item => {
                    if (ingredientMatchesStock(ingredient, item.value, stock)) stockCounts[item.value] += 1;
                });
            }

            if (ingredientMatchesStock(ingredient, activeStockFilter, stock)) {
                categoryCounts.__all += 1;
                if (ingredient.category && categorySet.has(ingredient.category)) {
                    categoryCounts[ingredient.category] = (categoryCounts[ingredient.category] ?? 0) + 1;
                }
            }

            if (ingredientMatchesCategory(ingredient, activeCategory) && ingredientMatchesStock(ingredient, activeStockFilter, stock)) {
                filtered.push(ingredient);
            }
        });

        availableCategories.forEach(category => {
            categoryCounts[category] = categoryCounts[category] ?? 0;
        });

        return {
            filteredIngredients: sortBy(filtered, "name"),
            stockCounts,
            categoryCounts,
        };
    }, [ingredients, stockSnapshots, normalizedSearch, activeCategory, activeStockFilter, availableCategories]);

    const { filteredIngredients, stockCounts, categoryCounts } = filterData;
    const pagedIngredientsResetKey = `${activeStockFilter}|${activeCategory ?? "all"}|${normalizedSearch}`;
    const {
        visibleItems: visibleIngredients,
        loadedCount: loadedIngredientCount,
        totalCount: totalIngredientCount,
        hasMore: hasMoreIngredients,
        loadMore: loadMoreIngredients,
    } = usePagedVirtualItems({ items: filteredIngredients, resetKey: pagedIngredientsResetKey });
    const rowHeight = useDynamicRowHeight({ defaultRowHeight: INGREDIENT_ROW_DEFAULT_HEIGHT, key: pagedIngredientsResetKey });

    const _onAdd = () => {
        toggleAddModal.show();
    }

    const _onDelete = useCallback((item) => {
        dispatch(removeIngredient([item.id]));
    }, [dispatch]);

    const _onOpenInventory = useCallback((item: Ingredient) => {
        setInventoryIngredient(item);
    }, []);

    const _onCloseInventory = useCallback(() => {
        setInventoryIngredient(null);
    }, []);

    const ingredientRowProps = useMemo(() => ({
        items: visibleIngredients,
        stockSnapshots,
        onDelete: _onDelete,
        isAdmin,
        onSuggest: _onSuggest,
        onOpenInventory: _onOpenInventory,
    }), [visibleIngredients, stockSnapshots, _onDelete, isAdmin, _onSuggest, _onOpenInventory]);

    const _scrollToTop = useCallback(() => {
        const scrolled = scrollVirtualListToTop(listRef.current);
        if (scrolled) setShowScrollTop(false);
        return scrolled;
    }, []);

    const _onRowsRendered = useCallback((visibleRows: { startIndex: number; stopIndex: number }) => {
        _setScrollTopVisible(visibleRows.startIndex > 1);
        if (hasMoreIngredients && visibleRows.stopIndex >= Math.max(0, loadedIngredientCount - INGREDIENT_LOAD_MORE_THRESHOLD)) {
            loadMoreIngredients();
        }
    }, [_setScrollTopVisible, hasMoreIngredients, loadedIngredientCount, loadMoreIngredients]);

    useEffect(() => {
        if (!didMountScrollRef.current) {
            didMountScrollRef.current = true;
            return;
        }
        _scrollToTop();
    }, [_scrollToTop, activeStockFilter, activeCategory, searchText]);

    return <React.Fragment>
        <div style={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
            <Stack.Compact>
                <Input allowClear data-testid="ingredient-search-input" placeholder="Tìm kiếm" onChange={_onSearchChange} />
                {isAdmin && <Button onClick={_onAdd} icon={<PlusOutlined />} />}
                <Tooltip title="Dùng trước hết hạn">
                    <Button onClick={toggleUseFirst.show} icon={<FireOutlined style={{ color: "#ff4d4f" }} />} />
                </Tooltip>
                <Tooltip title="Thống kê nguyên liệu">
                    <Button onClick={toggleStats.show} icon={<BarChartOutlined style={{ color: "#1677ff" }} />} />
                </Tooltip>
            </Stack.Compact>
            <div style={filterRowStyle}>
                {INGREDIENT_STOCK_FILTERS.map(item => (
                    <button key={item.value} type="button" data-testid={`ingredient-filter-${item.value}`} onClick={() => setActiveStockFilter(item.value)} style={filterChipStyle(activeStockFilter === item.value)}>
                        {item.label} ({stockCounts[item.value] ?? 0})
                    </button>
                ))}
            </div>
            {availableCategories.length > 0 && (
                <div style={filterRowStyle}>
                    <button type="button" data-testid="ingredient-category-filter-reset" onClick={() => setActiveCategory(null)} style={filterChipStyle(activeCategory === null)}>
                        Tất cả nhóm ({categoryCounts.__all ?? 0})
                    </button>
                    {availableCategories.map(category => (
                        <button key={category} type="button" onClick={() => setActiveCategory(activeCategory === category ? null : category)} style={filterChipStyle(activeCategory === category)}>
                            {category} ({categoryCounts[category] ?? 0})
                        </button>
                    ))}
                </div>
            )}
            <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
                <VirtualList
                    listRef={listRef}
                    rowComponent={IngredientRow}
                    rowCount={visibleIngredients.length}
                    rowHeight={rowHeight}
                    overscanCount={1}
                    onScroll={_onListScroll}
                    onRowsRendered={_onRowsRendered}
                    rowProps={ingredientRowProps}
                    style={virtualListStyle}
                    data-testid="ingredient-virtual-list"
                />
                {hasMoreIngredients && <div data-testid="ingredient-list-page-status" style={{ position: "absolute", left: "50%", bottom: 10, transform: "translateX(-50%)", padding: "4px 10px", borderRadius: 999, background: "rgba(255,255,255,0.94)", border: "1px solid #f0f0f0", boxShadow: "0 4px 14px rgba(0,0,0,0.08)", fontSize: 12, color: "#595959", pointerEvents: "none" }}>
                    Đã tải {loadedIngredientCount}/{totalIngredientCount}
                </div>}
                <VirtualListScrollTopButton listRef={listRef} rowCount={visibleIngredients.length} visible={showScrollTop} />
            </div>
        </div>
        <Modal width={640} open={toggleAddModal.value} title={
            <Space>
                <Image src={VegetablesIcon} preview={false} width={24} style={{ marginBottom: 3 }} />
                Thêm nguyên liệu
            </Space>
        } destroyOnClose={true} onCancel={toggleAddModal.hide} footer={null}>
            <DeferredModalContent active={toggleAddModal.value}>
                <IngredientAddWidget />
            </DeferredModalContent>
        </Modal>
        {toggleUseFirst.value && <UseFirstWidget
            open={toggleUseFirst.value}
            onClose={toggleUseFirst.hide}
            onSuggest={_onSuggest}
        />}
        {toggleStats.value && <IngredientStatsWidget
            open={toggleStats.value}
            onClose={toggleStats.hide}
        />}
        {toggleSuggester.value && <React.Suspense fallback={null}>
            <LazyDishSuggesterScreen
                open={toggleSuggester.value}
                onClose={toggleSuggester.hide}
                initialIngredientIds={suggestIds}
            />
        </React.Suspense>}
        {inventoryIngredient && <Modal open={Boolean(inventoryIngredient)} title={
            <Space>
                <DatabaseOutlined />
                Tồn kho - {inventoryIngredient.name}
            </Space>
        } destroyOnClose={true} onCancel={_onCloseInventory} footer={null}>
            <DeferredModalContent active={Boolean(inventoryIngredient)} minHeight={180}>
                <IngredientInventoryWidget item={inventoryIngredient} onDone={_onCloseInventory} onSuggest={_onSuggest} />
            </DeferredModalContent>
        </Modal>}
    </React.Fragment>
}

type IngredientItemProps = {
    item: Ingredient;
    stockSnapshot: IngredientStockSnapshot;
    onDelete: (item: Ingredient) => void;
    isAdmin: boolean;
    onSuggest: (ids: string[]) => void;
    onOpenInventory: (item: Ingredient) => void;
}

const IngredientItemComponent: React.FunctionComponent<IngredientItemProps> = (props) => {
    const toggleEdit = useToggle({ defaultValue: false });

    const totalAmt = props.stockSnapshot?.usableAmount ?? 0;
    const inventoryUnit = IngredientUnitHelper.getBaseUnit(props.item);
    const preservation = INGREDIENT_PRESERVATION_OPTIONS.find(o => o.value === props.item.preservationCondition);
    const shelfLife = INGREDIENT_SHELF_LIFE_OPTIONS.find(o => o.value === props.item.shelfLife);
    const nearestExpiry = props.stockSnapshot?.nearestExpiry ?? null;
    const expiryBadge = nearestExpiry ? InventoryHelper.expiryBadge(nearestExpiry.daysLeft) : null;
    const inventoryUnits = IngredientUnitHelper.getInventoryUnits(props.item);
    const recipeUnits = IngredientUnitHelper.getRecipeUnits(props.item);
    const visibleRecipeUnits = recipeUnits.slice(0, 4).join(", ");
    const extraRecipeUnitCount = Math.max(0, recipeUnits.length - 4);
    const inventoryStatus = props.item.alwaysAvailable
        ? { label: "Luôn có", detail: "Không cần quản lý tồn kho", color: "#389e0d", background: "#f6ffed", border: "#b7eb8f" }
        : !props.stockSnapshot?.hasInventory
            ? { label: "Chưa có tồn kho", detail: "Bấm để nhập lô đầu tiên", color: "#8c8c8c", background: "#fafafa", border: "#d9d9d9" }
            : totalAmt <= 0
                ? { label: "Hết khả dụng", detail: "Không còn lô dùng được", color: "#cf1322", background: "#fff1f0", border: "#ffa39e" }
                : totalAmt <= 2
                    ? { label: `${IngredientUnitHelper.formatAmount(totalAmt)} ${inventoryUnit}`, detail: "Tồn kho thấp", color: "#d46b08", background: "#fff7e6", border: "#ffd591" }
                    : { label: `${IngredientUnitHelper.formatAmount(totalAmt)} ${inventoryUnit}`, detail: "Tồn kho ổn", color: "#389e0d", background: "#f6ffed", border: "#b7eb8f" };
    const railColor = expiryBadge && nearestExpiry?.daysLeft <= 3 ? expiryBadge.color : inventoryStatus.color;

    return <React.Fragment>
        <div data-testid={`ingredient-list-item-${props.item.id}`} style={{ padding: "6px 0 8px", boxSizing: "border-box" }}>
            <div style={{
                display: "grid",
                gridTemplateColumns: "5px minmax(0, 1fr)",
                minHeight: 112,
                border: "1px solid #e8e8e8",
                borderRadius: 8,
                background: "#fff",
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                overflow: "hidden",
                boxSizing: "border-box",
            }}>
                <div style={{ background: railColor }} />
                <div style={{ padding: 10, minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 8, alignItems: "start" }}>
                        <div style={{ minWidth: 0 }}>
                            <Tooltip title={props.item.name}>
                                <Typography.Paragraph style={{ marginBottom: 2, fontWeight: 650, lineHeight: "21px" }} ellipsis={{ rows: 2 }}>
                                    {props.item.name}
                                </Typography.Paragraph>
                            </Tooltip>
                            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
                                {props.item.category && <span style={{ padding: "1px 7px", borderRadius: 999, background: "#f0f5ff", color: "#1d39c4", fontSize: 11, lineHeight: "18px", fontWeight: 600 }}>{props.item.category}</span>}
                                <span style={{ padding: "1px 7px", borderRadius: 999, background: "#fafafa", color: "#595959", border: "1px solid #f0f0f0", fontSize: 11, lineHeight: "18px" }}>Gốc: {inventoryUnit}</span>
                                {shelfLife && <Tooltip title={shelfLife.description}>
                                    <span style={{ padding: "1px 7px", borderRadius: 999, background: `${shelfLife.color}14`, color: shelfLife.color, border: `1px solid ${shelfLife.color}33`, fontSize: 11, lineHeight: "18px", fontWeight: 600 }}>{shelfLife.emoji} {shelfLife.label}</span>
                                </Tooltip>}
                                {preservation && <Tooltip title={preservation.description}>
                                    <span style={{ padding: "1px 7px", borderRadius: 999, background: "#f9f0ff", color: "#531dab", border: "1px solid #efdbff", fontSize: 11, lineHeight: "18px" }}>{preservation.label}</span>
                                </Tooltip>}
                            </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                            {props.isAdmin && <Button onClick={toggleEdit.show} icon={<EditOutlined />} style={{ width: 34, paddingInline: 0 }} />}
                            {props.isAdmin && (
                                <Popconfirm title="Xóa?" onConfirm={() => props.onDelete(props.item)}>
                                    <Button danger icon={<DeleteOutlined />} style={{ width: 34, paddingInline: 0 }} />
                                </Popconfirm>
                            )}
                        </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "minmax(120px, 0.92fr) minmax(0, 1.08fr)", gap: 8, alignItems: "stretch" }}>
                        <button
                            type="button"
                            onClick={() => props.onOpenInventory(props.item)}
                            style={{
                                border: `1px solid ${inventoryStatus.border}`,
                                background: inventoryStatus.background,
                                borderRadius: 8,
                                padding: "7px 9px",
                                textAlign: "left",
                                cursor: "pointer",
                                minWidth: 0,
                            }}
                        >
                            <Typography.Text type="secondary" style={{ display: "block", fontSize: 11, lineHeight: "14px" }}>Tồn kho khả dụng</Typography.Text>
                            <Typography.Text strong style={{ display: "block", color: inventoryStatus.color, fontSize: 14, lineHeight: "19px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                <DatabaseOutlined /> {inventoryStatus.label}
                            </Typography.Text>
                            <Typography.Text type="secondary" style={{ display: "block", fontSize: 11, lineHeight: "14px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{inventoryStatus.detail}</Typography.Text>
                        </button>

                        <div style={{ minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center", gap: 4, border: "1px solid #f0f0f0", borderRadius: 8, background: "#fafafa", padding: "7px 9px" }}>
                            <Typography.Text type="secondary" style={{ fontSize: 11, lineHeight: "14px" }}>Đơn vị công thức</Typography.Text>
                            <Typography.Text strong style={{ fontSize: 13, lineHeight: "18px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {visibleRecipeUnits}{extraRecipeUnitCount > 0 ? ` +${extraRecipeUnitCount}` : ""}
                            </Typography.Text>
                            <Typography.Text type="secondary" style={{ fontSize: 11, lineHeight: "14px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                Nhập kho: {inventoryUnits.join(", ")}
                            </Typography.Text>
                        </div>
                    </div>

                    {expiryBadge && <Typography.Text style={{ color: expiryBadge.color, fontSize: 12, lineHeight: "16px" }}>
                        <FireOutlined style={{ fontSize: 11 }} /> Lô gần nhất: {expiryBadge.label}
                    </Typography.Text>}
                </div>
            </div>
        </div>

        {/* Edit modal */}
        {toggleEdit.value && <Modal width={640} open={toggleEdit.value} title={
            <Space>
                <Image src={VegetablesIcon} preview={false} width={24} style={{ marginBottom: 3 }} />
                Chỉnh sửa nguyên liệu
            </Space>
        } destroyOnClose={true} onCancel={toggleEdit.hide} footer={null}>
            <DeferredModalContent active={toggleEdit.value}>
                <IngredientEditWidget item={props.item} onDone={() => toggleEdit.hide()} />
            </DeferredModalContent>
        </Modal>}

    </React.Fragment>
}

export const IngredientItem = React.memo(IngredientItemComponent);
