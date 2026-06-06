import { CloudDownloadOutlined, CloudUploadOutlined, ExportOutlined, HistoryOutlined, ImportOutlined, LockOutlined, MenuOutlined, UnlockOutlined, FireOutlined, QuestionCircleOutlined, SearchOutlined, LoadingOutlined } from "@ant-design/icons";
import { ObjectPropertyHelper } from "@common/Helpers/ObjectProperty";
import { SharedSyncModal } from "@components/AppInitializer/SharedSyncModal";
import { Button } from "@components/Button";
import { TextArea } from "@components/Form/Input";
import { Image } from "@components/Image";
import { Box } from "@components/Layout/Box";
import { Content } from "@components/Layout/Content";
import { Header } from "@components/Layout/Header";
import { Space } from "@components/Layout/Space";
import { Stack } from "@components/Layout/Stack";
import { useMessage } from "@components/Message";
import { DeferredModalContent, Modal } from "@components/Modal";
import { SmartForm, useSmartForm } from "@components/SmartForm";
import { Tooltip } from "@components/Tootip";
import { Typography } from "@components/Typography";
import { useAdminMode, useTheme, useToggle, useOnlineStatus, useSharedPublish, useSharedDataSync, type SyncedVersions } from "@hooks";
import { ScheduledMealToolkitWidget } from "@modules/ScheduledMeal/Screens/ScheduledMealToolkit.widget";
import { DishSuggesterScreen } from "@modules/DishSuggester/Screens/DishSuggester.screen";
import { CookingSessionWidget } from "@modules/Dishes/Screens/CookingSession.widget";
import { CookingHistoryWidget } from "@modules/Dishes/Screens/CookingHistory.widget";
import { GistBackupWidget } from "@components/GistBackupWidget";
import { UserGuideScreen } from "@modules/Home/Screens/UserGuide.screen";
import { GlobalSearchScreen } from "@modules/Home/Screens/GlobalSearch.screen";
import { selectCookingSessions, selectCurrentFeatureName, selectDishesById } from "@store/Selectors";
import { Drawer, Flex, Input as AntInput, Layout, Divider } from "antd";
import React, { useState } from "react";
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { useSelector } from "react-redux";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import LogoIcon from "../../assets/icons/logo.png";
import MealsIcon from "../../assets/icons/meals.png";
import DishesIcon from "../../assets/icons/noodles.png";
import ShoppingListIcon from "../../assets/icons/shoppingList.png";
import IngredientIcon from "../../assets/icons/vegetable.png";
import SuggesterIcon from "../../assets/icons/cooking.png";
import BudgetIcon from "../../assets/icons/budget.png";
import { AppShellNavigationProvider, useAppShellNavigation, useAppShellNavigationController } from "./AppShellNavigationContext";
import { RootRoutes } from "./RootRoutes";

const layoutStyles: React.CSSProperties = {
    height: "100%"
}

const drawerToolsPlaceholderStyle: React.CSSProperties = {
    minHeight: 48,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#8c8c8c",
};

const sidebarNavListStyle: React.CSSProperties = {
    padding: "8px 4px",
};

const sidebarNavButtonStyle = (active: boolean): React.CSSProperties => ({
    width: "100%",
    minHeight: 48,
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "9px 12px",
    border: 0,
    borderRadius: 8,
    background: active ? "#f0f5ff" : "transparent",
    color: active ? "#1677ff" : "#1f1f1f",
    font: "inherit",
    fontSize: 16,
    fontWeight: active ? 650 : 500,
    textAlign: "left",
    cursor: "pointer",
});

const useDeferredDrawerTools = (open: boolean) => {
    const [ready, setReady] = React.useState(false);
    const frameRefs = React.useRef<number[]>([]);

    const clearFrames = React.useCallback(() => {
        frameRefs.current.forEach(frame => window.cancelAnimationFrame(frame));
        frameRefs.current = [];
    }, []);

    React.useEffect(() => {
        clearFrames();
        setReady(false);
        if (!open) return;

        const firstFrame = window.requestAnimationFrame(() => {
            const secondFrame = window.requestAnimationFrame(() => {
                frameRefs.current = [];
                setReady(true);
            });
            frameRefs.current.push(secondFrame);
        });
        frameRefs.current.push(firstFrame);

        return clearFrames;
    }, [clearFrames, open]);

    return ready;
};

