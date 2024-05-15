import { Button } from "@components/Button";
import { Content } from "@components/Layout/Content";
import { Header } from "@components/Layout/Header";
import { useTheme, useToggle } from "@hooks";
import { Layout, Drawer, Flex } from "antd";
import React, { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { MenuOutlined, ImportOutlined, ExportOutlined } from "@ant-design/icons";
import { List } from "@components/List";
import { RootRoutes } from "./RootRoutes";
import { Box } from "@components/Layout/Box";
import { Stack } from "@components/Layout/Stack";
import { Typography } from "@components/Typography";
import { useSelector } from "react-redux";
import { RootState } from "@store/Store";
import { Modal } from "@components/Modal";
import { TextArea } from "@components/Form/Input";
import { SmartForm, useSmartForm } from "@components/SmartForm";
import { ObjectPropertyHelper } from "@common/Helpers/ObjectProperty";
import { Space } from "@components/Layout/Space";
import { ScheduledMealToolkitWidget } from "@modules/ScheduledMeal/Screens/ScheduledMealToolkit.widget";
import { Menu } from "@components/Menu";
import DishesIcon from "../../assets/icons/noodles.png";
import IngredientIcon from "../../assets/icons/vegetable.png";
import MealsIcon from "../../assets/icons/meals.png";
import ShoppingListIcon from "../../assets/icons/shoppingList.png";
import MarketIcon from "../../assets/icons/market.png";
import LogoIcon from "../../assets/icons/logo.png";
import ShoppingList2Icon from "../../assets/icons/shoppingList2.png";
import { Image } from "@components/Image";
import { Tooltip } from "@components/Tootip";
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { useMessage } from "@components/Message";

const layoutStyles: React.CSSProperties = {
    height: "100%"
}

export const MasterPage = () => {
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
                    <SidebarDrawer />
                    <Tooltip title={currentFeatureName}>
                        <Typography.Paragraph style={{ fontFamily: "kanit", fontSize: 24, fontWeight: "500", marginBottom: 0, width: 230 }} ellipsis>{currentFeatureName}</Typography.Paragraph>
                    </Tooltip>
                </Stack>
                {_featureIcon() && <Image preview={false} src={_featureIcon()} height={36} style={{ marginBottom: 5 }} />}
            </Stack>
        </Header>
        <Content>
            <Outlet />
        </Content>
        <BottomTabNavigator />
    </Layout>
}

const SidebarDrawer = () => {
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();

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
                    <Box style={{ padding: 15 }}><DataBackup /> </Box>
                </Flex>
            </Drawer>
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

export const DataBackup = () => {
    const toggleShowData = useToggle();
    const toggleImportData = useToggle();
    const [exportedData, setExportedData] = useState<string>("");
    const message = useMessage();

    const importDataForm = useSmartForm({
        defaultValues: {
            data: ""
        },
        onSubmit: (values) => {
            localStorage.setItem("persist:root", values.transformValues.data);
            message.success("Import thành công");
        },
        itemDefinitions: defaultValues => ({
            data: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.data), label: "Data" }
        })
    })

    return <React.Fragment>
        <Space>
            <Button icon={<ExportOutlined />} onClick={() => {
                setExportedData(localStorage.getItem("persist:root"));
                toggleShowData.show();
            }}>Export</Button>

            <Button icon={<ImportOutlined />} onClick={toggleImportData.show}>Import</Button>
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