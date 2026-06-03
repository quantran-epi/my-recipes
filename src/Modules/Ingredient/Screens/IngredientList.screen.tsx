import { DeleteOutlined, EditOutlined, PlusOutlined, DatabaseOutlined, FireOutlined, BarChartOutlined } from "@ant-design/icons";
import { Button } from "@components/Button";
import { Input } from "@components/Form/Input";
import { Image } from "@components/Image";
import { Space } from "@components/Layout/Space";
import { Stack } from "@components/Layout/Stack";
import { Modal } from "@components/Modal";
import { Popconfirm } from "@components/Popconfirm";
import { Tooltip } from "@components/Tootip";
import { Typography } from "@components/Typography";
import { useScreenTitle, useToggle, useAdminMode } from "@hooks";
import { InventoryHelper } from "@common/Helpers/InventoryHelper";
import { IngredientUnitHelper } from "@common/Helpers/IngredientUnitHelper";
import { Ingredient, INGREDIENT_CATEGORIES, INGREDIENT_PRESERVATION_OPTIONS, INGREDIENT_SHELF_LIFE_OPTIONS } from "@store/Models/Ingredient";
import { removeIngredient } from "@store/Reducers/IngredientReducer";
import { selectInventoryById } from "@store/Selectors";
import { RootState } from "@store/Store";
import { debounce, sortBy } from "lodash";
import React, { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { List as VirtualList, useDynamicRowHeight, type RowComponentProps } from "react-window";
import VegetablesIcon from "../../../../assets/icons/vegetable.png";
import { IngredientAddWidget } from "./IngredientAdd.widget";
import { IngredientEditWidget } from "./IngredientEdit.widget";
import { IngredientInventoryWidget } from "./IngredientInventory.widget";
import { UseFirstWidget } from "./UseFirst.widget";
import { IngredientStatsWidget } from "./IngredientStats.widget";
import { DishSuggesterScreen } from "@modules/DishSuggester/Screens/DishSuggester.screen";

type IngredientStockFilter = "all" | "in_stock" | "need_stock" | "low_stock" | "urgent" | "always_available";

const INGREDIENT_STOCK_FILTERS: { value: IngredientStockFilter; label: string }[] = [
    { value: "all", label: "Tất cả" },
    { value: "in_stock", label: "Đang có" },
    { value: "need_stock", label: "Cần nhập" },
    { value: "low_stock", label: "Sắp hết" },
    { value: "urgent", label: "Sắp hết hạn" },
    { value: "always_available", label: "Luôn có" },
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

type IngredientRowProps = { items: Ingredient[]; onDelete: (item: Ingredient) => void; isAdmin: boolean; onSuggest: (ids: string[]) => void; };

const IngredientRow = ({ index, style, items, onDelete, isAdmin, onSuggest }: RowComponentProps<IngredientRowProps>) => {
    if (!items[index]) return null;
    return <div style={style}><IngredientItem item={items[index]} onDelete={onDelete} isAdmin={isAdmin} onSuggest={onSuggest} /></div>;
};

export const IngredientListScreen = () => {
    const ingredients = useSelector((state: RootState) => state.shared.ingredient.ingredients);
    const toggleAddModal = useToggle({ defaultValue: false });
    const dispatch = useDispatch();
    const { } = useScreenTitle({ value: "Nguyên liệu", deps: [] });
    const [searchText, setSearchText] = useState("");
    const [activeStockFilter, setActiveStockFilter] = useState<IngredientStockFilter>("all");
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const inventoryItems = useSelector((state: RootState) => state.personal.inventory.items);
    const rowHeight = useDynamicRowHeight({ defaultRowHeight: 132, key: searchText + activeStockFilter + (activeCategory ?? "") });
    const { isAdmin } = useAdminMode();

    const toggleUseFirst = useToggle({ defaultValue: false });
    const toggleStats = useToggle({ defaultValue: false });
    const toggleSuggester = useToggle({ defaultValue: false });
    const [suggestIds, setSuggestIds] = useState<string[]>([]);

    const _onSuggest = (ids: string[]) => {
        setSuggestIds(ids);
        toggleSuggester.show();
    };

    const availableCategories = useMemo(() => {
        const categorySet = new Set(ingredients.map(item => item.category).filter(Boolean) as string[]);
        return INGREDIENT_CATEGORIES.filter(category => categorySet.has(category));
    }, [ingredients]);

    const filteredIngredients = useMemo(() => {
        return sortBy(ingredients.filter(item => {
            const inventory = inventoryItems[item.id];
            const usableAmount = InventoryHelper.totalUsableAmount(inventory, item);
            const nearestExpiry = InventoryHelper.nearestExpiryBatch(inventory, item);
            const matchesSearch = item.name.trim().toLowerCase().includes(searchText.trim().toLowerCase());
            const matchesCategory = activeCategory === null || item.category === activeCategory;
            const matchesStock = activeStockFilter === "all"
                || (activeStockFilter === "in_stock" && (InventoryHelper.isAlwaysAvailable(item) || usableAmount > 0))
                || (activeStockFilter === "need_stock" && !InventoryHelper.isAlwaysAvailable(item) && usableAmount <= 0)
                || (activeStockFilter === "low_stock" && !InventoryHelper.isAlwaysAvailable(item) && usableAmount > 0 && usableAmount <= 2)
                || (activeStockFilter === "urgent" && Boolean(nearestExpiry && nearestExpiry.daysLeft <= 3))
                || (activeStockFilter === "always_available" && InventoryHelper.isAlwaysAvailable(item));
            return matchesSearch && matchesCategory && matchesStock;
        }), "name");
    }, [ingredients, inventoryItems, searchText, activeCategory, activeStockFilter])

    const _onAdd = () => {
        toggleAddModal.show();
    }

    const _onDelete = (item) => {
        dispatch(removeIngredient([item.id]));
    }

    return <React.Fragment>
        <div style={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
            <Stack.Compact>
                <Input allowClear placeholder="Tìm kiếm" onChange={debounce((e) => setSearchText(e.target.value), 350)} />
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
                    <button key={item.value} type="button" onClick={() => setActiveStockFilter(item.value)} style={filterChipStyle(activeStockFilter === item.value)}>
                        {item.label}
                    </button>
                ))}
            </div>
            {availableCategories.length > 0 && (
                <div style={filterRowStyle}>
                    <button type="button" onClick={() => setActiveCategory(null)} style={filterChipStyle(activeCategory === null)}>
                        Tất cả nhóm
                    </button>
                    {availableCategories.map(category => (
                        <button key={category} type="button" onClick={() => setActiveCategory(activeCategory === category ? null : category)} style={filterChipStyle(activeCategory === category)}>
                            {category}
                        </button>
                    ))}
                </div>
            )}
            <div style={{ flex: 1, minHeight: 0 }}>
                <VirtualList
                    rowComponent={IngredientRow}
                    rowCount={filteredIngredients.length}
                    rowHeight={rowHeight}
                    rowProps={{ items: filteredIngredients, onDelete: _onDelete, isAdmin, onSuggest: _onSuggest }}
                    style={{ height: "100%" }}
                />
            </div>
        </div>
        <Modal width={640} open={toggleAddModal.value} title={
            <Space>
                <Image src={VegetablesIcon} preview={false} width={24} style={{ marginBottom: 3 }} />
                Thêm nguyên liệu
            </Space>
        } destroyOnClose={true} onCancel={toggleAddModal.hide} footer={null}>
            <IngredientAddWidget />
        </Modal>
        <UseFirstWidget
            open={toggleUseFirst.value}
            onClose={toggleUseFirst.hide}
            onSuggest={_onSuggest}
        />
        <IngredientStatsWidget
            open={toggleStats.value}
            onClose={toggleStats.hide}
        />
        <DishSuggesterScreen
            open={toggleSuggester.value}
            onClose={toggleSuggester.hide}
            initialIngredientIds={suggestIds}
        />
    </React.Fragment>
}

