import { CloudDownloadOutlined, CloudUploadOutlined, DatabaseOutlined, ExportOutlined, HistoryOutlined, ImportOutlined, LockOutlined, MedicineBoxOutlined, MenuOutlined, UnlockOutlined, FireOutlined, QuestionCircleOutlined, SearchOutlined, LoadingOutlined, SyncOutlined, SettingOutlined } from "@ant-design/icons";
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
import { GlobalSearchScreen } from "@modules/Home/Screens/GlobalSearch.screen";
import { isUserGuideWelcomeComplete } from "@modules/Home/Screens/UserGuideOnboardingStorage";
import { selectCookingSessions, selectCurrentFeatureName, selectDishesById, selectInventoryHealthConfig } from "@store/Selectors";
import { Flex, Input as AntInput, Layout, Divider, InputNumber } from "antd";
import React, { useState } from "react";
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { useDispatch, useSelector } from "react-redux";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import LogoIcon from "../../assets/icons/logo.png";
import HouseIcon from "../../assets/icons/house.png";
import FamilyIcon from "../../assets/icons/family.png";
import DietPlanIcon from "../../assets/icons/diet-plan.png";
import DishesIcon from "../../assets/icons/noodles.png";
import ShoppingListIcon from "../../assets/icons/shoppingList.png";
import IngredientIcon from "../../assets/icons/vegetable.png";
import SuggesterIcon from "../../assets/icons/cooking.png";
import BudgetIcon from "../../assets/icons/budget.png";
import MonitorIcon from "../../assets/icons/monitor.png";
import LayoutIcon from "../../assets/icons/layout.png";
import MedicalRecordIcon from "../../assets/icons/medical-record.png";
import NutritionPlanIcon from "../../assets/icons/nutrition-plan.png";
import { INGREDIENT_PRESERVATION_OPTIONS, INGREDIENT_SHELF_LIFE_OPTIONS, IngredientPreservationCondition, IngredientShelfLife } from "@store/Models/Ingredient";
import { DEFAULT_INVENTORY_HEALTH_CONFIG, InventoryHealthConfig, normalizeInventoryHealthConfig } from "@store/Models/SharedConfig";
import { updateInventoryConfig } from "@store/Reducers/SharedConfigReducer";
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
    color: "#8f46f7",
};

const sidebarNavListStyle: React.CSSProperties = {
    padding: "10px 8px 8px",
};

const sidebarNavGroupStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    marginBottom: 14,
};

const sidebarNavSectionLabelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: "#9b8fb5",
    padding: "0 12px",
    marginBottom: 4,
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

type HeaderVisual = {
    tone: string;
    shadow: string;
}

const defaultHeaderVisual: HeaderVisual = {
    tone: "#8d46f6",
    shadow: "rgba(95,43,191,0.22)",
};

const headerVisualByFeatureName: Record<string, HeaderVisual> = {
    "Tổng quan": { tone: "#7436dc", shadow: "rgba(95,43,191,0.24)" },
    "Nguyên liệu": { tone: "#389e0d", shadow: "rgba(44,128,56,0.22)" },
    "Món ăn": { tone: "#fa541c", shadow: "rgba(190,79,30,0.22)" },
    "Nấu gì?": { tone: "#13a8a8", shadow: "rgba(19,130,130,0.22)" },
    "Nhà mình": { tone: "#1677ff", shadow: "rgba(22,88,210,0.23)" },
    "Lập thực đơn": { tone: "#13a8a8", shadow: "rgba(19,130,130,0.22)" },
    "Thực đơn": { tone: "#1677ff", shadow: "rgba(22,88,210,0.23)" },
    "Lịch mua sắm": { tone: "#0958d9", shadow: "rgba(9,88,217,0.24)" },
    "Tính chi phí": { tone: "#d46b08", shadow: "rgba(180,92,18,0.23)" },
    "Phân tích": { tone: "#2f54eb", shadow: "rgba(47,84,235,0.23)" },
    "Dinh dưỡng": { tone: "#13a8a8", shadow: "rgba(19,130,130,0.22)" },
    "Mẫu dùng lại": { tone: "#fa8c16", shadow: "rgba(196,105,22,0.22)" },
    "Sức khỏe dữ liệu": { tone: "#cf1322", shadow: "rgba(176,32,48,0.22)" },
    "Hướng dẫn": { tone: "#8f46f7", shadow: "rgba(95,43,191,0.22)" },
    "Tour hướng dẫn": { tone: "#8f46f7", shadow: "rgba(95,43,191,0.22)" },
    "Chào mừng": { tone: "#8f46f7", shadow: "rgba(95,43,191,0.22)" },
};

