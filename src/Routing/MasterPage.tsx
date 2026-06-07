import { CloudDownloadOutlined, CloudUploadOutlined, ExportOutlined, HistoryOutlined, ImportOutlined, LockOutlined, MenuOutlined, UnlockOutlined, FireOutlined, QuestionCircleOutlined, SearchOutlined, LoadingOutlined } from "@ant-design/icons";
import { ObjectPropertyHelper } from "@common/Helpers/ObjectProperty";
import { getStorageString, setStorageString } from "@common/Storage/AppStorage";
import { SharedSyncModal } from "@components/AppInitializer/SharedSyncModal";
import { Button } from "@components/Button";
import { FastDrawerShell } from "@components/FastOverlay";
import { TextArea } from "@components/Form/Input";
import { Image } from "@components/Image";
import { Box } from "@components/Layout/Box";
import { Content } from "@components/Layout/Content";
import { Header } from "@components/Layout/Header";
import { Space } from "@components/Layout/Space";
import { Stack } from "@components/Layout/Stack";
import { useMessage } from "@components/Message";
import { DeferredModalContent, Modal } from "@components/Modal";
import { useModal } from "@components/Modal/ModalProvider";
import { SmartForm, useSmartForm } from "@components/SmartForm";
import { Tooltip } from "@components/Tootip";
import { Typography } from "@components/Typography";
import { useAdminMode, useToggle, useOnlineStatus, useSharedPublish, useSharedDataSync, type SyncedVersions } from "@hooks";
import { ScheduledMealToolkitWidget } from "@modules/ScheduledMeal/Screens/ScheduledMealToolkit.widget";
import { DishSuggesterScreen } from "@modules/DishSuggester/Screens/DishSuggester.screen";
import { CookingSessionWidget } from "@modules/Dishes/Screens/CookingSession.widget";
import { CookingHistoryWidget } from "@modules/Dishes/Screens/CookingHistory.widget";
import { GistBackupWidget } from "@components/GistBackupWidget";
import { UserGuideScreen } from "@modules/Home/Screens/UserGuide.screen";
import { GlobalSearchScreen } from "@modules/Home/Screens/GlobalSearch.screen";
import { selectCookingSessions, selectCurrentFeatureName, selectDishesById } from "@store/Selectors";
import { Flex, Input as AntInput, Layout, Divider } from "antd";
import React, { useState } from "react";
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { useSelector } from "react-redux";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import LogoIcon from "../../assets/icons/logo.png";
import HouseIcon from "../../assets/icons/house.png";
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

const APP_CONFIRM_Z_INDEX = 5200;

const headerActionButtonStyle: React.CSSProperties = {
    width: 38,
    height: 38,
    borderRadius: 999,
    background: "rgba(255,255,255,0.16)",
    border: "1px solid rgba(255,255,255,0.24)",
    color: "#fff",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18)",
};

