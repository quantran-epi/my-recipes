import { Button } from "@components/Button";
import { Content } from "@components/Layout/Content";
import { Header } from "@components/Layout/Header";
import { useTheme, useToggle } from "@hooks";
import { Layout, Drawer } from "antd";
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

const layoutStyles: React.CSSProperties = {
    height: "100%"
}

export const MasterPage = () => {
    const theme = useTheme();
    const currentFeatureName = useSelector((state: RootState) => state.appContext.currentFeatureName);

    return <Layout style={layoutStyles}>
        <Header style={{
            height: 45,
            lineHeight: "45px",
            paddingInline: 5,
            backgroundColor: "#fff",
            borderBottom: "0.5px solid " + theme.token.colorBorder
        }}>
            <Stack fullwidth>
                <SidebarDrawer />
                <Typography.Text>{currentFeatureName}</Typography.Text>
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

    const onNavigate = (item) => {
        navigate(item.href);
        setOpen(false);
    }

    return (
        <React.Fragment>
            <Button type="primary" onClick={showDrawer} icon={<MenuOutlined />} />
            <Drawer placement="left" title="Chức năng" onClose={onClose} open={open}>
                <List dataSource={[
                    { title: "Nguyên liệu", href: RootRoutes.AuthorizedRoutes.IngredientRoutes.List() },
                    { title: "Món ăn", href: RootRoutes.AuthorizedRoutes.DishesRoutes.List() },
                    { title: "Lịch mua sắm", href: RootRoutes.AuthorizedRoutes.ShoppingListRoutes.List() },
                    { title: "Thực đơn", href: RootRoutes.AuthorizedRoutes.ScheduledMealRoutes.List() },
                ]} renderItem={(item) => <List.Item>
                    <List.Item.Meta
                        description={<Button fullwidth style={{ textAlign: "left" }} onClick={() => onNavigate(item)}>{item.title}</Button>} />
                </List.Item>} />
                <DataBackup />
            </Drawer>
            <ScheduledMealToolkitWidget />
        </React.Fragment>
    );
};

export const DataBackup = () => {
    const toggleShowData = useToggle();
    const toggleImportData = useToggle();
    const [exportedData, setExportedData] = useState<string>("");

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