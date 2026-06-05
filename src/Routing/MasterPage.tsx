import { CloudDownloadOutlined, CloudUploadOutlined, ExportOutlined, HistoryOutlined, ImportOutlined, LockOutlined, MenuOutlined, UnlockOutlined, FireOutlined, SettingOutlined, QuestionCircleOutlined, SearchOutlined, LoadingOutlined } from "@ant-design/icons";
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
import { DeferredModalContent, Modal } from "@components/Modal";
import { SmartForm, useSmartForm } from "@components/SmartForm";
import { Tooltip } from "@components/Tootip";
import { Typography } from "@components/Typography";
import { useAdminMode, useTheme, useToggle, useOnlineStatus, useSharedPublish } from "@hooks";
import { ScheduledMealToolkitWidget } from "@modules/ScheduledMeal/Screens/ScheduledMealToolkit.widget";
import { DishSuggesterScreen } from "@modules/DishSuggester/Screens/DishSuggester.screen";
import { CookingSessionWidget } from "@modules/Dishes/Screens/CookingSession.widget";
import { CookingHistoryWidget } from "@modules/Dishes/Screens/CookingHistory.widget";
import { GistBackupWidget } from "@components/GistBackupWidget";
import { UserGuideScreen } from "@modules/Home/Screens/UserGuide.screen";
import { GlobalSearchScreen } from "@modules/Home/Screens/GlobalSearch.screen";
import { addDishes, resetDishes } from "@store/Reducers/DishesReducer";
import { addIngredient, resetIngredient } from "@store/Reducers/IngredientReducer";
import { addScheduledMeal, resetScheduleMeals } from "@store/Reducers/ScheduledMealReducer";
import { addShoppingList, resetShoppingList } from "@store/Reducers/ShoppingListReducer";
import { selectCookingSessions, selectCurrentFeatureName, selectDishesById } from "@store/Selectors";
import { Drawer, Flex, Input as AntInput, Layout, Divider } from "antd";
import React, { useState } from "react";
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { flushSync } from "react-dom";
import { useDispatch, useSelector } from "react-redux";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import LogoIcon from "../../assets/icons/logo.png";
import MealsIcon from "../../assets/icons/meals.png";
import DishesIcon from "../../assets/icons/noodles.png";
import ShoppingListIcon from "../../assets/icons/shoppingList.png";
import IngredientIcon from "../../assets/icons/vegetable.png";
import SuggesterIcon from "../../assets/icons/cooking.png";
import BudgetIcon from "../../assets/icons/budget.png";
import { RootRoutes } from "./RootRoutes";

const layoutStyles: React.CSSProperties = {
    height: "100%"
}

const sidebarTransitionOverlayStyle: React.CSSProperties = {
    position: "fixed",
    top: 60,
    left: 0,
    right: 0,
    bottom: 80,
    zIndex: 850,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(180deg, rgba(255,255,255,0.9), rgba(244,248,255,0.86))",
    backdropFilter: "blur(6px)",
    pointerEvents: "auto",
};

const sidebarTransitionContentStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 12,
    minWidth: 190,
    padding: "13px 16px",
    borderRadius: 18,
    border: "1px solid rgba(22,119,255,0.14)",
    background: "rgba(255,255,255,0.96)",
    boxShadow: "0 18px 42px rgba(15,35,80,0.14)",
    color: "#12355f",
};

const sidebarTransitionIconStyle: React.CSSProperties = {
    width: 36,
    height: 36,
    borderRadius: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #e6f4ff, #f6ffed)",
    color: "#1677ff",
    fontSize: 18,
    boxShadow: "inset 0 0 0 1px rgba(22,119,255,0.08)",
};

const sidebarTransitionTextStyle: React.CSSProperties = {
    display: "block",
    color: "#102a43",
    fontSize: 13,
    fontWeight: 700,
    lineHeight: "18px",
};

const sidebarTransitionHintStyle: React.CSSProperties = {
    display: "block",
    color: "#6b7c93",
    fontSize: 11,
    lineHeight: "15px",
};

