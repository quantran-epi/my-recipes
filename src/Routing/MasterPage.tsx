import { CloudDownloadOutlined, CloudSyncOutlined, CloudUploadOutlined, ExportOutlined, ImportOutlined, LockOutlined, MenuOutlined, UnlockOutlined, FireOutlined, SettingOutlined } from "@ant-design/icons";
import { ObjectPropertyHelper } from "@common/Helpers/ObjectProperty";
import { Button } from "@components/Button";
import { TextArea, Input } from "@components/Form/Input";
import { Image } from "@components/Image";
import { Box } from "@components/Layout/Box";
import { Content } from "@components/Layout/Content";
import { Header } from "@components/Layout/Header";
import { Space } from "@components/Layout/Space";
import { Stack } from "@components/Layout/Stack";
import { Menu } from "@components/Menu";
import { useMessage } from "@components/Message";
import { Modal } from "@components/Modal";
import { SmartForm, useSmartForm } from "@components/SmartForm";
import { Tooltip } from "@components/Tootip";
import { Typography } from "@components/Typography";
import { useAutoBackup, useAdminMode, useTheme, useToggle, useOnlineStatus, useSharedPublish } from "@hooks";
import { ScheduledMealToolkitWidget } from "@modules/ScheduledMeal/Screens/ScheduledMealToolkit.widget";
import { DishSuggesterScreen } from "@modules/DishSuggester/Screens/DishSuggester.screen";
import { FinishCookingWidget } from "@modules/Dishes/Screens/FinishCooking.widget";
import { GistBackupWidget } from "@components/GistBackupWidget";
import { addDishes, resetDishes } from "@store/Reducers/DishesReducer";
import { addIngredient, resetIngredient } from "@store/Reducers/IngredientReducer";
import { addScheduledMeal, resetScheduleMeals } from "@store/Reducers/ScheduledMealReducer";
import { addShoppingList, resetShoppingList } from "@store/Reducers/ShoppingListReducer";
import { RootState } from "@store/Store";
import { Drawer, Flex, Input as AntInput, Layout, Divider } from "antd";
import React, { useState } from "react";
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { useDispatch, useSelector } from "react-redux";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import LogoIcon from "../../assets/icons/logo.png";
import MealsIcon from "../../assets/icons/meals.png";
import DishesIcon from "../../assets/icons/noodles.png";
import ShoppingListIcon from "../../assets/icons/shoppingList.png";
import IngredientIcon from "../../assets/icons/vegetable.png";
import SuggesterIcon from "../../assets/icons/cooking.png";
import { RootRoutes } from "./RootRoutes";

const layoutStyles: React.CSSProperties = {
    height: "100%"
}

export const MasterPage = () => {
    const { triggerBackup, isBackingUp, lastBackupTime } = useAutoBackup();
    const theme = useTheme();
    const currentFeatureName = useSelector((state: RootState) => state.personal.appContext.currentFeatureName);    const { isOnline } = useOnlineStatus();

    const _featureIcon = () => {
        switch (currentFeatureName) {
            case "Món ăn": return DishesIcon;
            case "Thực đơn": return MealsIcon;
            case "Lịch mua sắm": return ShoppingListIcon;
            case "Nguyên liệu": return IngredientIcon;
            default: return null;
        }
    }

    return <Layout style={layoutStyles}>
        <Header style={{
            height: 60,
            lineHeight: "60px",
            paddingInline: 10,
            backgroundColor: "#fff",
            borderBottom: "0.5px solid " + theme.token.colorBorder
        }}>
            <Stack justify="space-between" align="center">
                <Stack>
                    <SidebarDrawer triggerBackup={triggerBackup} isBackingUp={isBackingUp} lastBackupTime={lastBackupTime} />
                    <Tooltip title={currentFeatureName}>
                        <Typography.Paragraph style={{ fontFamily: "kanit", fontSize: 24, fontWeight: "500", marginBottom: 0, width: 230 }} ellipsis>{currentFeatureName}</Typography.Paragraph>
                    </Tooltip>
                </Stack>
                {_featureIcon() && <Image preview={false} src={_featureIcon()} width={36} style={{ marginBottom: 5 }} />}
            </Stack>
        </Header>
        <Content>
            {!isOnline && (
                <div style={{
                    background: '#fffbe6',
                    borderBottom: '1px solid #ffe58f',
                    padding: '6px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 13,
                    color: '#7c6000',
                }}>
                    <span>📴</span>
                    <span>Không có mạng — Dữ liệu vẫn được lưu cục bộ</span>
                </div>
            )}
            <Outlet />
        </Content>
        <BottomTabNavigator />
        <CookingPill />
    </Layout>
}

