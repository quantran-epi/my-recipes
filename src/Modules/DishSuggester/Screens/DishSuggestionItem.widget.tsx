import { CheckOutlined, MinusOutlined, PlusOutlined } from "@ant-design/icons";
import { Avatar } from "@components/Avatar";
import { Box } from "@components/Layout/Box";
import { Space } from "@components/Layout/Space";
import { Stack } from "@components/Layout/Stack";
import { Tag } from "@components/Tag";
import { Typography } from "@components/Typography";
import { ScoredDish } from "../Helpers/DishScorer";
import { RootState } from "@store/Store";
import React, { useState } from "react";
import { useSelector } from "react-redux";
import NoodlesIcon from "../../../../assets/icons/noodles.png";
import { Image } from "@components/Image";

type DishSuggestionItemProps = {
    scored: ScoredDish;
    selected: boolean;
    onToggle: (dishId: string) => void;
}

export const DishSuggestionItem: React.FC<DishSuggestionItemProps> = ({ scored, selected, onToggle }) => {
    const allIngredients = useSelector((state: RootState) => state.ingredient.ingredients);
    const [expanded, setExpanded] = useState(false);

    const _name = (id: string) => allIngredients.find(i => i.id === id)?.name ?? id;

    const pct = Math.round(scored.score * 100);
    const scoreColor = pct >= 100 ? "#52c41a" : pct >= 50 ? "#faad14" : "#fa8c16";

    return (
        <div
            style={{
                borderRadius: 10,
                border: `1.5px solid ${selected ? "#52c41a" : "#ebebeb"}`,
                backgroundColor: selected ? "#f6ffed" : "#fafafa",
                marginBottom: 8,
                overflow: "hidden",
                transition: "all 0.15s",
            }}
        >
            {/* Main row — tap to select */}
            <div
                onClick={() => onToggle(scored.dish.id)}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", cursor: "pointer" }}
            >
                {/* Select indicator */}
                <div style={{
                    width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                    border: `2px solid ${selected ? "#52c41a" : "#d9d9d9"}`,
                    background: selected ? "#52c41a" : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.15s",
                }}>
                    {selected && <CheckOutlined style={{ color: "#fff", fontSize: 11 }} />}
                </div>

                {/* Dish avatar */}
                <Avatar
                    src={scored.dish.image}
                    icon={!scored.dish.image ? <Image src={NoodlesIcon} preview={false} width={26} /> : undefined}
                    size={42}
                    shape="square"
                    style={{ borderRadius: 6, flexShrink: 0 }}
                />

                {/* Info */}
                <Box style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2, minWidth: 0 }}>
                        <Typography.Text strong style={{ fontSize: 14, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                            {scored.dish.name}
                        </Typography.Text>
                        {/* Score pill */}
                        <div style={{
                            padding: "2px 8px", borderRadius: 12, fontSize: 12, fontWeight: 700,
                            background: scoreColor + "22", color: scoreColor, flexShrink: 0, whiteSpace: "nowrap",
                        }}>
                            {pct}%
                        </div>
                    </div>

                    {/* Tags row */}
                    {scored.dish.tags?.length > 0 && (
                        <Stack wrap="wrap" gap={3}>
                            {scored.dish.tags.map(t => (
                                <Tag key={t} color="geekblue" style={{ fontSize: 10, lineHeight: "16px", padding: "0 5px", marginBottom: 0 }}>{t}</Tag>
                            ))}
                        </Stack>
                    )}

                    {/* Ingredient mini summary */}
                    <Stack gap={6} style={{ marginTop: 4 }}>
                        <Typography.Text style={{ fontSize: 11, color: "#52c41a" }}>
                            ✓ {scored.matchedIngredientIds.length} có sẵn
                        </Typography.Text>
                        {scored.missingIngredientIds.length > 0 && (
                            <Typography.Text style={{ fontSize: 11, color: "#ff4d4f" }}>
                                ✗ {scored.missingIngredientIds.length} còn thiếu
                            </Typography.Text>
                        )}
                    </Stack>
                </Box>

                {/* Expand toggle */}
                <div
                    onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
                    style={{ padding: "4px 6px", cursor: "pointer", color: "#aaa", flexShrink: 0 }}
                >
                    {expanded ? <MinusOutlined /> : <PlusOutlined />}
                </div>
            </div>

            {/* Expanded ingredient detail */}
            {expanded && (
                <Box style={{ padding: "0 12px 10px 12px", borderTop: "1px solid #f0f0f0" }}>
                    {scored.matchedIngredientIds.length > 0 && (
                        <Box style={{ marginTop: 8 }}>
                            <Typography.Text type="secondary" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                                Có sẵn
                            </Typography.Text>
                            <Stack wrap="wrap" gap={5} style={{ marginTop: 5 }}>
                                {scored.matchedIngredientIds.map(id => (
                                    <div key={id} style={{
                                        display: "inline-flex", alignItems: "center", gap: 3,
                                        padding: "3px 10px", borderRadius: 16, fontSize: 12,
                                        background: "#f6ffed", border: "1px solid #b7eb8f", color: "#389e0d",
                                    }}>
                                        <CheckOutlined style={{ fontSize: 10 }} /> {_name(id)}
                                    </div>
                                ))}
                            </Stack>
                        </Box>
                    )}
                    {scored.missingIngredientIds.length > 0 && (
                        <Box style={{ marginTop: 8 }}>
                            <Typography.Text type="secondary" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                                Cần mua thêm
                            </Typography.Text>
                            <Stack wrap="wrap" gap={5} style={{ marginTop: 5 }}>
                                {scored.missingIngredientIds.map(id => (
                                    <div key={id} style={{
                                        display: "inline-flex", alignItems: "center", gap: 3,
                                        padding: "3px 10px", borderRadius: 16, fontSize: 12,
                                        background: "#fff2f0", border: "1px solid #ffccc7", color: "#cf1322",
                                    }}>
                                        ✗ {_name(id)}
                                    </div>
                                ))}
                            </Stack>
                        </Box>
                    )}
                </Box>
            )}
        </div>
    );
};
