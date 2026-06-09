import { CameraOutlined, CheckCircleOutlined, FileImageOutlined, ReloadOutlined, ScanOutlined, WarningOutlined } from "@ant-design/icons";
import { IngredientUnitHelper } from "@common/Helpers/IngredientUnitHelper";
import { Button } from "@components/Button";
import { Box } from "@components/Layout/Box";
import { Stack } from "@components/Layout/Stack";
import { DeferredModalContent, Modal } from "@components/Modal";
import { useMessage } from "@components/Message";
import { Typography } from "@components/Typography";
import { INGREDIENT_UNITS, Ingredient, IngredientUnit } from "@store/Models/Ingredient";
import { ShoppingList } from "@store/Models/ShoppingList";
import { selectIngredientsById } from "@store/Selectors";
import { Alert, Empty, Input, InputNumber, Progress, Select, Space, Tag } from "antd";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";

export type ReceiptImportApplyRow = {
    ingredientGroupId: string;
    amount: number;
    unit: IngredientUnit;
    price?: number;
}

type ReceiptImportWidgetProps = {
    open: boolean;
    shoppingList: ShoppingList;
    onClose: () => void;
    onApply: (rows: ReceiptImportApplyRow[]) => void;
}

type ParsedReceiptRow = {
    id: string;
    rawText: string;
    rawName: string;
    amount?: number;
    unit?: IngredientUnit;
    price?: number;
    confidence: number;
    ingredientGroupId?: string;
    enabled: boolean;
}

type ReceiptLineParseResult = {
    rawText: string;
    rawName: string;
    amount?: number;
    unit?: IngredientUnit;
    price?: number;
}

const receiptImportBodyStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    width: "100%",
    boxSizing: "border-box",
};

const actionGridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 8,
    width: "100%",
};

const reviewCardStyle: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    padding: 11,
    borderRadius: 8,
    border: "1px solid rgba(116,54,220,0.12)",
    background: "#fff",
    boxShadow: "0 8px 20px rgba(74,48,130,0.06)",
};

const ignoredLineKeywords = [
    "tong cong", "tong tien", "thanh tien", "total", "subtotal", "vat", "tax", "giam gia", "discount",
    "khuyen mai", "tien mat", "cash", "visa", "momo", "zalopay", "the ngan hang", "ma hd", "hoa don",
    "ngay", "gio", "nhan vien", "cam on", "hotline", "dia chi", "website", "don gia", "so luong",
];