const getHeaderVisualByPath = (pathname: string): HeaderVisual | null => {
    if (pathname.includes("/ingredient")) return headerVisualByFeatureName["Nguyên liệu"];
    if (pathname.includes("/dishes")) return headerVisualByFeatureName["Món ăn"];
    if (pathname.includes("/dish-suggester")) return headerVisualByFeatureName["Nấu gì?"];
    if (pathname.includes("/household")) return headerVisualByFeatureName["Nhà mình"];
    if (pathname.includes("/smart-meal-planner")) return headerVisualByFeatureName["Lập thực đơn"];
    if (pathname.includes("/scheduledMeal")) return headerVisualByFeatureName["Thực đơn"];
    if (pathname.includes("/shoppingList")) return headerVisualByFeatureName["Lịch mua sắm"];
    if (pathname.includes("/expense-planner")) return headerVisualByFeatureName["Tính chi phí"];
    if (pathname.includes("/analytics")) return headerVisualByFeatureName["Phân tích"];
    if (pathname.includes("/nutrition-goals")) return headerVisualByFeatureName["Dinh dưỡng"];
    if (pathname.includes("/templates")) return headerVisualByFeatureName["Mẫu dùng lại"];
    if (pathname.includes("/sync-backup-health")) return headerVisualByFeatureName["Sức khỏe dữ liệu"];
    if (pathname.includes("/guide")) return headerVisualByFeatureName["Hướng dẫn"];
    return null;
};

const getHeaderVisual = (featureName: string, pathname: string): HeaderVisual => {
    return getHeaderVisualByPath(pathname) ?? headerVisualByFeatureName[featureName] ?? defaultHeaderVisual;
};

const createHeaderBackground = (visual: HeaderVisual) => `linear-gradient(135deg, ${visual.tone} 0%, #7436dc 58%, #5e2bbf 100%)`;

