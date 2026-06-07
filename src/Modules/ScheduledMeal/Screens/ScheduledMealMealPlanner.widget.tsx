import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { DishServingHelper } from "@common/Helpers/DishServingHelper";
import { Button } from "@components/Button";
import { ServingSizeInput } from "@components/Form/ServingSizeInput";
import { Option, Select } from "@components/Form/Select";
import { Image } from "@components/Image";
import { Box } from "@components/Layout/Box";
import { Stack } from "@components/Layout/Stack";
import { Tag } from "@components/Tag";
import { Typography } from "@components/Typography";
import { normalizeDishServings } from "@modules/ShoppingList/Screens/DishServingSelector.widget";
import { Dishes } from "@store/Models/Dishes";
import { ScheduledMeal } from "@store/Models/ScheduledMeal";
import React, { useMemo, useState } from "react";
import MorningIcon from "../../../../assets/icons/sunrise.png";
import NightIcon from "../../../../assets/icons/night.png";
import NoonIcon from "../../../../assets/icons/time.png";

type MealKey = keyof ScheduledMeal["meals"];

type ScheduledMealMealPlannerProps = {
    meals: ScheduledMeal["meals"];
    dishServings: Record<string, number>;
    dishes: Dishes[];
    onMealsChange: (nextMeals: ScheduledMeal["meals"], nextDishServings: Record<string, number>) => void;
}

const mealSections: Array<{ key: MealKey; label: string; icon: string; color: string; background: string; border: string }> = [
    { key: "breakfast", label: "Bữa sáng", icon: MorningIcon, color: "#d48806", background: "#fffbe6", border: "#ffe58f" },
    { key: "lunch", label: "Bữa trưa", icon: NoonIcon, color: "#d46b08", background: "#fff7e6", border: "#ffd591" },
    { key: "dinner", label: "Bữa tối", icon: NightIcon, color: "#531dab", background: "#f9f0ff", border: "#efdbff" },
];

const emptyMeals = (): ScheduledMeal["meals"] => ({ breakfast: [], lunch: [], dinner: [] });

const getAllDishIds = (meals: ScheduledMeal["meals"]): string[] => Object.values(meals ?? emptyMeals()).flat();

const getPresetValues = (baseServings: number): number[] => {
    return Array.from(new Set([
        Math.max(1, baseServings - 1),
        baseServings,
        baseServings + 1,
        Math.max(baseServings + 1, baseServings * 2),
    ])).slice(0, 4);
};

