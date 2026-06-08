import { CheckCircleOutlined, ClockCircleOutlined, CloseOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';
import { Button } from '@components/Button';
import { Image } from '@components/Image';
import { Box } from '@components/Layout/Box';
import { Stack } from '@components/Layout/Stack';
import { Typography } from '@components/Typography';
import { useScreenTitle } from '@hooks';
import { RootRoutes } from '@routing/RootRoutes';
import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GuideRealPreviewScreen } from './UserGuideRealPreview';
import HouseIcon from '../../../../assets/icons/house.png';
import MealsIcon from '../../../../assets/icons/meals.png';
import DishesIcon from '../../../../assets/icons/noodles.png';
import ShoppingListIcon from '../../../../assets/icons/shoppingList.png';
import IngredientIcon from '../../../../assets/icons/vegetable.png';
import SuggesterIcon from '../../../../assets/icons/cooking.png';
import BudgetIcon from '../../../../assets/icons/budget.png';

type TourScreenKey = 'dashboard' | 'inventory' | 'dishes' | 'suggestions' | 'shopping' | 'meals';

type TourStep = {
    id: string;
    screen: TourScreenKey;
    target: string;
    title: string;
    description: string;
    hint: string;
}

type ScreenConfig = {
    key: TourScreenKey;
    label: string;
    shortLabel: string;
    title: string;
    subtitle: string;
    tone: string;
    icon: string;
}

type SpotlightRect = {
    left: number;
    top: number;
    width: number;
    height: number;
}

type FakeTargetProps = {
    targetKey: string;
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
}

const GUIDE_TOUR_STORAGE_KEY = 'my-recipes-user-guide-tour-done-v2';

const SCREEN_CONFIGS: ScreenConfig[] = [
    { key: 'dashboard', label: 'Tổng quan', shortLabel: 'Tổng quan', title: 'Tổng quan', subtitle: 'Bếp nhà hôm nay', tone: '#7436dc', icon: HouseIcon },
    { key: 'inventory', label: 'Nguyên liệu và tồn kho', shortLabel: 'Kho', title: 'Nguyên liệu', subtitle: 'Tồn kho theo lô', tone: '#389e0d', icon: IngredientIcon },
    { key: 'dishes', label: 'Món ăn', shortLabel: 'Món', title: 'Món ăn', subtitle: 'Công thức và phiên nấu', tone: '#d48806', icon: DishesIcon },
    { key: 'suggestions', label: 'Gợi ý món', shortLabel: 'Nấu gì?', title: 'Nấu gì?', subtitle: 'Gợi ý theo tủ lạnh', tone: '#13a8a8', icon: SuggesterIcon },
    { key: 'shopping', label: 'Lịch mua sắm', shortLabel: 'Mua sắm', title: 'Lịch mua sắm', subtitle: 'Giỏ cuối tuần', tone: '#0958d9', icon: ShoppingListIcon },
    { key: 'meals', label: 'Thực đơn', shortLabel: 'Thực đơn', title: 'Thực đơn', subtitle: 'Thứ Hai, 08/06/2026', tone: '#1677ff', icon: MealsIcon },
];

