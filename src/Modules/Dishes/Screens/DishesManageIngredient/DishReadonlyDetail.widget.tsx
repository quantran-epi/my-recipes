import { EditOutlined, QuestionCircleOutlined } from "@ant-design/icons";
import { DishDurationBreakdownItem, DishDurationHelper } from "@common/Helpers/DishDurationHelper";
import { IngredientUnitHelper } from "@common/Helpers/IngredientUnitHelper";
import { InventoryHelper } from "@common/Helpers/InventoryHelper";
import { ServingSizeInput } from "@components/Form/ServingSizeInput";
import { Button } from "@components/Button";
import { Empty } from "@components/Empty";
import { Image } from "@components/Image";
import { Box } from "@components/Layout/Box";
import { Divider } from "@components/Layout/Divider";
import { Space } from "@components/Layout/Space";
import { Stack } from "@components/Layout/Stack";
import { List } from "@components/List";
import { DeferredModalContent, Modal } from "@components/Modal";
import { Tag } from "@components/Tag";
import { Tooltip } from "@components/Tootip";
import { Typography } from "@components/Typography";
import { RootRoutes } from "@routing/RootRoutes";
import { Dishes, DishesIngredientAmount, DishesStep } from "@store/Models/Dishes";
import { selectDishesById, selectIngredientsById, selectInventory } from "@store/Selectors";
import { orderBy } from "lodash";
import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import AnalysisIcon from "../../../../../assets/icons/analysis.png";
import ClockIcon from "../../../../../assets/icons/clock (2).png";
import DietIcon from "../../../../../assets/icons/diet.png";
import NoodlesIcon from "../../../../../assets/icons/noodles.png";
import ProcessIcon from "../../../../../assets/icons/process.png";
import VegetableIcon from "../../../../../assets/icons/vegetable.png";
import { DishCostEstimateWidget } from "./DishCostEstimate.widget";
import { DishImageWidget } from "./DishImage.widget";

import { DishServingHelper } from '@common/Helpers/DishServingHelper';

type DishesReadonlyDetailModalProps = {
    dish: Dishes;
    open: boolean;
    onClose: () => void;
    zIndex?: number;
    targetServings?: number;
}

export const DishesReadonlyDetailModal: React.FunctionComponent<DishesReadonlyDetailModalProps> = ({ dish, open, onClose, zIndex, targetServings }) => {
    const navigate = useNavigate();

    const _onOpenDetail = () => {
        onClose();
        React.startTransition(() => navigate(RootRoutes.AuthorizedRoutes.DishesRoutes.ManageIngredient(dish.id)));
    }

    return <Modal
        style={{ top: 40 }}
        width={720}
        open={open}
        title={<Space>
            <Image src={NoodlesIcon} preview={false} width={24} style={{ marginBottom: 3 }} />
            {dish.name}
        </Space>}
        destroyOnClose
        onCancel={onClose}
        zIndex={zIndex}
        footer={<Space>
            <Button onClick={onClose}>Đóng</Button>
            <Button type="primary" icon={<EditOutlined />} onClick={_onOpenDetail}>Mở trang chi tiết</Button>
        </Space>}
    >
        <Box data-testid="dish-readonly-detail-modal">
            <DeferredModalContent active={open} minHeight={220}>
                <DishesReadonlyDetailWidget dish={dish} targetServings={targetServings} />
            </DeferredModalContent>
        </Box>
    </Modal>
}

type DishesReadonlyDetailWidgetProps = {
    dish: Dishes;
    targetServings?: number;
}

