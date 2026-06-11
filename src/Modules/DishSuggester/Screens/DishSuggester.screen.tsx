import { BarChartOutlined, BulbOutlined, CalculatorOutlined, ClockCircleOutlined, ExportOutlined, FireOutlined, LeftOutlined, MinusOutlined, MoreOutlined, PieChartOutlined, PlusOutlined, SettingOutlined, ShoppingCartOutlined, TeamOutlined, ThunderboltOutlined } from "@ant-design/icons";
import { DishDurationHelper } from "@common/Helpers/DishDurationHelper";
import { DishNutritionHelper, DishNutritionSummary } from "@common/Helpers/DishNutritionHelper";
import { DishServingHelper } from "@common/Helpers/DishServingHelper";
import { HouseholdSuitabilityHelper } from "@common/Helpers/HouseholdSuitabilityHelper";
import { NutritionGoalHelper, NutritionGoalMatch } from "@common/Helpers/NutritionGoalHelper";
import { Button } from "@components/Button";
import { Dropdown } from "@components/Dropdown";
import { createSelectedOptionsDropdownRender, renderResponsiveTagPlaceholder } from "@components/Form/Select";
import { Image } from "@components/Image";
import { Box } from "@components/Layout/Box";
import { Space } from "@components/Layout/Space";
import { Stack } from "@components/Layout/Stack";
import { useMessage } from "@components/Message";
import { DeferredModalContent, Modal } from "@components/Modal";
import { Tag } from "@components/Tag";
import { Typography } from "@components/Typography";
import { useScheduledCalculation, useToggle } from "@hooks";
import { DishScorer, ScoredDish, ScoredDishGroup } from "../Helpers/DishScorer";
import { selectDishes, selectDishesById, selectHouseholdMembers, selectIngredients, selectIngredientsById, selectInventory, selectInventoryHealthConfig, selectNutritionGoals, selectSelectedHouseholdMemberIds } from "@store/Selectors";
import { InputNumber, Select, Spin } from "antd";
import React, { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { IngredientPickerWidget } from "./IngredientPicker.widget";
import { DishSuggestionList } from "./DishSuggestionList.widget";
import { DishImageWidget } from "@modules/Dishes/Screens/DishesManageIngredient/DishImage.widget";
import { ShoppingListAddWidget } from "@modules/ShoppingList/Screens/ShoppingListAdd.widget";
import { DishExpensePlannerWidget } from "@modules/Dishes/Screens/DishesManageIngredient/DishExpensePlanner.widget";
import { NutritionCalculatorModalContent, type NutritionCalculatorInitialSelection } from "@modules/Home/Screens/NutritionCalculator.widget";
import ShoppingListIcon from "../../../../assets/icons/shoppingList.png";
import NoodlesIcon from "../../../../assets/icons/noodles.png";
import DietIcon from "../../../../assets/icons/diet.png";
import { Dishes } from "@store/Models/Dishes";
import { InventoryHelper } from "@common/Helpers/InventoryHelper";
import { IngredientUnitHelper } from "@common/Helpers/IngredientUnitHelper";
import { Collapse } from "antd";
import { RootRoutes } from "@routing/RootRoutes";
import { NutritionGoal as SharedNutritionGoal } from "@store/Models/SharedConfig";
import { setSelectedHouseholdMemberIds } from "@store/Reducers/AppContextReducer";
import { startCooking } from "@store/Reducers/CookingSessionReducer";

type Mode = "ingredients" | "inventory" | "duration" | "nutrition";
type SuggesterActionMode = "navigate" | "modal";

type NutritionSuggestion = {
    dish: Dishes;
    nutrition: DishNutritionSummary;
    match: NutritionGoalMatch;
    score: number;
    reason: string;
    tone: string;
}

type DishSuggesterScreenProps = {
    open: boolean;
    onClose: () => void;
    initialMode?: Mode;
    initialIngredientIds?: string[];
    previewInline?: boolean;
    pageInline?: boolean;
    actionMode?: SuggesterActionMode;
}

const totalDurationMins = (dish: Dishes) => {
    return DishDurationHelper.getTotalMinutes(dish.duration);
};

const collectAllCookingSteps = (dish: Dishes, dishesById: Map<string, Dishes>, visited = new Set<string>()): string[] => {
    if (visited.has(dish.id)) return [];
    visited.add(dish.id);
    const fromIncluded = (dish.includeDishes ?? []).flatMap(id => {
        const included = dishesById.get(id);
        return included ? collectAllCookingSteps(included, dishesById, visited) : [];
    });
    return [...fromIncluded, ...(dish.steps ?? []).map(step => step.content)];
};

type DishSuggestionCalculation = {
    scored: ScoredDish[];
    groups: ScoredDishGroup[];
}

type DurationDishCalculation = {
    dishes: Dishes[];
}

type NutritionDishCalculation = {
    suggestions: NutritionSuggestion[];
}

const createEmptyDishSuggestionCalculation = (): DishSuggestionCalculation => ({
    scored: [],
    groups: [],
});

const createEmptyDurationDishCalculation = (): DurationDishCalculation => ({
    dishes: [],
});

const createEmptyNutritionDishCalculation = (): NutritionDishCalculation => ({
    suggestions: [],
});

const getNutritionReason = (summary: DishNutritionSummary, match: NutritionGoalMatch): string => {
    return `${match.matchedCriteriaCount}/${match.totalCriteriaCount} điều hợp · ${DishNutritionHelper.formatCalories(summary.perServing.calories)}`;
};

const PendingCalculationBox: React.FunctionComponent<{ text: string }> = ({ text }) => {
    return <Box style={{ minHeight: 120, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
        <Stack direction="column" align="center" gap={8}>
            <Spin size="small" />
            <Typography.Text type="secondary">{text}</Typography.Text>
        </Stack>
    </Box>;
};

export const DishSuggesterScreen: React.FC<DishSuggesterScreenProps> = ({ open, onClose, initialMode, initialIngredientIds, previewInline, pageInline, actionMode = "navigate" }) => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const message = useMessage();
    const dishes = useSelector(selectDishes);
    const dishesById = useSelector(selectDishesById);
    const allIngredients = useSelector(selectIngredients);
    const ingredientsById = useSelector(selectIngredientsById);
    const inventory = useSelector(selectInventory);
    const inventoryConfig = useSelector(selectInventoryHealthConfig);
    const nutritionGoals = useSelector(selectNutritionGoals);
    const householdMembers = useSelector(selectHouseholdMembers);
    const selectedHouseholdMemberIds = useSelector(selectSelectedHouseholdMemberIds);

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
    const toggleExpensePlanner = useToggle();
    const toggleNutritionCalculator = useToggle();
    const toggleSuitabilityModal = useToggle();

    const [maxMinutes, setMaxMinutes] = useState<number>(30);
    const [fridgeSearchIds, setFridgeSearchIds] = useState<string[]>([]);
    const [durationSearchIds, setDurationSearchIds] = useState<string[]>([]);
    const [nutritionGoalId, setNutritionGoalId] = useState<string>(nutritionGoals[0]?.id ?? "");
    const [expandedNutritionDishIds, setExpandedNutritionDishIds] = useState<Set<string>>(() => new Set());

    React.useEffect(() => {
        if (nutritionGoals.length === 0) {
            setNutritionGoalId("");
            return;
        }
        if (!nutritionGoals.some(goal => goal.id === nutritionGoalId)) {
            setNutritionGoalId(nutritionGoals[0].id);
        }
    }, [nutritionGoals, nutritionGoalId]);

    const selectedNutritionGoal = useMemo<SharedNutritionGoal | undefined>(() => {
        return nutritionGoals.find(goal => goal.id === nutritionGoalId) ?? nutritionGoals[0];
    }, [nutritionGoalId, nutritionGoals]);

    const ingredientOptions = useMemo(() => allIngredients.map(i => ({ value: i.id, label: i.name })), [allIngredients]);
    const householdMemberOptions = useMemo(() => householdMembers.map(member => ({ value: member.id, label: member.name })), [householdMembers]);

    const inventoryIngredientIds = useMemo(() => {
        if (!open) return [];
        return Object.entries(inventory)
            .filter(([id, inv]) => {
                const ingredient = ingredientsById.get(id);
                return !InventoryHelper.isAlwaysAvailable(ingredient)
                    && InventoryHelper.totalUsableAmount(inv as any, ingredient, inventoryConfig) > 0;
            })
            .map(([id]) => id);
    }, [open, inventory, ingredientsById, inventoryConfig]);

    const calculateIngredientSuggestions = React.useCallback((): DishSuggestionCalculation => {
        const scored = DishScorer.score(dishes, selectedIngredientIds, dishes);
        return { scored, groups: DishScorer.group(scored) };
    }, [dishes, selectedIngredientIds]);
    const { value: ingredientSuggestions, pending: ingredientSuggestionsPending } = useScheduledCalculation(calculateIngredientSuggestions, {
        enabled: open && mode === "ingredients" && step === 1,
        initialValue: createEmptyDishSuggestionCalculation,
    });
    const ingredientScored = ingredientSuggestions.scored;
    const ingredientGroups = ingredientSuggestions.groups;

    const calculateInventorySuggestions = React.useCallback((): DishSuggestionCalculation => {
        const scored = DishScorer.scoreWithInventory(dishes, inventory as any, dishes, allIngredients, inventoryConfig);
        return { scored, groups: DishScorer.group(scored) };
    }, [allIngredients, dishes, inventory, inventoryConfig]);
    const { value: inventorySuggestions, pending: inventorySuggestionsPending } = useScheduledCalculation(calculateInventorySuggestions, {
        enabled: open && mode === "inventory",
        initialValue: createEmptyDishSuggestionCalculation,
    });
    const inventoryScored = inventorySuggestions.scored;
    const inventoryGroups = inventorySuggestions.groups;

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

    const calculateDurationDishes = React.useCallback((): DurationDishCalculation => {
        return {
            dishes: dishes
                .filter(d => { const t = totalDurationMins(d); return t > 0 && t <= maxMinutes; })
                .sort((a, b) => totalDurationMins(a) - totalDurationMins(b)),
        };
    }, [dishes, maxMinutes]);
    const { value: durationCalculation, pending: durationPending } = useScheduledCalculation(calculateDurationDishes, {
        enabled: open && mode === "duration" && step === 1,
        initialValue: createEmptyDurationDishCalculation,
    });
    const durationFiltered = durationCalculation.dishes;

    const filteredDurationDishes = useMemo(() => {
        if (durationSearchIds.length === 0) return durationFiltered;
        return durationFiltered.filter(dish =>
            durationSearchIds.every(id =>
                dish.ingredients?.some(req => req.ingredientId === id)
            )
        );
    }, [durationFiltered, durationSearchIds]);

    const calculateNutritionSuggestions = React.useCallback((): NutritionDishCalculation => {
        if (!selectedNutritionGoal) return createEmptyNutritionDishCalculation();
        const suggestions = dishes
            .map(dish => {
                const nutrition = DishNutritionHelper.calculateDishNutrition(dish, dishes, ingredientsById);
                const match = NutritionGoalHelper.score(nutrition, selectedNutritionGoal);
                const score = match.score;
                if (score <= 0) return null;
                return {
                    dish,
                    nutrition,
                    match,
                    score,
                    reason: getNutritionReason(nutrition, match),
                    tone: selectedNutritionGoal.color ?? "#7436dc",
                } as NutritionSuggestion;
            })
            .filter((item): item is NutritionSuggestion => item !== null)
            .sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score;
                return (b.nutrition.coveragePercent - a.nutrition.coveragePercent);
            })
            .slice(0, 40);
        return { suggestions };
    }, [dishes, ingredientsById, selectedNutritionGoal]);
    const { value: nutritionCalculation, pending: nutritionPending } = useScheduledCalculation(calculateNutritionSuggestions, {
        enabled: open && mode === "nutrition" && step === 1,
        initialValue: createEmptyNutritionDishCalculation,
    });
    const nutritionSuggestions = nutritionCalculation.suggestions;
    const selectedDishIdSet = useMemo(() => new Set(selectedDishIds), [selectedDishIds]);
    const selectedDishesForActions = useMemo(() => selectedDishIds
        .map(id => dishes.find(dish => dish.id === id))
        .filter((dish): dish is Dishes => Boolean(dish)), [dishes, selectedDishIds]);
    const nutritionInitialSelection = useMemo<NutritionCalculatorInitialSelection>(() => ({
        key: `dishes|${selectedDishIds.join(",")}||`,
        source: "dishes",
        dishIds: selectedDishIds,
        shoppingListIds: [],
        mealIds: [],
    }), [selectedDishIds]);

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

    const _toggleDish = React.useCallback((dishId: string) => {
        setSelectedDishIds(prev =>
            prev.includes(dishId) ? prev.filter(id => id !== dishId) : [...prev, dishId]
        );
    }, []);

    const _toggleNutritionDetails = React.useCallback((dishId: string, event: React.SyntheticEvent<HTMLElement>) => {
        event.stopPropagation();
        setExpandedNutritionDishIds(prev => {
            const next = new Set(prev);
            if (next.has(dishId)) next.delete(dishId);
            else next.add(dishId);
            return next;
        });
    }, []);

    const _onNutritionGoalChange = React.useCallback((goalId: string) => {
        setSelectedDishIds([]);
        setExpandedNutritionDishIds(new Set());
        setNutritionGoalId(goalId);
    }, []);

    const _onFridgeSearchChange = React.useCallback((ids: string[]) => {
        setSelectedDishIds([]);
        setFridgeSearchIds(ids);
    }, []);

    const _onDurationSearchChange = React.useCallback((ids: string[]) => {
        setSelectedDishIds([]);
        setDurationSearchIds(ids);
    }, []);

    const _onMaxMinutesChange = React.useCallback((value: number) => {
        setSelectedDishIds([]);
        setMaxMinutes(value);
    }, []);

    const _onSelectedHouseholdMembersChange = React.useCallback((memberIds: string[]) => {
        dispatch(setSelectedHouseholdMemberIds(memberIds));
    }, [dispatch]);

    const _onNext = () => setStep(1);
    const _onBack = () => setStep(0);

    const _onClose = () => {
        setStep(0);
        setSelectedIngredientIds([]);
        setSelectedDishIds([]);
        setExpandedNutritionDishIds(new Set());
        onClose();
    };

    const _onModeChange = (m: Mode) => {
        setMode(m);
        setStep(m === "inventory" ? 1 : 0);
        setSelectedDishIds([]);
        setExpandedNutritionDishIds(new Set());
        setFridgeSearchIds([]);
        setDurationSearchIds([]);
    };

    const _missingIngredientName = (id: string) => ingredientsById.get(id)?.name ?? id;

    const _onOpenExpensePlanner = (dishIds: string[]) => {
        if (dishIds.length === 0) return;
        if (actionMode === "modal") {
            toggleExpensePlanner.show();
            return;
        }
        navigate(RootRoutes.AuthorizedRoutes.ExpensePlanner(dishIds));
        _onClose();
    };

    const _onOpenNutritionCalculator = (dishIds: string[]) => {
        if (dishIds.length === 0) return;
        if (actionMode === "modal") {
            toggleNutritionCalculator.show();
            return;
        }
        navigate(RootRoutes.AuthorizedRoutes.NutritionGoals({ calculator: true, source: "dishes", dishes: dishIds }));
        _onClose();
    };

    const _onOpenSeparatePage = () => {
        navigate(RootRoutes.AuthorizedRoutes.DishSuggester());
        _onClose();
    };

    const _onStartCookingSession = (dishIds: string[]) => {
        const targetDishes = dishIds
            .map(id => dishesById.get(id))
            .filter((dish): dish is Dishes => Boolean(dish));
        if (targetDishes.length === 0) return;
        const memberIds = selectedHouseholdMemberIds.length > 0 ? selectedHouseholdMemberIds : householdMembers.map(member => member.id);
        targetDishes.forEach(dish => {
            const ingredientIds = Array.from(new Set(DishServingHelper.collectIngredientAmounts(dish, dishes).map(row => row.ingredientId)));
            dispatch(startCooking({
                dishId: dish.id,
                dishName: dish.name,
                baseServings: DishServingHelper.getBaseServings(dish),
                steps: collectAllCookingSteps(dish, dishesById),
                ingredientIds,
                householdMemberIds: memberIds,
            }));
        });
        message.success(targetDishes.length === 1 ? `Đã bắt đầu nấu ${targetDishes[0].name}` : `Đã bắt đầu nấu ${targetDishes.length} món`);
        if (!pageInline) _onClose();
    };

    const actionButtonStyle: React.CSSProperties = {
        width: 40,
        height: 40,
        minWidth: 40,
        paddingInline: 0,
        borderRadius: 14,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
    };

    const backIconButtonStyle: React.CSSProperties = {
        width: 40,
        height: 40,
        minWidth: 40,
        paddingInline: 0,
        borderRadius: 999,
        color: "#595959",
    };

    const selectedCountStyle = (count: number): React.CSSProperties => ({
        minWidth: 28,
        textAlign: "right",
        color: count > 0 ? "#1677ff" : "#8c8c8c",
        fontSize: 13,
        fontWeight: 700,
        lineHeight: "40px",
        whiteSpace: "nowrap",
    });

    const footerRowStyle: React.CSSProperties = {
        width: "100%",
        marginTop: 12,
        display: "flex",
        alignItems: "center",
        justifyContent: mode !== "inventory" ? "space-between" : "flex-end",
        gap: 12,
    };

    const ResultsActions = ({ dishIds, pending = false }: { dishIds: string[]; pending?: boolean }) => {
        const disabled = pending || dishIds.length === 0;

        return <Stack gap={8} align="center" style={{ marginLeft: "auto", flexShrink: 0 }}>
            <Typography.Text data-testid="dish-suggester-selected-count" style={selectedCountStyle(dishIds.length)}>({dishIds.length})</Typography.Text>
            <Button
                type="primary"
                disabled={disabled}
                aria-label={`Bắt đầu nấu ${dishIds.length} món`}
                data-testid="dish-suggester-start-cooking-button"
                icon={<FireOutlined />}
                onClick={() => _onStartCookingSession(dishIds)}
            >
                Nấu
            </Button>
            <Dropdown
                placement="topRight"
                trigger={["click"]}
                disabled={disabled}
                menu={{
                    onClick: ({ key }) => {
                        if (key === "shopping") toggleShoppingListAdd.show();
                        if (key === "expense") _onOpenExpensePlanner(dishIds);
                        if (key === "suitability") toggleSuitabilityModal.show();
                        if (key === "nutrition") _onOpenNutritionCalculator(dishIds);
                    },
                    items: [
                        { key: "shopping", label: "Tạo lịch mua", icon: <ShoppingCartOutlined /> },
                        { key: "expense", label: "Kế hoạch chi phí", icon: <CalculatorOutlined /> },
                        { key: "suitability", label: "Độ hợp nhà mình", icon: <TeamOutlined /> },
                        { key: "nutrition", label: "Tính dinh dưỡng", icon: <PieChartOutlined /> },
                    ],
                }}
            >
                <Button
                    disabled={disabled}
                    aria-label={`Thao tác khác cho ${dishIds.length} món`}
                    data-testid="dish-suggester-more-actions-button"
                    icon={<MoreOutlined />}
                    style={actionButtonStyle}
                />
            </Dropdown>
        </Stack>;
    };

    const ResultsFooter = ({ dishIds, pending = false }: { dishIds: string[]; pending?: boolean }) => (
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
            <div style={footerRowStyle}>
                {mode !== "inventory" && (
                    <Button aria-label="Quay lại" onClick={_onBack} icon={<LeftOutlined />} style={backIconButtonStyle} />
                )}
                <ResultsActions dishIds={dishIds} pending={pending} />
            </div>
        </>
    );

    const ModeTabs = () => (
        <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 6,
            marginBottom: 16,
        }}>
            {([
                { key: "ingredients" as Mode, label: "Nguyên liệu", icon: <BulbOutlined /> },
                { key: "inventory" as Mode, label: "Tủ lạnh", icon: <ThunderboltOutlined /> },
                { key: "duration" as Mode, label: "Thời gian", icon: <ClockCircleOutlined /> },
                { key: "nutrition" as Mode, label: "Dinh dưỡng", icon: <Image src={DietIcon} preview={false} width={18} alt="" /> },
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

    const NutritionMetric = ({ label, value, tone }: { label: string; value: string; tone: string }) => (
        <div style={{ minWidth: 0, border: `1px solid ${tone}22`, borderRadius: 8, background: `${tone}0d`, padding: "6px 7px" }}>
            <Typography.Text strong style={{ display: "block", color: tone, fontSize: 12.5, lineHeight: "17px", overflowWrap: "anywhere" }}>{value}</Typography.Text>
            <Typography.Text type="secondary" style={{ display: "block", fontSize: 10.5, lineHeight: "13px" }}>{label}</Typography.Text>
        </div>
    );

    const NutritionGoalPicker = () => (
        <Box style={{ padding: 12, borderRadius: 8, background: "#fbf9ff", border: "1px solid #ece5ff", marginBottom: 14 }}>
            <Stack justify="space-between" align="center" gap={8} style={{ marginBottom: 9 }}>
                <Typography.Text strong>Chọn mục tiêu dinh dưỡng</Typography.Text>
                <Button
                    type="text"
                    icon={<SettingOutlined />}
                    onClick={() => { navigate(RootRoutes.AuthorizedRoutes.NutritionGoals()); _onClose(); }}
                    style={{ borderRadius: 999, color: "#7436dc" }}
                >
                    Quản lý
                </Button>
            </Stack>
            {nutritionGoals.length === 0 ? (
                <Box style={{ border: "1px dashed #d9d9d9", borderRadius: 8, padding: 14, textAlign: "center", background: "#fff" }}>
                    <Typography.Text type="secondary">Chưa có mục tiêu dinh dưỡng. Hãy tạo mục tiêu trước.</Typography.Text>
                </Box>
            ) : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(138px, 1fr))", gap: 8 }}>
                {nutritionGoals.map(goal => {
                    const active = selectedNutritionGoal?.id === goal.id;
                    const tone = goal.color ?? "#7436dc";
                    return <button
                        key={goal.id}
                        type="button"
                        onClick={() => _onNutritionGoalChange(goal.id)}
                        style={{
                            border: active ? `2px solid ${tone}` : "1px solid #e8e2f7",
                            background: active ? `${tone}12` : "#fff",
                            borderRadius: 8,
                            padding: "10px 11px",
                            cursor: "pointer",
                            textAlign: "left",
                            minWidth: 0,
                        }}
                    >
                        <Stack gap={7} align="flex-start">
                            <span style={{ width: 9, height: 9, borderRadius: 99, background: tone, marginTop: 5, flexShrink: 0 }} />
                            <div style={{ minWidth: 0 }}>
                                <Typography.Text strong style={{ display: "block", color: active ? tone : "#111827", fontSize: 13, lineHeight: "17px", overflowWrap: "anywhere" }}>{goal.name}</Typography.Text>
                                <Typography.Text type="secondary" style={{ display: "block", fontSize: 11, lineHeight: "15px" }}>{goal.criteria.length} điều cần theo</Typography.Text>
                            </div>
                        </Stack>
                    </button>;
                })}
            </div>}
        </Box>
    );

    const renderNutritionSuggestionList = () => {
        const goal = selectedNutritionGoal;
        if (!goal) return null;
        const tone = goal.color ?? "#7436dc";
        return <>
            <Stack align="center" gap={8} style={{ marginBottom: 10 }}>
                <BarChartOutlined style={{ color: tone }} />
                <Typography.Text type="secondary" style={{ fontSize: 12, flex: 1 }}>
                    Gợi ý theo mục tiêu <strong style={{ color: tone }}>{goal.name}</strong>
                </Typography.Text>
            </Stack>
            <Select
                value={goal.id}
                onChange={_onNutritionGoalChange}
                style={{ width: "100%", marginBottom: 10 }}
                options={nutritionGoals.map(item => ({ value: item.id, label: `${item.name} - ${item.criteria.length} điều` }))}
            />
            <Box style={{ maxHeight: 430, overflowY: "auto", paddingRight: 2 }}>
                {nutritionSuggestions.map(item => {
                    const selected = selectedDishIdSet.has(item.dish.id);
                    const expanded = expandedNutritionDishIds.has(item.dish.id);
                    return <div
                        key={item.dish.id}
                        data-testid={`nutrition-suggestion-item-${item.dish.id}`}
                        onClick={() => _toggleDish(item.dish.id)}
                        style={{
                            borderRadius: 10,
                            border: `1.5px solid ${selected ? "#52c41a" : "#ebe4f8"}`,
                            background: selected ? "#f6ffed" : "#fff",
                            marginBottom: 8,
                            padding: 11,
                            cursor: "pointer",
                            boxShadow: "0 8px 18px rgba(74,48,130,0.06)",
                        }}
                    >
                        <div style={{ display: "grid", gridTemplateColumns: "22px 44px minmax(0, 1fr) 34px", gap: 10, alignItems: "start" }}>
                            <div style={{
                                width: 22,
                                height: 22,
                                borderRadius: "50%",
                                border: `2px solid ${selected ? "#52c41a" : "#d9d9d9"}`,
                                background: selected ? "#52c41a" : "transparent",
                                color: "#fff",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                                marginTop: 9,
                                fontSize: 12,
                                fontWeight: 800,
                            }}>{selected ? "✓" : ""}</div>
                            <DishImageWidget src={item.dish.image} width={44} height={44} borderRadius={7} fallbackIconSize={24} showBrokenLabel={false} style={{ flexShrink: 0, marginTop: 1 }} />
                            <Box style={{ minWidth: 0, flex: 1 }}>
                                <Typography.Text strong style={{ display: "block", color: "#111827", fontSize: 14, lineHeight: "18px", overflowWrap: "anywhere" }}>{item.dish.name}</Typography.Text>
                                <Typography.Text type="secondary" style={{ display: "block", fontSize: 11, lineHeight: "15px", marginTop: 2 }}>{item.reason}</Typography.Text>
                                {expanded && <>
                                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(72px, 1fr))", gap: 6, marginTop: 6 }}>
                                        <NutritionMetric label="kcal" value={DishNutritionHelper.formatCalories(item.nutrition.perServing.calories)} tone="#7436dc" />
                                        <NutritionMetric label="đạm" value={DishNutritionHelper.formatGram(item.nutrition.perServing.protein)} tone="#1677ff" />
                                        <NutritionMetric label="béo" value={DishNutritionHelper.formatGram(item.nutrition.perServing.fat)} tone="#d46b08" />
                                        <NutritionMetric label="xơ" value={DishNutritionHelper.formatGram(item.nutrition.perServing.fiber)} tone="#389e0d" />
                                    </div>
                                    {(item.nutrition.missingNutritionIngredientIds.length > 0 || item.nutrition.missingConversionIngredientIds.length > 0) && (
                                        <Typography.Text type="secondary" style={{ display: "block", fontSize: 10, lineHeight: "14px", marginTop: 8 }}>
                                            Cần bổ sung thông tin cho {item.nutrition.missingNutritionIngredientIds.length + item.nutrition.missingConversionIngredientIds.length} nguyên liệu.
                                        </Typography.Text>
                                    )}
                                </>}
                            </Box>
                            <div
                                role="button"
                                tabIndex={0}
                                onClick={(event) => _toggleNutritionDetails(item.dish.id, event)}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter" || event.key === " ") {
                                        event.preventDefault();
                                        _toggleNutritionDetails(item.dish.id, event);
                                    }
                                }}
                                aria-label={`${expanded ? "Ẩn" : "Xem"} dinh dưỡng của ${item.dish.name}`}
                                style={{ padding: "4px 6px", cursor: "pointer", color: "#aaa", flexShrink: 0, marginTop: 8 }}
                            >
                                {expanded ? <MinusOutlined /> : <PlusOutlined />}
                            </div>
                        </div>
                    </div>;
                })}
            </Box>
        </>;
    };

    const content = <>
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
                    {ingredientSuggestionsPending
                        ? <PendingCalculationBox text="Đang tính gợi ý món..." />
                        : ingredientGroups.length === 0
                        ? <Box style={{ textAlign: "center", padding: "32px 0" }}>
                            <Typography.Text type="secondary">Không tìm thấy món phù hợp</Typography.Text>
                        </Box>
                        : <DishSuggestionList
                            groups={ingredientGroups}
                            selectedDishIds={selectedDishIds}
                            onToggle={_toggleDish}
                        />
                    }
                    <ResultsFooter dishIds={selectedDishIds} pending={ingredientSuggestionsPending} />
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
                                onChange={_onFridgeSearchChange}
                                style={{ width: "100%", marginBottom: 10 }}
                                size="small"
                                maxTagCount="responsive"
                                maxTagPlaceholder={renderResponsiveTagPlaceholder}
                                dropdownRender={createSelectedOptionsDropdownRender({ mode: 'multiple', value: fridgeSearchIds, options: ingredientOptions })}
                                options={ingredientOptions}
                            />
                            {inventorySuggestionsPending
                                ? <PendingCalculationBox text="Đang tính món phù hợp với tủ lạnh..." />
                                : filteredInventoryGroups.length === 0
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
                            <ResultsFooter dishIds={selectedDishIds} pending={inventorySuggestionsPending} />
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
                                onChange={v => _onMaxMinutesChange(v ?? 30)}
                                addonAfter="phút"
                                style={{ width: 140 }}
                            />
                            <Stack wrap="wrap" gap={6}>
                                {[15, 30, 45, 60, 90].map(m => (
                                    <Button
                                        key={m}
                                        type={maxMinutes === m ? "primary" : "default"}
                                        onClick={() => _onMaxMinutesChange(m)}
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
                    {durationPending ? (
                        <PendingCalculationBox text="Đang lọc món theo thời gian..." />
                    ) : durationFiltered.length === 0 ? (
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
                                onChange={_onDurationSearchChange}
                                style={{ width: "100%", marginBottom: 10 }}
                                size="small"
                                maxTagCount="responsive"
                                maxTagPlaceholder={renderResponsiveTagPlaceholder}
                                dropdownRender={createSelectedOptionsDropdownRender({ mode: 'multiple', value: durationSearchIds, options: ingredientOptions })}
                                options={ingredientOptions}
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
                                onChange={_onDurationSearchChange}
                                style={{ width: "100%", marginBottom: 10 }}
                                size="small"
                                maxTagCount="responsive"
                                maxTagPlaceholder={renderResponsiveTagPlaceholder}
                                dropdownRender={createSelectedOptionsDropdownRender({ mode: 'multiple', value: durationSearchIds, options: ingredientOptions })}
                                options={ingredientOptions}
                            />
                            <Typography.Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 10 }}>
                                {filteredDurationDishes.length}{durationSearchIds.length > 0 ? ` / ${durationFiltered.length}` : ''} món nấu được trong ≤ {maxMinutes} phút
                            </Typography.Text>
                            <Box style={{ maxHeight: 380, overflowY: "auto" }}>
                                {filteredDurationDishes.map(dish => {
                                    const mins = totalDurationMins(dish);
                                    const durationItems = DishDurationHelper.getActiveItems(dish.duration);
                                    const tempo = DishDurationHelper.getTempo(mins);
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
                                                    <Tag style={{ marginRight: 0, color: tempo.color, background: tempo.background, borderColor: tempo.border }}>
                                                        🕐 {DishDurationHelper.formatMinutes(mins)}
                                                    </Tag>
                                                </Stack>
                                            </div>
                                            {durationItems.length > 0 && <Space wrap size={[4, 4]} style={{ marginBottom: ingredients.length > 0 ? 7 : 0 }}>
                                                {durationItems.map(item => <span key={item.phase.key} style={{ padding: "1px 7px", borderRadius: 999, border: `1px solid ${item.phase.border}`, background: "#fff", color: item.phase.color, fontSize: 11, lineHeight: "18px", whiteSpace: "nowrap" }}>
                                                    {item.phase.shortLabel} {item.minutes}'
                                                </span>)}
                                            </Space>}
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
                        <Button aria-label="Quay lại" onClick={_onBack} icon={<LeftOutlined />} style={backIconButtonStyle} />
                        <ResultsActions dishIds={selectedDishIds} pending={durationPending} />
                    </Stack>
                </>
            )}

            {/* ── Mode: nutrition ── */}
            {mode === "nutrition" && step === 0 && (
                <>
                    <NutritionGoalPicker />
                    <Stack justify="flex-end">
                        <Button
                            type="primary"
                            icon={<BarChartOutlined />}
                            disabled={!selectedNutritionGoal}
                            onClick={_onNext}
                            style={{ borderRadius: 20, paddingInline: 20 }}
                        >
                            Gợi ý theo {selectedNutritionGoal?.name ?? "dinh dưỡng"}
                        </Button>
                    </Stack>
                </>
            )}

            {mode === "nutrition" && step === 1 && (
                <>
                    {nutritionPending
                        ? <PendingCalculationBox text="Đang tính gợi ý dinh dưỡng..." />
                        : nutritionSuggestions.length === 0
                        ? <Box style={{ textAlign: "center", padding: "32px 0" }}>
                            <Typography.Text type="secondary">Chưa có món nào hợp mục tiêu. Bạn có thể bổ sung dinh dưỡng cho món sau.</Typography.Text>
                            <Button
                                type="text"
                                icon={<SettingOutlined />}
                                onClick={() => { navigate(RootRoutes.AuthorizedRoutes.NutritionGoals()); _onClose(); }}
                                style={{ display: "inline-flex", marginTop: 8, borderRadius: 999, color: "#7436dc" }}
                            >
                                Xem mục tiêu
                            </Button>
                        </Box>
                        : renderNutritionSuggestionList()
                    }
                    <Stack justify="space-between" style={{ marginTop: 12 }}>
                        <Button aria-label="Quay lại" onClick={_onBack} icon={<LeftOutlined />} style={backIconButtonStyle} />
                        <ResultsActions dishIds={selectedDishIds} pending={nutritionPending} />
                    </Stack>
                </>
            )}
    </>;

    const shoppingListModal = toggleShoppingListAdd.value ? <Modal
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
                        if (!pageInline) _onClose();
                    }}
                    onCreated={(shoppingList) => {
                        toggleShoppingListAdd.hide();
                        if (actionMode !== "modal") navigate(RootRoutes.AuthorizedRoutes.ShoppingListRoutes.Detail(shoppingList.id));
                    }}
                />
            </DeferredModalContent>
        </Modal> : null;

    const expensePlannerModal = toggleExpensePlanner.value ? <Modal
        open={toggleExpensePlanner.value}
        onCancel={toggleExpensePlanner.hide}
        footer={null}
        destroyOnClose
        width='min(900px, calc(100vw - 24px))'
        title={<Space><CalculatorOutlined />Tính chi phí</Space>}
        bodyStyle={{ maxHeight: 'calc(100vh - 128px)', overflowY: 'auto', padding: '18px' }}
    >
        <DeferredModalContent active={toggleExpensePlanner.value} minHeight={360}>
            <DishExpensePlannerWidget initialDishes={selectedDishesForActions} allowDishSelection />
        </DeferredModalContent>
    </Modal> : null;

    const nutritionCalculatorModal = toggleNutritionCalculator.value ? <Modal
        open={toggleNutritionCalculator.value}
        onCancel={toggleNutritionCalculator.hide}
        footer={null}
        destroyOnClose
        width='min(980px, calc(100vw - 24px))'
        title={<Space><PieChartOutlined />Máy tính dinh dưỡng</Space>}
        bodyStyle={{ maxHeight: 'calc(100vh - 128px)', overflowY: 'auto', padding: '22px 18px 18px' }}
    >
        <DeferredModalContent active={toggleNutritionCalculator.value} minHeight={520}>
            <NutritionCalculatorModalContent initialSelection={nutritionInitialSelection} />
        </DeferredModalContent>
    </Modal> : null;

    const suitabilityMembers = selectedHouseholdMemberIds.length > 0
        ? householdMembers.filter(member => selectedHouseholdMemberIds.includes(member.id))
        : householdMembers;
    const suitabilityResults = selectedDishesForActions.map(dish => HouseholdSuitabilityHelper.evaluateDishForMembers(dish, suitabilityMembers, dishes, ingredientsById, nutritionGoals));
    const suitabilityModal = toggleSuitabilityModal.value ? <Modal
        open={toggleSuitabilityModal.value}
        onCancel={toggleSuitabilityModal.hide}
        footer={null}
        destroyOnClose={false}
        width='min(860px, calc(100vw - 24px))'
        title={<Space><TeamOutlined />Độ phù hợp với nhà mình</Space>}
        bodyStyle={{ maxHeight: 'calc(100vh - 128px)', overflowY: 'auto', padding: '18px' }}
    >
        <DeferredModalContent active={toggleSuitabilityModal.value} minHeight={240}>
            {householdMembers.length === 0 ? <Box style={{ textAlign: 'center', padding: '26px 0' }}>
                <Typography.Text type='secondary' style={{ display: 'block', marginBottom: 10 }}>Chưa có hồ sơ thành viên để đánh giá.</Typography.Text>
                <Button type='primary' icon={<TeamOutlined />} onClick={() => { navigate(RootRoutes.AuthorizedRoutes.HouseholdProfiles()); toggleSuitabilityModal.hide(); if (!pageInline) _onClose(); }}>
                    Mở Nhà mình
                </Button>
            </Box> : selectedDishesForActions.length === 0 ? <Box style={{ textAlign: 'center', padding: '26px 0' }}>
                <Typography.Text type='secondary'>Chọn ít nhất một món để đánh giá.</Typography.Text>
            </Box> : <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 12 }}>
                <Box style={{ border: '1px solid #e6f4ff', borderRadius: 8, background: '#f8fbff', padding: 10 }}>
                    <Typography.Text strong style={{ display: 'block', fontSize: 12, marginBottom: 6 }}>Thành viên dùng để đánh giá</Typography.Text>
                    <Select
                        mode='multiple'
                        allowClear
                        maxTagCount='responsive'
                        maxTagPlaceholder={renderResponsiveTagPlaceholder}
                        dropdownRender={createSelectedOptionsDropdownRender({ mode: 'multiple', value: selectedHouseholdMemberIds, options: householdMemberOptions })}
                        value={selectedHouseholdMemberIds}
                        placeholder='Tất cả thành viên'
                        onChange={_onSelectedHouseholdMembersChange}
                        options={householdMemberOptions}
                        style={{ width: '100%' }}
                    />
                </Box>

                {suitabilityResults.map(result => <Box key={result.dish.id} style={{ width: '100%', boxSizing: 'border-box', border: '1px solid rgba(15,23,42,0.08)', borderRadius: 8, background: '#fff', padding: 12 }}>
                    <Stack justify='space-between' align='flex-start' gap={10} style={{ marginBottom: 10 }}>
                        <div style={{ minWidth: 0 }}>
                            <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 16, lineHeight: '21px', overflowWrap: 'anywhere' }}>{result.dish.name}</Typography.Text>
                            <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '17px' }}>{result.positiveCount} điểm hợp · {result.warningCount} lưu ý</Typography.Text>
                        </div>
                        <Tag color={result.averageScore >= 76 ? 'green' : result.averageScore >= 58 ? 'blue' : 'volcano'} style={{ marginRight: 0 }}>{result.averageScore}%</Tag>
                    </Stack>

                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 8 }}>
                        {result.members.map(memberResult => <Box key={memberResult.member.id} style={{ width: '100%', boxSizing: 'border-box', border: `1px solid ${memberResult.tone === 'warning' ? '#ffd591' : memberResult.tone === 'success' ? '#b7eb8f' : '#d6e4ff'}`, borderRadius: 8, background: memberResult.tone === 'warning' ? '#fff7e6' : memberResult.tone === 'success' ? '#f6ffed' : '#f8fbff', padding: 9, minWidth: 0 }}>
                            <Stack justify='space-between' align='center' gap={8} style={{ marginBottom: 6 }}>
                                <Stack align='center' gap={6} style={{ minWidth: 0 }}>
                                    <span style={{ width: 9, height: 9, borderRadius: 99, background: memberResult.member.color ?? '#1677ff', flexShrink: 0 }} />
                                    <Typography.Text strong style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{memberResult.member.name}</Typography.Text>
                                </Stack>
                                <Tag color={memberResult.tone === 'warning' ? 'orange' : memberResult.tone === 'success' ? 'green' : 'blue'} style={{ marginRight: 0 }}>{memberResult.score}%</Tag>
                            </Stack>
                            {memberResult.positives.length > 0 && <Stack wrap='wrap' gap={4} style={{ marginBottom: 5 }}>
                                {memberResult.positives.map(item => <Tag key={item} color='green' style={{ marginRight: 0 }}>{item}</Tag>)}
                            </Stack>}
                            {memberResult.warnings.length > 0 && <Stack wrap='wrap' gap={4} style={{ marginBottom: 5 }}>
                                {memberResult.warnings.map(item => <Tag key={item} color='volcano' style={{ marginRight: 0 }}>{item}</Tag>)}
                            </Stack>}
                            {memberResult.notes.length > 0 && <Typography.Text type='secondary' style={{ display: 'block', fontSize: 11, lineHeight: '16px' }}>{memberResult.notes.join(' · ')}</Typography.Text>}
                        </Box>)}
                    </div>
                </Box>)}
            </div>}
        </DeferredModalContent>
    </Modal> : null;

    if (previewInline || pageInline) {
        return <Box data-testid={pageInline ? "dish-suggester-page-content" : "dish-suggester-inline-preview"} style={{ height: pageInline ? undefined : "100%", minHeight: 0, overflowY: "auto", padding: pageInline ? 0 : 12, background: "#fff" }}>
            <Stack align="center" gap={8} style={{ marginBottom: 12 }}>
                <Image src={NoodlesIcon} preview={false} width={22} style={{ marginBottom: 3 }} />
                <Typography.Text strong style={{ fontSize: 16, lineHeight: "21px", color: "#111827" }}>Nấu gì hôm nay?</Typography.Text>
            </Stack>
            {content}
            {shoppingListModal}
            {expensePlannerModal}
            {nutritionCalculatorModal}
            {suitabilityModal}
        </Box>;
    }

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
            headerActions={<Button
                aria-label="Mở trang Nấu gì riêng"
                data-testid="dish-suggester-open-page-button"
                icon={<ExportOutlined />}
                onClick={_onOpenSeparatePage}
                style={{ width: 34, height: 34, borderRadius: 10, paddingInline: 0, color: "#7436dc", borderColor: "rgba(116,54,220,0.20)" }}
            />}
            style={{ top: 24 }}
        >
            {content}
        </Modal>

        {shoppingListModal}
        {expensePlannerModal}
        {nutritionCalculatorModal}
        {suitabilityModal}
    </>;
};