const TOUR_STEPS: TourStep[] = [
    {
        id: 'dashboard-hero',
        screen: 'dashboard',
        target: 'dashboard-hero',
        title: 'Bắt đầu từ Tổng quan',
        description: 'Đây là nơi người dùng nhìn việc quan trọng trong ngày: bữa đã lên lịch, giỏ mua đang mở và nguyên liệu cần xử lý.',
        hint: 'Dùng Tổng quan như màn hình mở app mỗi ngày.',
    },
    {
        id: 'dashboard-priority',
        screen: 'dashboard',
        target: 'dashboard-priority',
        title: 'Ưu tiên việc cần làm',
        description: 'Các card này giống dashboard thật: mỗi dòng là một hành động nhanh để mở đúng luồng nấu, mua hoặc xử lý tồn kho.',
        hint: 'Chạm thử từng card minh họa để thấy trạng thái chọn trong tour.',
    },
    {
        id: 'inventory-list',
        screen: 'inventory',
        target: 'inventory-list',
        title: 'Tồn kho là nền dữ liệu chính',
        description: 'Trang Nguyên liệu thật có tìm kiếm, lọc và danh sách theo nhóm. Tour dùng dữ liệu đẹp để giải thích cách đọc lô còn lại.',
        hint: 'Ưu tiên nguyên liệu có cảnh báo hạn dùng.',
    },
    {
        id: 'inventory-batch',
        screen: 'inventory',
        target: 'inventory-batch',
        title: 'Xem từng lô đang có',
        description: 'Mỗi lô có số lượng, đơn vị và hạn dùng. Dữ liệu này giúp app tính món gợi ý và lượng cần mua.',
        hint: 'Cập nhật kho sau khi mua để các trang khác tính đúng.',
    },
    {
        id: 'dishes-list',
        screen: 'dishes',
        target: 'dishes-list',
        title: 'Danh sách món để chọn nhanh',
        description: 'Trang Món ăn thật là danh sách có tìm kiếm, lọc trạng thái và thông tin khẩu phần/thời gian để chọn món nhanh.',
        hint: 'Món càng đầy đủ nguyên liệu và khẩu phần, tính toán càng tốt.',
    },
    {
        id: 'dish-actions',
        screen: 'dishes',
        target: 'dish-actions',
        title: 'Từ món sang hành động',
        description: 'Từ một món có thể bắt đầu nấu, tạo giỏ mua hoặc mở chi tiết nguyên liệu. Tour chạy trong sandbox nên không ghi dữ liệu thật.',
        hint: 'Luồng thường dùng: chọn món -> tạo giỏ hoặc thêm vào thực đơn.',
    },
    {
        id: 'suggestion-tabs',
        screen: 'suggestions',
        target: 'suggestion-tabs',
        title: 'Gợi ý theo tình huống',
        description: 'Gợi ý món thật có các chế độ như tủ lạnh, thời gian và dinh dưỡng. Daily tour tập trung vào luồng tủ lạnh.',
        hint: 'Khi không biết nấu gì, bắt đầu từ Nấu gì?.',
    },
    {
        id: 'suggestion-card',
        screen: 'suggestions',
        target: 'suggestion-card',
        title: 'Món phù hợp nhất',
        description: 'Card món hiển thị điểm khớp, nguyên liệu có sẵn và nguyên liệu còn thiếu để người dùng quyết định nhanh.',
        hint: 'Chọn nhiều món rồi tạo giỏ hoặc tính dinh dưỡng.',
    },
    {
        id: 'shopping-summary',
        screen: 'shopping',
        target: 'shopping-summary',
        title: 'Giỏ mua có tiến độ rõ ràng',
        description: 'Shopping list thật cho biết đã mua bao nhiêu, còn gì cần mua và chi phí ước tính nếu nguyên liệu có giá.',
        hint: 'Dùng khi đang đi chợ để không bỏ sót nguyên liệu.',
    },
    {
        id: 'shopping-items',
        screen: 'shopping',
        target: 'shopping-items',
        title: 'Tick từng nhóm nguyên liệu',
        description: 'Các dòng dữ liệu minh họa này dùng layout giỏ thật. Khi hoàn tất trong app thật, người dùng có thể nhập nguyên liệu về kho.',
        hint: 'Chạm thử để thấy trạng thái đã mua.',
    },
    {
        id: 'meal-date',
        screen: 'meals',
        target: 'meal-date',
        title: 'Thực đơn theo ngày',
        description: 'Trang Thực đơn thật xoay quanh ngày đang xem. Người dùng chọn ngày rồi thêm món vào sáng, trưa hoặc tối.',
        hint: 'Nhãn ngày là trung tâm của kế hoạch hôm đó.',
    },
    {
        id: 'meal-plan',
        screen: 'meals',
        target: 'meal-plan',
        title: 'Tạo giỏ từ nhiều bữa',
        description: 'Sau khi lên bữa và khẩu phần, app có thể gom nguyên liệu còn thiếu thành lịch mua sắm cho một hoặc nhiều ngày.',
        hint: 'Luồng kết thúc: thực đơn -> tạo giỏ -> mua -> nhập kho.',
    },
];

