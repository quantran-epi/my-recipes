import { BulbOutlined, ClockCircleOutlined, LeftOutlined, ShoppingCartOutlined, ThunderboltOutlined } from "@ant-design/icons";
import { Button } from "@components/Button";
import { Image } from "@components/Image";
import { Box } from "@components/Layout/Box";
import { Space } from "@components/Layout/Space";
import { Stack } from "@components/Layout/Stack";
import { DeferredModalContent, Modal } from "@components/Modal";
import { Tag } from "@components/Tag";
import { Typography } from "@components/Typography";
import { useToggle } from "@hooks";
import { DishScorer, ScoredDish, ScoredDishGroup } from "../Helpers/DishScorer";
import { selectDishes, selectIngredients, selectIngredientsById, selectInventory } from "@store/Selectors";
import { InputNumber, Input, Select } from "antd";
import React, { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { IngredientPickerWidget } from "./IngredientPicker.widget";
import { DishSuggestionList } from "./DishSuggestionList.widget";
import { ShoppingListAddWidget } from "@modules/ShoppingList/Screens/ShoppingListAdd.widget";
import ShoppingListIcon from "../../../../assets/icons/shoppingList.png";
import NoodlesIcon from "../../../../assets/icons/noodles.png";
import { Dishes } from "@store/Models/Dishes";
import { InventoryHelper } from "@common/Helpers/InventoryHelper";
import { IngredientUnitHelper } from "@common/Helpers/IngredientUnitHelper";
import { Collapse } from "antd";
import { RootRoutes } from "@routing/RootRoutes";

type Mode = "ingredients" | "inventory" | "duration";

type DishSuggesterScreenProps = {
    open: boolean;
    onClose: () => void;
    initialMode?: Mode;
    initialIngredientIds?: string[];
}

const totalDurationMins = (dish: Dishes) => {
    const d = dish.duration;
    if (!d) return 0;
    return (d.unfreeze ?? 0) + (d.prepare ?? 0) + (d.cooking ?? 0) + (d.serve ?? 0) + (d.cooldown ?? 0);
};

export const DishSuggesterScreen: React.FC<DishSuggesterScreenProps> = ({ open, onClose, initialMode, initialIngredientIds }) => {
    const navigate = useNavigate();
    const dishes = useSelector(selectDishes);
    const allIngredients = useSelector(selectIngredients);
    const ingredientsById = useSelector(selectIngredientsById);
    const inventory = useSelector(selectInventory);

    const [mode, setMode] = useState<Mode>(initialMode ?? "ingredients");
    const [step, setStep] = useState(0);

    // When opened with pre-filled IDs (e.g. from UseFirstWidget), jump to results step
    React.useEffect(() => {
        if (open && initialIngredientIds && initialIngredientIds.length > 0) {
            setMode("ingredients");
            setSelectedIngredientIds(initialIngredientIds);
            setStep(1);
        } else if (open && initialMode) {
            setMode(initialMode);
            setStep(0);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const [selectedIngredientIds, setSelectedIngredientIds] = useState<string[]>(initialIngredientIds ?? []);
    const [selectedDishIds, setSelectedDishIds] = useState<string[]>([]);
    const toggleShoppingListAdd = useToggle();

    const [maxMinutes, setMaxMinutes] = useState<number>(30);
    const [fridgeSearchIds, setFridgeSearchIds] = useState<string[]>([]);
    const [durationSearchIds, setDurationSearchIds] = useState<string[]>([]);

    const inventoryIngredientIds = useMemo(() => {
        if (!open) return [];
        return Object.entries(inventory)
            .filter(([id, inv]) => {
                const ingredient = ingredientsById.get(id);
                return !InventoryHelper.isAlwaysAvailable(ingredient)
                    && InventoryHelper.totalUsableAmount(inv as any, ingredient) > 0;
            })
            .map(([id]) => id);
    }, [open, inventory, ingredientsById]);

    const ingredientScored = useMemo(() => {
        if (!open || mode !== "ingredients" || step !== 1) return [];
        return DishScorer.score(dishes, selectedIngredientIds, dishes);
    }, [open, mode, step, dishes, selectedIngredientIds]);
    const ingredientGroups = useMemo(() => DishScorer.group(ingredientScored), [ingredientScored]);

    const inventoryScored = useMemo(() => {
        if (!open || mode !== "inventory") return [];
        return DishScorer.scoreWithInventory(dishes, inventory as any, dishes, allIngredients);
    }, [open, mode, dishes, inventory, allIngredients]);
    const inventoryGroups = useMemo(() => DishScorer.group(inventoryScored), [inventoryScored]);

    const filteredInventoryGroups = useMemo(() => {
        if (fridgeSearchIds.length === 0) return inventoryGroups;
        return inventoryGroups
            .map(group => ({
                ...group,
                dishes: group.dishes.filter(scored => {
                    const requiredIds = new Set([...scored.matchedIngredientIds, ...scored.missingIngredientIds]);
                    return fridgeSearchIds.every(id => requiredIds.has(id));
                }),
            }))
            .filter(group => group.dishes.length > 0);
    }, [inventoryGroups, fridgeSearchIds]);

    const durationFiltered = useMemo(() => {
        if (!open || mode !== "duration") return [];
        return dishes
            .filter(d => { const t = totalDurationMins(d); return t > 0 && t <= maxMinutes; })
            .sort((a, b) => totalDurationMins(a) - totalDurationMins(b));
    }, [open, mode, dishes, maxMinutes]);

    const filteredDurationDishes = useMemo(() => {
        if (durationSearchIds.length === 0) return durationFiltered;
        return durationFiltered.filter(dish =>
            durationSearchIds.every(id =>
                dish.ingredients?.some(req => req.ingredientId === id)
            )
        );
    }, [durationFiltered, durationSearchIds]);

    const selectedScored = useMemo(() => {
        const source = mode === "inventory" ? inventoryScored : ingredientScored;
        return source.filter(s => selectedDishIds.includes(s.dish.id));
    }, [mode, inventoryScored, ingredientScored, selectedDishIds]);

    const missingIngredientIds = useMemo(() => {
        const ids = new Set<string>();
        selectedScored.forEach(s => s.missingIngredientIds.forEach(id => ids.add(id)));
        return Array.from(ids);
    }, [selectedScored]);

    const matchedIngredientIds = useMemo(() => {
        const ids = new Set<string>();
        selectedScored.forEach(s => s.matchedIngredientIds.forEach(id => ids.add(id)));
        return Array.from(ids);
    }, [selectedScored]);

    const _toggleDish = (dishId: string) => {
        setSelectedDishIds(prev =>
            prev.includes(dishId) ? prev.filter(id => id !== dishId) : [...prev, dishId]
        );
    };

    const _onNext = () => setStep(1);
    const _onBack = () => setStep(0);

    const _onClose = () => {
        setStep(0);
        setSelectedIngredientIds([]);
        setSelectedDishIds([]);
        onClose();
    };

    const _onModeChange = (m: Mode) => {
        setMode(m);
        setStep(m === "inventory" ? 1 : 0);
        setSelectedDishIds([]);
        setFridgeSearchIds([]);
        setDurationSearchIds([]);
    };

    const _missingIngredientName = (id: string) => ingredientsById.get(id)?.name ?? id;

    const ResultsFooter = ({ dishIds }: { dishIds: string[] }) => (
        <>
            {dishIds.length > 0 && (
                <Box style={{
                    marginTop: 10, padding: "8px 12px", borderRadius: 8,
                    background: missingIngredientIds.length === 0 ? "#f6ffed" : "#fff7e6",
                    border: `1px solid ${missingIngredientIds.length === 0 ? "#b7eb8f" : "#ffe7ba"}`,
                }}>
                    {missingIngredientIds.length === 0 ? (
                        <Typography.Text style={{ fontSize: 12, color: "#389e0d" }}>
                            🎉 Đủ nguyên liệu cho tất cả món đã chọn!
                        </Typography.Text>
                    ) : (
                        <>
                            <Typography.Text style={{ fontSize: 12, color: "#d46b08", display: "block", marginBottom: 6 }}>
                                Cần mua thêm <strong>{missingIngredientIds.length}</strong> nguyên liệu:
                            </Typography.Text>
                            <Stack wrap="wrap" gap={5}>
                                {missingIngredientIds.slice(0, 8).map(id => (
                                    <div key={id} style={{
                                        padding: "2px 10px", borderRadius: 12, fontSize: 12,
                                        background: "#fff2f0", border: "1px solid #ffccc7", color: "#cf1322",
                                    }}>
                                        {_missingIngredientName(id)}
                                    </div>
                                ))}
                                {missingIngredientIds.length > 8 && (
                                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                        +{missingIngredientIds.length - 8} khác
                                    </Typography.Text>
                                )}
                            </Stack>
                        </>
                    )}
                </Box>
            )}
            <Stack justify="space-between" style={{ marginTop: 12 }}>
                {mode !== "inventory" && (
                    <Button onClick={_onBack} icon={<LeftOutlined />} style={{ borderRadius: 20 }}>
                        Quay lại
                    </Button>
                )}
                <Button
                    type="primary"
                    disabled={dishIds.length === 0}
                    icon={<ShoppingCartOutlined />}
                    onClick={toggleShoppingListAdd.show}
                    style={{ borderRadius: 20, paddingInline: 20, marginLeft: "auto" }}
                >
                    Tạo giỏ hàng ({dishIds.length})
                </Button>
            </Stack>
        </>
    );

    const ModeTabs = () => (
        <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 6,
            marginBottom: 16,
        }}>
            {([
                { key: "ingredients" as Mode, label: "Nguyên liệu", icon: <BulbOutlined /> },
                { key: "inventory" as Mode, label: "Tủ lạnh", icon: <ThunderboltOutlined /> },
                { key: "duration" as Mode, label: "Thời gian", icon: <ClockCircleOutlined /> },
            ]).map(tab => (
                <button
                    key={tab.key}
                    onClick={() => _onModeChange(tab.key)}
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 4,
                        padding: "8px 4px",
                        borderRadius: 10,
                        border: mode === tab.key ? "2px solid #1677ff" : "1px solid #d9d9d9",
                        background: mode === tab.key ? "#e6f4ff" : "#fff",
                        color: mode === tab.key ? "#1677ff" : "#555",
                        fontWeight: mode === tab.key ? 600 : 400,
                        fontSize: 12,
                        cursor: "pointer",
                        minWidth: 0,
                        width: "100%",
                    }}
                >
                    <span style={{ fontSize: 16 }}>{tab.icon}</span>
                    <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>
                        {tab.label}
                    </span>
                </button>
            ))}
        </div>
    );

    return <>
        <Modal
            open={open}
            onCancel={_onClose}
            footer={null}
            destroyOnClose
            title={
                <Space>
                    <Image src={NoodlesIcon} preview={false} width={22} style={{ marginBottom: 3 }} />
                    Nấu gì hôm nay?
                </Space>
            }
            style={{ top: 24 }}
        >
            <ModeTabs />

            {/* ── Mode: ingredients ── */}
            {mode === "ingredients" && step === 0 && (
                <>
                    <IngredientPickerWidget
                        selectedIds={selectedIngredientIds}
                        onChange={setSelectedIngredientIds}
                    />
                    <Stack justify="flex-end" style={{ marginTop: 14 }}>
                        <Button
                            type="primary"
                            size="middle"
                            disabled={selectedIngredientIds.length === 0}
                            onClick={_onNext}
                            icon={<BulbOutlined />}
                            style={{ borderRadius: 20, paddingInline: 20 }}
                        >
                            Gợi ý món ({selectedIngredientIds.length})
                        </Button>
                    </Stack>
                </>
            )}

            {mode === "ingredients" && step === 1 && (
                <>
                    {ingredientGroups.length === 0
                        ? <Box style={{ textAlign: "center", padding: "32px 0" }}>
                            <Typography.Text type="secondary">Không tìm thấy món phù hợp</Typography.Text>
                        </Box>
                        : <DishSuggestionList
                            groups={ingredientGroups}
                            selectedDishIds={selectedDishIds}
                            onToggle={_toggleDish}
                        />
                    }
                    <ResultsFooter dishIds={selectedDishIds} />
                </>
            )}

            {/* ── Mode: inventory ── */}
            {mode === "inventory" && (
                <>
                    {inventoryIngredientIds.length === 0 ? (
                        <Box style={{ textAlign: "center", padding: "32px 0" }}>
                            <Typography.Text type="secondary">
                                Tủ lạnh trống — hãy cập nhật tồn kho trước
                            </Typography.Text>
                        </Box>
                    ) : (
                        <>
                            <Collapse
                                size="small"
                                ghost
                                style={{ marginBottom: 12, background: "#e6f4ff", borderRadius: 8, border: "1px solid #91caff" }}
                                items={[{
                                    key: "inv",
                                    label: (
                                        <Typography.Text style={{ fontSize: 12, color: "#0958d9" }}>
                                            🧊 <strong>{inventoryIngredientIds.length}</strong> nguyên liệu trong tủ lạnh — bấm để xem
                                        </Typography.Text>
                                    ),
                                    children: (
                                        <Box style={{ maxHeight: 180, overflowY: "auto" }}>
                                            <Stack wrap="wrap" gap={6}>
                                                {inventoryIngredientIds.map(id => {
                                                    const ingr = ingredientsById.get(id);
                                                    const inv = inventory[id];
                                                    const amt = InventoryHelper.totalAmount(inv as any, ingr);
                                                    const unit = IngredientUnitHelper.getBaseUnit(ingr);
                                                    return (
                                                        <div key={id} style={{
                                                            padding: "3px 10px", borderRadius: 12, fontSize: 12,
                                                            background: "#fff", border: "1px solid #91caff",
                                                            color: "#0958d9", whiteSpace: "nowrap",
                                                        }}>
                                                            {ingr?.name ?? id}
                                                            <span style={{ color: "#52c41a", marginLeft: 5, fontWeight: 600 }}>
                                                                {IngredientUnitHelper.formatAmount(amt)} {unit}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </Stack>
                                        </Box>
                                    ),
                                }]}
                            />
                            <Select
                                mode="multiple"
                                allowClear
                                placeholder="Lọc món chứa nguyên liệu..."
                                value={fridgeSearchIds}
                                onChange={setFridgeSearchIds}
                                style={{ width: "100%", marginBottom: 10 }}
                                size="small"
                                maxTagCount="responsive"
                                options={allIngredients.map(i => ({
                                    value: i.id,
                                    label: i.name,
                                }))}
                            />
                            {filteredInventoryGroups.length === 0
                                ? <Box style={{ textAlign: "center", padding: "32px 0" }}>
                                    <Typography.Text type="secondary">
                                        {fridgeSearchIds.length > 0
                                            ? `Không có món nào chứa đủ các nguyên liệu đã chọn`
                                            : 'Không tìm thấy món phù hợp với nguyên liệu hiện có'}
                                    </Typography.Text>
                                </Box>
                                : <DishSuggestionList
                                    groups={filteredInventoryGroups}
                                    selectedDishIds={selectedDishIds}
                                    onToggle={_toggleDish}
                                />
                            }
                            <ResultsFooter dishIds={selectedDishIds} />
                        </>
                    )}
                </>
            )}

            {/* ── Mode: duration ── */}
            {mode === "duration" && step === 0 && (
                <>
                    <Box style={{
                        padding: "16px", borderRadius: 10, background: "#f8f8f8",
                        border: "1px solid #e8e8e8", marginBottom: 16,
                    }}>
                        <Typography.Text style={{ display: "block", marginBottom: 10, fontWeight: 500 }}>
                            ⏱ Bạn có bao nhiêu thời gian để nấu?
                        </Typography.Text>
                        <Stack gap={10} align="center" wrap="wrap">
                            <InputNumber
                                min={5} max={480} step={5}
                                value={maxMinutes}
                                onChange={v => setMaxMinutes(v ?? 30)}
                                addonAfter="phút"
                                style={{ width: 140 }}
                            />
                            <Stack wrap="wrap" gap={6}>
                                {[15, 30, 45, 60, 90].map(m => (
                                    <Button
                                        key={m}
                                        size="small"
                                        type={maxMinutes === m ? "primary" : "default"}
                                        onClick={() => setMaxMinutes(m)}
                                        style={{ borderRadius: 14 }}
                                    >
                                        {m} phút
                                    </Button>
                                ))}
                            </Stack>
                        </Stack>
                    </Box>
                    <Stack justify="flex-end">
                        <Button
                            type="primary"
                            icon={<BulbOutlined />}
                            onClick={_onNext}
                            style={{ borderRadius: 20, paddingInline: 20 }}
                        >
                            Tìm món ≤ {maxMinutes} phút
                        </Button>
                    </Stack>
                </>
            )}

            {mode === "duration" && step === 1 && (
                <>
                    {durationFiltered.length === 0 ? (
                        <Box style={{ textAlign: "center", padding: "32px 0" }}>
                            <Typography.Text type="secondary">
                                Không có món nào nấu được trong {maxMinutes} phút
                            </Typography.Text>
                        </Box>
                    ) : filteredDurationDishes.length === 0 ? (
                        <Box style={{ textAlign: "center", padding: "32px 0" }}>
                            <Select
                                mode="multiple"
                                allowClear
                                placeholder="Lọc món chứa nguyên liệu..."
                                value={durationSearchIds}
                                onChange={setDurationSearchIds}
                                style={{ width: "100%", marginBottom: 10 }}
                                size="small"
                                maxTagCount="responsive"
                                options={allIngredients.map(i => ({ value: i.id, label: i.name }))}
                            />
                            <Typography.Text type="secondary">
                                Không có món nào chứa đủ các nguyên liệu đã chọn
                            </Typography.Text>
                        </Box>
                    ) : (
                        <>
                            <Select
                                mode="multiple"
                                allowClear
                                placeholder="Lọc món chứa nguyên liệu..."
                                value={durationSearchIds}
                                onChange={setDurationSearchIds}
                                style={{ width: "100%", marginBottom: 10 }}
                                size="small"
                                maxTagCount="responsive"
                                options={allIngredients.map(i => ({ value: i.id, label: i.name }))}
                            />
                            <Typography.Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 10 }}>
                                {filteredDurationDishes.length}{durationSearchIds.length > 0 ? ` / ${durationFiltered.length}` : ''} món nấu được trong ≤ {maxMinutes} phút
                            </Typography.Text>
                            <Box style={{ maxHeight: 380, overflowY: "auto" }}>
                                {filteredDurationDishes.map(dish => {
                                    const mins = totalDurationMins(dish);
                                    const selected = selectedDishIds.includes(dish.id);
                                    const ingredients = dish.ingredients ?? [];
                                    const availableCount = ingredients.filter(req => {
                                        const ingr = ingredientsById.get(req.ingredientId);
                                        const unit = IngredientUnitHelper.getBaseUnit(ingr, [req.unit]);
                                        const stockAmt = InventoryHelper.totalAmount(inventory[req.ingredientId] as any, ingr);
                                        const needed = IngredientUnitHelper.toBaseAmount(ingr, req.amount, req.unit, unit) ?? 0;
                                        return needed > 0 ? stockAmt >= needed : stockAmt > 0;
                                    }).length;
                                    return (
                                        <div
                                            key={dish.id}
                                            onClick={() => _toggleDish(dish.id)}
                                            style={{
                                                padding: "10px 12px", marginBottom: 8, borderRadius: 10, cursor: "pointer",
                                                border: `1.5px solid ${selected ? "#52c41a" : "#ebebeb"}`,
                                                background: selected ? "#f6ffed" : "#fafafa",
                                                transition: "all 0.15s",
                                            }}
                                        >
                                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: ingredients.length > 0 ? 8 : 0 }}>
                                                <Typography.Text strong style={{ fontSize: 14 }}>{dish.name}</Typography.Text>
                                                <Stack gap={6} align="center">
                                                    {ingredients.length > 0 && (
                                                        <span style={{ fontSize: 11, color: availableCount === ingredients.length ? "#389e0d" : "#888" }}>
                                                            {availableCount}/{ingredients.length} có sẵn
                                                        </span>
                                                    )}
                                                    <Tag color={mins <= 20 ? "green" : mins <= 45 ? "blue" : "orange"} style={{ marginRight: 0 }}>
                                                        🕐 {mins} phút
                                                    </Tag>
                                                </Stack>
                                            </div>
                                            {ingredients.length > 0 && (
                                                <Stack wrap="wrap" gap={4}>
                                                    {ingredients.map(req => {
                                                        const ingr = ingredientsById.get(req.ingredientId);
                                                        const inv = inventory[req.ingredientId];
                                                        const unit = IngredientUnitHelper.getBaseUnit(ingr, [req.unit]);
                                                        const stockAmt = InventoryHelper.totalAmount(inv as any, ingr);
                                                        const needed = IngredientUnitHelper.toBaseAmount(ingr, req.amount, req.unit, unit) ?? 0;
                                                        const enough = needed > 0 ? stockAmt >= needed : stockAmt > 0;
                                                        const lacking = stockAmt > 0 && !enough;
                                                        const missing = stockAmt === 0;

                                                        const chipStyle: React.CSSProperties = enough
                                                            ? { background: "#f6ffed", border: "1px solid #b7eb8f", color: "#389e0d" }
                                                            : lacking
                                                            ? { background: "#fff7e6", border: "1px solid #ffd591", color: "#d46b08" }
                                                            : { background: "#f5f5f5", border: "1px solid #d9d9d9", color: "#aaa" };

                                                        return (
                                                            <div key={req.ingredientId} style={{
                                                                padding: "2px 8px", borderRadius: 10, fontSize: 11,
                                                                whiteSpace: "nowrap", ...chipStyle,
                                                            }}>
                                                                {ingr?.name ?? req.ingredientId}
                                                                {enough && stockAmt > 0 && (
                                                                    <span style={{ marginLeft: 4, fontWeight: 600 }}>
                                                                        {IngredientUnitHelper.formatAmount(stockAmt)}{unit}
                                                                    </span>
                                                                )}
                                                                {lacking && (
                                                                    <span style={{ marginLeft: 4, fontWeight: 600 }}>
                                                                        {IngredientUnitHelper.formatAmount(stockAmt)}/{IngredientUnitHelper.formatAmount(needed)}{unit}
                                                                    </span>
                                                                )}
                                                                {missing && needed > 0 && (
                                                                    <span style={{ marginLeft: 4 }}>
                                                                        (cần {needed}{req.unit ?? ""})
                                                                    </span>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </Stack>
                                            )}
                                        </div>
                                    );
                                })}
                            </Box>
                        </>
                    )}
                    <Stack justify="space-between" style={{ marginTop: 12 }}>
                        <Button onClick={_onBack} icon={<LeftOutlined />} style={{ borderRadius: 20 }}>
                            Quay lại
                        </Button>
                        <Button
                            type="primary"
                            disabled={selectedDishIds.length === 0}
                            icon={<ShoppingCartOutlined />}
                            onClick={toggleShoppingListAdd.show}
                            style={{ borderRadius: 20, paddingInline: 20 }}
                        >
                            Tạo giỏ hàng ({selectedDishIds.length})
                        </Button>
                    </Stack>
                </>
            )}
        </Modal>

        {toggleShoppingListAdd.value && <Modal
            open={toggleShoppingListAdd.value}
            onCancel={toggleShoppingListAdd.hide}
            footer={null}
            destroyOnClose
            title={
                <Space>
                    <Image src={ShoppingListIcon} preview={false} width={22} style={{ marginBottom: 3 }} />
                    Tạo lịch mua sắm
                </Space>
            }
            style={{ top: 30 }}
        >
            <DeferredModalContent active={toggleShoppingListAdd.value}>
                <ShoppingListAddWidget
                    date={new Date()}
                    dishIds={selectedDishIds}
                    alreadyHaveIngredientIds={
                        mode === "ingredients" ? selectedIngredientIds :
                        mode === "inventory" ? matchedIngredientIds : []
                    }
                    onDone={() => {
                        toggleShoppingListAdd.hide();
                        _onClose();
                    }}
                    onCreated={(shoppingList) => navigate(RootRoutes.AuthorizedRoutes.ShoppingListRoutes.Detail(shoppingList.id))}
                />
            </DeferredModalContent>
        </Modal>}
    </>;
};
