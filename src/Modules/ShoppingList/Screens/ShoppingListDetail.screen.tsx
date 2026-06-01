import { ArrowLeftOutlined } from "@ant-design/icons";
import { Button } from "@components/Button";
import { Image } from "@components/Image";
import { Box } from "@components/Layout/Box";
import { Space } from "@components/Layout/Space";
import { Stack } from "@components/Layout/Stack";
import { Result } from "@components/Result/Result";
import { Typography } from "@components/Typography";
import { useScreenTitle } from "@hooks";
import { RootRoutes } from "@routing/RootRoutes";
import { selectShoppingLists } from "@store/Selectors";
import moment from "moment";
import React, { useMemo } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import ShoppingListIcon from "../../../../assets/icons/shoppingList.png";
import { ShoppingListDetailWidget } from "./ShoppingListDetail.widget";

export const ShoppingListDetailScreen = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const shoppingListId = searchParams.get("shoppingList") ?? "";
    const shoppingLists = useSelector(selectShoppingLists);
    const shoppingList = useMemo(() => shoppingLists.find(item => item.id === shoppingListId), [shoppingLists, shoppingListId]);

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

    return <React.Fragment>
        <Stack justify="space-between" align="center" style={{ marginBottom: 12 }}>
            <Button icon={<ArrowLeftOutlined />} onClick={_backToList}>Quay lại</Button>
        </Stack>

        <Box style={{ background: "#fff", border: "1px solid #f0f0f0", borderRadius: 8, padding: 14, marginBottom: 12 }}>
            <Stack justify="space-between" align="flex-start" style={{ gap: 12 }}>
                <Box style={{ minWidth: 0 }}>
                    <Space>
                        <Image src={ShoppingListIcon} preview={false} width={26} style={{ marginBottom: 3 }} />
                        <Typography.Title level={4} style={{ margin: 0 }}>{shoppingList.name}</Typography.Title>
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
                </Stack>
            </Stack>
        </Box>

        <Box style={{ background: "#fff", border: "1px solid #f0f0f0", borderRadius: 8, padding: 14 }}>
            <ShoppingListDetailWidget shoppingList={shoppingList} />
        </Box>
    </React.Fragment>;
}