const getScreenConfig = (key: TourScreenKey): ScreenConfig => SCREEN_CONFIGS.find(item => item.key === key) ?? SCREEN_CONFIGS[0];

const getStepIndexFromItem = (item: string | null): number => {
    if (!item) return 0;
    const screenMap: Record<string, TourScreenKey> = {
        start: 'dashboard',
        ingredients: 'inventory',
        dishes: 'dishes',
        suggestions: 'suggestions',
        shopping: 'shopping',
        meals: 'meals',
    };
    const screen = screenMap[item] ?? (SCREEN_CONFIGS.some(config => config.key === item) ? item as TourScreenKey : 'dashboard');
    return Math.max(0, TOUR_STEPS.findIndex(step => step.screen === screen));
};

const readCompletedTours = (): string[] => {
    if (typeof window === 'undefined') return [];
    try {
        const raw = window.localStorage.getItem(GUIDE_TOUR_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
    } catch {
        return [];
    }
};

const writeCompletedTours = (keys: string[]) => {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(GUIDE_TOUR_STORAGE_KEY, JSON.stringify(keys));
    } catch {
        // Tour progress is optional local UI state.
    }
};

const tourCss = `
.guide-tour-screen {
    min-height: 100vh;
    min-height: 100dvh;
    width: 100%;
    overflow: hidden;
    position: relative;
    background: linear-gradient(135deg, #f6f1ff 0%, #ffffff 46%, #eefbf7 100%);
    color: #111827;
}
.guide-tour-layout {
    height: 100vh;
    height: 100dvh;
    display: grid;
    grid-template-columns: minmax(330px, 410px) minmax(250px, 330px);
    gap: 16px;
    justify-content: center;
    align-items: center;
    padding: calc(16px + env(safe-area-inset-top)) 16px calc(16px + env(safe-area-inset-bottom));
    box-sizing: border-box;
}
.guide-tour-phone {
    width: min(410px, calc(100vw - 24px));
    height: min(820px, calc(100dvh - 32px));
    border-radius: 28px;
    border: 1px solid rgba(116,54,220,0.18);
    background: #fff;
    box-shadow: 0 24px 58px rgba(74,48,130,0.20);
    overflow: hidden;
    position: relative;
}
.guide-tour-app-header {
    height: 76px;
    padding: 10px 12px 12px;
    box-sizing: border-box;
    color: #fff;
    background: linear-gradient(135deg, #8d46f6 0%, #7436dc 58%, #5e2bbf 100%);
    box-shadow: 0 12px 26px rgba(95,43,191,0.22);
}
.guide-tour-app-content {
    height: calc(100% - 156px);
    overflow-y: auto;
    overflow-x: hidden;
    background: linear-gradient(180deg, #e9e3f4 0%, #f6f3fb 52%, #ffffff 100%);
    padding: 12px;
    box-sizing: border-box;
}
.guide-tour-real-target,
.guide-real-preview {
    height: 100%;
    min-height: 0;
}
.guide-real-preview [data-testid="dashboard"] {
    padding-bottom: 92px !important;
}
.guide-tour-bottom-tab {
    height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    pointer-events: none;
    position: relative;
}
.guide-tour-bottom-dock {
    width: min(370px, calc(100% - 22px));
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border: 1px solid rgba(116,54,220,0.14);
    border-radius: 20px;
    background: rgba(255,255,255,0.98);
    box-shadow: 0 14px 34px rgba(74,48,130,0.18), 0 5px 12px rgba(74,48,130,0.08);
    padding: 6px 8px;
    box-sizing: border-box;
}
.guide-tour-tab-button {
    flex: 1 1 0;
    min-width: 0;
    max-width: 62px;
    height: 52px;
    border-radius: 14px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    font-size: 10px;
    line-height: 13px;
    color: #6b6478;
}
.guide-tour-tab-center {
    width: 74px;
    height: 82px;
    transform: translateY(-15px);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    color: #2f2545;
    font-size: 10px;
    font-weight: 650;
}
.guide-tour-step-panel {
    border: 1px solid rgba(116,54,220,0.12);
    border-radius: 18px;
    background: rgba(255,255,255,0.92);
    box-shadow: 0 24px 54px rgba(74,48,130,0.20);
    padding: 14px;
    min-width: 0;
}
.guide-tour-topic-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
}
.guide-tour-topic-button {
    border-radius: 10px;
    padding: 9px;
    text-align: left;
    cursor: pointer;
    min-width: 0;
}
.guide-tour-mask-piece {
    position: fixed;
    z-index: 2400;
    background: rgba(18, 12, 38, 0.48);
    pointer-events: none;
}
.guide-tour-spotlight {
    position: fixed;
    z-index: 2401;
    border: 2px solid #fff;
    box-shadow: 0 0 0 3px rgba(116,54,220,0.88), 0 12px 34px rgba(18,12,38,0.24);
    pointer-events: none;
}
.guide-tour-popup {
    position: fixed;
    z-index: 2410;
    border-radius: 16px;
    background: rgba(255,255,255,0.98);
    border: 1px solid rgba(116,54,220,0.16);
    box-shadow: 0 18px 44px rgba(18,12,38,0.24);
    padding: 13px;
    box-sizing: border-box;
    max-height: min(330px, 40vh);
    overflow-y: auto;
}
@media (max-width: 820px) {
    .guide-tour-layout {
        display: block;
        padding: 0;
    }
    .guide-tour-phone {
        width: 100vw;
        height: 100vh;
        height: 100dvh;
        border-radius: 0;
        border: 0;
        box-shadow: none;
    }
    .guide-tour-side-panel {
        display: none;
    }
    .guide-tour-popup {
        max-height: min(300px, 42vh);
    }
}
`;

