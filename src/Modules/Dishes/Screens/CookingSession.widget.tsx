import { ArrowLeftOutlined, ArrowRightOutlined, CheckCircleOutlined, ShoppingCartOutlined, PlayCircleOutlined } from "@ant-design/icons";
import { Button } from "@components/Button";
import { Stack } from "@components/Layout/Stack";
import { Tag } from "@components/Tag";
import { Typography } from "@components/Typography";
import { useToggle } from "@hooks";
import { Dishes, DishesIngredientAmount } from "@store/Models/Dishes";
import { Ingredient } from "@store/Models/Ingredient";
import { InventoryHelper } from "@common/Helpers/InventoryHelper";
import { IngredientUnitHelper } from "@common/Helpers/IngredientUnitHelper";
import { startCooking, setStepCooking } from "@store/Reducers/CookingSessionReducer";
import { selectDishes, selectIngredients, selectInventory, selectCookingSessions } from "@store/Selectors";
import { Progress, Space } from "antd";
import React, { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { ShoppingListAddWidget } from "@modules/ShoppingList/Screens/ShoppingListAdd.widget";
import { Modal } from "@components/Modal";
import ShoppingListIcon from "../../../../assets/icons/shoppingList.png";
import StepsIcon from "../../../../assets/icons/process.png";
import { Image } from "@components/Image";
import { FinishCookingWidget } from "./FinishCooking.widget";
import { RootRoutes } from "@routing/RootRoutes";

type CookingIngredientRow = {
    ingredient: Ingredient;
    required: number;
    unit: string;
    inStock: number;
    lacking: number;
    sufficient: boolean;
}

const collectIngredientAmounts = (
    dish: Dishes,
    allDishes: Dishes[],
    visited = new Set<string>()
): DishesIngredientAmount[] => {
    if (visited.has(dish.id)) return [];
    visited.add(dish.id);
    const own = dish.ingredients;
    const fromIncluded = dish.includeDishes.flatMap(id => {
        const d = allDishes.find(d => d.id === id);
        return d ? collectIngredientAmounts(d, allDishes, visited) : [];
    });
    return [...own, ...fromIncluded];
};

const collectAllSteps = (
    dish: Dishes,
    allDishes: Dishes[],
    visited = new Set<string>()
): string[] => {
    if (visited.has(dish.id)) return [];
    visited.add(dish.id);
    const fromIncluded = (dish.includeDishes ?? []).flatMap(id => {
        const d = allDishes.find(d => d.id === id);
        return d ? collectAllSteps(d, allDishes, visited) : [];
    });
    return [...fromIncluded, ...(dish.steps ?? []).map(s => s.content)];
};

type CookingSessionWidgetProps = {
    dish: Dishes;
    onDone: () => void;
}

export const CookingSessionWidget: React.FunctionComponent<CookingSessionWidgetProps> = ({ dish, onDone }) => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const allDishes = useSelector(selectDishes);
    const allIngredients = useSelector(selectIngredients);
    const inventoryItems = useSelector(selectInventory);
    const sessions = useSelector(selectCookingSessions);
    const toggleShoppingList = useToggle();
    const [phase, setPhase] = useState<"prep" | "cooking">("prep");
    const [showFinish, setShowFinish] = useState(false);

    const activeSession = sessions.find(s => s.dishId === dish.id && s.status === "cooking");
    const steps = useMemo(() => collectAllSteps(dish, allDishes), [dish, allDishes]);

    const rows = useMemo<CookingIngredientRow[]>(() => {
        const amounts = collectIngredientAmounts(dish, allDishes);
        const grouped: Record<string, { total: number; unit: string }> = {};
        amounts.forEach(amt => {
            const ingredient = allIngredients.find(i => i.id === amt.ingredientId);
            const baseUnit = IngredientUnitHelper.getBaseUnit(ingredient, [amt.unit]);
            const val = IngredientUnitHelper.toBaseAmount(ingredient, amt.amount, amt.unit, baseUnit) ?? IngredientUnitHelper.parseAmount(amt.amount);
            if (!grouped[amt.ingredientId]) grouped[amt.ingredientId] = { total: 0, unit: baseUnit };
            grouped[amt.ingredientId].total += val;
        });
        return Object.entries(grouped).map(([ingredientId, { total, unit }]) => {
            const ingredient = allIngredients.find(i => i.id === ingredientId);
            if (!ingredient) return null;
            const inv = inventoryItems[ingredientId];
            const inStock = InventoryHelper.availableAmount(inv, ingredient, total);
            const lacking = Math.max(0, total - inStock);
            return { ingredient, required: total, unit, inStock, lacking, sufficient: inStock >= total } as CookingIngredientRow;
        }).filter(Boolean) as CookingIngredientRow[];
    }, [dish, allDishes, allIngredients, inventoryItems]);

    const lackingIngredientIds = rows.filter(r => !r.sufficient).map(r => r.ingredient.id);
    const allSufficient = rows.every(r => r.sufficient);

    const _onStartCooking = () => {
        dispatch(startCooking({ dishId: dish.id, dishName: dish.name, steps }));
        if (steps.length > 0) setPhase("cooking");
        else onDone();
    };

    // ── Step-by-step cooking view ─────────────────────────────────────────────
    const session = activeSession;
    const currentIndex = session?.currentStepIndex ?? 0;
    const sessionSteps = session?.steps ?? [];
    const totalSteps = sessionSteps.length;

    const _onNext = () => {
        if (!session) return;
        if (currentIndex < totalSteps - 1)
            dispatch(setStepCooking({ sessionId: session.id, stepIndex: currentIndex + 1 }));
    };
    const _onPrev = () => {
        if (!session) return;
        if (currentIndex > 0)
            dispatch(setStepCooking({ sessionId: session.id, stepIndex: currentIndex - 1 }));
    };

    if ((phase === "cooking" || activeSession) && session && totalSteps === 0) {
        return <FinishCookingWidget session={session} onDone={onDone} />;
    }

    if ((phase === "cooking" || activeSession) && session && totalSteps > 0) {
        const progress = Math.round(((currentIndex + 1) / totalSteps) * 100);
        const isLast = currentIndex === totalSteps - 1;

        // ── Finish confirmation screen ────────────────────────────────────
        if (showFinish) {
            return <FinishCookingWidget session={session} onDone={onDone} />;
        }

        return (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <Typography.Text type="secondary" style={{ fontSize: 12, whiteSpace: "nowrap" }}>
                        Bước {currentIndex + 1} / {totalSteps}
                    </Typography.Text>
                    <Progress
                        percent={progress}
                        size="small"
                        style={{ flex: 1, marginBottom: 0 }}
                        showInfo={false}
                        strokeColor="#fa8c16"
                    />
                </div>

                <div style={{
                    background: "#fffbe6",
                    border: "1px solid #ffd591",
                    borderRadius: 12,
                    padding: "20px 16px",
                    minHeight: 120,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}>
                    <Typography.Text style={{ fontSize: 16, lineHeight: 1.6, textAlign: "center", display: "block" }}>
                        {sessionSteps[currentIndex]}
                    </Typography.Text>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                    <Button
                        icon={<ArrowLeftOutlined />}
                        disabled={currentIndex === 0}
                        onClick={_onPrev}
                        style={{ flex: 1 }}
                    >
                        Trước
                    </Button>
                    {isLast ? (
                        <Button
                            type="primary"
                            icon={<CheckCircleOutlined />}
                            onClick={() => setShowFinish(true)}
                            style={{ flex: 1, background: "#52c41a", borderColor: "#52c41a" }}
                        >
                            Hoàn thành
                        </Button>
                    ) : (
                        <Button
                            type="primary"
                            icon={<ArrowRightOutlined />}
                            onClick={_onNext}
                            style={{ flex: 1, background: "#fa8c16", borderColor: "#fa8c16" }}
                        >
                            Tiếp theo
                        </Button>
                    )}
                </div>
            </div>
        );
    }

    // ── Prep / ingredient check view ─────────────────────────────────────────
    return <React.Fragment>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Kiểm tra nguyên liệu cần thiết để nấu món này
        </Typography.Text>

        <div style={{ marginTop: 12, marginBottom: 8 }}>
            {rows.length === 0 && (
                <Typography.Text type="secondary">Món này chưa có nguyên liệu.</Typography.Text>
            )}
            {rows.map(row => (
                <div key={row.ingredient.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '6px 0', borderBottom: '1px solid rgba(5,5,5,0.04)'
                }}>
                    <Typography.Text style={{ flex: 1 }}>{row.ingredient.name}</Typography.Text>
                    <Space size={6}>
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                            Cần {row.required}{row.unit}
                        </Typography.Text>
                        {row.ingredient.alwaysAvailable ? (
                            <Tag color="green" style={{ marginInlineEnd: 0 }}>Luôn có</Tag>
                        ) : row.sufficient ? (
                            <Tag color="green" style={{ marginInlineEnd: 0 }}>Đủ ({row.inStock}{row.unit})</Tag>
                        ) : (
                            <Tag color="red" style={{ marginInlineEnd: 0 }}>Thiếu {row.lacking}{row.unit}</Tag>
                        )}
                    </Space>
                </div>
            ))}
        </div>

        {!allSufficient && rows.length > 0 && (
            <div style={{
                background: '#fff7e6', border: '1px solid #ffd591', borderRadius: 8,
                padding: '8px 12px', marginBottom: 8, fontSize: 12, color: '#d46b08'
            }}>
                Có {lackingIngredientIds.length} nguyên liệu chưa đủ.
            </div>
        )}

        {steps.length > 0 && (
            <div style={{
                background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 8,
                padding: '8px 12px', marginBottom: 4, fontSize: 12, color: '#389e0d',
                display: 'flex', alignItems: 'center', gap: 6
            }}>
                <Image src={StepsIcon} preview={false} width={16} style={{ marginBottom: 2 }} />
                {steps.length} bước hướng dẫn sẽ hiển thị sau khi bắt đầu
            </div>
        )}

        <Stack direction="column" style={{ gap: 8, marginTop: 8 }}>
            {!allSufficient && rows.length > 0 && (
                <Button fullwidth icon={<ShoppingCartOutlined />} onClick={toggleShoppingList.show}>
                    Tạo danh sách mua
                </Button>
            )}
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

        <Modal
            open={toggleShoppingList.value}
            title={
                <Space>
                    <Image src={ShoppingListIcon} preview={false} width={22} style={{ marginBottom: 3 }} />
                    Tạo danh sách mua — {dish.name}
                </Space>
            }
            destroyOnClose
            onCancel={toggleShoppingList.hide}
            footer={null}
        >
            <ShoppingListAddWidget
                date={new Date()}
                dishIds={[dish.id]}
                onDone={() => { toggleShoppingList.hide(); onDone(); }}
                onCreated={(shoppingList) => navigate(RootRoutes.AuthorizedRoutes.ShoppingListRoutes.Detail(shoppingList.id))}
            />
        </Modal>
    </React.Fragment>;
};
