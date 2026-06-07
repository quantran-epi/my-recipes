import { ArrowLeftOutlined, DeleteOutlined, EditOutlined } from "@ant-design/icons"
import { Button } from "@components/Button"
import { DeferredModalContent, Modal } from "@components/Modal"
import { Popconfirm } from "@components/Popconfirm"
import { Space } from "@components/Layout/Space"
import { Stack } from "@components/Layout/Stack"
import { Box } from "@components/Layout/Box"
import { useMessage } from "@components/Message"
import { useAdminMode, useScreenTitle, useToggle } from "@hooks"
import { removeDishes } from "@store/Reducers/DishesReducer"
import { selectDishes, selectDishesById } from "@store/Selectors"
import { Typography } from "antd"
import React, { useMemo } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate, useSearchParams } from "react-router-dom"
import { DishesDetailWidget } from "./DishDetail.widget"
import { DishesEditWidget } from "../DishesEdit.widget"
import { RootRoutes } from "@routing/RootRoutes"
import NoodlesIcon from "../../../../../assets/icons/noodles.png"
import { Image } from "@components/Image"

const topToolCardStyle: React.CSSProperties = {
    background: "#fff",
    border: "1px solid #f0f0f0",
    borderRadius: 0,
    padding: 10,
    marginBottom: 10,
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
};

export const DishesDetailScreen = () => {
    const [params] = useSearchParams();
    const dishes = useSelector(selectDishes);
    const dishesById = useSelector(selectDishesById);
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const message = useMessage();
    const { isAdmin } = useAdminMode();
    const toggleEdit = useToggle();

    const currentDish = useMemo(() => {
        return dishesById.get(params.get("dishes"));
    }, [params, dishesById]);

    useScreenTitle({ value: currentDish ? currentDish.name : "Chi tiết món ăn", deps: [currentDish] });

    const _referencingDishes = () => {
        if (!currentDish) return [];
        return dishes.filter(d => d.id !== currentDish.id && d.includeDishes?.includes(currentDish.id));
    };

    const _onDelete = () => {
        const refs = _referencingDishes();
        if (refs.length > 0) {
            message.error(`Không thể xóa! Món ăn này đang được dùng trong: ${refs.map(d => d.name).join(", ")}.`);
            return;
        }
        dispatch(removeDishes([currentDish.id]));
        navigate(RootRoutes.AuthorizedRoutes.DishesRoutes.List());
        message.success("Đã xóa món ăn");
    };

    if (!currentDish) {
        return (
            <div style={{ padding: 24, textAlign: "center" }}>
                <Typography.Text type="secondary">Không tìm thấy món ăn.</Typography.Text>
                <br />
                <Button style={{ marginTop: 12 }} onClick={() => navigate(RootRoutes.AuthorizedRoutes.DishesRoutes.List())}>
                    Quay lại danh sách
                </Button>
            </div>
        );
    }

    return (
        <React.Fragment>
            {/* ── Top bar ── */}
            <Box style={topToolCardStyle}>
                <div style={{ display: "grid", gridTemplateColumns: isAdmin ? "auto minmax(0, 1fr) auto" : "auto minmax(0, 1fr)", alignItems: "center", gap: 8 }}>
                    <Button
                        icon={<ArrowLeftOutlined />}
                        onClick={() => navigate(-1)}
                    >
                        Quay lại
                    </Button>
                    <Stack align="center" justify="center" gap={6} style={{ minWidth: 0, width: "100%" }}>
                        <Image src={NoodlesIcon} preview={false} width={22} style={{ marginBottom: 3, flexShrink: 0 }} />
                        <Typography.Text strong style={{ minWidth: 0, fontSize: 15, lineHeight: "19px", whiteSpace: "normal", overflowWrap: "anywhere", textAlign: "center" }}>
                            {currentDish.name}
                        </Typography.Text>
                    </Stack>
                    {isAdmin && (
                        <Space size={4}>
                            <Button icon={<EditOutlined />} onClick={toggleEdit.show} />
                            <Popconfirm
                                title="Xóa món ăn"
                                description="Bạn chắc chắn muốn xóa món ăn này?"
                                onConfirm={_onDelete}
                                okText="Xóa"
                                cancelText="Huỷ"
                                okButtonProps={{ danger: true }}
                            >
                                <Button danger icon={<DeleteOutlined />} />
                            </Popconfirm>
                        </Space>
                    )}
                </div>
            </Box>

            {/* ── Detail content ── */}
            <div style={{ paddingBottom: 100 }}>
                <DishesDetailWidget dish={currentDish} />
            </div>

            {/* ── Edit modal ── */}
            <Modal
                open={toggleEdit.value}
                title={<Space><EditOutlined />Chỉnh sửa — {currentDish.name}</Space>}
                destroyOnClose
                onCancel={toggleEdit.hide}
                footer={null}
            >
                <DeferredModalContent active={toggleEdit.value}>
                    <DishesEditWidget item={currentDish} onDone={toggleEdit.hide} />
                </DeferredModalContent>
            </Modal>
        </React.Fragment>
    );
};