const getHeaderDateLabel = () => {
    const date = new Date();
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${day}, ${month} ${date.getFullYear()}`;
};

const sidebarNavButtonStyle = (active: boolean): React.CSSProperties => ({
    width: "100%",
    minHeight: 48,
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 12px",
    border: active ? "1px solid rgba(116, 54, 220, 0.16)" : "1px solid transparent",
    borderRadius: 8,
    background: active ? "linear-gradient(135deg, #f5f0ff 0%, #ffffff 100%)" : "transparent",
    color: active ? "#5e2bbf" : "#2f2545",
    font: "inherit",
    fontSize: 16,
    fontWeight: active ? 650 : 500,
    textAlign: "left",
    cursor: "pointer",
    boxShadow: active ? "0 8px 18px rgba(116, 54, 220, 0.10)" : "none",
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
    const currentFeatureName = useSelector(selectCurrentFeatureName);
    const { isOnline } = useOnlineStatus();
    const toggleSearch = useToggle();
    const location = useLocation();
    const navigate = useNavigate();
    const appShellNavigation = useAppShellNavigationController(location.pathname, navigate);
    const headerVisual = getHeaderVisual(currentFeatureName, location.pathname);

    React.useEffect(() => {
        const welcomeRoute = RootRoutes.AuthorizedRoutes.UserGuideWelcome();
        if (location.pathname === welcomeRoute) return;
        if (isUserGuideWelcomeComplete()) return;
        navigate(welcomeRoute, { replace: true });
    }, [location.pathname, navigate]);

    React.useEffect(() => {
        const content = document.getElementById("app-content");
        if (!content) return;
        content.scrollTop = 0;
        content.scrollTo({ top: 0, behavior: "auto" });
    }, [location.pathname]);

    const _featureIcon = () => {
        switch (currentFeatureName) {
            case "Món ăn": return DishesIcon;
            case "Thực đơn": return DietPlanIcon;
            case "Lịch mua sắm": return ShoppingListIcon;
            case "Nguyên liệu": return IngredientIcon;
            case "Tính chi phí": return BudgetIcon;
            case "Phân tích": return MonitorIcon;
            case "Dinh dưỡng": return NutritionPlanIcon;
            case "Mẫu dùng lại": return LayoutIcon;
            case "Nhà mình": return FamilyIcon;
            case "Lập thực đơn": return DietPlanIcon;
            case "Sức khỏe dữ liệu": return MedicalRecordIcon;
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
                background: createHeaderBackground(headerVisual),
                borderBottom: 0,
                boxShadow: `0 12px 26px ${headerVisual.shadow}`,
                color: "#fff",
                zIndex: 10,
            }}>
                <Stack justify="space-between" align="center" gap={10} style={{ height: "100%" }}>
                    <Stack align="center" gap={9} style={{ minWidth: 0, flex: "1 1 auto" }}>
                        <SidebarDrawer buttonStyle={headerActionButtonStyle} />
                        <div style={{ minWidth: 0 }}>
                            <Typography.Text style={{ display: "block", color: "rgba(255,255,255,0.82)", fontSize: 11, lineHeight: "14px", fontWeight: 650 }}>My Recipes</Typography.Text>
                            <Tooltip title={currentFeatureName}>
                                <Typography.Paragraph style={{ fontSize: 18, lineHeight: "22px", fontWeight: 750, marginBottom: 0, maxWidth: "min(190px, calc(100vw - 210px))", color: "#fff" }} ellipsis>{currentFeatureName}</Typography.Paragraph>
                            </Tooltip>
                        </div>
                    </Stack>
                    <Stack align="center" gap={6} style={{ flexShrink: 0 }}>
                        <span style={{ borderRadius: 999, padding: "5px 9px", background: "rgba(255,255,255,0.16)", border: "1px solid rgba(255,255,255,0.22)", color: "#fff", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
                            {getHeaderDateLabel()}
                        </span>
                        <Button
                            type="text"
                            aria-label="Tìm kiếm toàn cục"
                            data-testid="global-search-button"
                            icon={<SearchOutlined style={{ fontSize: 18 }} />}
                            onClick={toggleSearch.show}
                            style={headerActionButtonStyle}
                        />
                        {_featureIcon() && currentFeatureName !== "Sức khỏe dữ liệu" && <span style={{ width: 38, height: 38, borderRadius: "50%", background: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 18px rgba(34, 17, 83, 0.22)" }}>
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
    const dispatch = useDispatch();
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
    const toggleBackupCenter = useToggle();
    const { navigateWithFeedback } = useAppShellNavigation();
    const toolsReady = useDeferredDrawerTools(open);
    const location = useLocation();
    const [publishTokenInput, setPublishTokenInput] = useState(githubToken);
    const inventoryConfig = useSelector(selectInventoryHealthConfig);
    const [inventoryConfigDraft, setInventoryConfigDraft] = useState<InventoryHealthConfig>(() => normalizeInventoryHealthConfig(inventoryConfig));

    React.useEffect(() => {
        setPublishTokenInput(githubToken);
    }, [githubToken]);

    React.useEffect(() => {
        if (!toggleBackupCenter.value) return;
        setInventoryConfigDraft(normalizeInventoryHealthConfig(inventoryConfig));
    }, [toggleBackupCenter.value, inventoryConfig]);

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
                toggleBackupCenter.hide();
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
            content: "Thao tác này sẽ ghi nguyên liệu, món ăn và cấu hình dùng chung lên GitHub để các thiết bị khác đồng bộ. Bạn có chắc muốn xuất bản dữ liệu hiện tại?",
            okText: "Xuất bản",
            cancelText: "Hủy",
            centered: true,
            zIndex: APP_CONFIRM_Z_INDEX,
            onOk: publishSharedData,
        });
    };

    const updateInventoryConfigNumber = (key: "lowStockAmount" | "urgentExpiryDays", value: number | null) => {
        setInventoryConfigDraft(prev => normalizeInventoryHealthConfig({
            ...prev,
            [key]: typeof value === "number" ? value : 0,
        }));
    };

    const updateExpirationDefault = (shelfLife: IngredientShelfLife, preservationCondition: IngredientPreservationCondition, value: number | null) => {
        setInventoryConfigDraft(prev => normalizeInventoryHealthConfig({
            ...prev,
            expirationDefaults: {
                ...prev.expirationDefaults,
                [shelfLife]: {
                    ...prev.expirationDefaults[shelfLife],
                    [preservationCondition]: typeof value === "number" ? value : 0,
                },
            },
        }));
    };

    const resetInventoryConfigDraft = () => {
        setInventoryConfigDraft(normalizeInventoryHealthConfig(DEFAULT_INVENTORY_HEALTH_CONFIG));
    };

    const saveInventoryConfig = () => {
        dispatch(updateInventoryConfig(inventoryConfigDraft));
        message.success("Đã lưu cấu hình tồn kho dùng chung");
    };

    const publishTokenSaved = publishTokenInput.trim() === githubToken;
    const publishTokenStatusText = githubTokenSource === "local"
        ? "Đang dùng token lưu trên thiết bị này."
        : githubTokenSource === "build"
            ? "Đang dùng token cấu hình sẵn. Bạn có thể nhập token khác để ghi đè trên thiết bị này."
            : "Chưa có token xuất bản. Token chỉ lưu trong trình duyệt của thiết bị này.";

    const sidebarNavGroups = [
        {
            key: 'overview',
            label: 'Tổng quan',
            items: [
                { key: 'dashboard', href: RootRoutes.AuthorizedRoutes.Root(), icon: HouseIcon, label: 'Tổng quan' },
                { key: 'analytics', href: RootRoutes.AuthorizedRoutes.Analytics(), icon: MonitorIcon, label: 'Phân tích' },
            ],
        },
        {
            key: 'planning',
            label: 'Lên thực đơn',
            items: [
                { key: 'dishSuggester', href: RootRoutes.AuthorizedRoutes.DishSuggester(), icon: SuggesterIcon, label: 'Nấu gì?' },
                { key: 'meals', href: RootRoutes.AuthorizedRoutes.ScheduledMealRoutes.List(), icon: DietPlanIcon, label: 'Thực đơn' },
                { key: 'dishFeedback', href: RootRoutes.AuthorizedRoutes.ScheduledMealRoutes.FeedbackHistory(), icon: DietPlanIcon, label: 'Phản hồi món' },
                { key: 'shoppingList', href: RootRoutes.AuthorizedRoutes.ShoppingListRoutes.List(), icon: ShoppingListIcon, label: 'Lịch mua sắm' },
                { key: 'expensePlanner', href: RootRoutes.AuthorizedRoutes.ExpensePlanner(), icon: BudgetIcon, label: 'Tính chi phí' },
            ],
        },
        {
            key: 'library',
            label: 'Thư viện',
            items: [
                { key: 'dishes', href: RootRoutes.AuthorizedRoutes.DishesRoutes.List(), icon: DishesIcon, label: 'Món ăn' },
                { key: 'ingredients', href: RootRoutes.AuthorizedRoutes.IngredientRoutes.List(), icon: IngredientIcon, label: 'Nguyên liệu' },
                { key: 'templates', href: RootRoutes.AuthorizedRoutes.Templates(), icon: LayoutIcon, label: 'Mẫu dùng lại' },
            ],
        },
        {
            key: 'household',
            label: 'Gia đình',
            items: [
                { key: 'household', href: RootRoutes.AuthorizedRoutes.HouseholdProfiles(), icon: FamilyIcon, label: 'Nhà mình' },
                { key: 'nutritionGoals', href: RootRoutes.AuthorizedRoutes.NutritionGoals(), icon: NutritionPlanIcon, label: 'Dinh dưỡng' },
            ],
        },
    ];

    return (
        <React.Fragment>
            <Button type="text" data-testid="sidebar-drawer-button" onClick={showDrawer} icon={<MenuOutlined style={{ fontSize: 18 }} />} style={buttonStyle} />
            <FastDrawerShell
                title={
                    <Flex align="center" gap={10}>
                        <span style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg, #8f46f7 0%, #5e2bbf 100%)", display: "inline-flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 18px rgba(116,54,220,0.22)" }}>
                            <Image src={LogoIcon} width={25} loading="eager" alt="My Recipes" />
                        </span>
                        <div style={{ minWidth: 0 }}>
                            <Typography.Text style={{ display: "block", fontSize: 18, lineHeight: "22px", fontWeight: 750, color: "#2f2545" }}>My Recipes</Typography.Text>
                            <Typography.Text type="secondary" style={{ display: "block", fontSize: 11, lineHeight: "15px" }}>Bếp nhà hôm nay</Typography.Text>
                        </div>
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
                        {sidebarNavGroups.map(group => (
                            <div key={group.key} style={sidebarNavGroupStyle} data-testid={`sidebar-nav-group-${group.key}`}>
                                <div style={sidebarNavSectionLabelStyle}>{group.label}</div>
                                {group.items.map(item => (
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
                        ))}
                    </div>
                </div>

                <Box data-testid="sidebar-drawer-tools" style={{ padding: "0 16px 24px" }}>
                    {!toolsReady ? <div style={drawerToolsPlaceholderStyle}><LoadingOutlined /></div> : <React.Fragment>

                    {/* ── Data center ── */}
                    <Divider orientation="left" style={{ fontSize: 12, color: "#888", marginTop: 16, marginBottom: 12 }}>Dữ liệu</Divider>
                    <Flex vertical gap={8}>
                        <Button
                            icon={<DatabaseOutlined />}
                            block
                            onClick={toggleBackupCenter.show}
                        >
                            Dữ liệu & sao lưu
                        </Button>
                        <Button
                            icon={<MedicineBoxOutlined />}
                            block
                            onClick={() => onNavigate(RootRoutes.AuthorizedRoutes.SyncBackupHealth())}
                        >
                            Sức khỏe dữ liệu
                        </Button>
                        <Typography.Text type="secondary" style={{ fontSize: 11, paddingLeft: 2 }}>
                            Đồng bộ dùng chung, sao lưu cá nhân và trạng thái backup được gom vào một nơi.
                        </Typography.Text>
                    </Flex>

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
                        onClick={() => onNavigate(RootRoutes.AuthorizedRoutes.UserGuide())}
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
                                    <Button type="text" danger onClick={onLock}>Khoá</Button>
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
            <Modal
                title={<Space><DatabaseOutlined style={{ color: "#7436dc" }} />Dữ liệu & sao lưu</Space>}
                open={toggleBackupCenter.value}
                onCancel={toggleBackupCenter.hide}
                footer={null}
                width="min(720px, calc(100vw - 24px))"
                destroyOnClose={false}
            >
                <DeferredModalContent active={toggleBackupCenter.value} minHeight={280}>
                    {toggleBackupCenter.value ? <Flex vertical gap={12}>
                        <Box style={{ border: "1px solid rgba(116,54,220,0.12)", borderRadius: 8, padding: 10, background: "#fbf9ff" }}>
                            <Stack justify="space-between" align="flex-start" gap={8}>
                                <div style={{ minWidth: 0 }}>
                                    <Typography.Text strong style={{ display: "block", color: "#2f2545", fontSize: 15, lineHeight: "20px" }}>Dữ liệu dùng chung</Typography.Text>
                                    <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, lineHeight: "17px" }}>
                                        Cập nhật nguyên liệu, món ăn, mục tiêu dinh dưỡng và cấu hình tồn kho mới nhất được admin xuất bản.
                                    </Typography.Text>
                                </div>
                                <Button icon={<CloudDownloadOutlined />} loading={isSyncChecking} onClick={onImportCloud}>
                                    Đồng bộ mới
                                </Button>
                            </Stack>
                        </Box>

                        {isAdmin && <Box style={{ border: "1px solid rgba(116,54,220,0.14)", borderRadius: 8, padding: 10, background: "#fff" }}>
                            <Flex vertical gap={10}>
                                <Flex align="flex-start" gap={8}>
                                    <span style={{ width: 34, height: 34, borderRadius: 8, display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#7436dc", background: "rgba(116,54,220,0.12)", flexShrink: 0 }}>
                                        <SettingOutlined />
                                    </span>
                                    <div style={{ minWidth: 0 }}>
                                        <Typography.Text strong style={{ display: "block", color: "#2f2545", fontSize: 15, lineHeight: "20px" }}>Cấu hình tồn kho dùng chung</Typography.Text>
                                        <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, lineHeight: "17px" }}>
                                            Thiết lập ngưỡng cảnh báo tồn kho và hạn dùng mặc định cho lô hàng chưa nhập ngày hết hạn riêng.
                                        </Typography.Text>
                                    </div>
                                </Flex>

                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
                                    <Box style={{ border: "1px solid #f0f0f0", borderRadius: 0, padding: 9, background: "#fbf9ff" }}>
                                        <Typography.Text strong style={{ display: "block", fontSize: 12, marginBottom: 5 }}>Ngưỡng thiếu hàng</Typography.Text>
                                        <InputNumber
                                            min={0}
                                            step={0.5}
                                            value={inventoryConfigDraft.lowStockAmount}
                                            onChange={value => updateInventoryConfigNumber("lowStockAmount", value)}
                                            style={{ width: "100%" }}
                                            addonAfter="đv"
                                        />
                                        <Typography.Text type="secondary" style={{ display: "block", fontSize: 11, lineHeight: "15px", marginTop: 5 }}>
                                            Tồn kho lớn hơn 0 và nhỏ hơn hoặc bằng số này sẽ được xem là thấp.
                                        </Typography.Text>
                                    </Box>
                                    <Box style={{ border: "1px solid #f0f0f0", borderRadius: 0, padding: 9, background: "#fbf9ff" }}>
                                        <Typography.Text strong style={{ display: "block", fontSize: 12, marginBottom: 5 }}>Sắp hết hạn trong</Typography.Text>
                                        <InputNumber
                                            min={0}
                                            step={1}
                                            value={inventoryConfigDraft.urgentExpiryDays}
                                            onChange={value => updateInventoryConfigNumber("urgentExpiryDays", value)}
                                            style={{ width: "100%" }}
                                            addonAfter="ngày"
                                        />
                                        <Typography.Text type="secondary" style={{ display: "block", fontSize: 11, lineHeight: "15px", marginTop: 5 }}>
                                            Lô hàng còn trong khoảng ngày này sẽ được ưu tiên cảnh báo và gợi ý nấu trước.
                                        </Typography.Text>
                                    </Box>
                                </div>

                                <Flex vertical gap={8}>
                                    <Typography.Text strong style={{ fontSize: 13, color: "#2f2545" }}>Hạn dùng mặc định theo bảo quản</Typography.Text>
                                    {INGREDIENT_SHELF_LIFE_OPTIONS.map(shelfLife => (
                                        <Box key={shelfLife.value} style={{ border: "1px solid #f0f0f0", borderRadius: 0, padding: 9, background: "#fff" }}>
                                            <Typography.Text strong style={{ display: "block", fontSize: 12, lineHeight: "16px", marginBottom: 7 }}>{shelfLife.label}</Typography.Text>
                                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(118px, 1fr))", gap: 7 }}>
                                                {INGREDIENT_PRESERVATION_OPTIONS.map(condition => (
                                                    <div key={condition.value}>
                                                        <Typography.Text type="secondary" style={{ display: "block", fontSize: 11, lineHeight: "15px", marginBottom: 3 }}>{condition.label}</Typography.Text>
                                                        <InputNumber
                                                            min={0}
                                                            step={1}
                                                            value={inventoryConfigDraft.expirationDefaults[shelfLife.value][condition.value]}
                                                            onChange={value => updateExpirationDefault(shelfLife.value, condition.value, value)}
                                                            style={{ width: "100%" }}
                                                            addonAfter="ngày"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </Box>
                                    ))}
                                </Flex>

                                <Flex gap={8} wrap="wrap" justify="flex-end">
                                    <Button type="text" onClick={resetInventoryConfigDraft}>Dùng mặc định</Button>
                                    <Button type="primary" onClick={saveInventoryConfig}>Lưu cấu hình</Button>
                                </Flex>
                            </Flex>
                        </Box>}

                        {isAdmin && <Box style={{ border: "1px solid rgba(82,196,26,0.18)", borderRadius: 8, padding: 10, background: "#fcfff8" }}>
                            <Flex vertical gap={8}>
                                <Typography.Text strong style={{ display: "block", color: "#245822", fontSize: 15, lineHeight: "20px" }}>Quản trị xuất bản</Typography.Text>
                                <Typography.Text type="secondary" style={{ fontSize: 12, lineHeight: "17px" }}>
                                    Đẩy nguyên liệu, món ăn và cấu hình dùng chung hiện tại lên GitHub để các thiết bị khác đồng bộ thủ công.
                                </Typography.Text>
                                <AntInput.Password
                                    autoComplete="off"
                                    placeholder="Token có quyền ghi repo contents"
                                    value={publishTokenInput}
                                    onChange={e => setPublishTokenInput(e.target.value)}
                                />
                                <Flex gap={8} wrap="wrap">
                                    <Button type="dashed" disabled={publishTokenSaved} onClick={onSavePublishToken}>
                                        Lưu token
                                    </Button>
                                    <Button loading={isTestingGithubToken} disabled={!publishTokenInput.trim() && !hasGithubToken} onClick={onTestPublishToken}>
                                        Kiểm tra token
                                    </Button>
                                    <Button type="text" disabled={!githubToken} onClick={onClearPublishToken}>
                                        Xoá token
                                    </Button>
                                </Flex>
                                <Typography.Text type="secondary" style={{ fontSize: 11, lineHeight: "16px" }}>
                                    {publishTokenStatusText}
                                </Typography.Text>
                                <Button
                                    icon={<CloudUploadOutlined />}
                                    loading={isPublishing}
                                    disabled={!hasGithubToken}
                                    onClick={onPublishSharedData}
                                    style={{ color: "#52c41a", borderColor: "#52c41a" }}
                                >
                                    Xuất bản dữ liệu dùng chung
                                </Button>
                                {lastPublishAt && <Typography.Text type="secondary" style={{ fontSize: 11, color: "#52c41a" }}>
                                    Xuất bản lần cuối: {new Date(lastPublishAt).toLocaleString("vi-VN")}
                                </Typography.Text>}
                            </Flex>
                        </Box>}

                        <Box style={{ border: "1px solid #f0f0f0", borderRadius: 8, padding: 10, background: "#fff" }}>
                            <Stack justify="space-between" align="flex-start" gap={8} style={{ marginBottom: 6 }}>
                                <div style={{ minWidth: 0 }}>
                                    <Typography.Text strong style={{ display: "block", color: "#2f2545", fontSize: 15, lineHeight: "20px" }}>Sao lưu cá nhân</Typography.Text>
                                    <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, lineHeight: "17px" }}>
                                        Sao lưu tồn kho, lịch mua sắm, thực đơn và mẫu dùng lại vào GitHub Gist.
                                    </Typography.Text>
                                </div>
                                <Button icon={<SyncOutlined />} onClick={() => { toggleBackupCenter.hide(); onNavigate(RootRoutes.AuthorizedRoutes.SyncBackupHealth()); }}>
                                    Xem sức khỏe
                                </Button>
                            </Stack>
                            <GistBackupWidget />
                        </Box>
                    </Flex> : null}
                </DeferredModalContent>
            </Modal>
            <ScheduledMealToolkitWidget onNavigate={onNavigate} />
            {pendingSync && (
                <SharedSyncModal
                    open={true}
                    manifest={pendingSync.manifest}
                    hasIngredientChanges={pendingSync.hasIngredientChanges}
                    hasDishChanges={pendingSync.hasDishChanges}
                    hasConfigChanges={pendingSync.hasConfigChanges}
                    force={pendingSync.force}
                    onDone={onSharedSyncDone}
                    onCancel={dismissSync}
                />
            )}
            {toggleHistory.value && <CookingHistoryWidget open={toggleHistory.value} onClose={toggleHistory.hide} />}
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
            width="min(760px, calc(100vw - 24px))"
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
            border: "1px solid rgba(116, 54, 220, 0.14)",
            borderRadius: 20,
            background: "rgba(255,255,255,0.98)",
            boxShadow: "0 14px 34px rgba(74, 48, 130, 0.18), 0 5px 12px rgba(74, 48, 130, 0.08)",
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
            background: active ? "rgba(116, 54, 220, 0.10)" : "transparent",
            color: active ? "#2f2545" : "#6b6478",
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
            color: "#2f2545",
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
            background: active ? "rgba(116, 54, 220, 0.12)" : "transparent",
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
                ? "linear-gradient(135deg, #8f46f7 0%, #5e2bbf 100%)"
                : "linear-gradient(135deg, #9b5cff 0%, #7436dc 100%)",
            boxShadow: active
                ? "0 10px 20px rgba(116, 54, 220, 0.34)"
                : "0 8px 18px rgba(116, 54, 220, 0.28)",
            boxSizing: "border-box",
            flexShrink: 0,
        }
    }

    const _labelStyles = (active: boolean): React.CSSProperties => {
        return {
            display: "block",
            color: active ? "#2f2545" : "#6b6478",
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
            color: "#2f2545",
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
                        <Image src={DietPlanIcon} preview={false} width={21} alt="" />
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
                    aria-label="Tính chi phí"
                    data-testid="bottom-tab-expense-planner"
                    style={_buttonStyles(budgetActive)}
                    onClick={() => onNavigate(budgetRoute)}
                >
                    <span style={_sideIconShellStyles(budgetActive)}>
                        <Image src={BudgetIcon} preview={false} width={21} alt="" />
                    </span>
                    <Typography.Text style={_labelStyles(budgetActive)}>Tính phí</Typography.Text>
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
            <Button icon={<ExportOutlined />} onClick={async () => {
                setExportedData(await getStorageString("persist:personal") ?? "");
                toggleShowData.show();
            }}>Export</Button>

            <Button icon={<ImportOutlined />} onClick={toggleImportData.show}>Import</Button>

            <Button loading={toggleImportingCloud.value} icon={<CloudDownloadOutlined />} onClick={_onImportCloud}>Import cloud</Button>
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