const SidebarDrawer = ({ triggerBackup, isBackingUp, lastBackupTime }: {
    triggerBackup: () => Promise<void>;
    isBackingUp: boolean;
    lastBackupTime: Date | null;
}) => {
    const [open, setOpen] = useState(false);
    const [pinModalOpen, setPinModalOpen] = useState(false);
    const [pin, setPin] = useState("");
    const [pinError, setPinError] = useState("");
    const [isImporting, setIsImporting] = useState(false);
    const { isAdmin, tryUnlock, lock } = useAdminMode();
    const { publishSharedData, isPublishing } = useSharedPublish();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const message = useMessage();

    const showDrawer = () => {
        setOpen(true);
    };

    const onClose = () => {
        setOpen(false);
    };

    const onNavigate = (href) => {
        navigate(href);
        setOpen(false);
    }

    const onUnlock = () => {
        if (tryUnlock(pin)) {
            setPinModalOpen(false);
            setPin("");
            setPinError("");
        } else {
            setPinError("Sai mã PIN");
        }
    };

    const onImportCloud = async () => {
        setIsImporting(true);
        try {
            const res = await fetch("https://raw.githubusercontent.com/quantran-epi/my-recipes/refs/heads/main/docs/data.txt?t=" + Date.now());
            const text = await res.text();
            const parseValues = JSON.parse(text);
            dispatch(resetIngredient());
            dispatch(resetDishes());
            dispatch(resetScheduleMeals());
            dispatch(resetShoppingList());
            JSON.parse(parseValues.dishes).dishes.forEach(dish => dispatch(addDishes(dish)));
            JSON.parse(parseValues.ingredient).ingredients.forEach(ingre => dispatch(addIngredient(ingre)));
            JSON.parse(parseValues.scheduledMeal).scheduledMeals.forEach(meal => dispatch(addScheduledMeal(meal)));
            JSON.parse(parseValues.shoppingList).shoppingLists.forEach(shplist => dispatch(addShoppingList(shplist)));
            message.success("Import backup thành công");
        } catch (ex: any) {
            message.error("Import thất bại: " + ex?.message);
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <React.Fragment>
            <Button type="primary" onClick={showDrawer} icon={<MenuOutlined />} />
            <Drawer
                placement="left"
                title={
                    <Flex align="center" gap={10}>
                        <Image src={LogoIcon} preview={false} width={32} />
                        <Typography.Text style={{ fontFamily: "kanit", fontSize: 22, fontWeight: 600 }}>My Recipes</Typography.Text>
                    </Flex>
                }
                onClose={onClose}
                open={open}
                styles={{ body: { padding: 0, display: "flex", flexDirection: "column", height: "100%", overflowY: "auto" } }}
            >
                {/* ── Navigation ── */}
                <Menu
                    style={{ borderInlineEnd: "none" }}
                    items={[
                        {
                            key: "ingredients", label: <Flex align="center" gap={10}>
                                <img src={IngredientIcon} width={24} />
                                <span>Nguyên liệu</span>
                            </Flex>, onClick: () => onNavigate(RootRoutes.AuthorizedRoutes.IngredientRoutes.List())
                        },
                        {
                            key: "dishes", label: <Flex align="center" gap={10}>
                                <img src={DishesIcon} width={24} />
                                <span>Món ăn</span>
                            </Flex>, onClick: () => onNavigate(RootRoutes.AuthorizedRoutes.DishesRoutes.List())
                        },
                        {
                            key: "shoppingList", label: <Flex align="center" gap={10}>
                                <img src={ShoppingListIcon} width={24} />
                                <span>Lịch mua sắm</span>
                            </Flex>, onClick: () => onNavigate(RootRoutes.AuthorizedRoutes.ShoppingListRoutes.List())
                        },
                        {
                            key: "meals", label: <Flex align="center" gap={10}>
                                <img src={MealsIcon} width={24} />
                                <span>Thực đơn</span>
                            </Flex>, onClick: () => onNavigate(RootRoutes.AuthorizedRoutes.ScheduledMealRoutes.List())
                        }
                    ]}
                />

                <Box style={{ padding: "0 16px 24px" }}>

                    {/* ── Sync shared data ── */}
                    <Divider orientation="left" style={{ fontSize: 12, color: "#888", marginTop: 16, marginBottom: 12 }}>Dữ liệu dùng chung</Divider>
                    <Flex vertical gap={8}>
                        <Button
                            icon={<CloudDownloadOutlined />}
                            loading={isImporting}
                            block
                            onClick={onImportCloud}
                        >
                            Đồng bộ dữ liệu mới
                        </Button>
                    </Flex>

                    {/* ── Personal backup (non-admin) ── */}
                    {!isAdmin && (
                        <>
                            <Divider orientation="left" style={{ fontSize: 12, color: "#888", marginTop: 16, marginBottom: 12 }}>Sao lưu cá nhân</Divider>
                            <GistBackupWidget />
                        </>
                    )}

                    {/* ── Admin tools ── */}
                    {isAdmin && (
                        <>
                            <Divider orientation="left" style={{ fontSize: 12, color: "#888", marginTop: 16, marginBottom: 12 }}>Quản trị</Divider>
                            <Flex vertical gap={8}>
                                <Button
                                    icon={<CloudUploadOutlined />}
                                    loading={isPublishing}
                                    onClick={publishSharedData}
                                    block
                                    style={{ color: "#52c41a", borderColor: "#52c41a" }}
                                >
                                    Xuất bản dữ liệu dùng chung
                                </Button>
                                <Button
                                    icon={<CloudSyncOutlined />}
                                    loading={isBackingUp}
                                    onClick={triggerBackup}
                                    block
                                >
                                    Sao lưu lên GitHub
                                </Button>
                                {lastBackupTime && (
                                    <Typography.Text type="secondary" style={{ fontSize: 11, textAlign: "center" }}>
                                        Sao lưu lần cuối: {lastBackupTime.toLocaleString("vi-VN")}
                                    </Typography.Text>
                                )}
                            </Flex>
                        </>
                    )}

                    {/* ── Settings / account ── */}
                    <Divider orientation="left" style={{ fontSize: 12, color: "#888", marginTop: 16, marginBottom: 12 }}>Tài khoản</Divider>
                    <Flex vertical gap={6}>
                        {isAdmin ? (
                            <Flex align="center" justify="space-between" style={{ padding: "4px 0" }}>
                                <Flex align="center" gap={6}>
                                    <LockOutlined style={{ color: "#52c41a" }} />
                                    <Typography.Text style={{ fontSize: 13, color: "#52c41a" }}>Đang ở chế độ Admin</Typography.Text>
                                </Flex>
                                <Button size="small" type="text" danger onClick={lock}>Khoá</Button>
                            </Flex>
                        ) : (
                            <Button type="text" icon={<UnlockOutlined />} block onClick={() => setPinModalOpen(true)} style={{ textAlign: "left", justifyContent: "flex-start" }}>
                                Đăng nhập Admin
                            </Button>
                        )}
                    </Flex>

                    {/* ── Troubleshooting ── */}
                    <Divider orientation="left" style={{ fontSize: 12, color: "#888", marginTop: 16, marginBottom: 12 }}>Khắc phục sự cố</Divider>
                    <DataBackup onImportCloud={onImportCloud} />

                </Box>
            </Drawer>
            <Modal
                title="Nhập mã PIN"
                open={pinModalOpen}
                onOk={onUnlock}
                onCancel={() => { setPinModalOpen(false); setPin(""); setPinError(""); }}
                okText="Xác nhận"
                cancelText="Huỷ"
                destroyOnClose
            >
                <Flex vertical gap={8}>
                    <AntInput.Password
                        placeholder="Nhập PIN"
                        value={pin}
                        onChange={e => { setPin(e.target.value); setPinError(""); }}
                        onPressEnter={onUnlock}
                    />
                    {pinError && <Typography.Text type="danger">{pinError}</Typography.Text>}
                </Flex>
            </Modal>
            <ScheduledMealToolkitWidget />
        </React.Fragment>
    );
};

const CookingPill = () => {
    const sessions = useSelector((state: RootState) => state.personal.cookingSession?.sessions ?? []);
    const activeSessions = sessions.filter(s => s.status === "cooking");
    const toggleFinish = useToggle();
    const [selectedSession, setSelectedSession] = React.useState<string | null>(null);

    if (activeSessions.length === 0) return null;

    const session = activeSessions[0]; // show first active

    const _onPillClick = () => {
        setSelectedSession(session.id);
        toggleFinish.show();
    };

    return <React.Fragment>
        <div
            onClick={_onPillClick}
            style={{
                position: 'fixed',
                bottom: 70,
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'linear-gradient(135deg, #fa8c16, #d46b08)',
                color: '#fff',
                borderRadius: 24,
                padding: '8px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 4px 16px rgba(250,140,22,0.5)',
                cursor: 'pointer',
                zIndex: 1000,
                userSelect: 'none',
                whiteSpace: 'nowrap',
            }}
        >
            <FireOutlined style={{ fontSize: 16 }} />
            <span style={{ fontSize: 14, fontWeight: 600 }}>
                Đang nấu: {session.dishName}
                {activeSessions.length > 1 && ` (+${activeSessions.length - 1})`}
            </span>
            <span style={{ fontSize: 11, opacity: 0.85 }}>Nhấn để hoàn thành</span>
        </div>

        <Modal
            open={toggleFinish.value}
            title={<Space><FireOutlined style={{ color: "#fa8c16" }} />Hoàn thành nấu — {session.dishName}</Space>}
            destroyOnClose
            onCancel={toggleFinish.hide}
            footer={null}
        >
            {selectedSession && activeSessions.find(s => s.id === selectedSession) && (
                <FinishCookingWidget
                    session={activeSessions.find(s => s.id === selectedSession)!}
                    onDone={toggleFinish.hide}
                />
            )}
        </Modal>
    </React.Fragment>;
};

const BottomTabNavigator = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const theme = useTheme();
    const toggleSuggester = useToggle();

    const _buttonStyles = (): React.CSSProperties => {
        return {
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: 64,
            width: 90
        }
    }

    const _containerStyles = (): React.CSSProperties => {
        return {
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            width: "100%",
            backgroundColor: "#fff",
            height: 80,
            borderTop: "0.5px solid " + theme.token.colorBorder
        }
    }

    const _textStyles = (route: string): React.CSSProperties => {
        return {
            color: route === location.pathname ? theme.token.colorPrimary : undefined,
            fontWeight: route === location.pathname ? "bold" : undefined,
            fontSize: 16
        }
    }

    const onNavigate = (href) => {
        navigate(href);
    }

    return <>
        <Stack justify="space-evenly" style={_containerStyles()}>
            <Button type="text" style={_buttonStyles()} icon={<Image src={DishesIcon} preview={false} width={28} style={{ marginLeft: 2 }} />} onClick={() => onNavigate(RootRoutes.AuthorizedRoutes.DishesRoutes.List())}>
                <Typography.Text style={_textStyles(RootRoutes.AuthorizedRoutes.DishesRoutes.List())}>Món ăn</Typography.Text>
            </Button>
            <Button type="text" style={_buttonStyles()} icon={<Image src={ShoppingListIcon} preview={false} width={28} style={{ marginLeft: 3 }} />} onClick={() => onNavigate(RootRoutes.AuthorizedRoutes.ShoppingListRoutes.List())}>
                <Typography.Text style={_textStyles(RootRoutes.AuthorizedRoutes.ShoppingListRoutes.List())}>Mua sắm</Typography.Text>
            </Button>
            <Button type="text" style={{ ..._buttonStyles(), color: theme.token.colorPrimary }} icon={<Image src={SuggesterIcon} preview={false} width={28} style={{ marginLeft: 2 }} />} onClick={toggleSuggester.show}>
                <Typography.Text style={{ fontSize: 16 }}>Nấu gì?</Typography.Text>
            </Button>
            <Button type="text" style={_buttonStyles()} icon={<Image src={MealsIcon} preview={false} width={28} style={{ marginLeft: 2 }} />} onClick={() => onNavigate(RootRoutes.AuthorizedRoutes.ScheduledMealRoutes.List())}>
                <Typography.Text style={_textStyles(RootRoutes.AuthorizedRoutes.ScheduledMealRoutes.List())}>Thực đơn</Typography.Text>
            </Button>
        </Stack>
        <DishSuggesterScreen open={toggleSuggester.value} onClose={toggleSuggester.hide} />
    </>
}