export const DishesReadonlyDetailWidget: React.FunctionComponent<DishesReadonlyDetailWidgetProps> = ({ dish, targetServings: initialTargetServings }) => {
    const dishesById = useSelector(selectDishesById);
    const [selectedIncludedDish, setSelectedIncludedDish] = useState<Dishes>();
    const [showServingPicker, setShowServingPicker] = useState(false);
    const baseServings = DishServingHelper.getBaseServings(dish);
    const [targetServings, setTargetServings] = useState<number>(() => DishServingHelper.getTargetServings(dish, initialTargetServings));
    const scaledIngredients = useMemo(() => DishServingHelper.scaleIngredientAmounts(dish, targetServings), [dish, targetServings]);

    useEffect(() => {
        setTargetServings(DishServingHelper.getTargetServings(dish, initialTargetServings));
        setShowServingPicker(false);
    }, [dish.id, baseServings, initialTargetServings]);

    const includedDishes = useMemo(() => {
        return dish.includeDishes
            .map(id => dishesById.get(id))
            .filter(Boolean) as Dishes[];
    }, [dish.includeDishes, dishesById]);

    const durationSummary = useMemo(() => {
        const breakdown = DishDurationHelper.getBreakdown(dish, dishesById);
        const ownItem = breakdown.items.find(item => item.dishId === dish.id);
        const includedItems = breakdown.items.filter(item => item.dishId !== dish.id);
        return {
            ...breakdown,
            ownItem,
            includedItems,
            tempo: DishDurationHelper.getTempo(breakdown.totalMinutes),
        };
    }, [dish, dishesById]);

    const renderDurationPhases = (item: DishDurationBreakdownItem) => <Space wrap size={[6, 6]}>
        {item.activeItems.map(active => <Tag key={`${item.dishId}-${active.phase.key}`} style={{ borderColor: active.phase.border, background: "#fff", color: active.phase.color, marginInlineEnd: 0 }}>
            {active.phase.shortLabel}: {DishDurationHelper.formatMinutes(active.minutes)}
        </Tag>)}
    </Space>;

    return <React.Fragment>
        <DishImageWidget src={dish.image} height={180} borderRadius={8} surface="detail" style={{ marginBottom: 12 }} />

        <Box style={{
            padding: '8px 10px',
            border: '1px solid #f0f0f0',
            borderRadius: 8,
            background: '#fafafa',
            marginBottom: 12,
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, width: '100%' }}>
                <div style={{ minWidth: 0 }}>
                    <Typography.Text strong style={{ display: 'block' }}>Khẩu phần</Typography.Text>
                    <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12 }}>
                        Đang tính {targetServings} phần · gốc {baseServings} phần
                    </Typography.Text>
                </div>
                <Button type='link' onClick={() => setShowServingPicker(value => !value)} style={{ paddingInline: 0, whiteSpace: 'nowrap' }}>
                    {showServingPicker ? 'Ẩn' : 'Đổi' }
                </Button>
            </div>
            {showServingPicker && <ServingSizeInput
                    value={targetServings}
                    onChange={(value) => setTargetServings(DishServingHelper.normalizeTargetServings(value, baseServings))}
                    style={{ width: 178, marginTop: 8 }}
                />}
        </Box>

        <DishCostEstimateWidget dish={dish} targetServings={targetServings} />

        {(dish.note || durationSummary.items.length > 0) && <React.Fragment>
            <Divider orientation="left"><Space>
                <Image src={AnalysisIcon} preview={false} width={22} style={{ marginBottom: 3 }} />
                Thông tin chung
            </Space></Divider>
            {dish.note && <Typography.Paragraph style={{ marginBottom: durationSummary.items.length > 0 ? 8 : 0 }}>
                <Typography.Text strong>Ghi chú: </Typography.Text>{dish.note}
            </Typography.Paragraph>}
            {durationSummary.items.length > 0 && <Box style={{ border: `1px solid ${durationSummary.tempo.border}`, borderRadius: 8, padding: 10, background: durationSummary.tempo.background }}>
                <Stack justify="space-between" align="center" gap={8} style={{ marginBottom: 8 }}>
                    <Space size={6}>
                        <Image src={ClockIcon} preview={false} width={16} style={{ marginBottom: 2 }} />
                        <Typography.Text strong style={{ color: durationSummary.tempo.color }}>Thời lượng</Typography.Text>
                    </Space>
                    <Typography.Text strong style={{ color: durationSummary.tempo.color }}>{DishDurationHelper.formatMinutes(durationSummary.totalMinutes)}</Typography.Text>
                </Stack>
                {durationSummary.ownItem && <Box style={{ border: "1px solid #f0f0f0", borderRadius: 8, background: "#fff", padding: 8, marginBottom: durationSummary.includedItems.length > 0 ? 8 : 0 }}>
                    <Stack fullwidth justify="space-between" gap={8} style={{ marginBottom: 6 }}>
                        <Typography.Text strong style={{ fontSize: 13 }}>Món chính</Typography.Text>
                        <Tag style={{ marginRight: 0 }}>{DishDurationHelper.formatMinutes(durationSummary.ownItem.ownMinutes)}</Tag>
                    </Stack>
                    {renderDurationPhases(durationSummary.ownItem)}
                </Box>}
                {durationSummary.includedItems.length > 0 && <Stack direction="column" gap={8} fullwidth align="stretch">
                    <Typography.Text strong style={{ display: "block", fontSize: 12, lineHeight: "16px" }}>Món bao gồm</Typography.Text>
                    {durationSummary.includedItems.map(item => <Box key={item.dishId} style={{ border: "1px solid #f0f0f0", borderRadius: 8, background: "#fff", padding: 8, marginLeft: Math.min(item.depth, 3) * 8 }}>
                        <Stack fullwidth justify="space-between" gap={8} style={{ marginBottom: 6 }}>
                            <Typography.Text strong style={{ fontSize: 13, overflowWrap: "anywhere" }}>{item.dishName}</Typography.Text>
                            <Tag style={{ marginRight: 0 }}>{DishDurationHelper.formatMinutes(item.ownMinutes)}</Tag>
                        </Stack>
                        {renderDurationPhases(item)}
                    </Box>)}
                </Stack>}
            </Box>}
        </React.Fragment>}

        {includedDishes.length > 0 && <React.Fragment>
            <Divider orientation="left"><Space>
                <Image src={DietIcon} preview={false} width={22} style={{ marginBottom: 3 }} />
                Bao gồm món
            </Space></Divider>
            <Stack wrap="wrap" gap={6}>
                {includedDishes.map(item => <Button key={item.id} onClick={() => setSelectedIncludedDish(item)}>
                    {item.name}
                </Button>)}
            </Stack>
        </React.Fragment>}

        <Divider orientation="left"><Space>
            <Image src={VegetableIcon} preview={false} width={22} style={{ marginBottom: 3 }} />
            Danh sách nguyên liệu
        </Space></Divider>
        {scaledIngredients.length > 0
            ? <List
                dataSource={orderBy(scaledIngredients, [item => item.required], ["desc"])}
                renderItem={(item) => <ReadonlyIngredientItem item={item} />}
            />
            : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />}

        <Divider orientation="left"><Space>
            <Image src={ProcessIcon} preview={false} width={22} style={{ marginBottom: 3 }} />
            Các bước thực hiện
        </Space></Divider>
        {dish.steps.length > 0
            ? <List
                dataSource={orderBy(dish.steps, [item => item.order], ["asc"])}
                renderItem={(item) => <ReadonlyStepItem item={item} />}
            />
            : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />}

        {selectedIncludedDish && <DishesReadonlyDetailModal
            dish={selectedIncludedDish}
            open={Boolean(selectedIncludedDish)}
            onClose={() => setSelectedIncludedDish(undefined)}
            zIndex={2400}
        />}
    </React.Fragment>
}

