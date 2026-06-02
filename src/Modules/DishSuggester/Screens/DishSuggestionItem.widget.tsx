import { CheckOutlined, FireOutlined, MinusOutlined, PlusOutlined } from "@ant-design/icons";
import { Box } from "@components/Layout/Box";
import { Stack } from "@components/Layout/Stack";
import { Tag } from "@components/Tag";
import { Typography } from "@components/Typography";
import { ScoredDish } from "../Helpers/DishScorer";
import { RootState } from "@store/Store";
import React, { useState } from "react";
import { useSelector } from "react-redux";
import { DishImageWidget } from "@modules/Dishes/Screens/DishesManageIngredient/DishImage.widget";
import { IngredientUnitHelper } from "@common/Helpers/IngredientUnitHelper";
import { IngredientPriceHelper } from "@common/Helpers/IngredientPriceHelper";

type DishSuggestionItemProps = {
    scored: ScoredDish;
    selected: boolean;
    onToggle: (dishId: string) => void;
}

export const DishSuggestionItem: React.FC<DishSuggestionItemProps> = ({ scored, selected, onToggle }) => {
    const allIngredients = useSelector((state: RootState) => state.shared.ingredient.ingredients);
    const [expanded, setExpanded] = useState(false);

    const _name = (id: string) => allIngredients.find(i => i.id === id)?.name ?? id;

    const pct = Math.round(scored.score * 100);
    const scoreColor = pct >= 100 ? "#52c41a" : pct >= 50 ? "#faad14" : "#fa8c16";
    const partialIngredients = scored.partialIngredientIds ?? [];
    const urgentIngredients = scored.urgentIngredients ?? [];
    const ingredientDetails = scored.ingredientDetails ?? [];
    const nearestUrgentDays = urgentIngredients.length > 0
        ? Math.min(...urgentIngredients.map(item => item.daysLeft))
        : null;
    const urgentColor = nearestUrgentDays !== null && nearestUrgentDays <= 1 ? "volcano" : "orange";

    const _urgentFor = (ingredientId: string) => urgentIngredients.find(item => item.ingredientId === ingredientId);
    const _detailFor = (ingredientId: string) => ingredientDetails.find(item => item.ingredientId === ingredientId);
    const _urgentDaysLabel = (daysLeft: number) => {
        if (daysLeft < 0) return "quá hạn";
        if (daysLeft === 0) return "hôm nay";
        return `${daysLeft} ngày`;
    };
    const _isPartial = (ingredientId: string) => partialIngredients.includes(ingredientId);
    const _formatAmount = (value: number) => IngredientUnitHelper.formatAmount(value);

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
                style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px", cursor: "pointer" }}
            >
                {/* Select indicator */}
                <div style={{
                    width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                    border: `2px solid ${selected ? "#52c41a" : "#d9d9d9"}`,
                    background: selected ? "#52c41a" : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.15s",
                    marginTop: 10,
                }}>
                    {selected && <CheckOutlined style={{ color: "#fff", fontSize: 11 }} />}
                </div>

                {/* Dish avatar */}
                <DishImageWidget src={scored.dish.image} width={42} height={42} borderRadius={6} fallbackIconSize={24} showBrokenLabel={false} style={{ flexShrink: 0, marginTop: 1 }} />

                {/* Info */}
                <Box style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", alignItems: "start", gap: 8, minWidth: 0 }}>
                        <Typography.Text strong style={{ fontSize: 14, lineHeight: "18px", minWidth: 0, overflowWrap: "anywhere" }}>
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

                    {urgentIngredients.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                            <Tag
                                color={urgentColor}
                                icon={<FireOutlined />}
                                style={{ fontSize: 10, lineHeight: "18px", marginRight: 0, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                            >
                                {urgentIngredients.length === 1
                                    ? `Dùng sớm: ${_name(urgentIngredients[0].ingredientId)}`
                                    : `Dùng sớm ${urgentIngredients.length} nguyên liệu`}
                            </Tag>
                        </div>
                    )}

                    {/* Tags row */}
                    {scored.dish.tags?.length > 0 && (
                        <Stack wrap="wrap" gap={3}>
                            {scored.dish.tags.map(t => (
                                <Tag key={t} color="geekblue" style={{ fontSize: 10, lineHeight: "16px", padding: "0 5px", marginBottom: 0 }}>{t}</Tag>
                            ))}
                        </Stack>
                    )}

                    {/* Ingredient mini summary */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 8px", marginTop: 1 }}>
                        <Typography.Text style={{ fontSize: 11, color: "#52c41a", whiteSpace: "nowrap" }}>
                            ✓ {scored.matchedIngredientIds.length} có sẵn
                        </Typography.Text>
                        {scored.missingIngredientIds.length > 0 && (
                            <Typography.Text style={{ fontSize: 11, color: "#ff4d4f", whiteSpace: "nowrap" }}>
                                ✗ {scored.missingIngredientIds.length} còn thiếu
                            </Typography.Text>
                        )}
                        {partialIngredients.length > 0 && (
                            <Typography.Text style={{ fontSize: 11, color: "#d46b08", whiteSpace: "nowrap" }}>
                                ◐ {partialIngredients.length} còn một phần
                            </Typography.Text>
                        )}
                        {urgentIngredients.length > 0 && (
                            <Typography.Text style={{ fontSize: 11, color: "#d46b08", whiteSpace: "nowrap" }}>
                                <FireOutlined style={{ fontSize: 10 }} /> {urgentIngredients.length} cần dùng sớm
                            </Typography.Text>
                        )}
                        {scored.extraShoppingCost && (
                            <Typography.Text style={{ fontSize: 11, color: "#0958d9", whiteSpace: "nowrap" }}>
                                Mua thêm ~ {IngredientPriceHelper.formatRange(scored.extraShoppingCost)}
                            </Typography.Text>
                        )}
                    </div>
                </Box>

                {/* Expand toggle */}
                <div
                    onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
                    style={{ padding: "4px 6px", cursor: "pointer", color: "#aaa", flexShrink: 0, marginTop: 8 }}
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
                                {scored.matchedIngredientIds.map(id => {
                                    const urgent = _urgentFor(id);
                                    const detail = _detailFor(id);
                                    return <div key={id} style={{
                                        display: "inline-flex", alignItems: "center", gap: 3,
                                        padding: "3px 10px", borderRadius: 16, fontSize: 12,
                                        background: urgent ? "#fff7e6" : "#f6ffed",
                                        border: urgent ? "1px solid #ffd591" : "1px solid #b7eb8f",
                                        color: urgent ? "#d46b08" : "#389e0d",
                                    }}>
                                        {urgent ? <FireOutlined style={{ fontSize: 10 }} /> : <CheckOutlined style={{ fontSize: 10 }} />} {_name(id)}
                                        {detail && <span style={{ fontWeight: 600 }}>({_formatAmount(detail.requiredAmount)}{detail.unit})</span>}
                                        {urgent && <span style={{ fontWeight: 600 }}>({_urgentDaysLabel(urgent.daysLeft)})</span>}
                                    </div>
                                })}
                            </Stack>
                        </Box>
                    )}
                    {scored.missingIngredientIds.length > 0 && (
                        <Box style={{ marginTop: 8 }}>
                            <Typography.Text type="secondary" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                                Cần mua thêm
                            </Typography.Text>
                            <Stack wrap="wrap" gap={5} style={{ marginTop: 5 }}>
                                {scored.missingIngredientIds.map(id => {
                                    const urgent = _urgentFor(id);
                                    const partial = _isPartial(id);
                                    const detail = _detailFor(id);
                                    return <div key={id} style={{
                                        display: "inline-flex", alignItems: "center", gap: 3,
                                        padding: "3px 10px", borderRadius: 16, fontSize: 12,
                                        background: urgent || partial ? "#fff7e6" : "#fff2f0",
                                        border: urgent || partial ? "1px solid #ffd591" : "1px solid #ffccc7",
                                        color: urgent || partial ? "#d46b08" : "#cf1322",
                                    }}>
                                        {urgent ? <FireOutlined style={{ fontSize: 10 }} /> : partial ? "◐" : "✗"} {_name(id)}
                                        {detail && <span style={{ fontWeight: 600 }}>(mua {_formatAmount(detail.needToBuyAmount)}{detail.unit})</span>}
                                        {partial && detail && <span style={{ fontWeight: 600 }}>
                                            có {_formatAmount(detail.inStockAmount)}/{_formatAmount(detail.requiredAmount)}{detail.unit}
                                        </span>}
                                        {partial && !detail && !urgent && <span style={{ fontWeight: 600 }}>(còn một phần)</span>}
                                        {urgent && <span style={{ fontWeight: 600 }}>({_urgentDaysLabel(urgent.daysLeft)})</span>}
                                    </div>
                                })}
                            </Stack>
                        </Box>
                    )}
                </Box>
            )}
        </div>
    );
};
