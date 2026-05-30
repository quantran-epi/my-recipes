import { CloudDownloadOutlined, CloudSyncOutlined, ExportOutlined, ImportOutlined, LockOutlined, MenuOutlined, UnlockOutlined } from "@ant-design/icons";
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
import { useAutoBackup, useAdminMode, useTheme, useToggle } from "@hooks";
import { ScheduledMealToolkitWidget } from "@modules/ScheduledMeal/Screens/ScheduledMealToolkit.widget";
import { addDishes, resetDishes } from "@store/Reducers/DishesReducer";
import { addIngredient, resetIngredient } from "@store/Reducers/IngredientReducer";
import { addScheduledMeal, resetScheduleMeals } from "@store/Reducers/ScheduledMealReducer";
import { addShoppingList, resetShoppingList } from "@store/Reducers/ShoppingListReducer";
import { RootState } from "@store/Store";
import { Drawer, Flex, Input as AntInput, Layout } from "antd";
import React, { useState } from "react";
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { useDispatch, useSelector } from "react-redux";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import LogoIcon from "../../assets/icons/logo.png";
import MealsIcon from "../../assets/icons/meals.png";
import DishesIcon from "../../assets/icons/noodles.png";
import ShoppingListIcon from "../../assets/icons/shoppingList.png";
import IngredientIcon from "../../assets/icons/vegetable.png";
import { RootRoutes } from "./RootRoutes";

const layoutStyles: React.CSSProperties = {
    height: "100%"
}

export const MasterPage = () => {
    const { triggerBackup, isBackingUp, lastBackupTime } = useAutoBackup();
    const theme = useTheme();
    const currentFeatureName = useSelector((state: RootState) => state.appContext.currentFeatureName);

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
            <Outlet />
        </Content>
        <BottomTabNavigator />
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
            <Drawer placement="left" title={<Typography.Text style={{ fontFamily: "kanit", fontSize: 24 }}>My Recipes</Typography.Text>} onClose={onClose} open={open} styles={{ body: { padding: 0 } }}>
                <Flex vertical justify="space-between" style={{ height: "100%" }}>
                    <Menu
                        items={[
                            {
                                key: "ingredients", label: <Flex align="center">
                                    <img src={IngredientIcon} width={32} style={{ marginRight: 10 }} />
                                    {"Nguyên liệu"}
                                </Flex>, onClick: () => onNavigate(RootRoutes.AuthorizedRoutes.IngredientRoutes.List())
                            },
                            {
                                key: "dishes", label: <Flex align="center">
                                    <img src={DishesIcon} width={32} style={{ marginRight: 10 }} />
                                    {"Món ăn"}
                                </Flex>, onClick: () => onNavigate(RootRoutes.AuthorizedRoutes.DishesRoutes.List())
                            },
                            {
                                key: "shoppingList", label: <Flex align="center">
                                    <img src={ShoppingListIcon} width={32} style={{ marginRight: 10 }} />
                                    {"Lịch mua sắm"}
                                </Flex>, onClick: () => onNavigate(RootRoutes.AuthorizedRoutes.ShoppingListRoutes.List())
                            },
                            {
                                key: "meals", label: <Flex align="center">
                                    <img src={MealsIcon} width={32} style={{ marginRight: 10 }} />
                                    {"Thực đơn"}
                                </Flex>, onClick: () => onNavigate(RootRoutes.AuthorizedRoutes.ScheduledMealRoutes.List())
                            }
                        ]}
                    />
                    <Box style={{ overflow: "hidden" }}>
                        <Image src={LogoIcon} width={350} preview={false} style={{ marginLeft: 90, opacity: 0.4 }} />
                    </Box>
                    <Box style={{ padding: 15 }}>
                        <Flex vertical gap={10}>
                            {/* Primary actions */}
                            <Button
                                type="primary"
                                icon={<CloudDownloadOutlined />}
                                loading={isImporting}
                                block
                                onClick={onImportCloud}
                            >
                                Đồng bộ ngay
                            </Button>
                            {isAdmin && (
                                <>
                                    <Button
                                        type="default"
                                        icon={<CloudSyncOutlined />}
                                        loading={isBackingUp}
                                        onClick={triggerBackup}
                                        block
                                    >
                                        Sao lưu ngay
                                    </Button>
                                    {lastBackupTime && (
                                        <Typography.Text type="secondary" style={{ fontSize: 12, textAlign: "center" }}>
                                            Lần sao lưu cuối: {lastBackupTime.toLocaleString("vi-VN")}
                                        </Typography.Text>
                                    )}
                                </>
                            )}
                            {/* Admin toggle */}
                            {isAdmin ? (
                                <Button size="small" type="text" icon={<LockOutlined />} danger block onClick={lock}>
                                    Khoá quyền admin
                                </Button>
                            ) : (
                                <Button size="small" type="text" icon={<UnlockOutlined />} block onClick={() => setPinModalOpen(true)}>
                                    Mở quyền admin
                                </Button>
                            )}
                            {/* Troubleshooting — manual export/import */}
                            <DataBackup onImportCloud={onImportCloud} />
                        </Flex>
                    </Box>
                </Flex>
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

const BottomTabNavigator = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const theme = useTheme();

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

    return <Stack justify="space-evenly" style={_containerStyles()}>
        <Button type="text" style={_buttonStyles()} icon={<Image src={DishesIcon} preview={false} width={28} style={{ marginLeft: 2 }} />} onClick={() => onNavigate(RootRoutes.AuthorizedRoutes.DishesRoutes.List())}>
            <Typography.Text style={_textStyles(RootRoutes.AuthorizedRoutes.DishesRoutes.List())}>Món ăn</Typography.Text>
        </Button>
        <Button type="text" style={_buttonStyles()} icon={<Image src={ShoppingListIcon} preview={false} width={28} style={{ marginLeft: 3 }} />} onClick={() => onNavigate(RootRoutes.AuthorizedRoutes.ShoppingListRoutes.List())}>
            <Typography.Text style={_textStyles(RootRoutes.AuthorizedRoutes.ShoppingListRoutes.List())}>Mua sắm</Typography.Text>
        </Button>
        <Button type="text" style={_buttonStyles()} icon={<Image src={MealsIcon} preview={false} width={28} style={{ marginLeft: 2 }} />} onClick={() => onNavigate(RootRoutes.AuthorizedRoutes.ScheduledMealRoutes.List())}>
            <Typography.Text style={_textStyles(RootRoutes.AuthorizedRoutes.ScheduledMealRoutes.List())}>Thực đơn</Typography.Text>
        </Button>
    </Stack>
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