type IngredientItemProps = {
    item: Ingredient;
    onDelete: (item: Ingredient) => void;
    isAdmin: boolean;
    onSuggest: (ids: string[]) => void;
}

export const IngredientItem: React.FunctionComponent<IngredientItemProps> = (props) => {
    const toggleEdit = useToggle({ defaultValue: false });
    const toggleInventory = useToggle({ defaultValue: false });

    const inv = useSelector(selectInventoryById(props.item.id));
    const totalAmt = InventoryHelper.totalUsableAmount(inv, props.item);
    const inventoryUnit = IngredientUnitHelper.getBaseUnit(props.item);
    const preservation = INGREDIENT_PRESERVATION_OPTIONS.find(o => o.value === props.item.preservationCondition);
    const shelfLife = INGREDIENT_SHELF_LIFE_OPTIONS.find(o => o.value === props.item.shelfLife);
    const nearestExpiry = InventoryHelper.nearestExpiryBatch(inv, props.item);
    const expiryBadge = nearestExpiry ? InventoryHelper.expiryBadge(nearestExpiry.daysLeft) : null;
    const inventoryUnits = IngredientUnitHelper.getInventoryUnits(props.item);
    const recipeUnits = IngredientUnitHelper.getRecipeUnits(props.item);
    const visibleRecipeUnits = recipeUnits.slice(0, 4).join(", ");
    const extraRecipeUnitCount = Math.max(0, recipeUnits.length - 4);
    const inventoryStatus = props.item.alwaysAvailable
        ? { label: "Luôn có", detail: "Không cần quản lý tồn kho", color: "#389e0d", background: "#f6ffed", border: "#b7eb8f" }
        : !inv
            ? { label: "Chưa có tồn kho", detail: "Bấm để nhập lô đầu tiên", color: "#8c8c8c", background: "#fafafa", border: "#d9d9d9" }
            : totalAmt <= 0
                ? { label: "Hết khả dụng", detail: "Không còn lô dùng được", color: "#cf1322", background: "#fff1f0", border: "#ffa39e" }
                : totalAmt <= 2
                    ? { label: `${IngredientUnitHelper.formatAmount(totalAmt)} ${inventoryUnit}`, detail: "Tồn kho thấp", color: "#d46b08", background: "#fff7e6", border: "#ffd591" }
                    : { label: `${IngredientUnitHelper.formatAmount(totalAmt)} ${inventoryUnit}`, detail: "Tồn kho ổn", color: "#389e0d", background: "#f6ffed", border: "#b7eb8f" };
    const railColor = expiryBadge && nearestExpiry?.daysLeft <= 3 ? expiryBadge.color : inventoryStatus.color;

    return <React.Fragment>
        <div style={{ padding: "6px 0 8px", boxSizing: "border-box" }}>
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
                            onClick={toggleInventory.show}
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
        <Modal width={640} open={toggleEdit.value} title={
            <Space>
                <Image src={VegetablesIcon} preview={false} width={24} style={{ marginBottom: 3 }} />
                Chỉnh sửa nguyên liệu
            </Space>
        } destroyOnClose={true} onCancel={toggleEdit.hide} footer={null}>
            <IngredientEditWidget item={props.item} onDone={() => toggleEdit.hide()} />
        </Modal>

        {/* Inventory modal */}
        <Modal open={toggleInventory.value} title={
            <Space>
                <DatabaseOutlined />
                Tồn kho — {props.item.name}
            </Space>
        } destroyOnClose={true} onCancel={toggleInventory.hide} footer={null}>
            <IngredientInventoryWidget item={props.item} onDone={toggleInventory.hide} onSuggest={props.onSuggest} />
        </Modal>
    </React.Fragment>
}

