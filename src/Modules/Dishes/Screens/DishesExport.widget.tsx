import React from "react";
import { Button } from "@components/Button";
import { Modal } from "@components/Modal";
import { Typography } from "@components/Typography";
import { useMessage } from "@components/Message";
import { Dishes } from "@store/Models/Dishes";
import { Ingredient } from "@store/Models/Ingredient";
import { Box } from "@components/Layout/Box";
import { Space } from "@components/Layout/Space";
import { useSelector } from "react-redux";
import { selectDishesById } from "@store/Selectors";
import NoodlesIcon from "../../../../assets/icons/noodles.png";
import { Image } from "@components/Image";

const formatDishToText = (dish: Dishes, ingredientsById: Map<string, Ingredient>, dishesById: Map<string, Dishes>, depth: number = 0): string => {
    const lines: string[] = [];
    const indent = "  ".repeat(depth);
    const header = depth === 0 ? "🍜" : "↳ 🍜";

    lines.push(`${indent}${header} ${dish.name.toUpperCase()}`);
    lines.push(`${indent}` + "=".repeat(40));

    if (dish.note) {
        lines.push(`${indent}📝 Ghi chú: ${dish.note}`);
        lines.push("");
    }

    if (dish.duration) {
        const parts: string[] = [];
        if (dish.duration.unfreeze) parts.push(`Rã đông: ${dish.duration.unfreeze} phút`);
        if (dish.duration.prepare) parts.push(`Sơ chế: ${dish.duration.prepare} phút`);
        if (dish.duration.cooking) parts.push(`Nấu: ${dish.duration.cooking} phút`);
        if (dish.duration.serve) parts.push(`Phục vụ: ${dish.duration.serve} phút`);
        if (dish.duration.cooldown) parts.push(`Nguội: ${dish.duration.cooldown} phút`);
        if (parts.length > 0) {
            lines.push(`${indent}⏱ Thời gian: ${parts.join(" | ")}`);
            lines.push("");
        }
    }

    if (dish.ingredients && dish.ingredients.length > 0) {
        lines.push(`${indent}🧺 NGUYÊN LIỆU:`);
        dish.ingredients.forEach(ing => {
            const ingInfo = ingredientsById.get(ing.ingredientId);
            const name = ingInfo?.name || ing.ingredientId;
            const prepare = ing.prepare && ing.prepare.length > 0 ? ` (${ing.prepare.join(", ")})` : "";
            const required = ing.required ? "" : " [tùy chọn]";
            lines.push(`${indent}  • ${name}: ${ing.amount} ${ing.unit}${prepare}${required}`);
        });
        lines.push("");
    }

    if (dish.steps && dish.steps.length > 0) {
        lines.push(`${indent}📋 CÁC BƯỚC THỰC HIỆN:`);
        const sortedSteps = [...dish.steps].sort((a, b) => a.order - b.order);
        sortedSteps.forEach((step, idx) => {
            const required = step.required ? "" : " [tùy chọn]";
            lines.push(`${indent}  ${idx + 1}. ${step.content}${required}`);
        });
        lines.push("");
    }

    if (dish.includeDishes && dish.includeDishes.length > 0) {
        lines.push(`${indent}🔗 BAO GỒM CÁC MÓN:`);
        lines.push("");
        dish.includeDishes.forEach(subDishId => {
            const subDish = dishesById.get(subDishId);
            if (subDish) {
                lines.push(formatDishToText(subDish, ingredientsById, dishesById, depth + 1));
            }
        });
    }

    return lines.join("\n");
};

type DishesExportWidgetProps = {
    dish: Dishes;
    allIngredients: Ingredient[];
    open: boolean;
    onClose: () => void;
}

export const DishesExportWidget: React.FC<DishesExportWidgetProps> = ({ dish, allIngredients, open, onClose }) => {
    const message = useMessage();
    const dishesById = useSelector(selectDishesById);
    const ingredientsById = React.useMemo(() => open ? new Map(allIngredients.map(item => [item.id, item])) : new Map<string, Ingredient>(), [open, allIngredients]);
    const text = React.useMemo(() => open ? formatDishToText(dish, ingredientsById, dishesById) : "", [open, dish, ingredientsById, dishesById]);

    if (!open) return null;

    const _onCopy = () => {
        navigator.clipboard.writeText(text).then(() => {
            message.success("Đã sao chép!");
        });
    };

    const _onDownload = () => {
        const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${dish.name}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <>
            <Modal
                open={open}
                onCancel={onClose}
                title={
                    <Space>
                        <Image src={NoodlesIcon} preview={false} width={20} style={{ marginBottom: 3 }} />
                        Xuất công thức — {dish.name}
                    </Space>
                }
                footer={
                    <Space>
                        <Button onClick={_onCopy}>Sao chép</Button>
                        <Button type="primary" onClick={_onDownload}>Tải file .txt</Button>
                    </Space>
                }
                destroyOnClose
            >
                <Box style={{ background: "#f5f5f5", borderRadius: 8, padding: 16, maxHeight: 400, overflowY: "auto" }}>
                    <Typography.Text>
                        <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 14, fontFamily: "inherit" }}>{text}</pre>
                    </Typography.Text>
                </Box>
            </Modal>
        </>
    );
};