type ReadonlyIngredientItemProps = {
    item: DishesIngredientAmount;
}

const ReadonlyIngredientItem: React.FunctionComponent<ReadonlyIngredientItemProps> = ({ item }) => {
    const ingredientsById = useSelector(selectIngredientsById);
    const inventoryItems = useSelector(selectInventory);
    const ingredient = ingredientsById.get(item.ingredientId);
    const inventory = inventoryItems[item.ingredientId];
    const baseUnit = IngredientUnitHelper.getBaseUnit(ingredient, [item.unit]);
    const requiredAmount = IngredientUnitHelper.toBaseAmount(ingredient, item.amount, item.unit, baseUnit)
        ?? IngredientUnitHelper.parseAmount(item.amount);
    const isAlwaysAvailable = InventoryHelper.isAlwaysAvailable(ingredient);
    const stockAmount = InventoryHelper.availableAmount(inventory, ingredient, requiredAmount);
    const hasStock = isAlwaysAvailable || stockAmount > 0;
    const enoughStock = isAlwaysAvailable || (requiredAmount > 0 ? stockAmount >= requiredAmount : hasStock);
    const inventoryStatus = isAlwaysAvailable
        ? { color: "#52c41a", label: "✓ Luôn có" }
        : enoughStock
            ? { color: "#52c41a", label: `✓ Đủ ${IngredientUnitHelper.formatAmount(stockAmount)}${baseUnit}` }
            : hasStock
                ? { color: "#d46b08", label: `◐ Còn ${IngredientUnitHelper.formatAmount(stockAmount)}/${IngredientUnitHelper.formatAmount(requiredAmount)}${baseUnit}` }
                : { color: "#ff4d4f", label: "✗ Chưa có" };

    return <List.Item data-testid={`dish-readonly-ingredient-${item.ingredientId}`} style={{ padding: "8px 0" }}>
        <List.Item.Meta
            title={<Stack justify="space-between" fullwidth align="flex-start" gap={8}>
                <Typography.Text strong style={{ overflowWrap: "anywhere" }}>{ingredient?.name ?? item.ingredientId}</Typography.Text>
                <Typography.Text type="secondary" style={{ whiteSpace: "nowrap" }}>{item.amount} {item.unit}</Typography.Text>
            </Stack>}
            description={<Stack direction="column" align="flex-start" gap={2}>
                <Space wrap size={[6, 2]}>
                    <Typography.Text style={{ fontSize: 12, color: inventoryStatus.color }}>{inventoryStatus.label}</Typography.Text>
                    {!enoughStock && hasStock && <Typography.Text style={{ fontSize: 12, color: "#d46b08" }}>
                        Thiếu {IngredientUnitHelper.formatAmount(Math.max(0, requiredAmount - stockAmount))}{baseUnit}
                    </Typography.Text>}
                    {!item.required && <Tooltip title="Tùy chọn">
                        <Tag color="gold" icon={<QuestionCircleOutlined />} style={{ marginInlineEnd: 0 }} />
                    </Tooltip>}
                </Space>
                {item.prepare?.length > 0 && <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    Sơ chế: {item.prepare.join(", ")}
                </Typography.Text>}
            </Stack>}
        />
    </List.Item>
}

type ReadonlyStepItemProps = {
    item: DishesStep;
}

const ReadonlyStepItem: React.FunctionComponent<ReadonlyStepItemProps> = ({ item }) => {
    return <List.Item style={{ padding: "8px 0" }}>
        <List.Item.Meta
            avatar={<Typography.Text strong>{item.order}</Typography.Text>}
            title={<Typography.Paragraph style={{ marginBottom: 0 }}>
                {item.content}
            </Typography.Paragraph>}
            description={!item.required && <Typography.Text type="secondary" style={{ fontSize: 12 }}>Tùy chọn</Typography.Text>}
        />
    </List.Item>
}