export const MasterPage = () => {
    const theme = useTheme();
    const currentFeatureName = useSelector(selectCurrentFeatureName);    const { isOnline } = useOnlineStatus();
    const toggleSearch = useToggle();
    const location = useLocation();
    const navigate = useNavigate();
    const appShellNavigation = useAppShellNavigationController(location.pathname, navigate);

    React.useEffect(() => {
        const content = document.getElementById("app-content");
        if (!content) return;
        content.scrollTop = 0;
        content.scrollTo({ top: 0, behavior: "auto" });
    }, [location.pathname]);

    const _featureIcon = () => {
        switch (currentFeatureName) {
            case "Món ăn": return DishesIcon;
            case "Thực đơn": return MealsIcon;
            case "Lịch mua sắm": return ShoppingListIcon;
            case "Nguyên liệu": return IngredientIcon;
            case "Kế hoạch chi phí": return BudgetIcon;
            case 'Tổng quan': return LogoIcon;
            default: return null;
        }
    }

    return <AppShellNavigationProvider value={appShellNavigation}>
        <Layout style={layoutStyles}>
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
                    <Stack align="center" gap={4}>
                        <Button
                            type="text"
                            aria-label="Tìm kiếm toàn cục"
                            data-testid="global-search-button"
                            icon={<SearchOutlined style={{ fontSize: 20 }} />}
                            onClick={toggleSearch.show}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        />
                        {_featureIcon() && <Image src={_featureIcon()} width={36} loading="eager" alt={currentFeatureName} style={{ marginBottom: 5 }} />}
                    </Stack>
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
            {toggleSearch.value && <GlobalSearchScreen open={toggleSearch.value} onClose={toggleSearch.hide} onNavigate={appShellNavigation.navigateWithFeedback} />}
        </Layout>
    </AppShellNavigationProvider>
}

