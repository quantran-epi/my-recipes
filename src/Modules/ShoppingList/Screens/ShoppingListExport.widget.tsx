import React from "react";
import { Button } from "@components/Button";
import { DeferredModalContent, Modal } from "@components/Modal";
import { Typography } from "@components/Typography";
import { ShoppingList } from "@store/Models/ShoppingList";
import { Ingredient } from "@store/Models/Ingredient";
import { Box } from "@components/Layout/Box";
import { Space } from "@components/Layout/Space";
import { useMessage } from "@components/Message";
import ShoppingListIcon from "../../../../assets/icons/shoppingList.png";
import { Image } from "@components/Image";
import moment from "moment";

const formatShoppingListToText = (shoppingList: ShoppingList, ingredientsById: Map<string, Ingredient>): string => {
    const lines: string[] = [];

    lines.push(`🛒 ${shoppingList.name.toUpperCase()}`);
    lines.push("=".repeat(40));
    lines.push(`📅 Ngày kế hoạch: ${moment(shoppingList.plannedDate).format("DD/MM/YYYY")}`);
    lines.push(`🕐 Ngày tạo: ${moment(shoppingList.createdDate).format("DD/MM/YYYY HH:mm")}`);
    lines.push("");

    if (shoppingList.ingredients && shoppingList.ingredients.length > 0) {
        lines.push("🧺 DANH SÁCH NGUYÊN LIỆU:");
        lines.push("-".repeat(40));

        shoppingList.ingredients.forEach(group => {
            const ingInfo = ingredientsById.get(group.ingredientId);
            const name = ingInfo?.name || group.ingredientId;
            const done = group.isDone ? " ✅" : "";

            if (group.amounts.length === 1) {
                const a = group.amounts[0];
                lines.push(`  ${group.isDone ? "☑" : "☐"} ${name}: ${a.amount} ${a.unit}${done}`);
            } else {
                lines.push(`  ${group.isDone ? "☑" : "☐"} ${name}${done}`);
                group.amounts.forEach(a => {
                    const itemDone = a.isDone ? " ✅" : "";
                    lines.push(`      • ${a.amount} ${a.unit}${itemDone}`);
                });
            }
        });
    }

    return lines.join("\n");
};

type ShoppingListExportWidgetProps = {
    shoppingList: ShoppingList;
    allIngredients: Ingredient[];
    open?: boolean;
    onClose?: () => void;
}

type ShoppingListExportBodyProps = {
    shoppingList: ShoppingList;
    allIngredients: Ingredient[];
    onTextReady: (text: string) => void;
}

const ShoppingListExportBody: React.FC<ShoppingListExportBodyProps> = ({ shoppingList, allIngredients, onTextReady }) => {
    const ingredientsById = React.useMemo(() => new Map(allIngredients.map(item => [item.id, item])), [allIngredients]);
    const text = React.useMemo(() => formatShoppingListToText(shoppingList, ingredientsById), [shoppingList, ingredientsById]);

    React.useEffect(() => {
        onTextReady(text);
    }, [onTextReady, text]);

    return <Box data-testid="shopping-list-export-modal" style={{ background: "#f5f5f5", borderRadius: 8, padding: 16, maxHeight: 400, overflowY: "auto" }}>
        <Typography.Text>
            <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 14, fontFamily: "inherit" }}>{text}</pre>
        </Typography.Text>
    </Box>;
};

export const ShoppingListExportWidget: React.FC<ShoppingListExportWidgetProps> = ({ shoppingList, allIngredients, open, onClose }) => {
    const message = useMessage();
    const [exportText, setExportText] = React.useState("");

    React.useEffect(() => {
        if (!open) setExportText("");
    }, [open]);

    if (!open) return null;

    const _onCopy = () => {
        navigator.clipboard.writeText(exportText).then(() => {
            message.success("Đã sao chép!");
        });
    };

    const _onDownload = () => {
        const blob = new Blob([exportText], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${shoppingList.name}.txt`;
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
                        <Image src={ShoppingListIcon} preview={false} width={20} style={{ marginBottom: 3 }} />
                        Xuất danh sách — {shoppingList.name}
                    </Space>
                }
                footer={
                    <Space>
                        <Button disabled={!exportText} onClick={_onCopy}>Sao chép</Button>
                        <Button disabled={!exportText} type="primary" onClick={_onDownload}>Tải file .txt</Button>
                    </Space>
                }
                destroyOnClose
            >
                <DeferredModalContent active={open} minHeight={180}>
                    <ShoppingListExportBody shoppingList={shoppingList} allIngredients={allIngredients} onTextReady={setExportText} />
                </DeferredModalContent>
            </Modal>
        </>
    );
};
