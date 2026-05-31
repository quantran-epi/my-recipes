import { ShoppingCartOutlined, PlayCircleOutlined } from "@ant-design/icons";
import { Button } from "@components/Button";
import { Stack } from "@components/Layout/Stack";
import { Tag } from "@components/Tag";
import { Typography } from "@components/Typography";
import { useToggle } from "@hooks";
import { Dishes, DishesIngredientAmount } from "@store/Models/Dishes";
import { Ingredient } from "@store/Models/Ingredient";
import { startCooking } from "@store/Reducers/CookingSessionReducer";
import { RootState } from "@store/Store";
import { Divider, Space } from "antd";
import React, { useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { ShoppingListAddWidget } from "@modules/ShoppingList/Screens/ShoppingListAdd.widget";
import { Modal } from "@components/Modal";
import ShoppingListIcon from "../../../../assets/icons/shoppingList.png";
import { Image } from "@components/Image";

type CookingIngredientRow = {
    ingredient: Ingredient;
    required: number;
    unit: string;
    inStock: number;
    lacking: number;
    sufficient: boolean;
}

// Recursively collect all ingredient amounts from dish and its includeDishes
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

type CookingSessionWidgetProps = {
    dish: Dishes;
    onDone: () => void;
}

export const CookingSessionWidget: React.FunctionComponent<CookingSessionWidgetProps> = ({ dish, onDone }) => {
    const dispatch = useDispatch();
    const allDishes = useSelector((state: RootState) => state.dishes.dishes);
    const allIngredients = useSelector((state: RootState) => state.ingredient.ingredients);
    const toggleShoppingList = useToggle();

    const rows = useMemo<CookingIngredientRow[]>(() => {
        const amounts = collectIngredientAmounts(dish, allDishes);
        // Group by ingredientId, sum amounts
        const grouped: Record<string, { total: number; unit: string }> = {};
        amounts.forEach(amt => {
            const parsed = parseFloat(amt.amount);
            const val = isNaN(parsed) ? 0 : parsed;
            if (!grouped[amt.ingredientId]) {
                grouped[amt.ingredientId] = { total: 0, unit: amt.unit };
            }
            grouped[amt.ingredientId].total += val;
        });

        return Object.entries(grouped).map(([ingredientId, { total, unit }]) => {
            const ingredient = allIngredients.find(i => i.id === ingredientId);
            if (!ingredient) return null;
            const inStock = ingredient.inventory?.amount ?? 0;
            const lacking = Math.max(0, total - inStock);
            return {
                ingredient,
                required: total,
                unit: ingredient.inventory?.unit ?? unit,
                inStock,
                lacking,
                sufficient: inStock >= total,
            } as CookingIngredientRow;
        }).filter(Boolean) as CookingIngredientRow[];
    }, [dish, allDishes, allIngredients]);

    const lackingDishIds = [dish.id];
    const lackingIngredientIds = rows.filter(r => !r.sufficient).map(r => r.ingredient.id);
    const allSufficient = rows.every(r => r.sufficient);

    const _onStartCooking = () => {
        dispatch(startCooking({ dishId: dish.id, dishName: dish.name }));
        onDone();
    };

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
                        {row.sufficient ? (
                            <Tag color="green" style={{ marginInlineEnd: 0 }}>
                                Đủ ({row.inStock}{row.unit})
                            </Tag>
                        ) : (
                            <Tag color="red" style={{ marginInlineEnd: 0 }}>
                                Thiếu {row.lacking}{row.unit}
                            </Tag>
                        )}
                    </Space>
                </div>
            ))}
        </div>

        {!allSufficient && rows.length > 0 && (
            <div style={{
                background: '#fff7e6', border: '1px solid #ffd591', borderRadius: 8,
                padding: '8px 12px', marginBottom: 12, fontSize: 12, color: '#d46b08'
            }}>
                Có {lackingIngredientIds.length} nguyên liệu chưa đủ. Bạn có thể tạo danh sách mua sắm cho các nguyên liệu còn thiếu.
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
                dishIds={lackingDishIds}
                onDone={() => { toggleShoppingList.hide(); onDone(); }}
            />
        </Modal>
    </React.Fragment>;
};
