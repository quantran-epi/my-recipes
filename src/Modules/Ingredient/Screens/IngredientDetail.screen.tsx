import { ArrowLeftOutlined, EditOutlined } from "@ant-design/icons";
import { InventoryHelper } from "@common/Helpers/InventoryHelper";
import { IngredientUnitHelper } from "@common/Helpers/IngredientUnitHelper";
import { IngredientPriceHelper } from "@common/Helpers/IngredientPriceHelper";
import { Button } from "@components/Button";
import { Image } from "@components/Image";
import { Box } from "@components/Layout/Box";
import { Space } from "@components/Layout/Space";
import { Stack } from "@components/Layout/Stack";
import { Modal } from "@components/Modal";
import { Result } from "@components/Result/Result";
import { Typography } from "@components/Typography";
import { useAdminMode, useScreenTitle, useToggle } from "@hooks";
import { DishSuggesterScreen } from "@modules/DishSuggester/Screens/DishSuggester.screen";
import { RootRoutes } from "@routing/RootRoutes";
import { INGREDIENT_PRESERVATION_OPTIONS, INGREDIENT_SHELF_LIFE_OPTIONS } from "@store/Models/Ingredient";
import { selectIngredients, selectInventoryById } from "@store/Selectors";
import { Divider } from "antd";
import React, { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import VegetablesIcon from "../../../../assets/icons/vegetable.png";
import { IngredientEditWidget } from "./IngredientEdit.widget";
import { IngredientInventoryWidget } from "./IngredientInventory.widget";

export const IngredientDetailScreen = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const ingredientId = searchParams.get("ingredient") ?? "";
    const ingredients = useSelector(selectIngredients);
    const inventory = useSelector(selectInventoryById(ingredientId));
    const { isAdmin } = useAdminMode();
    const toggleEdit = useToggle();
    const toggleSuggester = useToggle();
    const [suggestIds, setSuggestIds] = useState<string[]>([]);

    const ingredient = useMemo(() => ingredients.find(item => item.id === ingredientId), [ingredients, ingredientId]);
    useScreenTitle({ value: ingredient?.name ?? "Nguyên liệu", deps: [ingredient?.name] });

    const _backToList = () => navigate(RootRoutes.AuthorizedRoutes.IngredientRoutes.List());

    if (!ingredient) {
        return <Result
            status="404"
            title="Không tìm thấy nguyên liệu"
            subTitle="Nguyên liệu này không còn tồn tại hoặc đường dẫn chưa có mã nguyên liệu."
            extra={<Button icon={<ArrowLeftOutlined />} onClick={_backToList}>Quay lại danh sách</Button>}
        />;
    }

    const baseUnit = IngredientUnitHelper.getBaseUnit(ingredient);
    const inventoryUnits = IngredientUnitHelper.getInventoryUnits(ingredient);
    const recipeUnits = IngredientUnitHelper.getRecipeUnits(ingredient);
    const conversions = IngredientUnitHelper.getRecipeUnitConversions(ingredient);
    const totalAmount = InventoryHelper.totalAmount(inventory, ingredient);
    const shelfLife = INGREDIENT_SHELF_LIFE_OPTIONS.find(option => option.value === ingredient.shelfLife);
    const preservation = INGREDIENT_PRESERVATION_OPTIONS.find(option => option.value === ingredient.preservationCondition);
    const priceEstimate = ingredient.priceEstimate;

    const _onSuggest = (ingredientIds: string[]) => {
        setSuggestIds(ingredientIds);
        toggleSuggester.show();
    };

    return <React.Fragment>
        <Stack justify="space-between" align="center" style={{ marginBottom: 12 }}>
            <Button icon={<ArrowLeftOutlined />} onClick={_backToList}>Quay lại</Button>
            {isAdmin && <Button icon={<EditOutlined />} onClick={toggleEdit.show}>Sửa</Button>}
        </Stack>

        <Box style={{ background: "#fff", border: "1px solid #f0f0f0", borderRadius: 8, padding: 14, marginBottom: 12 }}>
            <Stack justify="space-between" align="flex-start" style={{ gap: 12 }}>
                <Box style={{ minWidth: 0 }}>
                    <Space>
                        <Image src={VegetablesIcon} preview={false} width={26} style={{ marginBottom: 3 }} />
                        <Typography.Title level={4} style={{ margin: 0 }}>{ingredient.name}</Typography.Title>
                    </Space>
                    <Stack wrap="wrap" gap={8} style={{ marginTop: 8 }}>
                        {ingredient.category && <Typography.Text type="secondary">Nhóm: {ingredient.category}</Typography.Text>}
                        {shelfLife && <Typography.Text style={{ color: shelfLife.color }}>{shelfLife.emoji} {shelfLife.label}</Typography.Text>}
                        {preservation && <Typography.Text type="secondary">Bảo quản: {preservation.label}</Typography.Text>}
                        {ingredient.alwaysAvailable && <Typography.Text style={{ color: "#52c41a", fontWeight: 600 }}>Luôn có sẵn</Typography.Text>}
                        {priceEstimate && <Typography.Text type="secondary">
                            Giá: {IngredientPriceHelper.formatRange(priceEstimate)} / {IngredientUnitHelper.formatAmount(priceEstimate.amount)} {priceEstimate.unit}
                        </Typography.Text>}
                    </Stack>
                </Box>
                <Typography.Text strong style={{ color: ingredient.alwaysAvailable || totalAmount > 0 ? "#52c41a" : "#8c8c8c", whiteSpace: "nowrap" }}>
                    {ingredient.alwaysAvailable ? "Luôn có sẵn" : `Tồn kho: ${IngredientUnitHelper.formatAmount(totalAmount)} ${baseUnit}`}
                </Typography.Text>
            </Stack>

            <Divider style={{ margin: "12px 0" }} />

            <Stack direction="column" align="flex-start" gap={6}>
                <Typography.Text><strong>Đơn vị gốc:</strong> {baseUnit}</Typography.Text>
                <Typography.Text><strong>Đơn vị nhập kho:</strong> {inventoryUnits.join(", ")}</Typography.Text>
                <Typography.Text><strong>Đơn vị trong công thức:</strong> {recipeUnits.join(", ")}</Typography.Text>
                <Box style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 2 }}>
                    {recipeUnits.map(unit => (
                        <span
                            key={unit}
                            style={{ padding: "2px 8px", borderRadius: 10, background: "#f5f5f5", color: "#595959", fontSize: 12 }}
                        >
                            1 {unit} = {IngredientUnitHelper.formatAmount(conversions[unit] ?? 1)} {baseUnit}
                        </span>
                    ))}
                </Box>
            </Stack>
        </Box>

        <Box style={{ background: "#fff", border: "1px solid #f0f0f0", borderRadius: 8, padding: 14 }}>
            <IngredientInventoryWidget item={ingredient} onSuggest={_onSuggest} />
        </Box>

        <Modal width={640} open={toggleEdit.value} title={
            <Space>
                <Image src={VegetablesIcon} preview={false} width={24} style={{ marginBottom: 3 }} />
                Chỉnh sửa nguyên liệu
            </Space>
        } destroyOnClose={true} onCancel={toggleEdit.hide} footer={null}>
            <IngredientEditWidget item={ingredient} onDone={toggleEdit.hide} />
        </Modal>

        <DishSuggesterScreen
            open={toggleSuggester.value}
            onClose={toggleSuggester.hide}
            initialIngredientIds={suggestIds}
        />
    </React.Fragment>;
}
