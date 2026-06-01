import { ArrowLeftOutlined, DeleteOutlined, EditOutlined } from "@ant-design/icons"
import { Button } from "@components/Button"
import { Modal } from "@components/Modal"
import { Popconfirm } from "@components/Popconfirm"
import { Space } from "@components/Layout/Space"
import { Stack } from "@components/Layout/Stack"
import { useMessage } from "@components/Message"
import { useAdminMode, useScreenTitle, useToggle } from "@hooks"
import { removeDishes } from "@store/Reducers/DishesReducer"
import { RootState } from "@store/Store"
import { Typography } from "antd"
import React, { useMemo } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate, useSearchParams } from "react-router-dom"
import { DishesDetailWidget } from "./DishDetail.widget"
import { DishesEditWidget } from "../DishesEdit.widget"
import { RootRoutes } from "@routing/RootRoutes"
import NoodlesIcon from "../../../../../assets/icons/noodles.png"
import { Image } from "@components/Image"

export const DishesDetailScreen = () => {
    const [params] = useSearchParams();
    const dishes = useSelector((state: RootState) => state.shared.dishes.dishes);
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const message = useMessage();
    const { isAdmin } = useAdminMode();
    const toggleEdit = useToggle();

    const currentDish = useMemo(() => {
        return dishes.find(e => e.id === params.get("dishes"));
    }, [params, dishes]);

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
            <Stack align="center" justify="space-between" style={{ padding: "10px 16px", borderBottom: "1px solid #f0f0f0", background: "#fff" }}>
                <Button
                    type="text"
                    icon={<ArrowLeftOutlined />}
                    onClick={() => navigate(-1)}
                    style={{ paddingInline: 0 }}
                >
                    Quay lại
                </Button>
                <Stack align="center" gap={6}>
                    <Image src={NoodlesIcon} preview={false} width={22} style={{ marginBottom: 3 }} />
                    <Typography.Text strong style={{ fontSize: 15 }}>
                        {currentDish.name}
                    </Typography.Text>
                </Stack>
                {isAdmin && (
                    <Space size={4}>
                        <Button type="text" icon={<EditOutlined />} onClick={toggleEdit.show} />
                        <Popconfirm
                            title="Xóa món ăn"
                            description="Bạn chắc chắn muốn xóa món ăn này?"
                            onConfirm={_onDelete}
                            okText="Xóa"
                            cancelText="Huỷ"
                            okButtonProps={{ danger: true }}
                        >
                            <Button type="text" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                    </Space>
                )}
            </Stack>

            {/* ── Detail content ── */}
            <div style={{ padding: "16px 16px 100px" }}>
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
                <DishesEditWidget item={currentDish} onDone={toggleEdit.hide} />
            </Modal>
        </React.Fragment>
    );
};
