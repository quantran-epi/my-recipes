import { CalendarOutlined, CheckCircleOutlined, ClockCircleOutlined, CloseOutlined, DatabaseOutlined, FireOutlined, LeftOutlined, PlayCircleOutlined, RightOutlined, SearchOutlined, ShoppingCartOutlined, WarningOutlined } from '@ant-design/icons';
import { Button } from '@components/Button';
import { Image } from '@components/Image';
import { Box } from '@components/Layout/Box';
import { Stack } from '@components/Layout/Stack';
import { Typography } from '@components/Typography';
import { useScreenTitle } from '@hooks';
import { RootRoutes } from '@routing/RootRoutes';
import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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

type FakeScreenProps = {
    target: React.FunctionComponent<FakeTargetProps>;
    selectedRows: string[];
    onToggleRow: (key: string) => void;
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
        hint: 'Chạm thử từng card fake để thấy trạng thái chọn.',
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
        description: 'Từ một món có thể bắt đầu nấu, tạo giỏ mua hoặc mở chi tiết nguyên liệu. Tour chỉ mô phỏng, không ghi dữ liệu thật.',
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
        description: 'Các dòng fake này mô phỏng nhóm nguyên liệu trong giỏ thật. Khi hoàn tất, app thật có thể nhập nguyên liệu về kho.',
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
    overflow: hidden;
    background: linear-gradient(180deg, #e9e3f4 0%, #f6f3fb 52%, #ffffff 100%);
    padding: 12px;
    box-sizing: border-box;
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
.guide-tour-screen-card {
    border: 1px solid rgba(116,54,220,0.10);
    border-radius: 8px;
    background: rgba(255,255,255,0.96);
    box-shadow: 0 10px 28px rgba(74,48,130,0.10);
    overflow: hidden;
}
.guide-tour-card-header {
    padding: 11px;
    border-bottom: 1px solid rgba(116,54,220,0.09);
}
.guide-tour-card-body {
    padding: 10px;
}
.guide-tour-row {
    border: 1px solid rgba(116,54,220,0.10);
    border-radius: 8px;
    background: #fff;
    padding: 9px;
    box-shadow: 0 6px 16px rgba(74,48,130,0.06);
}
.guide-tour-filter-row {
    display: flex;
    align-items: center;
    gap: 7px;
    overflow: hidden;
}
.guide-tour-chip {
    display: inline-flex;
    align-items: center;
    min-height: 24px;
    border-radius: 999px;
    padding: 3px 8px;
    border: 1px solid rgba(116,54,220,0.14);
    background: #fff;
    color: #5e2bbf;
    font-size: 10px;
    line-height: 14px;
    font-weight: 780;
    white-space: nowrap;
}
.guide-tour-card-title {
    display: block;
    color: #111827;
    font-size: 13px;
    line-height: 18px;
    font-weight: 800;
}
.guide-tour-card-subtitle {
    display: block;
    color: #8b8796;
    font-size: 10.5px;
    line-height: 15px;
    margin-top: 1px;
}
.guide-tour-meta-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 7px;
}
.guide-tour-three-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 7px;
}
.guide-tour-progress-track {
    height: 8px;
    border-radius: 999px;
    background: rgba(116,54,220,0.12);
    overflow: hidden;
}
.guide-tour-progress-bar {
    height: 100%;
    border-radius: inherit;
}
.guide-tour-fake-button {
    border: 1px solid rgba(116,54,220,0.14);
    border-radius: 999px;
    background: #fff;
    color: #5e2bbf;
    min-height: 30px;
    padding: 5px 10px;
    font: inherit;
    font-size: 11px;
    font-weight: 750;
    cursor: pointer;
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

const FakeButton: React.FunctionComponent<{ children: React.ReactNode; tone?: string; selected?: boolean; onClick?: () => void }> = ({ children, tone = '#7436dc', selected, onClick }) => {
    return <button type='button' className='guide-tour-fake-button' onClick={onClick} style={{ color: selected ? '#fff' : tone, background: selected ? tone : '#fff', borderColor: `${tone}33` }}>{children}</button>;
};

const MiniMetric: React.FunctionComponent<{ label: string; value: string; tone: string }> = ({ label, value, tone }) => {
    return <Box style={{ border: `1px solid ${tone}22`, borderRadius: 8, background: `${tone}09`, padding: 8, minWidth: 0 }}>
        <Typography.Text strong style={{ display: 'block', color: tone, fontSize: 18, lineHeight: '23px' }}>{value}</Typography.Text>
        <Typography.Text type='secondary' style={{ display: 'block', fontSize: 10, lineHeight: '14px', fontWeight: 720 }}>{label}</Typography.Text>
    </Box>;
};

const MiniInfo: React.FunctionComponent<{ label: string; value: string; tone: string; note?: string }> = ({ label, value, tone, note }) => {
    return <Box style={{ border: `1px solid ${tone}22`, borderRadius: 8, background: '#fff', padding: 8, minWidth: 0 }}>
        <Typography.Text type='secondary' style={{ display: 'block', fontSize: 10, lineHeight: '14px', fontWeight: 720, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</Typography.Text>
        <Typography.Text strong style={{ display: 'block', color: tone, fontSize: 12, lineHeight: '17px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</Typography.Text>
        {note && <Typography.Text type='secondary' style={{ display: 'block', fontSize: 9.5, lineHeight: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{note}</Typography.Text>}
    </Box>;
};

const FakeSearchBar: React.FunctionComponent<{ placeholder: string; tone: string; chips?: string[] }> = ({ placeholder, tone, chips = [] }) => {
    return <Box className='guide-tour-row' style={{ padding: 8 }}>
        <div className='guide-tour-filter-row'>
            <SearchOutlined style={{ color: tone, flexShrink: 0 }} />
            <Typography.Text type='secondary' style={{ fontSize: 12, lineHeight: '16px', minWidth: 0, flex: '1 1 auto', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{placeholder}</Typography.Text>
            {chips.map(chip => <span key={chip} className='guide-tour-chip' style={{ color: tone, borderColor: `${tone}30`, background: `${tone}09` }}>{chip}</span>)}
        </div>
    </Box>;
};

const FakeFilterChips: React.FunctionComponent<{ chips: string[]; activeIndex?: number; tone: string }> = ({ chips, activeIndex = 0, tone }) => {
    return <div className='guide-tour-filter-row'>
        {chips.map((chip, index) => <span key={chip} className='guide-tour-chip' style={{ color: index === activeIndex ? tone : '#6b6478', borderColor: index === activeIndex ? `${tone}38` : 'rgba(116,54,220,0.12)', background: index === activeIndex ? `${tone}0f` : '#fff' }}>{chip}</span>)}
    </div>;
};

const FakeProgress: React.FunctionComponent<{ percent: number; tone: string }> = ({ percent, tone }) => {
    return <div className='guide-tour-progress-track'>
        <div className='guide-tour-progress-bar' style={{ width: `${percent}%`, background: `linear-gradient(90deg, ${tone} 0%, #13a8a8 100%)` }} />
    </div>;
};

const SectionHeader: React.FunctionComponent<{ icon: React.ReactNode; title: string; subtitle: string; tone: string; action?: string }> = ({ icon, title, subtitle, tone, action }) => {
    return <div className='guide-tour-card-header' style={{ background: `linear-gradient(90deg, ${tone}12 0%, rgba(255,255,255,0.96) 72%)` }}>
        <Stack justify='space-between' align='center' gap={8}>
            <Stack align='center' gap={8} style={{ minWidth: 0 }}>
                <span style={{ width: 34, height: 34, borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: tone, background: `${tone}14`, border: `1px solid ${tone}26`, flexShrink: 0 }}>{icon}</span>
                <div style={{ minWidth: 0 }}>
                    <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 15, lineHeight: '20px' }}>{title}</Typography.Text>
                    <Typography.Text type='secondary' style={{ display: 'block', fontSize: 10.5, lineHeight: '15px' }}>{subtitle}</Typography.Text>
                </div>
            </Stack>
            {action && <span style={pillStyle(tone)}>{action}</span>}
        </Stack>
    </div>;
};

const DashboardFakeScreen: React.FunctionComponent<FakeScreenProps> = ({ target, selectedRows, onToggleRow }) => {
    return <Stack direction='column' align='stretch' gap={10}>
        {target({ targetKey: 'dashboard-hero', children: <Box className='guide-tour-screen-card' style={{ borderColor: 'rgba(116,54,220,0.18)' }}>
            <SectionHeader icon={<CalendarOutlined />} title='Hôm nay' subtitle='Thứ Hai, 08/06/2026 · bếp nhà cần xem trước' tone='#7436dc' action='4 việc' />
            <div className='guide-tour-card-body'>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                    <MiniMetric label='Bữa' value='3' tone='#7436dc' />
                    <MiniMetric label='Mua sắm' value='2' tone='#0958d9' />
                    <MiniMetric label='Sắp hết hạn' value='2' tone='#d48806' />
                </div>
                <Box style={{ marginTop: 8, border: '1px solid rgba(116,54,220,0.10)', borderRadius: 8, background: '#fff', padding: 8 }}>
                    <FakeFilterChips tone='#7436dc' chips={['Mon 3 bữa', 'Tue 1 giỏ', 'Wed chuẩn bị', 'Thu rảnh']} />
                </Box>
            </div>
        </Box> })}

        {target({ targetKey: 'dashboard-priority', children: <Box className='guide-tour-screen-card'>
            <SectionHeader icon={<WarningOutlined />} title='Việc nên làm trước' subtitle='Mở đúng luồng từ dashboard' tone='#d48806' action='Ưu tiên' />
            <div className='guide-tour-card-body'>
                <Stack direction='column' align='stretch' gap={8}>
                    {[
                        ['cook', 'Nấu cơm gà áp chảo', 'Đủ 80% nguyên liệu · 32 phút', 'Mở món ăn'],
                        ['shop', 'Đi chợ cho 4 bữa', 'Còn 5 nguyên liệu · ước tính 320k', 'Mở giỏ'],
                        ['stock', 'Dùng rau cải trước', '300g còn 2 ngày dùng tốt', 'Mở kho'],
                    ].map(([key, title, note, action]) => <button key={key} type='button' onClick={() => onToggleRow(key)} className='guide-tour-row' style={{ textAlign: 'left', cursor: 'pointer', borderColor: selectedRows.includes(key) ? '#7436dc55' : 'rgba(116,54,220,0.10)', background: selectedRows.includes(key) ? '#7436dc0d' : '#fff' }}>
                        <Stack justify='space-between' align='center' gap={8}>
                            <div style={{ minWidth: 0 }}>
                                <Typography.Text className='guide-tour-card-title'>{title}</Typography.Text>
                                <Typography.Text className='guide-tour-card-subtitle'>{note}</Typography.Text>
                            </div>
                            <span style={pillStyle(selectedRows.includes(key) ? '#7436dc' : '#6b6478')}>{selectedRows.includes(key) ? 'Đã xem' : action}</span>
                        </Stack>
                    </button>)}
                </Stack>
            </div>
        </Box> })}
    </Stack>;
};

const InventoryFakeScreen: React.FunctionComponent<FakeScreenProps> = ({ target, selectedRows, onToggleRow }) => {
    return <Stack direction='column' align='stretch' gap={10}>
        <FakeSearchBar placeholder='Tìm nguyên liệu, nhóm hoặc lô tồn kho' tone='#389e0d' chips={['Còn hàng', 'Sắp hết hạn']} />
        {target({ targetKey: 'inventory-list', children: <Box className='guide-tour-screen-card'>
            <SectionHeader icon={<DatabaseOutlined />} title='Nguyên liệu' subtitle='Danh sách tồn kho hiện tại' tone='#389e0d' action='24 mục' />
            <div className='guide-tour-card-body'>
                <FakeFilterChips tone='#389e0d' chips={['Tất cả', 'Rau củ', 'Thịt cá', 'Đồ khô']} />
                <div className='guide-tour-meta-grid' style={{ marginTop: 8, marginBottom: 8 }}>
                    <MiniInfo label='Có thể dùng ngay' value='18 mục' note='đang còn hàng' tone='#389e0d' />
                    <MiniInfo label='Cần dùng trước' value='3 lô' note='trong 2 ngày' tone='#d48806' />
                </div>
                <Stack direction='column' align='stretch' gap={8}>
                    {[
                        ['chicken', 'Ức gà', '450g', 'Thịt cá · ngăn đông', 'Đủ cho 2 phần cơm gà', '#389e0d'],
                        ['greens', 'Rau cải xanh', '300g', 'Rau củ · ngăn mát', 'Nên dùng trước 10/06', '#d48806'],
                        ['egg', 'Trứng gà', '8 quả', 'Đạm nhanh · kệ mát', 'Dễ ghép món sáng', '#13a8a8'],
                    ].map(([key, name, value, category, note, tone]) => <button key={key} type='button' onClick={() => onToggleRow(key)} className='guide-tour-row' style={{ textAlign: 'left', cursor: 'pointer', borderColor: selectedRows.includes(key) ? `${tone}66` : 'rgba(116,54,220,0.10)' }}>
                        <Stack justify='space-between' align='center' gap={8}>
                            <div style={{ minWidth: 0 }}>
                                <Typography.Text className='guide-tour-card-title'>{name}</Typography.Text>
                                <Typography.Text className='guide-tour-card-subtitle'>{value} · {category} · {note}</Typography.Text>
                            </div>
                            <span style={pillStyle(tone)}>{selectedRows.includes(key) ? 'Đã xem' : key === 'greens' ? 'Ưu tiên' : 'Còn hàng'}</span>
                        </Stack>
                    </button>)}
                </Stack>
            </div>
        </Box> })}
        {target({ targetKey: 'inventory-batch', children: <Box className='guide-tour-row' style={{ borderColor: '#d4880633', background: '#d488060a' }}>
            <Stack direction='column' align='stretch' gap={7}>
                <Stack justify='space-between' align='center' gap={10}>
                    <div style={{ minWidth: 0 }}>
                        <Typography.Text className='guide-tour-card-title'>Lô rau cải mua 06/06</Typography.Text>
                        <Typography.Text className='guide-tour-card-subtitle'>300g · ngăn mát · nên dùng trước 10/06</Typography.Text>
                    </div>
                    <span style={pillStyle('#d48806')}>2 ngày</span>
                </Stack>
                <FakeProgress percent={72} tone='#d48806' />
                <Typography.Text type='secondary' style={{ fontSize: 10.5, lineHeight: '15px' }}>Lô này được dùng trong gợi ý món, cảnh báo hết hạn và shopping list.</Typography.Text>
            </Stack>
        </Box> })}
    </Stack>;
};

const DishesFakeScreen: React.FunctionComponent<FakeScreenProps> = ({ target, selectedRows, onToggleRow }) => {
    return <Stack direction='column' align='stretch' gap={10}>
        <FakeSearchBar placeholder='Tìm món ăn, nguyên liệu hoặc tag' tone='#d48806' chips={['Hoàn thiện', '30 phút']} />
        {target({ targetKey: 'dishes-list', children: <Box className='guide-tour-screen-card'>
            <SectionHeader icon={<FireOutlined />} title='Món ăn' subtitle='Công thức, khẩu phần và trạng thái dữ liệu' tone='#d48806' action='128 món' />
            <div className='guide-tour-card-body'>
                <FakeFilterChips tone='#d48806' chips={['Tất cả', 'Hoàn thiện', 'Món chính', 'Nhanh']} activeIndex={1} />
                <Stack direction='column' align='stretch' gap={8}>
                    {[
                        ['rice-chicken', 'Cơm gà áp chảo', '2 phần · 32 phút', 'Đủ 80% nguyên liệu', ['Món chính', 'Áp chảo'], '#389e0d'],
                        ['oat', 'Cháo yến mạch trứng', '1 phần · 12 phút', 'Thiếu sữa tươi', ['Ăn sáng', 'Nhanh'], '#d48806'],
                        ['soup', 'Canh rau cải đậu hũ', '3 phần · 22 phút', 'Dùng rau sắp hết hạn', ['Canh', 'Nhẹ'], '#13a8a8'],
                    ].map(([key, name, meta, note, tags, tone]) => <button key={String(key)} type='button' onClick={() => onToggleRow(String(key))} className='guide-tour-row' style={{ textAlign: 'left', cursor: 'pointer', borderColor: selectedRows.includes(String(key)) ? `${tone}66` : 'rgba(116,54,220,0.10)', background: selectedRows.includes(String(key)) ? `${tone}0a` : '#fff' }}>
                        <Stack justify='space-between' align='center' gap={8}>
                            <div style={{ minWidth: 0 }}>
                                <Typography.Text className='guide-tour-card-title'>{name}</Typography.Text>
                                <Typography.Text className='guide-tour-card-subtitle'>{meta} · {note}</Typography.Text>
                                <Stack gap={5} wrap='wrap' style={{ marginTop: 5 }}>
                                    {(tags as string[]).map(tag => <span key={tag} style={pillStyle(String(tone))}>{tag}</span>)}
                                </Stack>
                            </div>
                            <span style={pillStyle(selectedRows.includes(String(key)) ? '#7436dc' : String(tone))}>{selectedRows.includes(String(key)) ? 'Chọn' : 'Xem'}</span>
                        </Stack>
                    </button>)}
                </Stack>
            </div>
        </Box> })}
        {target({ targetKey: 'dish-actions', children: <Box className='guide-tour-row'>
            <Stack justify='space-between' align='center' gap={8} wrap='wrap'>
                <div style={{ minWidth: 0 }}>
                    <Typography.Text className='guide-tour-card-title'>Hành động từ món đã chọn</Typography.Text>
                    <Typography.Text className='guide-tour-card-subtitle'>Nấu, tạo giỏ mua hoặc thêm vào thực đơn</Typography.Text>
                </div>
                <Stack align='center' gap={7} wrap='wrap' style={{ justifyContent: 'flex-end' }}>
                    {['Nấu', 'Tạo giỏ', 'Thực đơn'].map(label => <FakeButton key={label} tone='#d48806' selected={selectedRows.includes(label)} onClick={() => onToggleRow(label)}>{label}</FakeButton>)}
                </Stack>
            </Stack>
        </Box> })}
    </Stack>;
};

const SuggestionsFakeScreen: React.FunctionComponent<FakeScreenProps> = ({ target, selectedRows, onToggleRow }) => {
    return <Stack direction='column' align='stretch' gap={10}>
        {target({ targetKey: 'suggestion-tabs', children: <Box className='guide-tour-row'>
            <Stack direction='column' align='stretch' gap={8}>
                <FakeFilterChips tone='#13a8a8' chips={['Tủ lạnh', 'Thời gian', 'Dinh dưỡng']} />
                <div className='guide-tour-meta-grid'>
                    <MiniInfo label='Có sẵn trong kho' value='14 nguyên liệu' note='đọc từ tồn kho' tone='#389e0d' />
                    <MiniInfo label='Món đủ dữ liệu' value='36 món' note='có khẩu phần' tone='#13a8a8' />
                </div>
            </Stack>
        </Box> })}
        {target({ targetKey: 'suggestion-card', children: <Box className='guide-tour-screen-card' style={{ borderColor: '#13a8a833' }}>
            <SectionHeader icon={<PlayCircleOutlined />} title='Món phù hợp nhất' subtitle='Xếp hạng theo nguyên liệu đang có' tone='#13a8a8' action='92 điểm' />
            <div className='guide-tour-card-body'>
                <Stack direction='column' align='stretch' gap={8}>
                    <Box className='guide-tour-row' style={{ background: '#13a8a80a', borderColor: '#13a8a833' }}>
                        <Stack justify='space-between' align='center' gap={8}>
                            <div style={{ minWidth: 0 }}>
                                <Typography.Text className='guide-tour-card-title'>Cơm gà áp chảo</Typography.Text>
                                <Typography.Text className='guide-tour-card-subtitle'>32 phút · 2 phần · giàu đạm</Typography.Text>
                            </div>
                            <CheckCircleOutlined style={{ color: '#13a8a8', fontSize: 18 }} />
                        </Stack>
                    </Box>
                    <Box className='guide-tour-row'>
                        <Stack justify='space-between' align='center' gap={8}>
                            <Typography.Text style={{ fontSize: 12, lineHeight: '17px', color: '#2f2545', fontWeight: 720 }}>Có sẵn: gà, cơm, trứng, rau cải</Typography.Text>
                            <CheckCircleOutlined style={{ color: '#389e0d' }} />
                        </Stack>
                    </Box>
                    <Box className='guide-tour-row'>
                        <Stack justify='space-between' align='center' gap={8}>
                            <Typography.Text style={{ fontSize: 12, lineHeight: '17px', color: '#2f2545', fontWeight: 720 }}>Cần mua: hành lá 100g</Typography.Text>
                            <ShoppingCartOutlined style={{ color: '#0958d9' }} />
                        </Stack>
                    </Box>
                    <Stack gap={7} wrap='wrap' style={{ justifyContent: 'flex-end' }}>
                        <FakeButton tone='#13a8a8' selected={selectedRows.includes('suggest-dish')} onClick={() => onToggleRow('suggest-dish')}>Chọn</FakeButton>
                        <FakeButton tone='#0958d9' selected={selectedRows.includes('suggest-cart')} onClick={() => onToggleRow('suggest-cart')}>Giỏ</FakeButton>
                        <FakeButton tone='#7436dc' selected={selectedRows.includes('suggest-nutrition')} onClick={() => onToggleRow('suggest-nutrition')}>Nutrition</FakeButton>
                    </Stack>
                </Stack>
            </div>
        </Box> })}
    </Stack>;
};

const ShoppingFakeScreen: React.FunctionComponent<FakeScreenProps> = ({ target, selectedRows, onToggleRow }) => {
    return <Stack direction='column' align='stretch' gap={10}>
        <FakeSearchBar placeholder='Tìm lịch mua sắm, món hoặc nguyên liệu' tone='#0958d9' chips={['Đang mua', 'Tuần này']} />
        {target({ targetKey: 'shopping-summary', children: <Box className='guide-tour-screen-card'>
            <SectionHeader icon={<ShoppingCartOutlined />} title='Giỏ cuối tuần' subtitle='Từ 4 bữa trong thực đơn' tone='#0958d9' action='7/12' />
            <div className='guide-tour-card-body'>
                <FakeProgress percent={58} tone='#0958d9' />
                <div className='guide-tour-meta-grid' style={{ marginTop: 9 }}>
                    <MiniMetric label='Còn mua' value='5 mục' tone='#0958d9' />
                    <MiniMetric label='Ước tính' value='320k' tone='#d48806' />
                </div>
                <div className='guide-tour-three-grid' style={{ marginTop: 8 }}>
                    <MiniInfo label='Nguồn' value='4 bữa' tone='#7436dc' />
                    <MiniInfo label='Ngày mua' value='09/06' tone='#0958d9' />
                    <MiniInfo label='Nhập kho' value='sẵn' tone='#389e0d' />
                </div>
            </div>
        </Box> })}
        {target({ targetKey: 'shopping-items', children: <Box className='guide-tour-screen-card'>
            <SectionHeader icon={<CheckCircleOutlined />} title='Nguyên liệu cần mua' subtitle='Tick khi đi chợ' tone='#0958d9' />
            <div className='guide-tour-card-body'>
                <Stack direction='column' align='stretch' gap={8}>
                    {[
                        ['scallion', 'Hành lá', '100g', 'cho cơm gà', false],
                        ['milk', 'Sữa tươi', '1 hộp', 'cho cháo yến mạch', true],
                        ['tofu', 'Đậu hũ non', '2 miếng', 'cho canh tối', false],
                    ].map(([key, name, amount, source, done]) => {
                        const selected = selectedRows.includes(String(key)) || Boolean(done);
                        return <button key={String(key)} type='button' onClick={() => onToggleRow(String(key))} className='guide-tour-row' style={{ textAlign: 'left', cursor: 'pointer', borderColor: selected ? '#0958d955' : 'rgba(116,54,220,0.10)', background: selected ? '#0958d90d' : '#fff' }}>
                            <Stack justify='space-between' align='center' gap={8}>
                                <Stack align='center' gap={8} style={{ minWidth: 0 }}>
                                    <span style={{ width: 24, height: 24, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: selected ? '#fff' : '#0958d9', background: selected ? '#0958d9' : '#fff', border: '1px solid #0958d944', flexShrink: 0 }}>{selected ? <CheckCircleOutlined /> : null}</span>
                                    <div style={{ minWidth: 0 }}>
                                        <Typography.Text style={{ display: 'block', color: '#2f2545', fontSize: 12, lineHeight: '17px', fontWeight: 720 }}>{name}</Typography.Text>
                                        <Typography.Text type='secondary' style={{ display: 'block', fontSize: 10, lineHeight: '14px' }}>{source}</Typography.Text>
                                    </div>
                                </Stack>
                                <Typography.Text strong style={{ color: '#0958d9', fontSize: 12, lineHeight: '17px' }}>{amount}</Typography.Text>
                            </Stack>
                        </button>;
                    })}
                </Stack>
            </div>
        </Box> })}
    </Stack>;
};

const MealsFakeScreen: React.FunctionComponent<FakeScreenProps> = ({ target, selectedRows, onToggleRow }) => {
    return <Stack direction='column' align='stretch' gap={10}>
        {target({ targetKey: 'meal-date', children: <Box className='guide-tour-row' style={{ borderColor: '#1677ff33', background: '#1677ff0a' }}>
            <Stack direction='column' align='stretch' gap={8}>
                <Stack align='center' justify='space-between' gap={8}>
                    <FakeButton tone='#1677ff'><LeftOutlined /></FakeButton>
                <div style={{ textAlign: 'center', minWidth: 0 }}>
                    <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 15, lineHeight: '20px' }}>Monday, 08/06/2026</Typography.Text>
                    <Typography.Text type='secondary' style={{ display: 'block', fontSize: 10.5, lineHeight: '15px' }}>3 bữa · 6 phần</Typography.Text>
                </div>
                    <FakeButton tone='#1677ff'><RightOutlined /></FakeButton>
                </Stack>
                <Stack justify='center' gap={6} wrap='wrap'>
                    <span style={pillStyle('#1677ff')}>Chọn ngày</span>
                    <span style={pillStyle('#13a8a8')}>Từ mẫu</span>
                    <span style={pillStyle('#0958d9')}>Tạo giỏ</span>
                </Stack>
            </Stack>
        </Box> })}
        {target({ targetKey: 'meal-plan', children: <Box className='guide-tour-screen-card'>
            <SectionHeader icon={<CalendarOutlined />} title='Kế hoạch hôm nay' subtitle='Theo buổi ăn và khẩu phần' tone='#1677ff' action='Tạo giỏ' />
            <div className='guide-tour-card-body'>
                <Stack direction='column' align='stretch' gap={8}>
                    {[
                        ['morning', 'Sáng', 'Cháo yến mạch trứng', '1 phần', '12 phút'],
                        ['lunch', 'Trưa', 'Cơm gà áp chảo', '2 phần', '32 phút'],
                        ['dinner', 'Tối', 'Canh rau cải đậu hũ', '3 phần', '22 phút'],
                    ].map(([key, meal, dish, serving, duration]) => <button key={key} type='button' onClick={() => onToggleRow(key)} className='guide-tour-row' style={{ textAlign: 'left', cursor: 'pointer', borderColor: selectedRows.includes(key) ? '#1677ff55' : 'rgba(116,54,220,0.10)', background: selectedRows.includes(key) ? '#1677ff0d' : '#fff' }}>
                        <Stack justify='space-between' align='center' gap={8}>
                            <div style={{ minWidth: 0 }}>
                                <Typography.Text strong style={{ display: 'block', color: '#1677ff', fontSize: 11, lineHeight: '15px' }}>{meal}</Typography.Text>
                                <Typography.Text style={{ display: 'block', color: '#2f2545', fontSize: 12, lineHeight: '17px', fontWeight: 720 }}>{dish}</Typography.Text>
                                <Typography.Text type='secondary' style={{ display: 'block', fontSize: 10, lineHeight: '14px' }}>{duration} · tạo giỏ được</Typography.Text>
                            </div>
                            <span style={pillStyle('#1677ff')}>{serving}</span>
                        </Stack>
                    </button>)}
                </Stack>
            </div>
        </Box> })}
    </Stack>;
};

const FakeAppShell: React.FunctionComponent<{
    screen: ScreenConfig;
    target: React.FunctionComponent<FakeTargetProps>;
    selectedRows: string[];
    onToggleRow: (key: string) => void;
}> = ({ screen, target, selectedRows, onToggleRow }) => {
    const props = { target, selectedRows, onToggleRow };
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
            {screen.key === 'dashboard' && <DashboardFakeScreen {...props} />}
            {screen.key === 'inventory' && <InventoryFakeScreen {...props} />}
            {screen.key === 'dishes' && <DishesFakeScreen {...props} />}
            {screen.key === 'suggestions' && <SuggestionsFakeScreen {...props} />}
            {screen.key === 'shopping' && <ShoppingFakeScreen {...props} />}
            {screen.key === 'meals' && <MealsFakeScreen {...props} />}
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
    const [selectedRows, setSelectedRows] = React.useState<string[]>([]);
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
        setSelectedRows([]);
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

    const toggleRow = React.useCallback((key: string) => {
        setSelectedRows(prev => prev.includes(key) ? prev.filter(item => item !== key) : [...prev, key]);
        window.requestAnimationFrame(updateSpotlight);
    }, [updateSpotlight]);

    const selectScreen = React.useCallback((screenKey: TourScreenKey) => {
        const index = TOUR_STEPS.findIndex(item => item.screen === screenKey);
        if (index >= 0) goToStep(index);
    }, [goToStep]);

    return <FakeTargetContext.Provider value={registerTarget}>
        <div className='guide-tour-screen' data-testid='user-guide-tour-page'>
            <style>{tourCss}</style>
            <div className='guide-tour-layout'>
                <FakeAppShell screen={screen} target={target} selectedRows={selectedRows} onToggleRow={toggleRow} />

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
                                <Typography.Text style={{ color: '#2f2545', fontSize: 11, lineHeight: '16px', fontWeight: 720 }}>Tour dùng dữ liệu giả đẹp và màn hình mô phỏng. Không có trang thật nào bị thêm target hoặc bị ghi dữ liệu.</Typography.Text>
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