const useRouteLoadingFeedback = (pathname: string) => {
    const [routeLoading, setRouteLoading] = useState(false);
    const loadingTimerRef = React.useRef<number | null>(null);
    const loadingFrameRef = React.useRef<number | null>(null);
    const loadingFallbackTimerRef = React.useRef<number | null>(null);
    const pendingRouteRef = React.useRef<string | null>(null);

    const clearLoadingTimer = React.useCallback(() => {
        if (loadingTimerRef.current !== null) {
            window.clearTimeout(loadingTimerRef.current);
            loadingTimerRef.current = null;
        }
    }, []);

    const clearLoadingFrame = React.useCallback(() => {
        if (loadingFrameRef.current !== null) {
            window.cancelAnimationFrame(loadingFrameRef.current);
            loadingFrameRef.current = null;
        }
    }, []);

    const clearLoadingFallbackTimer = React.useCallback(() => {
        if (loadingFallbackTimerRef.current !== null) {
            window.clearTimeout(loadingFallbackTimerRef.current);
            loadingFallbackTimerRef.current = null;
        }
    }, []);

    const finishRouteLoading = React.useCallback(() => {
        pendingRouteRef.current = null;
        clearLoadingTimer();
        clearLoadingFrame();
        clearLoadingFallbackTimer();
        setRouteLoading(false);
    }, [clearLoadingFallbackTimer, clearLoadingFrame, clearLoadingTimer]);

    const startRouteLoading = React.useCallback((href: string) => {
        clearLoadingTimer();
        clearLoadingFrame();
        clearLoadingFallbackTimer();
        pendingRouteRef.current = href;
        setRouteLoading(true);
        loadingFallbackTimerRef.current = window.setTimeout(finishRouteLoading, 1200);
    }, [clearLoadingFallbackTimer, clearLoadingFrame, clearLoadingTimer, finishRouteLoading]);

    React.useEffect(() => {
        return () => {
            clearLoadingTimer();
            clearLoadingFrame();
            clearLoadingFallbackTimer();
        };
    }, [clearLoadingFallbackTimer, clearLoadingFrame, clearLoadingTimer]);

    React.useEffect(() => {
        if (!routeLoading) return;
        const pendingRoute = pendingRouteRef.current;
        if (pendingRoute && pathname !== pendingRoute) return;

        clearLoadingTimer();
        clearLoadingFrame();
        loadingFrameRef.current = window.requestAnimationFrame(() => {
            loadingFrameRef.current = window.requestAnimationFrame(() => {
                loadingFrameRef.current = null;
                loadingTimerRef.current = window.setTimeout(finishRouteLoading, 80);
            });
        });
    }, [clearLoadingFrame, clearLoadingTimer, finishRouteLoading, pathname, routeLoading]);

    return { routeLoading, startRouteLoading };
};

export const MasterPage = () => {
    const theme = useTheme();
    const currentFeatureName = useSelector(selectCurrentFeatureName);    const { isOnline } = useOnlineStatus();
    const toggleSearch = useToggle();
    const location = useLocation();

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
        {toggleSearch.value && <GlobalSearchScreen open={toggleSearch.value} onClose={toggleSearch.hide} />}
    </Layout>
}

