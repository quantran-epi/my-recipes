import { EditOutlined, QuestionCircleOutlined } from "@ant-design/icons";
import { IngredientUnitHelper } from "@common/Helpers/IngredientUnitHelper";
import { InventoryHelper } from "@common/Helpers/InventoryHelper";
import { Button } from "@components/Button";
import { Empty } from "@components/Empty";
import { Image } from "@components/Image";
import { Box } from "@components/Layout/Box";
import { Divider } from "@components/Layout/Divider";
import { Space } from "@components/Layout/Space";
import { Stack } from "@components/Layout/Stack";
import { List } from "@components/List";
import { Modal } from "@components/Modal";
import { Tag } from "@components/Tag";
import { Tooltip } from "@components/Tootip";
import { Typography } from "@components/Typography";
import { RootRoutes } from "@routing/RootRoutes";
import { Dishes, DishesIngredientAmount, DishesStep } from "@store/Models/Dishes";
import { selectDishes, selectIngredients, selectInventory } from "@store/Selectors";
import { orderBy } from "lodash";
import React, { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import AnalysisIcon from "../../../../../assets/icons/analysis.png";
import ClockIcon from "../../../../../assets/icons/clock (2).png";
import DietIcon from "../../../../../assets/icons/diet.png";
import NoodlesIcon from "../../../../../assets/icons/noodles.png";
import ProcessIcon from "../../../../../assets/icons/process.png";
import VegetableIcon from "../../../../../assets/icons/vegetable.png";

type DishesReadonlyDetailModalProps = {
    dish: Dishes;
    open: boolean;
    onClose: () => void;
    zIndex?: number;
}

export const DishesReadonlyDetailModal: React.FunctionComponent<DishesReadonlyDetailModalProps> = ({ dish, open, onClose, zIndex }) => {
    const navigate = useNavigate();

    const _onOpenDetail = () => {
        onClose();
        navigate(RootRoutes.AuthorizedRoutes.DishesRoutes.ManageIngredient(dish.id));
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
        <Box style={{ maxHeight: "70vh", overflowY: "auto", paddingRight: 4 }}>
            <DishesReadonlyDetailWidget dish={dish} />
        </Box>
    </Modal>
}

type DishesReadonlyDetailWidgetProps = {
    dish: Dishes;
}

export const DishesReadonlyDetailWidget: React.FunctionComponent<DishesReadonlyDetailWidgetProps> = ({ dish }) => {
    const dishes = useSelector(selectDishes);
    const [selectedIncludedDish, setSelectedIncludedDish] = useState<Dishes>();

    const includedDishes = useMemo(() => {
        return dish.includeDishes
            .map(id => dishes.find(item => item.id === id))
            .filter(Boolean) as Dishes[];
    }, [dish.includeDishes, dishes]);

    const durationItems = useMemo(() => {
        const labels: Record<keyof Dishes["duration"], string> = {
            unfreeze: "Rã đông",
            prepare: "Sơ chế",
            cooking: "Nấu",
            serve: "Trình bày",
            cooldown: "Để nguội",
        };

        return Object.entries(dish.duration ?? {})
            .filter(([, value]) => value !== null && value !== undefined && value > 0)
            .map(([key, value]) => ({ label: labels[key as keyof Dishes["duration"]], value }));
    }, [dish.duration]);

    return <React.Fragment>
        {dish.image && <Box style={{
            borderRadius: 8,
            width: "100%",
            height: 180,
            backgroundImage: `url(${dish.image})`,
            backgroundSize: "cover",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
            marginBottom: 12,
        }} />}

        {(dish.note || durationItems.length > 0) && <React.Fragment>
            <Divider orientation="left"><Space>
                <Image src={AnalysisIcon} preview={false} width={22} style={{ marginBottom: 3 }} />
                Thông tin chung
            </Space></Divider>
            {dish.note && <Typography.Paragraph style={{ marginBottom: durationItems.length > 0 ? 8 : 0 }}>
                <Typography.Text strong>Ghi chú: </Typography.Text>{dish.note}
            </Typography.Paragraph>}
            {durationItems.length > 0 && <Space wrap size={[6, 6]}>
                {durationItems.map(item => <Tag key={item.label} icon={<Image src={ClockIcon} preview={false} width={12} style={{ marginBottom: 2 }} />}>
                    {item.label}: {item.value} phút
                </Tag>)}
            </Space>}
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
        {dish.ingredients.length > 0
            ? <List
                dataSource={orderBy(dish.ingredients, [item => item.required], ["desc"])}
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
    const ingredients = useSelector(selectIngredients);
    const inventoryItems = useSelector(selectInventory);
    const ingredient = ingredients.find(entry => entry.id === item.ingredientId);
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

    return <List.Item style={{ padding: "8px 0" }}>
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