export const ScheduledMealMealPlanner: React.FunctionComponent<ScheduledMealMealPlannerProps> = ({ meals, dishServings, dishes, onMealsChange }) => {
    const [addingMeal, setAddingMeal] = useState<MealKey | null>(null);
    const dishesById = useMemo(() => new Map(dishes.map(dish => [dish.id, dish])), [dishes]);
    const safeMeals = { ...emptyMeals(), ...(meals ?? {}) };

    const _setMeals = (nextMeals: ScheduledMeal["meals"], nextServings = dishServings) => {
        const selectedDishIds = getAllDishIds(nextMeals);
        onMealsChange(nextMeals, normalizeDishServings(selectedDishIds, dishesById, nextServings));
    };

    const _onAddDish = (mealKey: MealKey, dishId: string) => {
        if (!dishId) return;
        const currentDishIds = safeMeals[mealKey] ?? [];
        if (currentDishIds.includes(dishId)) {
            setAddingMeal(null);
            return;
        }

        _setMeals({ ...safeMeals, [mealKey]: [...currentDishIds, dishId] });
        setAddingMeal(null);
    };

    const _onRemoveDish = (mealKey: MealKey, dishId: string) => {
        _setMeals({ ...safeMeals, [mealKey]: (safeMeals[mealKey] ?? []).filter(id => id !== dishId) });
    };

    const _onServingChange = (dishId: string, nextValue: number | string | null) => {
        const dish = dishesById.get(dishId);
        const baseServings = DishServingHelper.getBaseServings(dish);
        _setMeals(safeMeals, {
            ...dishServings,
            [dishId]: DishServingHelper.normalizeTargetServings(nextValue, baseServings),
        });
    };

    const _onPresetClick = (dishId: string, targetServings: number) => {
        _setMeals(safeMeals, { ...dishServings, [dishId]: targetServings });
    };

    return <Stack direction="column" align="stretch" gap={10} style={{ marginBottom: 12 }}>
        {mealSections.map(section => {
            const dishIds = safeMeals[section.key] ?? [];
            const totalServings = dishIds.reduce((sum, dishId) => {
                const dish = dishesById.get(dishId);
                return sum + DishServingHelper.normalizeTargetServings(dishServings[dishId], DishServingHelper.getBaseServings(dish));
            }, 0);
            const availableDishes = dishes.filter(dish => !dishIds.includes(dish.id));

            return <Box key={section.key} style={{
                border: `1px solid ${section.border}`,
                borderRadius: 8,
                background: `linear-gradient(135deg, #fff 0%, ${section.background} 100%)`,
                padding: 11,
                boxShadow: "0 6px 18px rgba(15,23,42,0.06)",
            }}>
                <Stack justify="space-between" align="center" gap={8} style={{ marginBottom: 9 }}>
                    <Stack align="center" gap={8} style={{ minWidth: 0 }}>
                        <span style={{ width: 32, height: 32, borderRadius: 8, display: "inline-flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.86)", border: `1px solid ${section.border}`, flexShrink: 0 }}>
                            <Image src={section.icon} preview={false} width={20} style={{ marginBottom: 2 }} />
                        </span>
                        <div style={{ minWidth: 0 }}>
                            <Typography.Text strong style={{ display: "block", color: section.color, lineHeight: "19px" }}>{section.label}</Typography.Text>
                            <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, lineHeight: "16px" }}>{dishIds.length} món · {totalServings} phần</Typography.Text>
                        </div>
                    </Stack>
                    <Button size="small" icon={<PlusOutlined />} onClick={() => setAddingMeal(addingMeal === section.key ? null : section.key)}>Thêm món</Button>
                </Stack>

                {addingMeal === section.key && <Box style={{ marginBottom: 9 }}>
                    <Select
                        autoFocus
                        showSearch
                        value={undefined}
                        placeholder="Chọn món để thêm"
                        onChange={(dishId) => _onAddDish(section.key, dishId)}
                        filterOption={(inputValue, option) => {
                            if (!option?.children) return false;
                            return option.children.toString().toLowerCase().includes(inputValue.toLowerCase());
                        }}
                        style={{ width: "100%" }}>
                        {availableDishes.map(dish => <Option key={dish.id} value={dish.id}>{dish.name}</Option>)}
                    </Select>
                </Box>}

                {dishIds.length === 0 ? <Box style={{ border: "1px dashed rgba(0,0,0,0.12)", borderRadius: 8, background: "rgba(255,255,255,0.7)", padding: "12px 10px", textAlign: "center" }}>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>Chưa có món cho {section.label.toLowerCase()}</Typography.Text>
                </Box> : <Stack direction="column" align="stretch" gap={8}>
                    {dishIds.map(dishId => {
                        const dish = dishesById.get(dishId);
                        const baseServings = DishServingHelper.getBaseServings(dish);
                        const targetServings = DishServingHelper.normalizeTargetServings(dishServings[dishId], baseServings);
                        const scale = targetServings / baseServings;
                        const presets = getPresetValues(baseServings);

                        return <Box key={dishId} style={{ border: "1px solid rgba(15,23,42,0.08)", borderRadius: 8, background: "rgba(255,255,255,0.94)", padding: 9 }}>
                            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 8, alignItems: "start" }}>
                                <div style={{ minWidth: 0 }}>
                                    <Typography.Text strong style={{ display: "block", lineHeight: "19px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{dish?.name ?? dishId}</Typography.Text>
                                    <Stack wrap="wrap" gap={5} style={{ marginTop: 4 }}>
                                        <Tag style={{ marginInlineEnd: 0 }}>Gốc {baseServings}</Tag>
                                        <Tag color={scale === 1 ? "green" : scale > 1 ? "orange" : "blue"} style={{ marginInlineEnd: 0 }}>{scale === 1 ? "Giữ nguyên" : `${scale.toFixed(1)}x`}</Tag>
                                    </Stack>
                                </div>
                                <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => _onRemoveDish(section.key, dishId)} style={{ width: 32, paddingInline: 0 }} />
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 7, marginTop: 8 }}>
                                <ServingSizeInput
                                    value={targetServings}
                                    onChange={(nextValue) => _onServingChange(dishId, nextValue)}
                                    min={1}
                                    max={99}
                                    style={{ width: "100%" }}
                                />
                                <Stack wrap="wrap" gap={6}>
                                    {presets.map(preset => {
                                        const active = preset === targetServings;
                                        return <button
                                            key={preset}
                                            type="button"
                                            onClick={() => _onPresetClick(dishId, preset)}
                                            style={{
                                                border: active ? `1px solid ${section.color}` : "1px solid #e5e7eb",
                                                background: active ? section.background : "#fff",
                                                color: active ? section.color : "#4b5563",
                                                borderRadius: 999,
                                                padding: "4px 10px",
                                                fontSize: 12,
                                                fontWeight: active ? 700 : 500,
                                                lineHeight: "18px",
                                                cursor: "pointer",
                                            }}
                                        >{preset} phần</button>
                                    })}
                                </Stack>
                            </div>
                        </Box>
                    })}
                </Stack>}
            </Box>
        })}
    </Stack>
};
