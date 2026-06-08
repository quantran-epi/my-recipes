import { ArrowLeftOutlined, EditOutlined, PieChartOutlined } from "@ant-design/icons";
import { Button } from "@components/Button";
import { Image } from "@components/Image";
import { Box } from "@components/Layout/Box";
import { Space } from "@components/Layout/Space";
import { Stack } from "@components/Layout/Stack";
import { DeferredModalContent, Modal } from "@components/Modal";
import { Result } from "@components/Result/Result";
import { Typography } from "@components/Typography";
import { useScreenTitle, useToggle } from "@hooks";
import { RootRoutes } from "@routing/RootRoutes";
import { selectShoppingListsById } from "@store/Selectors";
import moment from "moment";
import React from "react";
import { useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import ShoppingListIcon from "../../../../assets/icons/shoppingList.png";
import { ShoppingListDetailWidget } from "./ShoppingListDetail.widget";
import { ShoppingListEditWidget } from "./ShoppingListEdit.widget";

const topToolCardStyle: React.CSSProperties = {
    background: "#fff",
    border: "1px solid #f0f0f0",
    borderRadius: 0,
    padding: 10,
    marginBottom: 10,
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
};

export const ShoppingListDetailScreen = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const shoppingListId = searchParams.get("shoppingList") ?? "";
    const shoppingListsById = useSelector(selectShoppingListsById);
    const shoppingList = shoppingListsById.get(shoppingListId);
    const toggleEditModal = useToggle({ defaultValue: false });

    useScreenTitle({ value: shoppingList?.name ?? "Lịch mua sắm", deps: [shoppingList?.name] });

    const _backToList = () => navigate(RootRoutes.AuthorizedRoutes.ShoppingListRoutes.List());

    if (!shoppingList) {
        return <Result
            status="404"
            title="Không tìm thấy lịch mua sắm"
            subTitle="Lịch mua sắm này không còn tồn tại hoặc đường dẫn chưa có mã lịch mua sắm."
            extra={<Button icon={<ArrowLeftOutlined />} onClick={_backToList}>Quay lại danh sách</Button>}
        />;
    }

    const doneCount = shoppingList.ingredients.filter(item => item.isDone).length;
    const itemCount = shoppingList.ingredients.length;
    const isReadonly = Boolean(shoppingList.completedAt);
    const hasCalculatorSource = shoppingList.dishes.length > 0 || shoppingList.scheduledMeals.length > 0;
    const _openNutritionCalculator = () => navigate(RootRoutes.AuthorizedRoutes.NutritionGoals({
        calculator: true,
        source: "shoppingLists",
        shoppingLists: [shoppingList.id],
    }));

    return <React.Fragment>
        <Box style={topToolCardStyle}>
            <Stack justify="space-between" align="center" gap={8} wrap="wrap">
                <Button icon={<ArrowLeftOutlined />} onClick={_backToList}>Quay lại</Button>
            </Stack>
        </Box>

        <Box style={{ background: "#fff", border: "1px solid #f0f0f0", borderRadius: 0, padding: 14, marginBottom: 12 }}>
            <Stack justify="space-between" align="flex-start" style={{ gap: 12 }}>
                <Box style={{ minWidth: 0 }}>
                    <Space style={{ minWidth: 0, alignItems: "flex-start" }}>
                        <Image src={ShoppingListIcon} preview={false} width={26} style={{ marginBottom: 3 }} />
                        <Typography.Title level={4} style={{ margin: 0, minWidth: 0, lineHeight: "24px", overflowWrap: "anywhere" }}>{shoppingList.name}</Typography.Title>
                    </Space>
                    <Typography.Text type="secondary" style={{ display: "block", marginTop: 6 }}>
                        {shoppingList.plannedDate
                            ? `Kế hoạch: ${moment(shoppingList.plannedDate).format("DD/MM/YYYY")}`
                            : `Tạo lúc: ${moment(shoppingList.createdDate).format("DD/MM/YYYY HH:mm")}`}
                    </Typography.Text>
                </Box>
                <Stack direction="column" align="flex-end" gap={2}>
                    <Typography.Text strong>{doneCount}/{itemCount} đã mua</Typography.Text>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {shoppingList.dishes.length} món · {shoppingList.scheduledMeals.length} thực đơn
                    </Typography.Text>
                    <Stack gap={6} wrap="wrap" justify="flex-end" style={{ marginTop: 6 }}>
                        <Button
                            size="small"
                            icon={<PieChartOutlined />}
                            disabled={!hasCalculatorSource}
                            onClick={_openNutritionCalculator}
                            style={{ borderRadius: 999, color: "#7436dc", borderColor: "rgba(116,54,220,0.28)", fontWeight: 650 }}
                        >
                            Dinh dưỡng
                        </Button>
                        {!isReadonly && <Button
                            size="small"
                            type="primary"
                            icon={<EditOutlined />}
                            onClick={toggleEditModal.show}
                            style={{ borderRadius: 999 }}
                        >
                            Sửa
                        </Button>}
                    </Stack>
                </Stack>
            </Stack>
        </Box>

        <Box style={{ background: "#fff", border: "1px solid #f0f0f0", borderRadius: 0, padding: 14 }}>
            <ShoppingListDetailWidget shoppingList={shoppingList} />
        </Box>
        {toggleEditModal.value && <Modal open={toggleEditModal.value} title={
            <Space>
                <Image src={ShoppingListIcon} preview={false} width={24} style={{ marginBottom: 3 }} />
                Sửa lịch mua sắm
            </Space>
        } destroyOnClose={true} onCancel={toggleEditModal.hide} footer={null}>
            <DeferredModalContent active={toggleEditModal.value} minHeight={180}>
                <div data-testid="shopping-list-detail-edit-modal">
                    <ShoppingListEditWidget item={shoppingList} onDone={toggleEditModal.hide} />
                </div>
            </DeferredModalContent>
        </Modal>}
    </React.Fragment>;
}
