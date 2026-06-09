import { CheckOutlined, SearchOutlined } from "@ant-design/icons";
import { Button } from "@components/Button";
import { Input } from "@components/Form/Input";
import { Image } from "@components/Image";
import { Box } from "@components/Layout/Box";
import { Stack } from "@components/Layout/Stack";
import { Tag } from "@components/Tag";
import { Typography } from "@components/Typography";
import { INGREDIENT_CATEGORIES, Ingredient } from "@store/Models/Ingredient";
import { selectIngredients, selectIngredientsById } from "@store/Selectors";
import { Divider } from "antd";
import { groupBy } from "lodash";
import React, { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import IngredientIcon from "../../../../assets/icons/vegetable.png";

type IngredientPickerWidgetProps = {
    selectedIds: string[];
    onChange: (ids: string[]) => void;
}

export const IngredientPickerWidget: React.FC<IngredientPickerWidgetProps> = ({ selectedIds, onChange }) => {
    const allIngredients = useSelector(selectIngredients);
    const ingredientsById = useSelector(selectIngredientsById);
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [search, setSearch] = useState("");

    const usedCategories = useMemo(() => {
        const cats = new Set(allIngredients.map(i => i.category ?? "Khác"));
        return INGREDIENT_CATEGORIES.filter(c => cats.has(c));
    }, [allIngredients]);

    const filtered = useMemo(() => {
        return allIngredients.filter(i => {
            const matchCat = !activeCategory || (i.category ?? "Khác") === activeCategory;
            const matchSearch = !search || i.name.toLowerCase().includes(search.toLowerCase());
            return matchCat && matchSearch;
        });
    }, [allIngredients, activeCategory, search]);

    const grouped = useMemo(() => {
        const g = groupBy(filtered, i => i.category ?? "Khác");
        const keys = INGREDIENT_CATEGORIES.filter(c => g[c]?.length > 0);
        Object.keys(g).forEach(k => { if (!keys.includes(k)) keys.push(k); });
        return keys.map(cat => ({ category: cat, items: g[cat] }));
    }, [filtered]);

    const _toggle = (id: string) => {
        if (selectedIds.includes(id)) {
            onChange(selectedIds.filter(s => s !== id));
        } else {
            onChange([...selectedIds, id]);
        }
    };

    const selectedCountByCategory = useMemo(() => {
        const map: Record<string, number> = {};
        allIngredients.forEach(i => {
            if (selectedIds.includes(i.id)) {
                const cat = i.category ?? "Khác";
                map[cat] = (map[cat] ?? 0) + 1;
            }
        });
        return map;
    }, [allIngredients, selectedIds]);

    return (
        <Box>
            {/* Search */}
            <Input
                prefix={<SearchOutlined style={{ color: "#aaa" }} />}
                placeholder="Tìm nguyên liệu..."
                allowClear
                onChange={e => setSearch(e.target.value)}
                style={{ marginBottom: 10, borderRadius: 8 }}
            />

            {/* Category pill tabs — horizontal scroll */}
            <Box style={{ overflowX: "auto", paddingBottom: 6, marginBottom: 8 }}>
                <Stack gap={6} style={{ flexWrap: "nowrap", minWidth: "max-content" }}>
                    {[{ key: null, label: "Tất cả" }, ...usedCategories.map(c => ({ key: c, label: c }))].map(({ key, label }) => {
                        const active = activeCategory === key;
                        const count = key === null ? selectedIds.length : (selectedCountByCategory[key] ?? 0);
                        return (
                            <div
                                key={String(key)}
                                onClick={() => setActiveCategory(key)}
                                style={{
                                    padding: "5px 14px",
                                    borderRadius: 20,
                                    cursor: "pointer",
                                    fontSize: 13,
                                    fontWeight: active ? 600 : 400,
                                    background: active ? "#1677ff" : "#f0f0f0",
                                    color: active ? "#fff" : "#555",
                                    whiteSpace: "nowrap",
                                    transition: "all 0.15s",
                                    userSelect: "none",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 5,
                                }}
                            >
                                {label}
                                {count > 0 && (
                                    <span style={{
                                        background: active ? "rgba(255,255,255,0.3)" : "#1677ff",
                                        color: "#fff",
                                        borderRadius: 10,
                                        padding: "0 6px",
                                        fontSize: 11,
                                        fontWeight: 600,
                                        lineHeight: "18px",
                                    }}>{count}</span>
                                )}
                            </div>
                        );
                    })}
                </Stack>
            </Box>

            {/* Selected summary strip */}
            {selectedIds.length > 0 && (
                <Box style={{ marginBottom: 8, padding: "6px 10px", background: "#f6ffed", borderRadius: 8, border: "1px solid #b7eb8f" }}>
                    <Stack justify="space-between" align="center" style={{ marginBottom: 6 }}>
                        <Typography.Text style={{ fontSize: 12, color: "#389e0d" }}>
                            ✓ Đã chọn <strong>{selectedIds.length}</strong> nguyên liệu
                        </Typography.Text>
                        <Button type="link" danger style={{ padding: 0, height: "auto", fontSize: 12 }} onClick={() => onChange([])}>
                            Bỏ hết
                        </Button>
                    </Stack>
                    <Box style={{ overflowX: "auto", paddingBottom: 2 }}>
                        <Stack gap={5} style={{ flexWrap: "nowrap", minWidth: "max-content" }}>
                            {selectedIds.map(id => {
                                const name = ingredientsById.get(id)?.name ?? id;
                                return (
                                    <div
                                        key={id}
                                        style={{
                                            display: "inline-flex", alignItems: "center", gap: 4,
                                            padding: "3px 8px 3px 10px", borderRadius: 14, fontSize: 12,
                                            background: "#fff", border: "1px solid #b7eb8f", color: "#389e0d",
                                            whiteSpace: "nowrap", userSelect: "none",
                                        }}
                                    >
                                        {name}
                                        <span
                                            onClick={() => _toggle(id)}
                                            style={{ cursor: "pointer", marginLeft: 2, fontSize: 11, color: "#52c41a", fontWeight: 700, lineHeight: 1 }}
                                        >✕</span>
                                    </div>
                                );
                            })}
                        </Stack>
                    </Box>
                </Box>
            )}

            {/* Ingredient chips grid */}
            <Box style={{ maxHeight: 300, overflowY: "auto", paddingRight: 2 }}>
                {grouped.length === 0 && (
                    <Typography.Text type="secondary" style={{ display: "block", textAlign: "center", padding: "24px 0" }}>
                        Không tìm thấy nguyên liệu
                    </Typography.Text>
                )}
                {grouped.map(group => (
                    <React.Fragment key={group.category}>
                        {!activeCategory && (
                            <Divider orientation="left" style={{ marginBlock: "8px 6px", borderColor: "#e8e8e8" }}>
                                <Typography.Text type="secondary" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                                    {group.category}
                                </Typography.Text>
                            </Divider>
                        )}
                        <Stack wrap="wrap" gap={7} style={{ paddingBottom: 6 }}>
                            {group.items.map(ing => {
                                const selected = selectedIds.includes(ing.id);
                                return (
                                    <div
                                        key={ing.id}
                                        onClick={() => _toggle(ing.id)}
                                        style={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: 4,
                                            padding: "5px 12px",
                                            borderRadius: 20,
                                            fontSize: 13,
                                            cursor: "pointer",
                                            userSelect: "none",
                                            transition: "all 0.15s",
                                            border: `1.5px solid ${selected ? "#52c41a" : "#d9d9d9"}`,
                                            background: selected ? "#f6ffed" : "#fafafa",
                                            color: selected ? "#389e0d" : "#444",
                                            fontWeight: selected ? 600 : 400,
                                        }}
                                    >
                                        {selected && <CheckOutlined style={{ fontSize: 11 }} />}
                                        {ing.name}
                                    </div>
                                );
                            })}
                        </Stack>
                    </React.Fragment>
                ))}
            </Box>
        </Box>
    );
};
