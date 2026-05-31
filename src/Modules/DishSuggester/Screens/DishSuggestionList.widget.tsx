import { Box } from "@components/Layout/Box";
import { Stack } from "@components/Layout/Stack";
import { Typography } from "@components/Typography";
import { ScoredDishGroup } from "../Helpers/DishScorer";
import React, { useState } from "react";
import { DishSuggestionItem } from "./DishSuggestionItem.widget";
import { DownOutlined, RightOutlined } from "@ant-design/icons";

type DishSuggestionListProps = {
    groups: ScoredDishGroup[];
    selectedDishIds: string[];
    onToggle: (dishId: string) => void;
}

export const DishSuggestionList: React.FC<DishSuggestionListProps> = ({ groups, selectedDishIds, onToggle }) => {
    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

    const _toggle = (label: string) => setCollapsed(c => ({ ...c, [label]: !c[label] }));

    return (
        <Box style={{ maxHeight: 440, overflowY: "auto", paddingRight: 2 }}>
            {groups.map((group, idx) => {
                const isCollapsed = collapsed[group.label];
                const selectedInGroup = group.dishes.filter(d => selectedDishIds.includes(d.dish.id)).length;
                return (
                    <Box key={group.label} style={{ marginBottom: 6 }}>
                        {/* Section header */}
                        <div
                            onClick={() => _toggle(group.label)}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "7px 10px",
                                borderRadius: 8,
                                background: group.color + "18",
                                cursor: "pointer",
                                marginBottom: isCollapsed ? 0 : 8,
                                userSelect: "none",
                            }}
                        >
                            <Stack gap={8} align="center">
                                {isCollapsed ? <RightOutlined style={{ fontSize: 10, color: group.color }} /> : <DownOutlined style={{ fontSize: 10, color: group.color }} />}
                                <Typography.Text strong style={{ fontSize: 13, color: group.color }}>
                                    {group.label}
                                </Typography.Text>
                                <div style={{
                                    background: group.color + "33", color: group.color,
                                    borderRadius: 10, padding: "0 8px", fontSize: 11, fontWeight: 600,
                                }}>
                                    {group.dishes.length} món
                                </div>
                            </Stack>
                            {selectedInGroup > 0 && (
                                <div style={{
                                    background: "#1677ff", color: "#fff",
                                    borderRadius: 10, padding: "0 8px", fontSize: 11, fontWeight: 600,
                                }}>
                                    ✓ {selectedInGroup} chọn
                                </div>
                            )}
                        </div>

                        {/* Dish list */}
                        {!isCollapsed && (
                            <Box>
                                {group.dishes.map(scored => (
                                    <DishSuggestionItem
                                        key={scored.dish.id}
                                        scored={scored}
                                        selected={selectedDishIds.includes(scored.dish.id)}
                                        onToggle={onToggle}
                                    />
                                ))}
                            </Box>
                        )}
                    </Box>
                );
            })}
        </Box>
    );
};
