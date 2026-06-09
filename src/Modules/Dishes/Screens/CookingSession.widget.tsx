import { ArrowLeftOutlined, ArrowRightOutlined, CheckCircleOutlined, ShoppingCartOutlined, PlayCircleOutlined, TeamOutlined } from "@ant-design/icons";
import { DishDurationHelper } from "@common/Helpers/DishDurationHelper";
import { DishServingHelper } from '@common/Helpers/DishServingHelper';
import { InventoryHelper } from "@common/Helpers/InventoryHelper";
import { IngredientUnitHelper } from "@common/Helpers/IngredientUnitHelper";
import { Button } from "@components/Button";
import { Image } from "@components/Image";
import { Box } from "@components/Layout/Box";
import { Stack } from "@components/Layout/Stack";
import { DeferredModalContent, Modal } from "@components/Modal";
import { ServingSizeInput } from "@components/Form/ServingSizeInput";
import { Tag } from "@components/Tag";
import { Typography } from "@components/Typography";
import { useToggle } from "@hooks";
import { ShoppingListAddWidget } from "@modules/ShoppingList/Screens/ShoppingListAdd.widget";
import { RootRoutes } from "@routing/RootRoutes";
import { Dishes } from "@store/Models/Dishes";
import { Ingredient } from "@store/Models/Ingredient";
import { CookingSession, CookingSessionIngredientStatus } from "@store/Models/CookingSession";
import { HouseholdMemberProfile } from "@store/Reducers/AppContextReducer";
import {
    setCookingIngredientStatus,
    setStepCooking,
    setTargetServingsCooking,
    startCooking,
    toggleCookingStepComplete,
    updateCookingNotes,
} from "@store/Reducers/CookingSessionReducer";
import {
    selectCookingSessions,
    selectDishes,
    selectDishesById,
    selectHouseholdMembers,
    selectIngredientsById,
    selectInventory,
    selectNutritionGoals,
    selectSelectedHouseholdMembers,
} from "@store/Selectors";
import { Input, Progress, Select, Space } from "antd";
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import ShoppingListIcon from "../../../../assets/icons/shoppingList.png";
import StepsIcon from "../../../../assets/icons/process.png";
import { FinishCookingWidget } from "./FinishCooking.widget";

type CookingIngredientRow = {
    ingredient: Ingredient;
    required: number;
    unit: string;
    inStock: number;
    lacking: number;
    sufficient: boolean;
    prepare: string[];
}

type FamilyNote = {
    key: string;
    tone: "success" | "warning" | "info";
    text: string;
}

type CookingSessionWidgetProps = {
    dish: Dishes;
    onDone: () => void;
}

const ingredientStatusOptions: Array<{ value: CookingSessionIngredientStatus; label: string }> = [
    { value: "needed", label: "Cần dùng" },
    { value: "prepared", label: "Đã sơ chế" },
    { value: "used", label: "Đã dùng" },
    { value: "substituted", label: "Đã thay thế" },
    { value: "skipped", label: "Bỏ qua" },
];

const ingredientStatusColor: Record<CookingSessionIngredientStatus, string> = {
    needed: "default",
    prepared: "blue",
    used: "green",
    substituted: "purple",
    skipped: "orange",
};

const collectAllSteps = (
    dish: Dishes,
    dishesById: Map<string, Dishes>,
    visited = new Set<string>()
): string[] => {
    if (visited.has(dish.id)) return [];
    visited.add(dish.id);
    const fromIncluded = (dish.includeDishes ?? []).flatMap(id => {
        const d = dishesById.get(id);
        return d ? collectAllSteps(d, dishesById, visited) : [];
    });
    return [...fromIncluded, ...(dish.steps ?? []).map(s => s.content)];
};

const getSessionIngredientStatus = (session: CookingSession | undefined, ingredientId: string): CookingSessionIngredientStatus => {
    return session?.ingredients?.find(item => item.ingredientId === ingredientId)?.status ?? "needed";
};