const getMonthLabel = () => new Date().toLocaleDateString("vi-VN", { month: "short", year: "numeric" });

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
            case 'Tổng quan': return HouseIcon;
            default: return null;
        }
    }

    return <AppShellNavigationProvider value={appShellNavigation}>
        <Layout style={layoutStyles}>
            <Header style={{
                height: 76,
                lineHeight: "normal",
                padding: "10px 12px 12px",
                background: "linear-gradient(135deg, #8d46f6 0%, #7436dc 58%, #5e2bbf 100%)",
                borderBottom: 0,
                boxShadow: "0 12px 26px rgba(95, 43, 191, 0.22)",
                color: "#fff",
                zIndex: 10,
            }}>
                <Stack justify="space-between" align="center" gap={10} style={{ height: "100%" }}>
                    <Stack align="center" gap={9} style={{ minWidth: 0 }}>
                        <SidebarDrawer buttonStyle={headerActionButtonStyle} />
                        <div style={{ minWidth: 0 }}>
                            <Typography.Text style={{ display: "block", color: "rgba(255,255,255,0.82)", fontSize: 11, lineHeight: "14px", fontWeight: 650 }}>My Recipes</Typography.Text>
                            <Tooltip title={currentFeatureName}>
                                <Typography.Paragraph style={{ fontSize: 19, lineHeight: "23px", fontWeight: 750, marginBottom: 0, maxWidth: 210, color: "#fff" }} ellipsis>{currentFeatureName}</Typography.Paragraph>
                            </Tooltip>
                        </div>
                    </Stack>
                    <Stack align="center" gap={6} style={{ flexShrink: 0 }}>
                        <span style={{ borderRadius: 999, padding: "5px 9px", background: "rgba(255,255,255,0.16)", border: "1px solid rgba(255,255,255,0.22)", color: "#fff", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
                            {getMonthLabel()}
                        </span>
                        <Button
                            type="text"
                            aria-label="Tìm kiếm toàn cục"
                            data-testid="global-search-button"
                            icon={<SearchOutlined style={{ fontSize: 18 }} />}
                            onClick={toggleSearch.show}
                            style={headerActionButtonStyle}
                        />
                        {_featureIcon() && <span style={{ width: 38, height: 38, borderRadius: "50%", background: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 18px rgba(34, 17, 83, 0.22)" }}>
                            <Image src={_featureIcon()} width={24} loading="eager" alt={currentFeatureName} />
                        </span>}
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

const SidebarDrawer = ({ buttonStyle }: { buttonStyle?: React.CSSProperties }) => {
    const [open, setOpen] = useState(false);
    const [pinModalOpen, setPinModalOpen] = useState(false);
    const [pin, setPin] = useState("");
    const [pinError, setPinError] = useState("");
    const { isAdmin, tryUnlock, lock } = useAdminMode();
    const {
        publishSharedData,
        isPublishing,
        lastPublishAt,
        githubToken,
        setGithubToken,
        clearGithubToken,
        hasGithubToken,
        githubTokenSource,
        testGithubToken,
        isTestingGithubToken,
    } = useSharedPublish();
    const { pendingSync, isSyncChecking, checkNow, dismissSync, markSynced } = useSharedDataSync();
    const message = useMessage();
    const modal = useModal();
    const toggleHistory = useToggle();
    const toggleGuide = useToggle();
    const { navigateWithFeedback } = useAppShellNavigation();
    const toolsReady = useDeferredDrawerTools(open);
    const location = useLocation();
    const [publishTokenInput, setPublishTokenInput] = useState(githubToken);

    React.useEffect(() => {
        setPublishTokenInput(githubToken);
    }, [githubToken]);

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

    const onUnlock = async () => {
        if (await tryUnlock(pin)) {
            setPinModalOpen(false);
            setPin("");
            setPinError("");
            window.location.reload();
        } else {
            setPinError("Sai mã PIN");
        }
    };

    const onLock = async () => {
        await lock();
        window.location.reload();
    };

    const onImportCloud = async () => {
        try {
            const nextPendingSync = await checkNow({ force: true });
            if (nextPendingSync) {
                setOpen(false);
            } else {
                message.success("Dữ liệu dùng chung đã mới nhất");
            }
        } catch (ex: any) {
            message.error("Đồng bộ thất bại: " + ex?.message);
        }
    };

    const onSharedSyncDone = async (synced: SyncedVersions) => {
        await markSynced(synced);
        message.success("Đồng bộ dữ liệu dùng chung thành công");
    };

    const onSavePublishToken = async () => {
        await setGithubToken(publishTokenInput);
        message.success("Đã lưu GitHub token xuất bản trên thiết bị này");
    };

    const onClearPublishToken = async () => {
        await clearGithubToken();
        setPublishTokenInput("");
        message.success("Đã xoá GitHub token xuất bản trên thiết bị này");
    };

    const onTestPublishToken = () => {
        testGithubToken(publishTokenInput);
    };

    const onPublishSharedData = () => {
        modal.confirm({
            title: "Xác nhận xuất bản dữ liệu dùng chung",
            content: "Thao tác này sẽ ghi các file dữ liệu dùng chung đã tách nhỏ lên GitHub để các thiết bị khác đồng bộ. Bạn có chắc muốn xuất bản dữ liệu hiện tại?",
            okText: "Xuất bản",
            cancelText: "Hủy",
            centered: true,
            zIndex: APP_CONFIRM_Z_INDEX,
            onOk: publishSharedData,
        });
    };

    const publishTokenSaved = publishTokenInput.trim() === githubToken;
    const publishTokenStatusText = githubTokenSource === "local"
        ? "Đang dùng token lưu trên thiết bị này."
        : githubTokenSource === "build"
            ? "Đang dùng token cấu hình sẵn. Bạn có thể nhập token khác để ghi đè trên thiết bị này."
            : "Chưa có token xuất bản. Token chỉ lưu trong trình duyệt của thiết bị này.";

    const sidebarNavItems = [
        { key: 'dashboard', href: RootRoutes.AuthorizedRoutes.Root(), icon: HouseIcon, label: 'Tổng quan' },
        { key: 'ingredients', href: RootRoutes.AuthorizedRoutes.IngredientRoutes.List(), icon: IngredientIcon, label: 'Nguyên liệu' },
        { key: 'dishes', href: RootRoutes.AuthorizedRoutes.DishesRoutes.List(), icon: DishesIcon, label: 'Món ăn' },
        { key: 'expensePlanner', href: RootRoutes.AuthorizedRoutes.ExpensePlanner(), icon: BudgetIcon, label: 'Kế hoạch chi phí' },
        { key: 'shoppingList', href: RootRoutes.AuthorizedRoutes.ShoppingListRoutes.List(), icon: ShoppingListIcon, label: 'Lịch mua sắm' },
        { key: 'meals', href: RootRoutes.AuthorizedRoutes.ScheduledMealRoutes.List(), icon: MealsIcon, label: 'Thực đơn' },
    ];

    return (
        <React.Fragment>
            <Button type="text" data-testid="sidebar-drawer-button" onClick={showDrawer} icon={<MenuOutlined style={{ fontSize: 18 }} />} style={buttonStyle} />
            <FastDrawerShell
                title={
                    <Flex align="center" gap={10}>
                        <Image src={LogoIcon} width={32} loading="eager" alt="My Recipes" />
                        <Typography.Text style={{ fontSize: 22, fontWeight: 600 }}>My Recipes</Typography.Text>
                    </Flex>
                }
                onClose={onClose}
                open={open}
                data-testid="sidebar-drawer"
                width="min(360px, calc(100vw - 38px))"
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
                                <div style={{ border: "1px solid #f0f0f0", borderRadius: 8, padding: "8px 10px", background: "#fafafa", marginBottom: 6 }}>
                                    <Flex vertical gap={6}>
                                        <Typography.Text strong style={{ fontSize: 12 }}>GitHub token xuất bản</Typography.Text>
                                        <AntInput.Password
                                            size="small"
                                            autoComplete="off"
                                            placeholder="Token có quyền ghi repo contents"
                                            value={publishTokenInput}
                                            onChange={e => setPublishTokenInput(e.target.value)}
                                        />
                                        <Flex gap={6}>
                                            <Button size="small" type="dashed" disabled={publishTokenSaved} onClick={onSavePublishToken} block>
                                                Lưu token
                                            </Button>
                                            <Button size="small" loading={isTestingGithubToken} disabled={!publishTokenInput.trim() && !hasGithubToken} onClick={onTestPublishToken} block>
                                                Kiểm tra
                                            </Button>
                                            <Button size="small" type="text" disabled={!githubToken} onClick={onClearPublishToken} block>
                                                Xoá
                                            </Button>
                                        </Flex>
                                        <Typography.Text type="secondary" style={{ fontSize: 11, lineHeight: "16px" }}>
                                            {publishTokenStatusText}
                                        </Typography.Text>
                                    </Flex>
                                </div>
                                <Button
                                    icon={<CloudUploadOutlined />}
                                    loading={isPublishing}
                                    disabled={!hasGithubToken}
                                    onClick={onPublishSharedData}
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
                                    <Button size="small" type="text" danger onClick={onLock}>Khoá</Button>
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
            </FastDrawerShell>
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
                    force={pendingSync.force}
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
            onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    _onPillClick();
                }
            }}
            role="button"
            tabIndex={0}
            data-testid="active-cooking-floating-button"
            style={{
                position: 'fixed',
                bottom: 76,
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'linear-gradient(135deg, #1f1f1f 0%, #3b2a1d 48%, #d46b08 100%)',
                color: '#fff',
                borderRadius: 999,
                padding: '9px 16px 9px 10px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                minHeight: 52,
                border: '1px solid rgba(255,255,255,0.72)',
                boxShadow: '0 10px 28px rgba(31,31,31,0.26), 0 0 0 4px rgba(250,140,22,0.16)',
                cursor: 'pointer',
                zIndex: 1000,
                userSelect: 'none',
                whiteSpace: 'nowrap',
                maxWidth: 'calc(100vw - 32px)',
            }}
        >
            <span style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.18)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.24)",
                flexShrink: 0,
            }}>
                <FireOutlined style={{ fontSize: 18 }} />
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <span style={{ fontSize: 11, fontWeight: 750, letterSpacing: 0, opacity: 0.86, lineHeight: "14px" }}>
                    Đang nấu
                </span>
                <span style={{ fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: "18px" }}>
                    {activeSessions.length > 1
                        ? `${activeSessions.length} món đang nấu`
                        : displaySession.dishName}
                </span>
                {activeSessions.length === 1 && displaySession.steps?.length > 0 && (
                    <span style={{ fontSize: 11, opacity: 0.88, lineHeight: "15px" }}>
                        Bước {(displaySession.currentStepIndex ?? 0) + 1}/{displaySession.steps.length}
                        {displaySession.steps[displaySession.currentStepIndex ?? 0]
                            ? ` - ${displaySession.steps[displaySession.currentStepIndex ?? 0].length > 30
                                ? displaySession.steps[displaySession.currentStepIndex ?? 0].slice(0, 30) + "…"
                                : displaySession.steps[displaySession.currentStepIndex ?? 0]}`
                            : ""}
                    </span>
                )}
                {activeSessions.length === 1 && !displaySession.steps?.length && (
                    <span style={{ fontSize: 11, opacity: 0.88, lineHeight: "15px" }}>Nhấn để hoàn thành</span>
                )}
                {activeSessions.length > 1 && (
                    <span style={{ fontSize: 11, opacity: 0.88, lineHeight: "15px" }}>Nhấn để chuyển món</span>
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
    const toggleSuggester = useToggle();
    const { navigateWithFeedback, isRouteFeedbackActive, pendingDestination } = useAppShellNavigation();
    const dishesRoute = RootRoutes.AuthorizedRoutes.DishesRoutes.List();
    const mealsRoute = RootRoutes.AuthorizedRoutes.ScheduledMealRoutes.List();
    const shoppingRoute = RootRoutes.AuthorizedRoutes.ShoppingListRoutes.List();
    const budgetRoute = RootRoutes.AuthorizedRoutes.ExpensePlanner();
    const pendingRoute = isRouteFeedbackActive ? pendingDestination : null;
    const isRouteActive = (href: string) => location.pathname === href || pendingRoute === href;
    const dishesActive = isRouteActive(dishesRoute);
    const mealsActive = isRouteActive(mealsRoute);
    const shoppingActive = isRouteActive(shoppingRoute);
    const budgetActive = isRouteActive(budgetRoute);

    const _containerStyles = (): React.CSSProperties => {
        return {
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            width: "100%",
            minHeight: 88,
            padding: "16px 10px calc(8px + env(safe-area-inset-bottom))",
            boxSizing: "border-box",
            overflow: "visible",
            zIndex: 900,
            touchAction: "manipulation",
            pointerEvents: "none",
        }
    }

    const _dockStyles = (): React.CSSProperties => {
        return {
            position: "relative",
            width: "min(392px, calc(100vw - 24px))",
            height: 64,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 0,
            padding: "6px 8px",
            boxSizing: "border-box",
            border: "1px solid rgba(226, 232, 240, 0.96)",
            borderRadius: 20,
            background: "#ffffff",
            boxShadow: "0 14px 34px rgba(15, 23, 42, 0.14), 0 5px 12px rgba(15, 23, 42, 0.07)",
            pointerEvents: "auto",
            overflow: "visible",
        }
    }

    const _buttonStyles = (active: boolean): React.CSSProperties => {
        return {
            flex: "1 1 0",
            position: "relative",
            zIndex: 1,
            minWidth: 0,
            maxWidth: 62,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
            height: 52,
            border: 0,
            borderRadius: 14,
            background: active ? "rgba(245, 130, 32, 0.10)" : "transparent",
            color: active ? "#1f2937" : "#6b7280",
            cursor: "pointer",
            font: "inherit",
            padding: "4px 2px 3px",
            boxSizing: "border-box",
            transition: "color 160ms ease, transform 160ms ease",
        }
    }

    const _suggesterButtonStyles = (): React.CSSProperties => {
        return {
            width: 74,
            height: 82,
            position: "relative",
            zIndex: 3,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 3,
            border: 0,
            borderRadius: 20,
            background: "transparent",
            color: "#1f2937",
            cursor: "pointer",
            font: "inherit",
            padding: 0,
            boxSizing: "border-box",
            transform: "translateY(-15px)",
            transition: "transform 160ms ease",
        }
    }

    const _sideIconShellStyles = (active: boolean): React.CSSProperties => {
        return {
            width: 26,
            height: 26,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 10,
            background: active ? "rgba(245, 130, 32, 0.12)" : "transparent",
            flexShrink: 0,
        }
    }

    const _centerBumpStyles = (): React.CSSProperties => {
        return {
            position: "absolute",
            zIndex: 1,
            top: -24,
            left: "50%",
            width: 76,
            height: 76,
            borderRadius: "50%",
            transform: "translateX(-50%)",
            background: "#ffffff",
            pointerEvents: "none",
        }
    }

    const _centerIconShellStyles = (active: boolean): React.CSSProperties => {
        return {
            position: "relative",
            zIndex: 2,
            width: 54,
            height: 54,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "50%",
            border: "5px solid #ffffff",
            background: active
                ? "linear-gradient(135deg, #0395ff 0%, #10b6ff 100%)"
                : "linear-gradient(135deg, #0aa7ff 0%, #1db7ff 100%)",
            boxShadow: active
                ? "0 10px 20px rgba(0, 153, 255, 0.32)"
                : "0 8px 18px rgba(0, 153, 255, 0.28)",
            boxSizing: "border-box",
            flexShrink: 0,
        }
    }

    const _labelStyles = (active: boolean): React.CSSProperties => {
        return {
            display: "block",
            color: active ? "#1f2937" : "#6b7280",
            fontWeight: active ? 650 : 500,
            fontSize: 10,
            lineHeight: "13px",
            whiteSpace: "nowrap",
            maxWidth: "100%",
            overflow: "hidden",
            textOverflow: "ellipsis",
        }
    }

    const _centerLabelStyles = (): React.CSSProperties => {
        return {
            display: "block",
            color: "#1f2937",
            fontWeight: 650,
            fontSize: 10,
            lineHeight: "13px",
            whiteSpace: "nowrap",
            marginTop: 0,
        }
    }

    const onNavigate = (href: string) => {
        if (location.pathname === href && !isRouteFeedbackActive) return;
        navigateWithFeedback(href);
    }

    return <>
        <div style={_containerStyles()} data-testid="bottom-tab-navigator">
            <div style={_dockStyles()}>
                <div style={_centerBumpStyles()} />
                <button
                    type="button"
                    aria-pressed={dishesActive}
                    aria-label="Món ăn"
                    data-testid="bottom-tab-dishes"
                    style={_buttonStyles(dishesActive)}
                    onClick={() => onNavigate(dishesRoute)}
                >
                    <span style={_sideIconShellStyles(dishesActive)}>
                        <Image src={DishesIcon} preview={false} width={21} alt="" />
                    </span>
                    <Typography.Text style={_labelStyles(dishesActive)}>Món ăn</Typography.Text>
                </button>
                <button
                    type="button"
                    aria-pressed={mealsActive}
                    aria-label="Thực đơn"
                    data-testid="bottom-tab-scheduled-meals"
                    style={_buttonStyles(mealsActive)}
                    onClick={() => onNavigate(mealsRoute)}
                >
                    <span style={_sideIconShellStyles(mealsActive)}>
                        <Image src={MealsIcon} preview={false} width={21} alt="" />
                    </span>
                    <Typography.Text style={_labelStyles(mealsActive)}>Thực đơn</Typography.Text>
                </button>
                <button
                    type="button"
                    aria-pressed={toggleSuggester.value}
                    aria-label="Nấu gì?"
                    data-testid="bottom-tab-suggester"
                    style={_suggesterButtonStyles()}
                    onClick={toggleSuggester.show}
                >
                    <span style={_centerIconShellStyles(toggleSuggester.value)}>
                        <Image src={SuggesterIcon} preview={false} width={27} alt="" />
                    </span>
                    <Typography.Text style={_centerLabelStyles()}>Nấu gì?</Typography.Text>
                </button>
                <button
                    type="button"
                    aria-pressed={shoppingActive}
                    aria-label="Mua sắm"
                    data-testid="bottom-tab-shopping-list"
                    style={_buttonStyles(shoppingActive)}
                    onClick={() => onNavigate(shoppingRoute)}
                >
                    <span style={_sideIconShellStyles(shoppingActive)}>
                        <Image src={ShoppingListIcon} preview={false} width={21} alt="" />
                    </span>
                    <Typography.Text style={_labelStyles(shoppingActive)}>Mua sắm</Typography.Text>
                </button>
                <button
                    type="button"
                    aria-pressed={budgetActive}
                    aria-label="Chi phí"
                    data-testid="bottom-tab-expense-planner"
                    style={_buttonStyles(budgetActive)}
                    onClick={() => onNavigate(budgetRoute)}
                >
                    <span style={_sideIconShellStyles(budgetActive)}>
                        <Image src={BudgetIcon} preview={false} width={21} alt="" />
                    </span>
                    <Typography.Text style={_labelStyles(budgetActive)}>Chi phí</Typography.Text>
                </button>
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

    // Restore personal data from a raw or base64-encoded persisted personal root.
    const _restorePersonalFromText = async (text: string) => {
        try {
            const trimmed = text.trim();
            let decoded = trimmed;
            try {
                decoded = decodeURIComponent(escape(atob(trimmed)));
            } catch { }
            JSON.parse(decoded);
            await setStorageString("persist:personal", decoded);
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
            await _restorePersonalFromText(text);
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
            <Button size="small" icon={<ExportOutlined />} onClick={async () => {
                setExportedData(await getStorageString("persist:personal") ?? "");
                toggleShowData.show();
            }}>Export</Button>

            <Button size="small" icon={<ImportOutlined />} onClick={toggleImportData.show}>Import</Button>

            <Button size="small" loading={toggleImportingCloud.value} icon={<CloudDownloadOutlined />} onClick={_onImportCloud}>Import cloud</Button>
        </Space>

        <Modal title="Export — dữ liệu cá nhân" open={toggleShowData.value} onCancel={toggleShowData.hide} footer={null}>
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

        <Modal title="Import — dữ liệu cá nhân" open={toggleImportData.value} onCancel={toggleImportData.hide} footer={null}>
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