const SidebarDrawer = () => {
    const [open, setOpen] = useState(false);
    const [pinModalOpen, setPinModalOpen] = useState(false);
    const [pin, setPin] = useState("");
    const [pinError, setPinError] = useState("");
    const [isImporting, setIsImporting] = useState(false);
    const { isAdmin, tryUnlock, lock } = useAdminMode();
    const { publishSharedData, isPublishing, lastPublishAt } = useSharedPublish();
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useDispatch();
    const message = useMessage();
    const toggleHistory = useToggle();
    const toggleGuide = useToggle();
    const { routeLoading, startRouteLoading } = useRouteLoadingFeedback(location.pathname);

    const showDrawer = () => {
        setOpen(true);
    };

    const onClose = () => {
        setOpen(false);
    };

    const onNavigate = (href: string) => {
        if (location.pathname === href) {
            flushSync(() => setOpen(false));
            return;
        }

        flushSync(() => {
            setOpen(false);
            startRouteLoading(href);
        });
        React.startTransition(() => navigate(href));
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
            const res = await fetch("https://raw.githubusercontent.com/quantran-epi/my-recipes/refs/heads/main/docs/shared-data.json?t=" + Date.now());
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const text = await res.text();
            if (!text || !text.trim()) throw new Error("Dữ liệu chia sẻ trống");
            const data = JSON.parse(text);
            dispatch(resetIngredient());
            dispatch(resetDishes());
            (data.ingredients ?? []).forEach(ingre => dispatch(addIngredient(ingre)));
            (data.dishes ?? []).forEach(dish => dispatch(addDishes(dish)));
            message.success("Đồng bộ dữ liệu dùng chung thành công");
        } catch (ex: any) {
            message.error("Đồng bộ thất bại: " + ex?.message);
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <React.Fragment>
            <Button type="primary" data-testid="sidebar-drawer-button" onClick={showDrawer} icon={<MenuOutlined />} />
            {routeLoading && (
                <div style={sidebarTransitionOverlayStyle}>
                    <div style={sidebarTransitionContentStyle}>
                        <div style={sidebarTransitionIconStyle}><LoadingOutlined /></div>
                        <div>
                            <span style={sidebarTransitionTextStyle}>Đang mở trang</span>
                            <span style={sidebarTransitionHintStyle}>Chuẩn bị dữ liệu hiển thị</span>
                        </div>
                    </div>
                </div>
            )}
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
                <Menu
                    style={{ borderInlineEnd: "none" }}
                    items={[
                        {
                            key: 'dashboard', label: <Flex align="center" gap={10}>
                                <Image src={LogoIcon} width={24} alt="" />
                                <span>Tổng quan</span>
                            </Flex>, onClick: () => onNavigate(RootRoutes.AuthorizedRoutes.Root())
                        },
                        {
                            key: "ingredients", label: <Flex align="center" gap={10}>
                                <Image src={IngredientIcon} width={24} alt="" />
                                <span>Nguyên liệu</span>
                            </Flex>, onClick: () => onNavigate(RootRoutes.AuthorizedRoutes.IngredientRoutes.List())
                        },
                        {
                            key: "dishes", label: <Flex align="center" gap={10}>
                                <Image src={DishesIcon} width={24} alt="" />
                                <span>Món ăn</span>
                            </Flex>, onClick: () => onNavigate(RootRoutes.AuthorizedRoutes.DishesRoutes.List())
                        },
                        {
                            key: "expensePlanner", label: <Flex align="center" gap={10}>
                                <Image src={BudgetIcon} width={24} alt="" />
                                <span>Kế hoạch chi phí</span>
                            </Flex>, onClick: () => onNavigate(RootRoutes.AuthorizedRoutes.ExpensePlanner())
                        },
                        {
                            key: "shoppingList", label: <Flex align="center" gap={10}>
                                <Image src={ShoppingListIcon} width={24} alt="" />
                                <span>Lịch mua sắm</span>
                            </Flex>, onClick: () => onNavigate(RootRoutes.AuthorizedRoutes.ShoppingListRoutes.List())
                        },
                        {
                            key: "meals", label: <Flex align="center" gap={10}>
                                <Image src={MealsIcon} width={24} alt="" />
                                <span>Thực đơn</span>
                            </Flex>, onClick: () => onNavigate(RootRoutes.AuthorizedRoutes.ScheduledMealRoutes.List())
                        }
                    ]}
                />

                <Box style={{ padding: "0 16px 24px" }}>

                    {/* ── Sync shared data ── */}
                    <Divider orientation="left" style={{ fontSize: 12, color: "#888", marginTop: 16, marginBottom: 12 }}>Dữ liệu dùng chung</Divider>
                    <Flex vertical gap={4}>
                        <Button
                            icon={<CloudDownloadOutlined />}
                            loading={isImporting}
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
    const navigate = useNavigate();
    const location = useLocation();
    const theme = useTheme();
    const toggleSuggester = useToggle();
    const { routeLoading, startRouteLoading } = useRouteLoadingFeedback(location.pathname);

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
            borderTop: "0.5px solid " + theme.token.colorBorder,
            zIndex: 900,
            touchAction: "manipulation",
        }
    }

    const _textStyles = (route: string): React.CSSProperties => {
        return {
            color: route === location.pathname ? theme.token.colorPrimary : undefined,
            fontWeight: route === location.pathname ? "bold" : undefined,
            fontSize: 16
        }
    }

    const onNavigate = (href: string) => {
        if (location.pathname === href) return;
        flushSync(() => startRouteLoading(href));
        React.startTransition(() => navigate(href));
    }

    return <>
        {routeLoading && (
            <div style={sidebarTransitionOverlayStyle}>
                <div style={sidebarTransitionContentStyle}>
                    <div style={sidebarTransitionIconStyle}><LoadingOutlined /></div>
                    <div>
                        <span style={sidebarTransitionTextStyle}>Đang mở trang</span>
                        <span style={sidebarTransitionHintStyle}>Chuẩn bị dữ liệu hiển thị</span>
                    </div>
                </div>
            </div>
        )}
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
        </Stack>
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