const getFamilyNotes = (
    dish: Dishes,
    rows: CookingIngredientRow[],
    members: HouseholdMemberProfile[],
    nutritionGoalNameById: Map<string, string>,
): FamilyNote[] => {
    const ingredientIds = new Set(rows.map(row => row.ingredient.id));
    const ingredientNameById = new Map(rows.map(row => [row.ingredient.id, row.ingredient.name]));
    const tags = dish.tags ?? [];
    const notes: FamilyNote[] = [];

    members.forEach(member => {
        if (member.favoriteDishIds.includes(dish.id)) {
            notes.push({ key: `${member.id}-favorite-dish`, tone: "success", text: `${member.name} thích món này` });
        }
        if (member.avoidedDishIds.includes(dish.id)) {
            notes.push({ key: `${member.id}-avoid-dish`, tone: "warning", text: `${member.name} tránh món này` });
        }

        const favoriteIngredients = member.favoriteIngredientIds.filter(id => ingredientIds.has(id)).map(id => ingredientNameById.get(id) ?? id);
        if (favoriteIngredients.length > 0) {
            notes.push({ key: `${member.id}-favorite-ingredients`, tone: "success", text: `${member.name} thích ${favoriteIngredients.slice(0, 2).join(", ")}` });
        }

        const avoidedIngredients = member.avoidedIngredientIds.filter(id => ingredientIds.has(id)).map(id => ingredientNameById.get(id) ?? id);
        if (avoidedIngredients.length > 0) {
            notes.push({ key: `${member.id}-avoid-ingredients`, tone: "warning", text: `${member.name} tránh ${avoidedIngredients.slice(0, 2).join(", ")}` });
        }

        const likedTags = member.preferredTags.filter(tag => tags.includes(tag));
        if (likedTags.length > 0) {
            notes.push({ key: `${member.id}-liked-tags`, tone: "info", text: `${member.name}: ${likedTags.slice(0, 2).join(", ")}` });
        }

        const avoidedTags = member.avoidedTags.filter(tag => tags.includes(tag));
        if (avoidedTags.length > 0) {
            notes.push({ key: `${member.id}-avoid-tags`, tone: "warning", text: `${member.name} ít hợp ${avoidedTags.slice(0, 2).join(", ")}` });
        }

        if (member.portionPreference && member.portionPreference !== 1) {
            notes.push({ key: `${member.id}-portion`, tone: "info", text: `${member.name}: ${member.portionPreference} phần` });
        }

        const nutritionGoalName = member.nutritionGoalId ? nutritionGoalNameById.get(member.nutritionGoalId) : undefined;
        if (nutritionGoalName) {
            notes.push({ key: `${member.id}-nutrition`, tone: "info", text: `${member.name}: ${nutritionGoalName}` });
        }

        if (member.notes) {
            notes.push({ key: `${member.id}-notes`, tone: "info", text: `${member.name}: ${member.notes}` });
        }
    });

    return notes.slice(0, 12);
};

const getFamilyNoteColors = (tone: FamilyNote["tone"]) => {
    if (tone === "warning") return { background: "#fff7e6", border: "#ffd591", color: "#ad4e00" };
    if (tone === "success") return { background: "#f6ffed", border: "#b7eb8f", color: "#237804" };
    return { background: "#e6f4ff", border: "#91caff", color: "#0958d9" };
};