const pillStyle = (tone: string): React.CSSProperties => ({
    borderRadius: 999,
    padding: '3px 8px',
    color: tone,
    background: `${tone}12`,
    border: `1px solid ${tone}24`,
    fontSize: 10,
    lineHeight: '14px',
    fontWeight: 800,
    whiteSpace: 'nowrap',
});

const FakeTargetContext = React.createContext<(key: string, node: HTMLDivElement | null) => void>(() => undefined);

const FakeTarget: React.FunctionComponent<FakeTargetProps> = ({ targetKey, children, className, style }) => {
    const register = React.useContext(FakeTargetContext);
    return <div ref={node => register(targetKey, node)} className={className} style={style}>{children}</div>;
};

const FakeAppShell: React.FunctionComponent<{
    screen: ScreenConfig;
    target: React.FunctionComponent<FakeTargetProps>;
    activeTarget: string;
}> = ({ screen, target, activeTarget }) => {
    return <div className='guide-tour-phone'>
        <div className='guide-tour-app-header'>
            <Stack justify='space-between' align='center' gap={10} style={{ height: '100%' }}>
                <Stack align='center' gap={9} style={{ minWidth: 0 }}>
                    <span style={{ width: 38, height: 38, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.24)' }}>=</span>
                    <div style={{ minWidth: 0 }}>
                        <Typography.Text style={{ display: 'block', color: 'rgba(255,255,255,0.82)', fontSize: 11, lineHeight: '14px', fontWeight: 650 }}>My Recipes</Typography.Text>
                        <Typography.Text strong style={{ display: 'block', color: '#fff', fontSize: 18, lineHeight: '22px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{screen.title}</Typography.Text>
                    </div>
                </Stack>
                <Stack align='center' gap={6} style={{ flexShrink: 0 }}>
                    <span style={{ borderRadius: 999, padding: '5px 9px', background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.22)', color: '#fff', fontSize: 11, fontWeight: 700 }}>08, 06 2026</span>
                    <span style={{ width: 38, height: 38, borderRadius: '50%', background: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 18px rgba(34,17,83,0.22)' }}><Image src={screen.icon} width={24} preview={false} alt='' /></span>
                </Stack>
            </Stack>
        </div>
        <div className='guide-tour-app-content'>
            {target({
                targetKey: activeTarget,
                className: 'guide-tour-real-target',
                children: <GuideRealPreviewScreen screen={screen.key} />,
            })}
        </div>
        <div className='guide-tour-bottom-tab'>
            <div className='guide-tour-bottom-dock'>
                {[
                    ['dishes', DishesIcon, 'Món ăn'],
                    ['meals', MealsIcon, 'Thực đơn'],
                ].map(([key, icon, label]) => <div key={String(key)} className='guide-tour-tab-button' style={{ background: screen.key === key ? 'rgba(116,54,220,0.10)' : 'transparent', color: screen.key === key ? '#2f2545' : '#6b6478' }}>
                    <Image src={String(icon)} preview={false} width={21} alt='' />
                    <span>{label}</span>
                </div>)}
                <div className='guide-tour-tab-center'>
                    <span style={{ width: 54, height: 54, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '5px solid #fff', background: 'linear-gradient(135deg, #9b5cff 0%, #7436dc 100%)', boxShadow: '0 8px 18px rgba(116,54,220,0.28)' }}><Image src={SuggesterIcon} preview={false} width={27} alt='' /></span>
                    <span>Nấu gì?</span>
                </div>
                {[
                    ['shopping', ShoppingListIcon, 'Mua sắm'],
                    ['budget', BudgetIcon, 'Tính phí'],
                ].map(([key, icon, label]) => <div key={String(key)} className='guide-tour-tab-button' style={{ background: screen.key === key ? 'rgba(116,54,220,0.10)' : 'transparent', color: screen.key === key ? '#2f2545' : '#6b6478' }}>
                    <Image src={String(icon)} preview={false} width={21} alt='' />
                    <span>{label}</span>
                </div>)}
            </div>
        </div>
    </div>;
};

const SpotlightOverlay: React.FunctionComponent<{
    rect: SpotlightRect | null;
    tone: string;
    current: number;
    total: number;
    title: string;
    description: string;
    hint: string;
    canPrevious: boolean;
    canNext: boolean;
    onPrevious: () => void;
    onNext: () => void;
    onFinish: () => void;
}> = ({ rect, tone, current, total, title, description, hint, canPrevious, canNext, onPrevious, onNext, onFinish }) => {
    const popupStyle = React.useMemo<React.CSSProperties>(() => {
        if (typeof window === 'undefined') return {};
        const width = Math.min(380, window.innerWidth - 24);
        if (!rect) return { width, left: 12, bottom: 18 };
        const centerX = rect.left + rect.width / 2;
        const left = Math.max(12, Math.min(window.innerWidth - width - 12, centerX - width / 2));
        const spaceAbove = rect.top;
        const spaceBelow = window.innerHeight - rect.top - rect.height;
        return spaceAbove > spaceBelow
            ? { width, left, top: 16 }
            : { width, left, bottom: 16 };
    }, [rect]);

    if (!rect) return <div className='guide-tour-popup' style={popupStyle}>
        <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 16, lineHeight: '21px' }}>{title}</Typography.Text>
        <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '18px', marginTop: 5 }}>{description}</Typography.Text>
    </div>;

    const gap = 8;
    const left = Math.max(0, rect.left - gap);
    const top = Math.max(0, rect.top - gap);
    const width = rect.width + gap * 2;
    const height = rect.height + gap * 2;
    const right = left + width;
    const bottom = top + height;
    const viewportWidth = typeof window === 'undefined' ? 0 : window.innerWidth;
    const viewportHeight = typeof window === 'undefined' ? 0 : window.innerHeight;

    return <React.Fragment>
        <div className='guide-tour-mask-piece' style={{ left: 0, top: 0, width: '100vw', height: top }} />
        <div className='guide-tour-mask-piece' style={{ left: 0, top, width: left, height }} />
        <div className='guide-tour-mask-piece' style={{ left: right, top, width: Math.max(0, viewportWidth - right), height }} />
        <div className='guide-tour-mask-piece' style={{ left: 0, top: bottom, width: '100vw', height: Math.max(0, viewportHeight - bottom) }} />
        <div className='guide-tour-spotlight' style={{ left, top, width, height, borderRadius: 14, boxShadow: `0 0 0 3px ${tone}, 0 12px 34px rgba(18,12,38,0.24)` }} />
        <div className='guide-tour-popup' style={popupStyle}>
            <Stack justify='space-between' align='center' gap={10} style={{ marginBottom: 8 }}>
                <span style={pillStyle(tone)}>Step {current + 1}/{total}</span>
                <span style={{ color: tone, fontSize: 12, fontWeight: 800 }}>{Math.round((current + 1) / total * 100)}%</span>
            </Stack>
            <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 16, lineHeight: '21px' }}>{title}</Typography.Text>
            <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '18px', marginTop: 5 }}>{description}</Typography.Text>
            <Box style={{ marginTop: 9, border: `1px solid ${tone}18`, borderRadius: 10, background: `${tone}08`, padding: 9 }}>
                <Typography.Text style={{ color: '#2f2545', fontSize: 11, lineHeight: '16px', fontWeight: 720 }}>{hint}</Typography.Text>
            </Box>
            <Stack justify='space-between' align='center' gap={8} style={{ marginTop: 11 }}>
                <Button icon={<LeftOutlined />} disabled={!canPrevious} onClick={onPrevious} style={{ borderRadius: 999 }}>Trước</Button>
                {canNext
                    ? <Button type='primary' icon={<RightOutlined />} onClick={onNext} style={{ borderRadius: 999, background: tone, borderColor: tone, fontWeight: 780 }}>Tiếp</Button>
                    : <Button type='primary' icon={<CheckCircleOutlined />} onClick={onFinish} style={{ borderRadius: 999, background: tone, borderColor: tone, fontWeight: 780 }}>Hoàn tất</Button>}
            </Stack>
        </div>
    </React.Fragment>;
};

