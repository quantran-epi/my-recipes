import { Button } from "@components/Button";
import { Content } from "@components/Layout/Content";
import { Header } from "@components/Layout/Header";
import { useTheme } from "@hooks";
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
            <Drawer placement="left" title="Menu" onClose={onClose} open={open}>
                <List dataSource={[
                    { title: "Ingredients", href: RootRoutes.AuthorizedRoutes.IngredientRoutes.List() },
                    { title: "Dishes", href: RootRoutes.AuthorizedRoutes.DishesRoutes.List() },
                    { title: "Shopping List", href: RootRoutes.AuthorizedRoutes.IngredientRoutes.List() },
                ]} renderItem={(item) => <List.Item>
                    <Button onClick={() => onNavigate(item)}>{item.title}</Button>
                </List.Item>} />
            </Drawer>
        </React.Fragment>
    );
};