export const CookingSessionWidget: React.FunctionComponent<CookingSessionWidgetProps> = ({ dish, onDone }) => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const allDishes = useSelector(selectDishes);
    const dishesById = useSelector(selectDishesById);
    const ingredientsById = useSelector(selectIngredientsById);
    const inventoryItems = useSelector(selectInventory);
    const sessions = useSelector(selectCookingSessions);
    const householdMembers = useSelector(selectHouseholdMembers);
    const selectedHouseholdMembers = useSelector(selectSelectedHouseholdMembers);
    const nutritionGoals = useSelector(selectNutritionGoals);
    const toggleShoppingList = useToggle();
    const [phase, setPhase] = useState<"prep" | "cooking">("prep");
    const [showFinish, setShowFinish] = useState(false);
    const baseServings = DishServingHelper.getBaseServings(dish);
    const [targetServings, setTargetServings] = useState<number>(() => baseServings);

    useEffect(() => {
        setTargetServings(baseServings);
        setPhase("prep");
        setShowFinish(false);
    }, [dish.id, baseServings]);

    const activeSession = sessions.find(s => s.dishId === dish.id && s.status === "cooking");
    const session = activeSession;
    const sessionMemberIdSet = useMemo(() => new Set(session?.householdMemberIds ?? []), [session?.householdMemberIds]);
    const cookingMembers = useMemo(() => {
        if (sessionMemberIdSet.size > 0) return householdMembers.filter(member => sessionMemberIdSet.has(member.id));
        return selectedHouseholdMembers;
    }, [householdMembers, selectedHouseholdMembers, sessionMemberIdSet]);
    const activeTargetServings = session?.targetServings ?? targetServings;
    const steps = useMemo(() => collectAllSteps(dish, dishesById), [dish, dishesById]);
    const sessionSteps = session?.steps ?? [];
    const totalSteps = sessionSteps.length;
    const currentIndex = Math.min(session?.currentStepIndex ?? 0, Math.max(0, totalSteps - 1));
    const completedStepSet = useMemo(() => new Set(session?.completedStepIndexes ?? []), [session?.completedStepIndexes]);
    const nutritionGoalNameById = useMemo(() => new Map(nutritionGoals.map(goal => [goal.id, goal.name])), [nutritionGoals]);

    const rows = useMemo<CookingIngredientRow[]>(() => {
        const amounts = DishServingHelper.collectIngredientAmounts(dish, allDishes, { targetServings: activeTargetServings });
        const grouped: Record<string, { total: number; unit: string; prepare: string[] }> = {};
        amounts.forEach(amt => {
            const ingredient = ingredientsById.get(amt.ingredientId);
            const baseUnit = IngredientUnitHelper.getBaseUnit(ingredient, [amt.unit]);
            const val = IngredientUnitHelper.toBaseAmount(ingredient, amt.amount, amt.unit, baseUnit) ?? IngredientUnitHelper.parseAmount(amt.amount);
            if (!grouped[amt.ingredientId]) grouped[amt.ingredientId] = { total: 0, unit: baseUnit, prepare: [] };
            grouped[amt.ingredientId].total += val;
            grouped[amt.ingredientId].prepare = Array.from(new Set([...grouped[amt.ingredientId].prepare, ...(amt.prepare ?? [])]));
        });
        return Object.entries(grouped).map(([ingredientId, { total, unit, prepare }]) => {
            const ingredient = ingredientsById.get(ingredientId);
            if (!ingredient) return null;
            const inv = inventoryItems[ingredientId];
            const required = InventoryHelper.roundAmount(total);
            const inStock = InventoryHelper.availableAmount(inv, ingredient, required);
            const lacking = InventoryHelper.roundAmount(Math.max(0, required - inStock));
            return { ingredient, required, unit, inStock, lacking, sufficient: inStock >= required, prepare } as CookingIngredientRow;
        }).filter(Boolean) as CookingIngredientRow[];
    }, [dish, allDishes, ingredientsById, inventoryItems, activeTargetServings]);

    const familyNotes = useMemo(() => getFamilyNotes(dish, rows, cookingMembers, nutritionGoalNameById), [dish, rows, cookingMembers, nutritionGoalNameById]);
    const lackingIngredientIds = rows.filter(r => !r.sufficient).map(r => r.ingredient.id);
    const allSufficient = rows.every(r => r.sufficient);
    const durationText = DishDurationHelper.formatMinutes(DishDurationHelper.getTotalMinutes(dish.duration));

    const _onStartCooking = () => {
        dispatch(startCooking({
            dishId: dish.id,
            dishName: dish.name,
            baseServings,
            targetServings,
            steps,
            ingredientIds: rows.map(row => row.ingredient.id),
            householdMemberIds: selectedHouseholdMembers.map(member => member.id),
        }));
        setPhase("cooking");
    };

    const _onSessionServingChange = (value: number) => {
        if (!session) return;
        dispatch(setTargetServingsCooking({ sessionId: session.id, targetServings: DishServingHelper.normalizeTargetServings(value, baseServings) }));
    };

    const _onIngredientStatusChange = (ingredientId: string, status: CookingSessionIngredientStatus) => {
        if (!session) return;
        dispatch(setCookingIngredientStatus({ sessionId: session.id, ingredientId, status }));
    };

    const _onNext = () => {
        if (!session) return;
        if (currentIndex < totalSteps - 1) dispatch(setStepCooking({ sessionId: session.id, stepIndex: currentIndex + 1 }));
    };

    const _onPrev = () => {
        if (!session) return;
        if (currentIndex > 0) dispatch(setStepCooking({ sessionId: session.id, stepIndex: currentIndex - 1 }));
    };

    const FamilyNotesPanel = () => familyNotes.length > 0 ? <Box style={{ border: "1px solid #d6e4ff", borderRadius: 8, padding: 10, background: "#f8fbff" }}>
        <Stack gap={7} align="center" style={{ marginBottom: 7 }}>
            <TeamOutlined style={{ color: "#0958d9" }} />
            <Typography.Text strong style={{ fontSize: 13 }}>Nhà mình</Typography.Text>
        </Stack>
        <Stack wrap="wrap" gap={5}>
            {familyNotes.map(note => {
                const colors = getFamilyNoteColors(note.tone);
                return <span key={note.key} style={{
                    border: `1px solid ${colors.border}`,
                    background: colors.background,
                    color: colors.color,
                    borderRadius: 14,
                    padding: "2px 8px",
                    fontSize: 12,
                    lineHeight: "18px",
                    maxWidth: "100%",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                }}>{note.text}</span>;
            })}
        </Stack>
    </Box> : null;

    const IngredientChecklist = ({ interactive }: { interactive: boolean }) => <Box style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {rows.length === 0 && <Typography.Text type="secondary">Món này chưa có nguyên liệu.</Typography.Text>}
        {rows.map(row => {
            const status = getSessionIngredientStatus(session, row.ingredient.id);
            return <div key={row.ingredient.id} data-testid={`cooking-ingredient-${row.ingredient.id}`} style={{
                display: 'grid',
                gridTemplateColumns: interactive ? 'minmax(0, 1fr) 132px' : 'minmax(0, 1fr) auto',
                alignItems: 'center',
                gap: 8,
                padding: '7px 0',
                borderBottom: '1px solid rgba(5,5,5,0.04)'
            }}>
                <Box style={{ minWidth: 0 }}>
                    <Typography.Text style={{ display: "block", lineHeight: "18px", overflowWrap: "anywhere" }}>{row.ingredient.name}</Typography.Text>
                    <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, lineHeight: "16px" }}>
                        Cần {IngredientUnitHelper.formatAmount(row.required)}{row.unit}
                        {row.prepare.length > 0 ? ` · ${row.prepare.slice(0, 2).join(", ")}` : ""}
                    </Typography.Text>
                </Box>
                {interactive ? <Select
                    size="small"
                    value={status}
                    onChange={value => _onIngredientStatusChange(row.ingredient.id, value)}
                    options={ingredientStatusOptions}
                /> : <Space size={6}>
                    {row.ingredient.alwaysAvailable ? (
                        <Tag color="green" style={{ marginInlineEnd: 0 }}>Luôn có</Tag>
                    ) : row.sufficient ? (
                        <Tag color="green" style={{ marginInlineEnd: 0 }}>Đủ ({IngredientUnitHelper.formatAmount(row.inStock)}{row.unit})</Tag>
                    ) : (
                        <Tag color="red" style={{ marginInlineEnd: 0 }}>Thiếu {IngredientUnitHelper.formatAmount(row.lacking)}{row.unit}</Tag>
                    )}
                </Space>}
                {interactive && <Tag color={ingredientStatusColor[status]} style={{ gridColumn: "1 / -1", width: "fit-content", marginRight: 0 }}>
                    {ingredientStatusOptions.find(item => item.value === status)?.label}
                </Tag>}
            </div>;
        })}
    </Box>;

    if ((phase === "cooking" || activeSession) && session) {
        if (showFinish || totalSteps === 0) {
            return <FinishCookingWidget session={session} onDone={onDone} />;
        }

        const progress = totalSteps > 0 ? Math.round((completedStepSet.size / totalSteps) * 100) : 100;
        const isLast = currentIndex === totalSteps - 1;
        const currentStepDone = completedStepSet.has(currentIndex);

        return <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, alignItems: "center" }}>
                <Box style={{ minWidth: 0 }}>
                    <Typography.Text strong style={{ display: "block", lineHeight: "18px" }}>{dish.name}</Typography.Text>
                    <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, lineHeight: "16px" }}>
                        {durationText} · Bước {currentIndex + 1}/{totalSteps}
                    </Typography.Text>
                </Box>
                <ServingSizeInput value={activeTargetServings} onChange={_onSessionServingChange} style={{ width: 178 }} />
            </div>

            <Progress percent={progress} size="small" style={{ marginBottom: 0 }} showInfo strokeColor="#fa8c16" />

            <Box style={{ background: "#fffbe6", border: "1px solid #ffd591", borderRadius: 8, padding: "16px 14px" }}>
                <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, lineHeight: "16px", marginBottom: 8 }}>
                    Bước {currentIndex + 1}
                </Typography.Text>
                <Typography.Text style={{ fontSize: 16, lineHeight: "24px", display: "block", overflowWrap: "anywhere" }}>
                    {sessionSteps[currentIndex]}
                </Typography.Text>
                <Button
                    fullwidth
                    icon={<CheckCircleOutlined />}
                    type={currentStepDone ? "primary" : "default"}
                    onClick={() => dispatch(toggleCookingStepComplete({ sessionId: session.id, stepIndex: currentIndex }))}
                    style={{ marginTop: 12, background: currentStepDone ? "#52c41a" : undefined, borderColor: currentStepDone ? "#52c41a" : undefined }}
                >
                    {currentStepDone ? "Đã xong bước này" : "Đánh dấu xong"}
                </Button>
            </Box>

            <FamilyNotesPanel />

            {lackingIngredientIds.length > 0 && <Box style={{ background: '#fff7e6', border: '1px solid #ffd591', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#d46b08' }}>
                Thiếu {lackingIngredientIds.length} nguyên liệu. Có thể đánh dấu bỏ qua hoặc thay thế trước khi hoàn thành.
            </Box>}

            <Box style={{ border: "1px solid #f0f0f0", borderRadius: 8, padding: 10, background: "#fff" }}>
                <Typography.Text strong style={{ display: "block", marginBottom: 6, fontSize: 13 }}>Nguyên liệu</Typography.Text>
                <IngredientChecklist interactive />
            </Box>

            <Input.TextArea
                value={session.notes}
                onChange={event => dispatch(updateCookingNotes({ sessionId: session.id, notes: event.target.value }))}
                placeholder="Ghi chú phiên nấu"
                autoSize={{ minRows: 2, maxRows: 4 }}
            />

            <div style={{ display: "flex", gap: 8 }}>
                <Button icon={<ArrowLeftOutlined />} disabled={currentIndex === 0} onClick={_onPrev} style={{ flex: 1 }}>
                    Trước
                </Button>
                {isLast ? <Button type="primary" icon={<CheckCircleOutlined />} onClick={() => setShowFinish(true)} style={{ flex: 1, background: "#52c41a", borderColor: "#52c41a" }}>
                    Hoàn thành
                </Button> : <Button type="primary" icon={<ArrowRightOutlined />} onClick={_onNext} style={{ flex: 1, background: "#fa8c16", borderColor: "#fa8c16" }}>
                    Tiếp theo
                </Button>}
            </div>
        </div>;
    }

    return <React.Fragment>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Kiểm tra nguyên liệu cần thiết để nấu món này
        </Typography.Text>

        <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 8,
            marginTop: 12,
            padding: '8px 10px',
            border: '1px solid #f0f0f0',
            borderRadius: 8,
            background: '#fafafa',
        }} data-testid="cooking-serving-control">
            <div>
                <Typography.Text strong style={{ display: 'block' }}>Khẩu phần</Typography.Text>
                <Typography.Text type='secondary' style={{ fontSize: 12 }}>Gốc {baseServings} phần · {durationText}</Typography.Text>
            </div>
            <ServingSizeInput
                value={targetServings}
                onChange={(value) => setTargetServings(DishServingHelper.normalizeTargetServings(value, baseServings))}
                style={{ width: 178, flexShrink: 0 }}
            />
        </div>

        <Box style={{ marginTop: 12, marginBottom: 8 }}>
            <IngredientChecklist interactive={false} />
        </Box>

        <FamilyNotesPanel />

        {!allSufficient && rows.length > 0 && <div style={{
            background: '#fff7e6', border: '1px solid #ffd591', borderRadius: 8,
            padding: '8px 12px', margin: '8px 0', fontSize: 12, color: '#d46b08'
        }}>
            Có {lackingIngredientIds.length} nguyên liệu chưa đủ.
        </div>}

        {steps.length > 0 && <div style={{
            background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 8,
            padding: '8px 12px', marginBottom: 4, fontSize: 12, color: '#389e0d',
            display: 'flex', alignItems: 'center', gap: 6
        }}>
            <Image src={StepsIcon} preview={false} width={16} style={{ marginBottom: 2 }} />
            {steps.length} bước hướng dẫn sẽ hiển thị sau khi bắt đầu
        </div>}

        <Stack direction="column" style={{ gap: 8, marginTop: 8 }}>
            {!allSufficient && rows.length > 0 && <Button fullwidth icon={<ShoppingCartOutlined />} onClick={toggleShoppingList.show}>
                Tạo danh sách mua
            </Button>}
            <Button
                fullwidth
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={_onStartCooking}
                style={{ background: "#fa8c16", borderColor: "#fa8c16" }}
            >
                {allSufficient ? "Bắt đầu nấu" : "Nấu dù thiếu nguyên liệu"}
            </Button>
        </Stack>

        {toggleShoppingList.value && <Modal
            open={toggleShoppingList.value}
            title={<Space>
                <Image src={ShoppingListIcon} preview={false} width={22} style={{ marginBottom: 3 }} />
                Tạo danh sách mua - {dish.name}
            </Space>}
            destroyOnClose
            onCancel={toggleShoppingList.hide}
            footer={null}
            zIndex={2500}
        >
            <DeferredModalContent active={toggleShoppingList.value}>
                <ShoppingListAddWidget
                    date={new Date()}
                    dishIds={[dish.id]}
                    initialDishServings={{ [dish.id]: targetServings }}
                    onDone={() => { toggleShoppingList.hide(); onDone(); }}
                    onCreated={(shoppingList) => navigate(RootRoutes.AuthorizedRoutes.ShoppingListRoutes.Detail(shoppingList.id))}
                />
            </DeferredModalContent>
        </Modal>}
    </React.Fragment>;
};
