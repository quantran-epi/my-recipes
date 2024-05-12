import { Button } from "@components/Button";
import { Content } from "@components/Layout/Content";
import { Header } from "@components/Layout/Header";
import { useTheme, useToggle } from "@hooks";
import { Layout, Drawer, Flex } from "antd";
import React, { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { MenuOutlined } from "@ant-design/icons";
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

                    <Box style={{ padding: 15 }}><DataBackup /> </Box>
                </Flex>
            </Drawer>
            <ScheduledMealToolkitWidget />
        </React.Fragment>
    );
};

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
        },
        itemDefinitions: defaultValues => ({
            data: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.data), label: "Data" }
        })
    })

    return <React.Fragment>
        <Space>
            <Button onClick={() => {
                setExportedData(localStorage.getItem("persist:root"));
                toggleShowData.show();
            }}>Export data</Button>

            <Button onClick={toggleImportData.show}>Import data</Button>
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