const normalizeText = (value: string): string => value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const parseNumber = (value: string): number | undefined => {
    const normalized = value.replace(/,/g, ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

const parseMoney = (value: string): number | undefined => {
    const digits = value.replace(/[^0-9]/g, "");
    const parsed = Number(digits);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

const normalizeReceiptUnit = (value: string): IngredientUnit | undefined => {
    const normalized = normalizeText(value);
    if (normalized === "lit" || normalized === "l") return "lít";
    if (normalized === "gam" || normalized === "gram") return "g";
    if (normalized === "qua") return "quả";
    if (normalized === "bo") return "bó";
    if (normalized === "cu") return "củ";
    if (normalized === "la") return "lá";
    if (normalized === "nhanh") return "nhánh";
    if (normalized === "chiec" || normalized === "chai" || normalized === "hop" || normalized === "goi") return "chiếc";
    if (normalized === "thia") return "thìa";
    return INGREDIENT_UNITS.find(unit => normalizeText(unit) === normalized);
};

const shouldIgnoreLine = (line: string): boolean => {
    const normalized = normalizeText(line);
    if (!normalized || normalized.length < 3) return true;
    return ignoredLineKeywords.some(keyword => normalized.includes(keyword));
};

const parseReceiptLine = (line: string): ReceiptLineParseResult | null => {
    const trimmed = line.trim().replace(/\s+/g, " ");
    if (shouldIgnoreLine(trimmed)) return null;

    const priceMatches = Array.from(trimmed.matchAll(/(?:^|\s)(\d{1,3}(?:[.,]\d{3})+|\d{4,})(?:\s*(?:d|đ|vnd))?(?=\s|$)/gi));
    const priceMatch = priceMatches[priceMatches.length - 1];
    const price = priceMatch ? parseMoney(priceMatch[0]) : undefined;
    const priceIndex = priceMatch?.index ?? 0;
    const withoutPrice = priceMatch ? `${trimmed.slice(0, priceIndex).trim()} ${trimmed.slice(priceIndex + priceMatch[0].length).trim()}`.trim() : trimmed;

    const amountMatch = withoutPrice.match(/(\d+(?:[.,]\d+)?)\s*(kg|g|gam|gram|ml|l|lit|lít|qua|quả|bo|bó|cu|củ|la|lá|chiec|chiếc|chai|hop|hộp|goi|gói|thanh|nhanh|nhánh|thia|thìa)\b/i);
    const amount = amountMatch ? parseNumber(amountMatch[1]) : undefined;
    const unit = amountMatch ? normalizeReceiptUnit(amountMatch[2]) : undefined;
    const rawName = withoutPrice
        .replace(amountMatch?.[0] ?? "", " ")
        .replace(/[^\p{L}0-9\s]/gu, " ")
        .replace(/\s+/g, " ")
        .trim();

    if (!rawName || (!price && !amount)) return null;

    return {
        rawText: trimmed,
        rawName,
        amount,
        unit,
        price,
    };
};

const scoreIngredientMatch = (rawName: string, ingredient: Ingredient | undefined): number => {
    if (!ingredient) return 0;
    const raw = normalizeText(rawName);
    const name = normalizeText(ingredient.name);
    if (!raw || !name) return 0;
    if (raw === name) return 98;
    if (raw.includes(name)) return 90;
    if (name.includes(raw)) return raw.length >= 4 ? 82 : 45;

    const rawTokens = raw.split(" ").filter(token => token.length >= 2);
    const nameTokens = name.split(" ").filter(token => token.length >= 2);
    if (rawTokens.length === 0 || nameTokens.length === 0) return 0;
    const shared = rawTokens.filter(token => nameTokens.some(nameToken => nameToken === token || nameToken.includes(token) || token.includes(nameToken))).length;
    const overlap = shared / Math.max(rawTokens.length, nameTokens.length);
    return Math.round(overlap * 76);
};

const getConfidenceTone = (confidence: number) => {
    if (confidence >= 80) return { label: "Cao", color: "green" as const };
    if (confidence >= 55) return { label: "Vừa", color: "gold" as const };
    return { label: "Thấp", color: "volcano" as const };
};

const buildReceiptRows = (
    text: string,
    shoppingList: ShoppingList,
    ingredientsById: Map<string, Ingredient>,
): ParsedReceiptRow[] => {
    const groups = shoppingList.ingredients;
    return text
        .split(/\r?\n/)
        .map(parseReceiptLine)
        .filter(Boolean)
        .map((parsed, index) => {
            const ranked = groups
                .map(group => ({ group, confidence: scoreIngredientMatch(parsed!.rawName, ingredientsById.get(group.ingredientId)) }))
                .sort((a, b) => b.confidence - a.confidence);
            const best = ranked[0];
            const defaultUnit = best?.group
                ? IngredientUnitHelper.getBaseUnit(ingredientsById.get(best.group.ingredientId), best.group.amounts.map(item => item.unit))
                : "g";

            return {
                id: `${index}-${parsed!.rawText}`,
                rawText: parsed!.rawText,
                rawName: parsed!.rawName,
                amount: parsed!.amount,
                unit: parsed!.unit ?? defaultUnit,
                price: parsed!.price,
                confidence: best?.confidence ?? 0,
                ingredientGroupId: best && best.confidence >= 45 ? best.group.id : undefined,
                enabled: Boolean(best && best.confidence >= 45),
            };
        });
};

export const ShoppingListReceiptImportWidget: React.FC<ReceiptImportWidgetProps> = ({ open, shoppingList, onClose, onApply }) => {
    const message = useMessage();
    const ingredientsById = useSelector(selectIngredientsById);
    const uploadInputRef = useRef<HTMLInputElement | null>(null);
    const cameraInputRef = useRef<HTMLInputElement | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [ocrText, setOcrText] = useState("");
    const [rows, setRows] = useState<ParsedReceiptRow[]>([]);
    const [parsing, setParsing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [parseError, setParseError] = useState<string | null>(null);

    const ingredientOptions = useMemo(() => shoppingList.ingredients.map(group => {
        const ingredient = ingredientsById.get(group.ingredientId);
        return {
            value: group.id,
            label: ingredient?.name ?? group.ingredientId,
        };
    }), [shoppingList.ingredients, ingredientsById]);

    const acceptedRows = useMemo(() => rows.filter(row => row.enabled && row.ingredientGroupId && row.amount && row.amount > 0), [rows]);

    useEffect(() => {
        if (open) return;
        setSelectedFile(null);
        setOcrText("");
        setRows([]);
        setParsing(false);
        setProgress(0);
        setParseError(null);
        setPreviewUrl(current => {
            if (current) URL.revokeObjectURL(current);
            return null;
        });
    }, [open]);

    const _onPickFile = (file?: File | null) => {
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            message.warning("Vui lòng chọn ảnh hóa đơn.");
            return;
        }
        setPreviewUrl(current => {
            if (current) URL.revokeObjectURL(current);
            return URL.createObjectURL(file);
        });
        setSelectedFile(file);
        setOcrText("");
        setRows([]);
        setParseError(null);
        setProgress(0);
    };

    const _parseText = (text: string) => {
        const nextRows = buildReceiptRows(text, shoppingList, ingredientsById);
        setRows(nextRows);
        if (nextRows.length === 0) {
            message.warning("Chưa đọc được dòng mua hàng nào. Bạn có thể sửa nội dung OCR rồi bấm phân tích lại.");
            return;
        }
        message.success(`Đã tách ${nextRows.length} dòng, vui lòng kiểm tra trước khi áp dụng.`);
    };

    const _runOcr = async () => {
        if (!selectedFile) {
            message.warning("Chọn hoặc chụp ảnh hóa đơn trước.");
            return;
        }

        setParsing(true);
        setProgress(2);
        setParseError(null);
        try {
            const Tesseract = await import("tesseract.js");
            const result = await Tesseract.recognize(selectedFile, "vie+eng", {
                logger: (event: any) => {
                    if (typeof event?.progress === "number") {
                        setProgress(Math.max(2, Math.round(event.progress * 100)));
                    }
                },
            });
            const text = result.data.text ?? "";
            setOcrText(text);
            _parseText(text);
        } catch (error: any) {
            setParseError(error?.message ?? "Không đọc được ảnh hóa đơn.");
            message.error("Không đọc được ảnh hóa đơn. Thử ảnh rõ hơn hoặc nhập nội dung OCR thủ công.");
        } finally {
            setParsing(false);
            setProgress(0);
        }
    };

    const _patchRow = (rowId: string, patch: Partial<ParsedReceiptRow>) => {
        setRows(current => current.map(row => row.id === rowId ? { ...row, ...patch } : row));
    };

    const _apply = () => {
        const payload = acceptedRows.map(row => ({
            ingredientGroupId: row.ingredientGroupId!,
            amount: row.amount!,
            unit: row.unit ?? "g",
            price: row.price,
        }));
        onApply(payload);
        onClose();
    };

    return <Modal
        open={open}
        width={760}
        title={<Space size={8}><ScanOutlined /><span>Nhập hóa đơn bằng ảnh</span></Space>}
        onCancel={onClose}
        destroyOnClose
        footer={<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Typography.Text type="secondary" style={{ fontSize: 12, lineHeight: "18px" }}>
                Ảnh chỉ dùng để đọc nội dung trong phiên này, không lưu vào dữ liệu app.
            </Typography.Text>
            <Space>
                <Button onClick={onClose}>Hủy</Button>
                <Button type="primary" disabled={acceptedRows.length === 0 || parsing} icon={<CheckCircleOutlined />} onClick={_apply}>Áp dụng {acceptedRows.length}</Button>
            </Space>
        </div>}
    >
        <DeferredModalContent active={open} minHeight={260}>
            <div style={receiptImportBodyStyle} data-testid="receipt-import-modal">
                <Alert
                    type="info"
                    showIcon
                    message="Luôn cần kiểm tra trước khi áp dụng"
                    description="OCR và ghép nguyên liệu có thể sai. Dù độ tin cậy cao, mỗi dòng bên dưới đều có thể sửa tên nguyên liệu, số lượng, đơn vị, giá hoặc bỏ qua."
                />

                <input ref={uploadInputRef} type="file" accept="image/*" hidden onChange={event => _onPickFile(event.target.files?.[0])} />
                <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" hidden onChange={event => _onPickFile(event.target.files?.[0])} />

                <div style={actionGridStyle}>
                    <Button icon={<FileImageOutlined />} onClick={() => uploadInputRef.current?.click()} style={{ height: 42 }}>Chọn ảnh</Button>
                    <Button icon={<CameraOutlined />} onClick={() => cameraInputRef.current?.click()} style={{ height: 42 }}>Mở camera</Button>
                </div>

                {previewUrl && <Box style={{ border: "1px solid rgba(116,54,220,0.12)", borderRadius: 8, background: "#fbf9ff", padding: 8 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "82px minmax(0, 1fr)", gap: 10, alignItems: "center" }}>
                        <img src={previewUrl} alt="Receipt preview" style={{ width: 82, height: 82, objectFit: "cover", borderRadius: 8, border: "1px solid #ede5ff" }} />
                        <div style={{ minWidth: 0 }}>
                            <Typography.Text strong style={{ display: "block", lineHeight: "20px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedFile?.name ?? "Ảnh hóa đơn"}</Typography.Text>
                            <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, lineHeight: "18px" }}>Ảnh chỉ nằm trong bộ nhớ modal này.</Typography.Text>
                            <Button type="primary" icon={<ScanOutlined />} loading={parsing} onClick={_runOcr} style={{ marginTop: 8 }}>Đọc hóa đơn</Button>
                        </div>
                    </div>
                </Box>}

                {parsing && <Box style={{ border: "1px solid #e6f4ff", borderRadius: 8, background: "#f7fbff", padding: 10 }}>
                    <Stack align="center" gap={8}>
                        <Progress percent={progress} size="small" style={{ flex: 1 }} />
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>Đang OCR</Typography.Text>
                    </Stack>
                </Box>}

                {parseError && <Alert type="warning" showIcon icon={<WarningOutlined />} message="OCR chưa thành công" description={parseError} />}

                <Box style={{ border: "1px solid #f0f0f0", borderRadius: 8, padding: 10, background: "#fff" }}>
                    <Stack justify="space-between" align="center" gap={8} style={{ marginBottom: 8 }}>
                        <Typography.Text strong>Nội dung OCR</Typography.Text>
                        <Button size="small" icon={<ReloadOutlined />} disabled={!ocrText.trim()} onClick={() => _parseText(ocrText)}>Phân tích lại</Button>
                    </Stack>
                    <Input.TextArea
                        value={ocrText}
                        onChange={event => setOcrText(event.target.value)}
                        rows={4}
                        placeholder="Sau khi đọc ảnh, nội dung OCR sẽ hiện ở đây. Bạn có thể sửa text rồi phân tích lại."
                    />
                </Box>

                <Box style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                    <Stack justify="space-between" align="center" gap={8}>
                        <div>
                            <Typography.Text strong style={{ display: "block", lineHeight: "20px" }}>Kiểm tra từng dòng</Typography.Text>
                            <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, lineHeight: "18px" }}>Chọn nguyên liệu đúng trước khi áp dụng vào lịch mua sắm.</Typography.Text>
                        </div>
                        <Tag color="purple" style={{ marginInlineEnd: 0 }}>{acceptedRows.length}/{rows.length}</Tag>
                    </Stack>

                    {rows.length === 0 && <Box style={{ border: "1px dashed #d9d9d9", borderRadius: 8, background: "#fafafa", padding: 16 }}>
                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có dòng hóa đơn để kiểm tra" />
                    </Box>}

                    {rows.map(row => {
                        const confidenceTone = getConfidenceTone(row.confidence);
                        return <div key={row.id} style={reviewCardStyle}>
                            <Stack justify="space-between" align="flex-start" gap={8} style={{ marginBottom: 8 }}>
                                <div style={{ minWidth: 0 }}>
                                    <Typography.Text strong style={{ display: "block", lineHeight: "20px", overflowWrap: "anywhere" }}>{row.rawName || "Dòng chưa rõ"}</Typography.Text>
                                    <Typography.Text type="secondary" style={{ display: "block", fontSize: 11, lineHeight: "16px", overflowWrap: "anywhere" }}>{row.rawText}</Typography.Text>
                                </div>
                                <Tag color={confidenceTone.color} style={{ marginInlineEnd: 0, flexShrink: 0 }}>{confidenceTone.label} {row.confidence}%</Tag>
                            </Stack>
                            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 8 }}>
                                <Select
                                    value={row.ingredientGroupId}
                                    placeholder="Chọn nguyên liệu trong lịch mua sắm"
                                    options={ingredientOptions}
                                    showSearch
                                    optionFilterProp="label"
                                    onChange={value => _patchRow(row.id, { ingredientGroupId: value, enabled: true })}
                                    style={{ width: "100%" }}
                                />
                                <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 94px minmax(0, 1fr)", gap: 8 }}>
                                    <InputNumber min={0} value={row.amount} placeholder="Lượng" onChange={value => _patchRow(row.id, { amount: typeof value === "number" ? value : undefined })} style={{ width: "100%" }} />
                                    <Select value={row.unit} onChange={value => _patchRow(row.id, { unit: value })} options={INGREDIENT_UNITS.map(unit => ({ value: unit, label: unit }))} style={{ width: "100%" }} />
                                    <InputNumber min={0} value={row.price} placeholder="Giá" formatter={value => value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".") : ""} parser={value => Number((value ?? "").replace(/[^0-9]/g, ""))} onChange={value => _patchRow(row.id, { price: typeof value === "number" ? value : undefined })} style={{ width: "100%" }} />
                                </div>
                                <Button
                                    size="small"
                                    danger={row.enabled}
                                    onClick={() => _patchRow(row.id, { enabled: !row.enabled })}
                                    style={{ justifySelf: "flex-start", borderRadius: 999 }}
                                >
                                    {row.enabled ? "Bỏ qua dòng này" : "Dùng dòng này"}
                                </Button>
                            </div>
                        </div>;
                    })}

                    {acceptedRows.length > 0 && <Box style={{ border: "1px solid #d9f7be", borderRadius: 8, background: "#f6ffed", padding: 10 }}>
                        <Typography.Text style={{ color: "#237804", fontSize: 12, lineHeight: "18px" }}>
                            Khi áp dụng, app sẽ cập nhật lượng đã mua trong lịch mua sắm. Ảnh gốc và nội dung OCR không được lưu vào dữ liệu app.
                        </Typography.Text>
                    </Box>}
                </Box>
            </div>
        </DeferredModalContent>
    </Modal>;
};