export const UserGuideTourScreen: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [stepIndex, setStepIndex] = React.useState(() => getStepIndexFromItem(searchParams.get('item')));
    const [completedTours, setCompletedTours] = React.useState<string[]>(readCompletedTours);
    const targetElements = React.useRef<Record<string, HTMLDivElement | null>>({});
    const [spotlightRect, setSpotlightRect] = React.useState<SpotlightRect | null>(null);
    useScreenTitle({ value: 'Tour hướng dẫn', deps: [] });

    const step = TOUR_STEPS[Math.min(stepIndex, TOUR_STEPS.length - 1)];
    const screen = getScreenConfig(step.screen);
    const completedScreenSet = React.useMemo(() => new Set(completedTours), [completedTours]);

    const registerTarget = React.useCallback((key: string, node: HTMLDivElement | null) => {
        targetElements.current[key] = node;
    }, []);

    const updateSpotlight = React.useCallback(() => {
        const node = targetElements.current[step.target];
        if (!node) {
            setSpotlightRect(null);
            return;
        }
        const next = node.getBoundingClientRect();
        setSpotlightRect({ left: next.left, top: next.top, width: next.width, height: next.height });
    }, [step.target]);

    React.useLayoutEffect(() => {
        const frame = window.requestAnimationFrame(updateSpotlight);
        window.addEventListener('resize', updateSpotlight);
        return () => {
            window.cancelAnimationFrame(frame);
            window.removeEventListener('resize', updateSpotlight);
        };
    }, [updateSpotlight, stepIndex]);

    React.useEffect(() => {
        setStepIndex(getStepIndexFromItem(searchParams.get('item')));
    }, [searchParams]);

    const target = React.useCallback<React.FunctionComponent<FakeTargetProps>>((props) => <FakeTarget {...props} />, []);

    const markScreenComplete = React.useCallback((screenKey: TourScreenKey) => {
        const next = Array.from(new Set([...completedTours, screenKey]));
        setCompletedTours(next);
        writeCompletedTours(next);
    }, [completedTours]);

    const goToStep = React.useCallback((nextIndex: number) => {
        const bounded = Math.max(0, Math.min(TOUR_STEPS.length - 1, nextIndex));
        setStepIndex(bounded);
        const nextStep = TOUR_STEPS[bounded];
        setSearchParams({ item: nextStep.screen }, { replace: true });
    }, [setSearchParams]);

    const next = React.useCallback(() => {
        markScreenComplete(step.screen);
        goToStep(stepIndex + 1);
    }, [goToStep, markScreenComplete, step.screen, stepIndex]);

    const previous = React.useCallback(() => goToStep(stepIndex - 1), [goToStep, stepIndex]);

    const finish = React.useCallback(() => {
        markScreenComplete(step.screen);
        navigate(RootRoutes.AuthorizedRoutes.UserGuide({ page: 'start' }), { replace: true });
    }, [markScreenComplete, navigate, step.screen]);

    const selectScreen = React.useCallback((screenKey: TourScreenKey) => {
        const index = TOUR_STEPS.findIndex(item => item.screen === screenKey);
        if (index >= 0) goToStep(index);
    }, [goToStep]);

    return <FakeTargetContext.Provider value={registerTarget}>
        <div className='guide-tour-screen' data-testid='user-guide-tour-page'>
            <style>{tourCss}</style>
            <div className='guide-tour-layout'>
                <FakeAppShell screen={screen} target={target} activeTarget={step.target} />

                <aside className='guide-tour-side-panel'>
                    <Box className='guide-tour-step-panel'>
                        <Stack justify='space-between' align='center' gap={8} style={{ marginBottom: 12 }}>
                            <div style={{ minWidth: 0 }}>
                                <Typography.Text style={{ display: 'block', color: screen.tone, fontSize: 12, lineHeight: '16px', fontWeight: 820 }}>Daily tour</Typography.Text>
                                <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 20, lineHeight: '25px' }}>{screen.label}</Typography.Text>
                            </div>
                            <Button icon={<CloseOutlined />} aria-label='Đóng tour' onClick={() => navigate(RootRoutes.AuthorizedRoutes.UserGuide({ page: 'start' }))} style={{ width: 36, height: 36, borderRadius: 999, paddingInline: 0 }} />
                        </Stack>
                        <div style={{ height: 8, borderRadius: 999, background: 'rgba(116,54,220,0.12)', overflow: 'hidden', marginBottom: 12 }}>
                            <div style={{ width: `${Math.round((stepIndex + 1) / TOUR_STEPS.length * 100)}%`, height: '100%', background: `linear-gradient(90deg, ${screen.tone} 0%, #13a8a8 100%)` }} />
                        </div>
                        <div className='guide-tour-topic-grid'>
                            {SCREEN_CONFIGS.map(config => {
                                const active = config.key === screen.key;
                                const done = completedScreenSet.has(config.key);
                                return <button key={config.key} type='button' className='guide-tour-topic-button' onClick={() => selectScreen(config.key)} style={{ border: `1px solid ${active ? config.tone : 'rgba(116,54,220,0.10)'}`, background: active ? `${config.tone}10` : '#fff' }}>
                                    <Stack align='center' gap={7}>
                                        <span style={{ width: 28, height: 28, borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: `${config.tone}12`, border: `1px solid ${config.tone}22`, flexShrink: 0 }}>
                                            {done ? <CheckCircleOutlined style={{ color: config.tone }} /> : <Image src={config.icon} preview={false} width={18} alt='' />}
                                        </span>
                                        <div style={{ minWidth: 0 }}>
                                            <Typography.Text strong style={{ display: 'block', color: active ? config.tone : '#111827', fontSize: 12, lineHeight: '16px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{config.shortLabel}</Typography.Text>
                                        </div>
                                    </Stack>
                                </button>;
                            })}
                        </div>
                        <Box style={{ marginTop: 12, border: `1px solid ${screen.tone}18`, borderRadius: 10, background: `${screen.tone}08`, padding: 10 }}>
                            <Stack align='center' gap={8}>
                                <ClockCircleOutlined style={{ color: screen.tone }} />
                                <Typography.Text style={{ color: '#2f2545', fontSize: 11, lineHeight: '16px', fontWeight: 720 }}>Tour dùng màn hình thật trong sandbox dữ liệu giả. Không có trang thật nào bị thêm target hoặc bị ghi dữ liệu.</Typography.Text>
                            </Stack>
                        </Box>
                    </Box>
                </aside>
            </div>

            <SpotlightOverlay
                rect={spotlightRect}
                tone={screen.tone}
                current={stepIndex}
                total={TOUR_STEPS.length}
                title={step.title}
                description={step.description}
                hint={step.hint}
                canPrevious={stepIndex > 0}
                canNext={stepIndex < TOUR_STEPS.length - 1}
                onPrevious={previous}
                onNext={next}
                onFinish={finish}
            />
        </div>
    </FakeTargetContext.Provider>;
};

export default UserGuideTourScreen;