export const DataBackup = ({ onImportCloud }: { onImportCloud?: () => Promise<void> }) => {
    const toggleShowData = useToggle();
    const toggleImportData = useToggle();
    const [exportedData, setExportedData] = useState<string>("");
    const message = useMessage();
    const dispatch = useDispatch();
    const toggleImportingCloud = useToggle();

    const _onImportCloud = async () => {
        if (onImportCloud) return onImportCloud();
        toggleImportingCloud.show();
        let data = await fetch("https://raw.githubusercontent.com/quantran-epi/my-recipes/refs/heads/main/docs/data.txt" + "?t=" + Date.now());

        let text = await data.text();

        try {
            let parseValues = JSON.parse(text);
            dispatch(resetIngredient());
            dispatch(resetDishes());
            dispatch(resetScheduleMeals());
            dispatch(resetShoppingList());
            JSON.parse(parseValues.dishes).dishes.map(dish => dispatch(addDishes(dish)));
            JSON.parse(parseValues.ingredient).ingredients.map(ingre => dispatch(addIngredient(ingre)));
            JSON.parse(parseValues.scheduledMeal).scheduledMeals.map(meal => dispatch(addScheduledMeal(meal)));
            JSON.parse(parseValues.shoppingList).shoppingLists.map(shplist => dispatch(addShoppingList(shplist)));
            toggleImportingCloud.hide();
            message.success("Import thành công");
        }
        catch (ex) {
            alert(ex);
        }
    }

    const importDataForm = useSmartForm({
        defaultValues: {
            data: ""
        },
        onSubmit: (values) => {
            debugger
            // localStorage.setItem("persist:root", values.transformValues.data);

            try {
                let parseValues = JSON.parse(values.transformValues.data);
                JSON.parse(parseValues.dishes).dishes.map(dish => dispatch(addDishes(dish)));
                JSON.parse(parseValues.ingredient).ingredients.map(ingre => dispatch(addIngredient(ingre)));
                JSON.parse(parseValues.scheduledMeal).scheduledMeals.map(meal => dispatch(addScheduledMeal(meal)));
                JSON.parse(parseValues.shoppingList).shoppingLists.map(shplist => dispatch(addShoppingList(shplist)));
                message.success("Import thành công");
            }
            catch (ex) {
                alert(ex);
            }

        },
        itemDefinitions: defaultValues => ({
            data: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.data), label: "Data" }
        })
    })

    return <React.Fragment>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>Troubleshooting</Typography.Text>
        <Space>
            <Button size="small" icon={<ExportOutlined />} onClick={() => {
                setExportedData(localStorage.getItem("persist:root"));
                toggleShowData.show();
            }}>Export</Button>

            <Button size="small" icon={<ImportOutlined />} onClick={toggleImportData.show}>Import</Button>

            <Button size="small" loading={toggleImportingCloud.value} icon={<CloudDownloadOutlined />} onClick={_onImportCloud}>Import cloud</Button>
        </Space>

        <Modal title="Export Data" open={toggleShowData.value} onCancel={toggleShowData.hide} footer={null}>
            <Box style={{ height: 300, overflowY: "auto" }}>
                {exportedData}
            </Box>
            <br />
            <CopyToClipboard text={exportedData}
                onCopy={() => message.success("Copied")}>
                <Stack justify="flex-end"><Button>Copy</Button></Stack>
            </CopyToClipboard>

        </Modal>
        <Modal title="Import Data" open={toggleImportData.value} onCancel={toggleImportData.hide} footer={null}>
            <SmartForm {...importDataForm.defaultProps}>
                <SmartForm.Item {...importDataForm.itemDefinitions.data}>
                    <TextArea rows={10} />
                </SmartForm.Item>
            </SmartForm>

            <Button onClick={importDataForm.submit}>Import</Button>
        </Modal>
    </React.Fragment>
}