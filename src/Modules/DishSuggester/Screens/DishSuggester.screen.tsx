import { BulbOutlined, LeftOutlined, ShoppingCartOutlined } from "@ant-design/icons";
import { Button } from "@components/Button";
import { Image } from "@components/Image";
import { Box } from "@components/Layout/Box";
import { Space } from "@components/Layout/Space";
import { Stack } from "@components/Layout/Stack";
import { Modal } from "@components/Modal";
import { Tag } from "@components/Tag";
import { Typography } from "@components/Typography";
import { useToggle } from "@hooks";
import { DishScorer, ScoredDish, ScoredDishGroup } from "../Helpers/DishScorer";
import { RootState } from "@store/Store";
import { Divider } from "antd";
import React, { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { IngredientPickerWidget } from "./IngredientPicker.widget";
import { DishSuggestionList } from "./DishSuggestionList.widget";
import { ShoppingListAddWidget } from "@modules/ShoppingList/Screens/ShoppingListAdd.widget";
import ShoppingListIcon from "../../../../assets/icons/shoppingList.png";
import NoodlesIcon from "../../../../assets/icons/noodles.png";
import IngredientIcon from "../../../../assets/icons/vegetable.png";

type DishSuggesterScreenProps = {
    open: boolean;
    onClose: () => void;
}

export const DishSuggesterScreen: React.FC<DishSuggesterScreenProps> = ({ open, onClose }) => {
    const dishes = useSelector((state: RootState) => state.shared.dishes.dishes);
    const allIngredients = useSelector((state: RootState) => state.shared.ingredient.ingredients);

    const [step, setStep] = useState(0);
    const [selectedIngredientIds, setSelectedIngredientIds] = useState<string[]>([]);
    const [selectedDishIds, setSelectedDishIds] = useState<string[]>([]);
    const toggleShoppingListAdd = useToggle();

    const scored = useMemo(() => DishScorer.score(dishes, selectedIngredientIds, dishes), [dishes, selectedIngredientIds]);
    const groups = useMemo(() => DishScorer.group(scored), [scored]);

    const selectedScored = useMemo(() =>
        scored.filter(s => selectedDishIds.includes(s.dish.id)),
        [scored, selectedDishIds]
    );

    const missingIngredientIds = useMemo(() => {
        const ids = new Set<string>();
        selectedScored.forEach(s => s.missingIngredientIds.forEach(id => ids.add(id)));
        return Array.from(ids);
    }, [selectedScored]);

    const _toggleDish = (dishId: string) => {
        setSelectedDishIds(prev =>
            prev.includes(dishId) ? prev.filter(id => id !== dishId) : [...prev, dishId]
        );
    };

    const _onNext = () => setStep(1);
    const _onBack = () => setStep(0);

    const _onClose = () => {
        setStep(0);
        setSelectedIngredientIds([]);
        setSelectedDishIds([]);
        onClose();
    };

    const _missingIngredientName = (id: string) => allIngredients.find(i => i.id === id)?.name ?? id;

    // Step indicator
    const StepBar = () => (
        <Stack gap={10} style={{ marginBottom: 16 }}>
            {/* Step 1 */}
            <div style={{
                flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
            }}>
                <div style={{
                    width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                    background: step === 0 ? "#1677ff" : "#52c41a",
                    color: "#fff", fontSize: 13, fontWeight: 700,
                }}>
                    {step > 0 ? "✓" : "1"}
                </div>
                <Typography.Text style={{ fontSize: 11, color: step === 0 ? "#1677ff" : "#52c41a", fontWeight: step === 0 ? 600 : 400 }}>
                    Nguyên liệu {step === 0 && selectedIngredientIds.length > 0 ? `(${selectedIngredientIds.length})` : ""}
                </Typography.Text>
            </div>
            {/* connector */}
            <div style={{ flex: 2, height: 2, background: step > 0 ? "#52c41a" : "#e0e0e0", marginTop: 13, transition: "background 0.3s" }} />
            {/* Step 2 */}
            <div style={{
                flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
            }}>
                <div style={{
                    width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                    background: step === 1 ? "#1677ff" : "#e0e0e0",
                    color: step === 1 ? "#fff" : "#aaa", fontSize: 13, fontWeight: 700,
                }}>
                    2
                </div>
                <Typography.Text style={{ fontSize: 11, color: step === 1 ? "#1677ff" : "#aaa", fontWeight: step === 1 ? 600 : 400 }}>
                    Chọn món {step === 1 && selectedDishIds.length > 0 ? `(${selectedDishIds.length})` : ""}
                </Typography.Text>
            </div>
        </Stack>
    );

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
            style={{ top: 24 }}
        >
            <StepBar />

            {step === 0 && <>
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
            </>}

            {step === 1 && <>
                {groups.length === 0
                    ? <Box style={{ textAlign: "center", padding: "32px 0" }}>
                        <Typography.Text type="secondary">Không tìm thấy món phù hợp</Typography.Text>
                    </Box>
                    : <DishSuggestionList
                        groups={groups}
                        selectedDishIds={selectedDishIds}
                        onToggle={_toggleDish}
                    />
                }

                {/* Missing ingredients summary */}
                {selectedDishIds.length > 0 && (
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

                <Stack justify="space-between" style={{ marginTop: 12 }}>
                    <Button onClick={_onBack} icon={<LeftOutlined />} style={{ borderRadius: 20 }}>
                        Quay lại
                    </Button>
                    <Button
                        type="primary"
                        disabled={selectedDishIds.length === 0}
                        icon={<ShoppingCartOutlined />}
                        onClick={toggleShoppingListAdd.show}
                        style={{ borderRadius: 20, paddingInline: 20 }}
                    >
                        Tạo giỏ hàng ({selectedDishIds.length})
                    </Button>
                </Stack>
            </>}
        </Modal>

        {/* ShoppingList add pre-filled with selected dishes */}
        <Modal
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
            <ShoppingListAddWidget
                date={new Date()}
                dishIds={selectedDishIds}
                alreadyHaveIngredientIds={selectedIngredientIds}
                onDone={() => {
                    toggleShoppingListAdd.hide();
                    _onClose();
                }}
            />
        </Modal>
    </>;
};
