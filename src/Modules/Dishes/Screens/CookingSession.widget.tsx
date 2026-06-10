import { ArrowLeftOutlined, ArrowRightOutlined, CheckCircleOutlined, ShoppingCartOutlined, PlayCircleOutlined } from "@ant-design/icons";
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
import {
    setCookingIngredientStatus,
    setStepCooking,
    setTargetServingsCooking,
    startCooking,
    toggleCookingStepComplete,
} from "@store/Reducers/CookingSessionReducer";
import {
    selectCookingSessions,
    selectDishes,
    selectDishesById,
    selectIngredientsById,
    selectInventory,
    selectSelectedHouseholdMembers,
} from "@store/Selectors";
import { Progress, Space, Switch } from "antd";
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

type CookingSessionWidgetProps = {
    dish: Dishes;
    onDone: () => void;
}

const COOKING_NESTED_MODAL_Z_INDEX = 4400;

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

export const CookingSessionWidget: React.FunctionComponent<CookingSessionWidgetProps> = ({ dish, onDone }) => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const allDishes = useSelector(selectDishes);
    const dishesById = useSelector(selectDishesById);
    const ingredientsById = useSelector(selectIngredientsById);
    const inventoryItems = useSelector(selectInventory);
    const sessions = useSelector(selectCookingSessions);
    const selectedHouseholdMembers = useSelector(selectSelectedHouseholdMembers);
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
    const activeTargetServings = session?.targetServings ?? targetServings;
    const steps = useMemo(() => collectAllSteps(dish, dishesById), [dish, dishesById]);
    const sessionSteps = session?.steps ?? [];
    const totalSteps = sessionSteps.length;
    const currentIndex = Math.min(session?.currentStepIndex ?? 0, Math.max(0, totalSteps - 1));
    const completedStepSet = useMemo(() => new Set(session?.completedStepIndexes ?? []), [session?.completedStepIndexes]);

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

    const IngredientChecklist = ({ interactive }: { interactive: boolean }) => <Box style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {rows.length === 0 && <Typography.Text type="secondary">Món này chưa có nguyên liệu.</Typography.Text>}
        {rows.map(row => {
            const status = getSessionIngredientStatus(session, row.ingredient.id);
            return <div key={row.ingredient.id} data-testid={`cooking-ingredient-${row.ingredient.id}`} style={{
                display: 'grid',
                gridTemplateColumns: interactive ? 'minmax(0, 1fr) auto' : 'minmax(0, 1fr) auto',
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
                {interactive ? <Switch
                    checked={status === "used"}
                    checkedChildren="Đã dùng"
                    unCheckedChildren="Chưa"
                    onChange={checked => _onIngredientStatusChange(row.ingredient.id, checked ? "used" : "needed")}
                /> : <Space size={6}>
                    {row.ingredient.alwaysAvailable ? (
                        <Tag color="green" style={{ marginInlineEnd: 0 }}>Luôn có</Tag>
                    ) : row.sufficient ? (
                        <Tag color="green" style={{ marginInlineEnd: 0 }}>Đủ ({IngredientUnitHelper.formatAmount(row.inStock)}{row.unit})</Tag>
                    ) : (
                        <Tag color="red" style={{ marginInlineEnd: 0 }}>Thiếu {IngredientUnitHelper.formatAmount(row.lacking)}{row.unit}</Tag>
                    )}
                </Space>}
            </div>;
        })}
    </Box>;

    if ((phase === "cooking" || activeSession) && session) {
        if (showFinish || totalSteps === 0) {
            return <FinishCookingWidget session={session} onDone={onDone} />;
        }

        const isLast = currentIndex === totalSteps - 1;
        const currentStepDone = completedStepSet.has(currentIndex);
        const stepProgressPercent = totalSteps > 0 ? Math.round(((currentIndex + 1) / totalSteps) * 100) : 0;

        return <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ border: '1px solid #f0f0f0', borderRadius: 8, background: '#fafafa', padding: 10 }}>
                <Typography.Text strong style={{ display: 'block', marginBottom: 6 }}>Khẩu phần</Typography.Text>
                <ServingSizeInput value={activeTargetServings} onChange={_onSessionServingChange} style={{ width: '100%' }} />
            </div>

            <Box style={{ background: "#fffbe6", border: "1px solid #ffd591", borderRadius: 8, padding: "16px 14px" }}>
                <Stack justify="space-between" align="center" gap={8} style={{ marginBottom: 10 }}>
                    <Button aria-label="Bước trước" icon={<ArrowLeftOutlined />} disabled={currentIndex === 0} onClick={_onPrev} style={{ width: 38, paddingInline: 0 }} />
                    <Typography.Text strong style={{ fontSize: 13 }}>Bước {currentIndex + 1}/{totalSteps}</Typography.Text>
                    <Button aria-label="Bước sau" icon={<ArrowRightOutlined />} disabled={isLast} onClick={_onNext} style={{ width: 38, paddingInline: 0 }} />
                </Stack>
                <Progress percent={stepProgressPercent} showInfo={false} strokeColor="#fa8c16" trailColor="rgba(250,140,22,0.16)" style={{ marginBottom: 10 }} />
                <Typography.Text style={{ fontSize: 16, lineHeight: "24px", display: "block", overflowWrap: "anywhere" }}>
                    {sessionSteps[currentIndex]}
                </Typography.Text>
                <Stack justify="space-between" align="center" gap={8} style={{ marginTop: 12 }}>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>Đánh dấu bước này</Typography.Text>
                    <Switch checked={currentStepDone} checkedChildren="Xong" unCheckedChildren="Chưa" onChange={() => dispatch(toggleCookingStepComplete({ sessionId: session.id, stepIndex: currentIndex }))} />
                </Stack>
            </Box>

            {lackingIngredientIds.length > 0 && <Box style={{ background: '#fff7e6', border: '1px solid #ffd591', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#d46b08' }}>
                Thiếu {lackingIngredientIds.length} nguyên liệu.
            </Box>}

            <Box style={{ border: "1px solid #f0f0f0", borderRadius: 8, padding: 10, background: "#fff" }}>
                <Typography.Text strong style={{ display: "block", marginBottom: 6, fontSize: 13 }}>Nguyên liệu</Typography.Text>
                <IngredientChecklist interactive />
            </Box>

            <Button type="primary" icon={<CheckCircleOutlined />} onClick={() => setShowFinish(true)} style={{ background: "#52c41a", borderColor: "#52c41a" }}>
                Hoàn thành món
            </Button>
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

        <Box style={{ marginTop: 12, marginBottom: 8, border: "1px solid #f0f0f0", borderRadius: 8, padding: 10, background: "#fff" }}>
            <Typography.Text strong style={{ display: "block", marginBottom: 6, fontSize: 13 }}>Nguyên liệu</Typography.Text>
            <IngredientChecklist interactive={false} />
        </Box>

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
            zIndex={COOKING_NESTED_MODAL_Z_INDEX}
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