const SidebarDrawer = () => {
    const [open, setOpen] = useState(false);
    const [pinModalOpen, setPinModalOpen] = useState(false);
    const [pin, setPin] = useState("");
    const [pinError, setPinError] = useState("");
    const { isAdmin, tryUnlock, lock } = useAdminMode();
    const { publishSharedData, isPublishing, lastPublishAt } = useSharedPublish();
    const { pendingSync, isSyncChecking, checkNow, dismissSync, markSynced } = useSharedDataSync();
    const message = useMessage();
    const toggleHistory = useToggle();
    const toggleGuide = useToggle();
    const { navigateWithFeedback } = useAppShellNavigation();
    const toolsReady = useDeferredDrawerTools(open);
    const location = useLocation();

    const showDrawer = () => {
        setOpen(true);
    };

    const resetPinState = () => {
        setPin("");
        setPinError("");
    };

    const onClose = () => {
        setOpen(false);
        setPinModalOpen(false);
        resetPinState();
    };

    const onNavigate = (href: string) => {
        navigateWithFeedback(href, () => setOpen(false));
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
        try {
            const nextPendingSync = await checkNow();
            if (nextPendingSync) {
                setOpen(false);
            } else {
                message.success("Dữ liệu dùng chung đã mới nhất");
            }
        } catch (ex: any) {
            message.error("Đồng bộ thất bại: " + ex?.message);
        }
    };

    const onSharedSyncDone = (synced: SyncedVersions) => {
        markSynced(synced);
        message.success("Đồng bộ dữ liệu dùng chung thành công");
    };

    const sidebarNavItems = [
        { key: 'dashboard', href: RootRoutes.AuthorizedRoutes.Root(), icon: LogoIcon, label: 'Tổng quan' },
        { key: 'ingredients', href: RootRoutes.AuthorizedRoutes.IngredientRoutes.List(), icon: IngredientIcon, label: 'Nguyên liệu' },
        { key: 'dishes', href: RootRoutes.AuthorizedRoutes.DishesRoutes.List(), icon: DishesIcon, label: 'Món ăn' },
        { key: 'expensePlanner', href: RootRoutes.AuthorizedRoutes.ExpensePlanner(), icon: BudgetIcon, label: 'Kế hoạch chi phí' },
        { key: 'shoppingList', href: RootRoutes.AuthorizedRoutes.ShoppingListRoutes.List(), icon: ShoppingListIcon, label: 'Lịch mua sắm' },
        { key: 'meals', href: RootRoutes.AuthorizedRoutes.ScheduledMealRoutes.List(), icon: MealsIcon, label: 'Thực đơn' },
    ];

    return (
        <React.Fragment>
            <Button type="primary" data-testid="sidebar-drawer-button" onClick={showDrawer} icon={<MenuOutlined />} />
            <Drawer
                placement="left"
                title={
                    <Flex align="center" gap={10}>
                        <Image src={LogoIcon} width={32} loading="eager" alt="My Recipes" />
                        <Typography.Text style={{ fontFamily: "kanit", fontSize: 22, fontWeight: 600 }}>My Recipes</Typography.Text>
                    </Flex>
                }
                onClose={onClose}
                open={open}
                data-testid="sidebar-drawer"
                destroyOnClose
                styles={{ body: { padding: 0, display: "flex", flexDirection: "column", height: "100%", overflowY: "auto" } }}
            >
                {/* ── Navigation ── */}
                <div data-testid="sidebar-drawer-primary-nav">
                    <div style={sidebarNavListStyle}>
                        {sidebarNavItems.map(item => (
                            <button
                                key={item.key}
                                type="button"
                                data-testid={`sidebar-nav-${item.key}`}
                                style={sidebarNavButtonStyle(location.pathname === item.href)}
                                onClick={() => onNavigate(item.href)}
                            >
                                <Image src={item.icon} width={24} alt="" />
                                <span>{item.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <Box data-testid="sidebar-drawer-tools" style={{ padding: "0 16px 24px" }}>
                    {!toolsReady ? <div style={drawerToolsPlaceholderStyle}><LoadingOutlined /></div> : <React.Fragment>

                    {/* ── Sync shared data ── */}
                    <Divider orientation="left" style={{ fontSize: 12, color: "#888", marginTop: 16, marginBottom: 12 }}>Dữ liệu dùng chung</Divider>
                    <Flex vertical gap={4}>
                        <Button
                            icon={<CloudDownloadOutlined />}
                            loading={isSyncChecking}
                            block
                            onClick={onImportCloud}
                        >
                            Đồng bộ dữ liệu mới
                        </Button>
                        <Typography.Text type="secondary" style={{ fontSize: 11, paddingLeft: 2 }}>
                            Cập nhật nguyên liệu và món ăn mới nhất được admin xuất bản.
                        </Typography.Text>
                    </Flex>

                    {/* ── Admin publish ── */}
                    {isAdmin && (
                        <>
                            <Divider orientation="left" style={{ fontSize: 12, color: "#888", marginTop: 20, marginBottom: 12 }}>Quản trị</Divider>
                            <Flex vertical gap={4}>
                                <Button
                                    icon={<CloudUploadOutlined />}
                                    loading={isPublishing}
                                    onClick={publishSharedData}
                                    block
                                    style={{ color: "#52c41a", borderColor: "#52c41a" }}
                                >
                                    Xuất bản dữ liệu dùng chung
                                </Button>
                                <Typography.Text type="secondary" style={{ fontSize: 11, paddingLeft: 2 }}>
                                    Đẩy danh sách nguyên liệu & món ăn hiện tại lên GitHub để mọi người đồng bộ.
                                </Typography.Text>
                                {lastPublishAt && (
                                    <Typography.Text type="secondary" style={{ fontSize: 11, paddingLeft: 2, color: "#52c41a" }}>
                                        ✅ Xuất bản lần cuối: {new Date(lastPublishAt).toLocaleString("vi-VN")}
                                    </Typography.Text>
                                )}
                            </Flex>
                        </>
                    )}

                    {/* ── Personal backup — everyone including admin ── */}
                    <Divider orientation="left" style={{ fontSize: 12, color: "#888", marginTop: 20, marginBottom: 8 }}>Sao lưu cá nhân</Divider>
                    <Typography.Text type="secondary" style={{ fontSize: 11, paddingLeft: 2, display: "block", marginBottom: 8 }}>
                        Sao lưu tồn kho, lịch mua sắm và thực đơn vào GitHub Gist để không mất dữ liệu khi đổi thiết bị.
                    </Typography.Text>
                    <GistBackupWidget />

                    {/* ── Cooking history ── */}
                    <Divider orientation="left" style={{ fontSize: 12, color: "#888", marginTop: 20, marginBottom: 12 }}>Nấu ăn</Divider>
                    <Button
                        icon={<HistoryOutlined />}
                        block
                        onClick={() => { setOpen(false); toggleHistory.show(); }}
                    >
                        Lịch sử nấu ăn
                    </Button>
                    <Button
                        icon={<QuestionCircleOutlined />}
                        block
                        style={{ marginTop: 8 }}
                        onClick={() => { setOpen(false); toggleGuide.show(); }}
                    >
                        Hướng dẫn sử dụng
                    </Button>

                    {/* ── Account ── */}
                    <Divider orientation="left" style={{ fontSize: 12, color: "#888", marginTop: 20, marginBottom: 12 }}>Tài khoản</Divider>
                    <Flex vertical gap={4}>
                        {isAdmin ? (
                            <>
                                <Flex align="center" justify="space-between" style={{ padding: "4px 0" }}>
                                    <Flex align="center" gap={6}>
                                        <LockOutlined style={{ color: "#52c41a" }} />
                                        <Typography.Text style={{ fontSize: 13, color: "#52c41a", fontWeight: 500 }}>Đang ở chế độ Admin</Typography.Text>
                                    </Flex>
                                    <Button size="small" type="text" danger onClick={lock}>Khoá</Button>
                                </Flex>
                                <Typography.Text type="secondary" style={{ fontSize: 11, paddingLeft: 2 }}>
                                    Nhấn "Khoá" để thoát chế độ admin và ẩn các công cụ quản trị.
                                </Typography.Text>
                            </>
                        ) : (
                            <>
                                <Button type="text" icon={<UnlockOutlined />} block onClick={() => setPinModalOpen(true)} style={{ justifyContent: "flex-start" }}>
                                    Đăng nhập Admin
                                </Button>
                                <Typography.Text type="secondary" style={{ fontSize: 11, paddingLeft: 2 }}>
                                    Nhập mã PIN để mở quyền thêm / sửa / xoá nguyên liệu và món ăn.
                                </Typography.Text>
                            </>
                        )}
                    </Flex>

                    </React.Fragment>}

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
            <ScheduledMealToolkitWidget onNavigate={onNavigate} />
            {pendingSync && (
                <SharedSyncModal
                    open={true}
                    manifest={pendingSync.manifest}
                    hasIngredientChanges={pendingSync.hasIngredientChanges}
                    hasDishChanges={pendingSync.hasDishChanges}
                    onDone={onSharedSyncDone}
                    onCancel={dismissSync}
                />
            )}
            {toggleHistory.value && <CookingHistoryWidget open={toggleHistory.value} onClose={toggleHistory.hide} />}
            {toggleGuide.value && <UserGuideScreen open={toggleGuide.value} onClose={toggleGuide.hide} />}
        </React.Fragment>
    );
};

const CookingPill = () => {
    const sessions = useSelector(selectCookingSessions);
    const dishesById = useSelector(selectDishesById);
    const activeSessions = React.useMemo(() => sessions.filter(s => s.status === "cooking"), [sessions]);

    const [sessionListOpen, setSessionListOpen] = React.useState(false);
    const [focusedSessionId, setFocusedSessionId] = React.useState<string | null>(null);
    const [cookingModalOpen, setCookingModalOpen] = React.useState(false);

    if (activeSessions.length === 0) return null;

    const focusedSession = activeSessions.find(s => s.id === focusedSessionId) ?? activeSessions[0];
    const focusedDish = dishesById.get(focusedSession?.dishId);

    const _onPillClick = () => {
        if (activeSessions.length === 1) {
            setFocusedSessionId(activeSessions[0].id);
            setCookingModalOpen(true);
        } else {
            setSessionListOpen(true);
        }
    };

    const _onSelectSession = (sessionId: string) => {
        setFocusedSessionId(sessionId);
        setSessionListOpen(false);
        setCookingModalOpen(true);
    };

    const displaySession = activeSessions[0];

    return <React.Fragment>
        {/* ── Floating pill ── */}
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
                maxWidth: 'calc(100vw - 32px)',
            }}
        >
            <FireOutlined style={{ fontSize: 16, flexShrink: 0 }} />
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {activeSessions.length > 1
                        ? `${activeSessions.length} món đang nấu`
                        : displaySession.dishName}
                </span>
                {activeSessions.length === 1 && displaySession.steps?.length > 0 && (
                    <span style={{ fontSize: 11, opacity: 0.85 }}>
                        Bước {(displaySession.currentStepIndex ?? 0) + 1}/{displaySession.steps.length}
                        {displaySession.steps[displaySession.currentStepIndex ?? 0]
                            ? ` — ${displaySession.steps[displaySession.currentStepIndex ?? 0].length > 30
                                ? displaySession.steps[displaySession.currentStepIndex ?? 0].slice(0, 30) + "…"
                                : displaySession.steps[displaySession.currentStepIndex ?? 0]}`
                            : ""}
                    </span>
                )}
                {activeSessions.length === 1 && !displaySession.steps?.length && (
                    <span style={{ fontSize: 11, opacity: 0.85 }}>Nhấn để hoàn thành</span>
                )}
                {activeSessions.length > 1 && (
                    <span style={{ fontSize: 11, opacity: 0.85 }}>Nhấn để chuyển món</span>
                )}
            </div>
        </div>

        {/* ── Session switcher sheet (multi-session) ── */}
        <Modal
            open={sessionListOpen}
            onCancel={() => setSessionListOpen(false)}
            footer={null}
            title={<Space><FireOutlined style={{ color: "#fa8c16" }} />{activeSessions.length} món đang nấu</Space>}
            style={{ top: 80 }}
            destroyOnClose={false}
        >
            <DeferredModalContent active={sessionListOpen} minHeight={120}>
                {sessionListOpen ? <Flex vertical gap={10}>
                {activeSessions.map(s => {
                    const progress = s.steps?.length > 0
                        ? Math.round(((s.currentStepIndex ?? 0) + 1) / s.steps.length * 100)
                        : null;
                    return (
                        <div
                            key={s.id}
                            onClick={() => _onSelectSession(s.id)}
                            style={{
                                padding: '12px 16px',
                                borderRadius: 12,
                                border: '1.5px solid #ffd591',
                                background: '#fffbe6',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 12,
                            }}
                        >
                            <Flex vertical gap={4} style={{ minWidth: 0, flex: 1 }}>
                                <Typography.Text strong style={{ fontSize: 14 }}>{s.dishName}</Typography.Text>
                                {s.steps?.length > 0 ? (
                                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                        Bước {(s.currentStepIndex ?? 0) + 1} / {s.steps.length}
                                        {s.steps[s.currentStepIndex ?? 0]
                                            ? ` — ${s.steps[s.currentStepIndex ?? 0].slice(0, 40)}${s.steps[s.currentStepIndex ?? 0].length > 40 ? '…' : ''}`
                                            : ''}
                                    </Typography.Text>
                                ) : (
                                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>Sẵn sàng hoàn thành</Typography.Text>
                                )}
                                {progress !== null && (
                                    <div style={{
                                        height: 4, borderRadius: 4, background: '#ffe7ba',
                                        marginTop: 4, overflow: 'hidden',
                                    }}>
                                        <div style={{
                                            height: '100%', borderRadius: 4,
                                            background: progress === 100 ? '#52c41a' : '#fa8c16',
                                            width: `${progress}%`,
                                            transition: 'width 0.3s',
                                        }} />
                                    </div>
                                )}
                            </Flex>
                            <FireOutlined style={{ color: '#fa8c16', fontSize: 18, flexShrink: 0 }} />
                        </div>
                    );
                })}
                </Flex> : null}
            </DeferredModalContent>
        </Modal>

        {/* ── Single session cooking modal ── */}
        <Modal
            open={cookingModalOpen}
            title={<Space><FireOutlined style={{ color: "#fa8c16" }} />Đang nấu — {focusedSession?.dishName}</Space>}
            destroyOnClose
            onCancel={() => setCookingModalOpen(false)}
            footer={null}
        >
            <DeferredModalContent active={cookingModalOpen} minHeight={220}>
                {cookingModalOpen && focusedDish ? (
                    <CookingSessionWidget
                        dish={focusedDish}
                        onDone={() => setCookingModalOpen(false)}
                    />
                ) : null}
            </DeferredModalContent>
        </Modal>
    </React.Fragment>;
};

const BottomTabNavigator = () => {
    const location = useLocation();
    const theme = useTheme();
    const toggleSuggester = useToggle();
    const { navigateWithFeedback } = useAppShellNavigation();
    const dishesRoute = RootRoutes.AuthorizedRoutes.DishesRoutes.List();
    const shoppingRoute = RootRoutes.AuthorizedRoutes.ShoppingListRoutes.List();
    const dishesActive = location.pathname === dishesRoute;
    const shoppingActive = location.pathname === shoppingRoute;

    const _containerStyles = (): React.CSSProperties => {
        return {
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            width: "100%",
            minHeight: 98,
            padding: "12px 14px calc(12px + env(safe-area-inset-bottom))",
            zIndex: 900,
            touchAction: "manipulation",
            pointerEvents: "none",
            background: "linear-gradient(180deg, rgba(255,255,255,0), rgba(248,251,255,0.92))",
        }
    }

    const _dockStyles = (): React.CSSProperties => {
        return {
            position: "relative",
            width: "min(428px, calc(100vw - 22px))",
            height: 76,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            padding: "8px 10px",
            border: "1px solid rgba(28, 47, 76, 0.12)",
            borderRadius: 30,
            background: "linear-gradient(180deg, rgba(255,255,255,0.97), rgba(246,250,255,0.94))",
            boxShadow: "0 16px 38px rgba(31, 46, 76, 0.18), inset 0 1px 0 rgba(255,255,255,0.9)",
            backdropFilter: "blur(14px)",
            pointerEvents: "auto",
            overflow: "visible",
        }
    }

    const _dockAccentStyles = (): React.CSSProperties => {
        return {
            position: "absolute",
            top: 6,
            left: "50%",
            width: 46,
            height: 3,
            borderRadius: 99,
            background: "linear-gradient(90deg, rgba(22,119,255,0.16), rgba(82,196,26,0.22), rgba(250,140,22,0.16))",
            transform: "translateX(-50%)",
            pointerEvents: "none",
        }
    }

    const _buttonStyles = (active: boolean): React.CSSProperties => {
        return {
            flex: "1 1 0",
            minWidth: 0,
            height: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "6px 8px",
            border: active ? "1px solid rgba(22, 119, 255, 0.16)" : "1px solid transparent",
            borderRadius: 22,
            background: active ? "linear-gradient(180deg, #ffffff, #edf7ff)" : "transparent",
            boxShadow: active ? "0 8px 18px rgba(22, 119, 255, 0.10), inset 0 0 0 1px rgba(255,255,255,0.8)" : undefined,
            color: active ? theme.token.colorPrimary : "#5f6f82",
            transition: "background 160ms ease, box-shadow 160ms ease, color 160ms ease",
        }
    }

    const _tabContentStyles = (): React.CSSProperties => {
        return {
            width: "100%",
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 3,
        }
    }

    const _tabIconFrameStyles = (active: boolean): React.CSSProperties => {
        return {
            width: 30,
            height: 30,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 12,
            background: active ? "rgba(22, 119, 255, 0.10)" : "rgba(31, 46, 76, 0.05)",
            boxShadow: active ? "inset 0 0 0 1px rgba(22,119,255,0.10)" : undefined,
            flexShrink: 0,
        }
    }

    const _activeIndicatorStyles = (active: boolean): React.CSSProperties => {
        return {
            width: active ? 20 : 4,
            height: 3,
            borderRadius: 99,
            background: active ? "linear-gradient(90deg, #1677ff, #52c41a)" : "transparent",
            opacity: active ? 1 : 0,
            transition: "width 160ms ease, opacity 160ms ease",
        }
    }

    const _suggesterButtonStyles = (active: boolean): React.CSSProperties => {
        return {
            width: 106,
            height: 66,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "7px 10px",
            border: "1px solid rgba(255,255,255,0.72)",
            borderRadius: 24,
            background: active
                ? "linear-gradient(135deg, #0f62fe, #1f9d63)"
                : "linear-gradient(135deg, #1677ff, #3dbb7c)",
            color: "#fff",
            boxShadow: active
                ? "0 16px 28px rgba(22, 119, 255, 0.34), 0 0 0 6px rgba(22, 119, 255, 0.08)"
                : "0 14px 26px rgba(22, 119, 255, 0.28), 0 0 0 5px rgba(82, 196, 26, 0.08)",
            transform: "translateY(-12px)",
            transition: "box-shadow 160ms ease, background 160ms ease",
        }
    }

    const _suggesterIconFrameStyles = (): React.CSSProperties => {
        return {
            width: 34,
            height: 34,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 14,
            background: "rgba(255,255,255,0.20)",
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.28)",
            flexShrink: 0,
        }
    }

    const _labelStyles = (active: boolean): React.CSSProperties => {
        return {
            display: "block",
            color: active ? theme.token.colorPrimary : "#4b5d6f",
            fontWeight: active ? 700 : 600,
            fontSize: 12,
            lineHeight: "15px",
            whiteSpace: "nowrap",
            maxWidth: "100%",
            overflow: "hidden",
            textOverflow: "ellipsis",
        }
    }

    const _suggesterLabelStyles = (): React.CSSProperties => {
        return {
            display: "block",
            color: "#fff",
            fontWeight: 750,
            fontSize: 13,
            lineHeight: "15px",
            whiteSpace: "nowrap",
            textShadow: "0 1px 2px rgba(0,0,0,0.16)",
        }
    }

    const onNavigate = (href: string) => {
        if (location.pathname === href) return;
        navigateWithFeedback(href);
    }

    const renderSideTab = (params: { label: string; icon: string; active: boolean }) => (
        <span style={_tabContentStyles()}>
            <span style={_tabIconFrameStyles(params.active)}>
                <Image src={params.icon} preview={false} width={24} alt="" />
            </span>
            <Typography.Text style={_labelStyles(params.active)}>{params.label}</Typography.Text>
            <span style={_activeIndicatorStyles(params.active)} />
        </span>
    );

    const renderSuggesterTab = () => (
        <span style={_tabContentStyles()}>
            <span style={_suggesterIconFrameStyles()}>
                <Image src={SuggesterIcon} preview={false} width={27} alt="" />
            </span>
            <Typography.Text style={_suggesterLabelStyles()}>Nấu gì?</Typography.Text>
        </span>
    );

    return <>
        <div style={_containerStyles()} data-testid="bottom-tab-navigator">
            <div style={_dockStyles()}>
                <span style={_dockAccentStyles()} />
                <Button
                    type="text"
                    aria-label="Món ăn"
                    data-testid="bottom-tab-dishes"
                    style={_buttonStyles(dishesActive)}
                    onClick={() => onNavigate(dishesRoute)}
                >
                    {renderSideTab({ label: "Món ăn", icon: DishesIcon, active: dishesActive })}
                </Button>
                <Button
                    type="text"
                    aria-label="Nấu gì?"
                    data-testid="bottom-tab-suggester"
                    style={_suggesterButtonStyles(toggleSuggester.value)}
                    onClick={toggleSuggester.show}
                >
                    {renderSuggesterTab()}
                </Button>
                <Button
                    type="text"
                    aria-label="Mua sắm"
                    data-testid="bottom-tab-shopping-list"
                    style={_buttonStyles(shoppingActive)}
                    onClick={() => onNavigate(shoppingRoute)}
                >
                    {renderSideTab({ label: "Mua sắm", icon: ShoppingListIcon, active: shoppingActive })}
                </Button>
            </div>
        </div>
        {toggleSuggester.value && <DishSuggesterScreen open={toggleSuggester.value} onClose={toggleSuggester.hide} />}
    </>
}

export const DataBackup = ({ onImportCloud }: { onImportCloud?: () => Promise<void> }) => {
    const toggleShowData = useToggle();
    const toggleImportData = useToggle();
    const [exportedData, setExportedData] = useState<string>("");
    const message = useMessage();
    const toggleImportingCloud = useToggle();

    // Restore personal data from data.txt (base64-encoded persist:personal)
    const _restorePersonalFromText = (text: string) => {
        try {
            const decoded = decodeURIComponent(escape(atob(text.trim())));
            localStorage.setItem("persist:personal", decoded);
            message.success("Khôi phục thành công! Đang tải lại...");
            setTimeout(() => window.location.reload(), 1200);
        } catch (ex) {
            message.error("Khôi phục thất bại: dữ liệu không hợp lệ");
        }
    };

    const _onImportCloud = async () => {
        if (onImportCloud) return onImportCloud();
        toggleImportingCloud.show();
        try {
            const res = await fetch(
                "https://raw.githubusercontent.com/quantran-epi/my-recipes/refs/heads/main/docs/data.txt?t=" + Date.now()
            );
            const text = await res.text();
            _restorePersonalFromText(text);
        } catch (ex: any) {
            message.error("Import thất bại: " + ex?.message);
        } finally {
            toggleImportingCloud.hide();
        }
    };

    const importDataForm = useSmartForm({
        defaultValues: { data: "" },
        onSubmit: (values) => {
            _restorePersonalFromText(values.transformValues.data);
        },
        itemDefinitions: defaultValues => ({
            data: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.data), label: "Data (base64)" }
        })
    });

    return <React.Fragment>
        <Space>
            <Button size="small" icon={<ExportOutlined />} onClick={() => {
                setExportedData(localStorage.getItem("persist:personal") ?? "");
                toggleShowData.show();
            }}>Export</Button>

            <Button size="small" icon={<ImportOutlined />} onClick={toggleImportData.show}>Import</Button>

            <Button size="small" loading={toggleImportingCloud.value} icon={<CloudDownloadOutlined />} onClick={_onImportCloud}>Import cloud</Button>
        </Space>

        <Modal title="Export — persist:personal" open={toggleShowData.value} onCancel={toggleShowData.hide} footer={null}>
            <DeferredModalContent active={toggleShowData.value} minHeight={320}>
                {toggleShowData.value ? <React.Fragment>
                    <Box style={{ height: 300, overflowY: "auto", wordBreak: "break-all", fontSize: 12 }}>
                        {exportedData}
                    </Box>
                    <br />
                    <CopyToClipboard text={exportedData} onCopy={() => message.success("Copied")}>
                        <Stack justify="flex-end"><Button>Copy</Button></Stack>
                    </CopyToClipboard>
                </React.Fragment> : null}
            </DeferredModalContent>
        </Modal>

        <Modal title="Import — persist:personal" open={toggleImportData.value} onCancel={toggleImportData.hide} footer={null}>
            <DeferredModalContent active={toggleImportData.value} minHeight={240}>
                {toggleImportData.value ? <React.Fragment>
                    <SmartForm {...importDataForm.defaultProps}>
                        <SmartForm.Item {...importDataForm.itemDefinitions.data}>
                            <TextArea rows={10} />
                        </SmartForm.Item>
                    </SmartForm>
                </React.Fragment> : null}
            </DeferredModalContent>
            <Button onClick={importDataForm.submit}>Khôi phục</Button>
        </Modal>
    </React.Fragment>
}
