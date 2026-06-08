import { CalendarOutlined, CheckCircleOutlined, LeftOutlined, PlayCircleOutlined, RightOutlined, SearchOutlined, ShoppingCartOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { Button } from '@components/Button';
import { Image } from '@components/Image';
import { Box } from '@components/Layout/Box';
import { Stack } from '@components/Layout/Stack';
import { Typography } from '@components/Typography';
import { useScreenTitle } from '@hooks';
import { RootRoutes } from '@routing/RootRoutes';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { markUserGuideWelcomeComplete } from './UserGuideOnboardingStorage';
import HouseIcon from '../../../../assets/icons/house.png';
import MealsIcon from '../../../../assets/icons/meals.png';
import DishesIcon from '../../../../assets/icons/noodles.png';
import ShoppingListIcon from '../../../../assets/icons/shoppingList.png';
import IngredientIcon from '../../../../assets/icons/vegetable.png';
import SuggesterIcon from '../../../../assets/icons/cooking.png';
import BudgetIcon from '../../../../assets/icons/budget.png';

type WelcomeSlide = {
    key: string;
    eyebrow: string;
    title: string;
    description: string;
    tone: string;
    icon: React.ReactNode;
    featureIcon: string;
    previewTitle: string;
    previewSubtitle: string;
    previewRows: { label: string; value: string; note: string; tone: string }[];
    points: string[];
}

const WELCOME_SLIDES: WelcomeSlide[] = [
    {
        key: 'today',
        eyebrow: 'My Recipes',
        title: 'Mở app, biết việc cần làm',
        description: 'Tổng quan gom món hôm nay, giỏ mua và nguyên liệu nên dùng trước.',
        tone: '#7436dc',
        icon: <ThunderboltOutlined />,
        featureIcon: HouseIcon,
        previewTitle: 'Tổng quan',
        previewSubtitle: 'Bếp nhà hôm nay',
        previewRows: [
            { label: 'Hôm nay', value: '4 việc', note: 'Thực đơn, mua sắm, tồn kho', tone: '#7436dc' },
            { label: 'Gợi ý món nên nấu', value: '3 món', note: 'Dựa trên nguyên liệu còn lại', tone: '#389e0d' },
            { label: 'Danh sách đang mở', value: '2 giỏ', note: 'Có thể tiếp tục đi mua', tone: '#0958d9' },
        ],
        points: ['Xem Tổng quan trước', 'Chọn món theo dữ liệu thật', 'Đi tiếp sang mua sắm hoặc thực đơn'],
    },
    {
        key: 'inventory',
        eyebrow: 'Tồn kho',
        title: 'Theo dõi kho theo từng lô',
        description: 'Biết còn bao nhiêu, lô nào gần hết hạn và món nào dùng được ngay.',
        tone: '#389e0d',
        icon: <CheckCircleOutlined />,
        featureIcon: IngredientIcon,
        previewTitle: 'Nguyên liệu',
        previewSubtitle: 'Tồn kho theo lô',
        previewRows: [
            { label: 'Rau cải xanh', value: '300g', note: 'Ngăn mát · còn 2 ngày', tone: '#d48806' },
            { label: 'Ức gà', value: '450g', note: 'Đủ cho 2 phần cơm gà', tone: '#389e0d' },
            { label: 'Trứng gà', value: '8 quả', note: 'Dễ ghép món nhanh', tone: '#13a8a8' },
        ],
        points: ['Cập nhật sau khi mua', 'Dùng nguyên liệu sắp hết hạn trước', 'Để app tính giỏ mua chính xác'],
    },
    {
        key: 'plan',
        eyebrow: 'Thực đơn',
        title: 'Lên bữa ăn theo ngày',
        description: 'Chọn món cho sáng, trưa, tối rồi tạo giỏ mua từ kế hoạch đó.',
        tone: '#1677ff',
        icon: <CalendarOutlined />,
        featureIcon: MealsIcon,
        previewTitle: 'Thực đơn',
        previewSubtitle: 'Monday, 08/06/2026',
        previewRows: [
            { label: 'Sáng', value: 'Cháo yến mạch', note: '1 phần', tone: '#1677ff' },
            { label: 'Trưa', value: 'Cơm gà áp chảo', note: '2 phần', tone: '#7436dc' },
            { label: 'Tối', value: 'Canh rau đậu hũ', note: '3 phần', tone: '#389e0d' },
        ],
        points: ['Chọn ngày cần nấu', 'Đặt khẩu phần cho từng món', 'Tạo giỏ mua từ nhiều bữa'],
    },
    {
        key: 'shopping',
        eyebrow: 'Mua sắm',
        title: 'Đi chợ theo danh sách rõ ràng',
        description: 'Tick nguyên liệu đã mua, xem phần còn thiếu và nhập đồ mới về kho.',
        tone: '#0958d9',
        icon: <ShoppingCartOutlined />,
        featureIcon: ShoppingListIcon,
        previewTitle: 'Lịch mua sắm',
        previewSubtitle: 'Giỏ cuối tuần',
        previewRows: [
            { label: 'Tiến độ', value: '7/12', note: 'Còn 5 nguyên liệu cần mua', tone: '#389e0d' },
            { label: 'Ước tính', value: '320k', note: 'Tính từ giá nguyên liệu', tone: '#0958d9' },
            { label: 'Nguồn', value: '4 bữa', note: 'Tự gom từ thực đơn', tone: '#7436dc' },
        ],
        points: ['Tick khi mua xong', 'Xem lượng còn thiếu', 'Hoàn tất để nhập kho'],
    },
];

const welcomeCss = `
.guide-welcome-screen {
    min-height: 100vh;
    min-height: 100dvh;
    width: 100%;
    position: relative;
    overflow: hidden;
    background: radial-gradient(circle at 18% 18%, rgba(116,54,220,0.18), transparent 31%), linear-gradient(145deg, #f7f3ff 0%, #ffffff 48%, #eefbf7 100%);
    color: #111827;
}
.guide-welcome-main {
    min-height: 100vh;
    min-height: 100dvh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: calc(24px + env(safe-area-inset-top)) 76px calc(92px + env(safe-area-inset-bottom));
    box-sizing: border-box;
}
.guide-welcome-stage {
    width: min(980px, 100%);
    display: grid;
    grid-template-columns: minmax(0, 0.96fr) minmax(260px, 0.82fr);
    gap: 18px;
    align-items: center;
}
.guide-welcome-copy {
    min-width: 0;
}
.guide-welcome-orb {
    width: 58px;
    height: 58px;
    border-radius: 18px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: rgba(255,255,255,0.92);
    box-shadow: 0 16px 34px rgba(74,48,130,0.16);
    font-size: 27px;
}
.guide-welcome-phone {
    border: 1px solid rgba(116,54,220,0.14);
    border-radius: 28px;
    background: rgba(255,255,255,0.92);
    box-shadow: 0 24px 54px rgba(74,48,130,0.18);
    padding: 12px;
    min-width: 0;
}
.guide-welcome-phone-inner {
    border-radius: 22px;
    overflow: hidden;
    border: 1px solid rgba(116,54,220,0.10);
    background: linear-gradient(180deg, #e9e3f4 0%, #f6f3fb 52%, #ffffff 100%);
}
.guide-welcome-phone-header {
    height: 76px;
    padding: 10px 12px 12px;
    box-sizing: border-box;
    color: #fff;
    box-shadow: 0 12px 26px rgba(95,43,191,0.22);
}
.guide-welcome-preview-list {
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 9px;
}
.guide-welcome-preview-row {
    border-radius: 8px;
    border: 1px solid rgba(116,54,220,0.10);
    background: rgba(255,255,255,0.94);
    padding: 10px;
    box-shadow: 0 8px 18px rgba(74,48,130,0.07);
}
.guide-welcome-mini-section {
    border: 1px solid rgba(116,54,220,0.10);
    border-radius: 8px;
    background: rgba(255,255,255,0.96);
    box-shadow: 0 10px 24px rgba(74,48,130,0.10);
    overflow: hidden;
}
.guide-welcome-preview-control {
    margin: 10px 10px 0;
    border: 1px solid rgba(116,54,220,0.10);
    border-radius: 8px;
    background: #fff;
    padding: 8px;
    box-shadow: 0 6px 14px rgba(74,48,130,0.06);
}
.guide-welcome-preview-pills {
    display: flex;
    align-items: center;
    gap: 5px;
    overflow: hidden;
}
.guide-welcome-preview-pill {
    border-radius: 999px;
    border: 1px solid rgba(116,54,220,0.14);
    padding: 3px 7px;
    font-size: 9.5px;
    line-height: 13px;
    font-weight: 780;
    white-space: nowrap;
}
.guide-welcome-progress-track {
    height: 7px;
    border-radius: 999px;
    background: rgba(116,54,220,0.12);
    overflow: hidden;
}
.guide-welcome-progress-bar {
    height: 100%;
    border-radius: inherit;
}
.guide-welcome-mini-tabbar {
    height: 66px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 10px 8px;
    box-sizing: border-box;
}
.guide-welcome-mini-dock {
    width: 100%;
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border: 1px solid rgba(116,54,220,0.14);
    border-radius: 18px;
    background: rgba(255,255,255,0.98);
    box-shadow: 0 10px 24px rgba(74,48,130,0.14);
    padding: 5px 7px;
    box-sizing: border-box;
}
.guide-welcome-mini-tab {
    flex: 1 1 0;
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    font-size: 9px;
    line-height: 12px;
    color: #6b6478;
}
.guide-welcome-arrow {
    position: fixed;
    top: 50%;
    transform: translateY(-50%);
    width: 48px;
    height: 48px;
    border-radius: 999px;
    border: 1px solid rgba(116,54,220,0.16);
    background: rgba(255,255,255,0.88);
    color: #5e2bbf;
    box-shadow: 0 14px 30px rgba(74,48,130,0.16);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 3;
}
.guide-welcome-arrow:disabled {
    opacity: 0.38;
    cursor: default;
}
.guide-welcome-arrow-left { left: max(16px, env(safe-area-inset-left)); }
.guide-welcome-arrow-right { right: max(16px, env(safe-area-inset-right)); }
.guide-welcome-bottom {
    position: fixed;
    left: 0;
    right: 0;
    bottom: calc(20px + env(safe-area-inset-bottom));
    z-index: 4;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 14px;
    padding: 0 16px;
    box-sizing: border-box;
}
.guide-welcome-dots {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 10px 12px;
    border-radius: 999px;
    background: rgba(255,255,255,0.84);
    border: 1px solid rgba(116,54,220,0.12);
    box-shadow: 0 10px 24px rgba(74,48,130,0.12);
}
.guide-welcome-dot {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    border: 0;
    padding: 0;
    cursor: pointer;
}
@media (max-width: 760px) {
    .guide-welcome-main {
        align-items: flex-start;
        padding: calc(22px + env(safe-area-inset-top)) 18px calc(96px + env(safe-area-inset-bottom));
        overflow-y: auto;
    }
    .guide-welcome-stage {
        grid-template-columns: minmax(0, 1fr);
        gap: 14px;
    }
    .guide-welcome-copy h1 {
        font-size: 31px !important;
        line-height: 37px !important;
    }
    .guide-welcome-arrow {
        top: auto;
        bottom: calc(18px + env(safe-area-inset-bottom));
        transform: none;
        width: 42px;
        height: 42px;
    }
    .guide-welcome-arrow-left { left: 16px; }
    .guide-welcome-arrow-right { right: 16px; }
}
`;

export const UserGuideWelcomeScreen: React.FC = () => {
    const navigate = useNavigate();
    const [index, setIndex] = React.useState(0);
    const slide = WELCOME_SLIDES[index];
    const isFirst = index === 0;
    const isLast = index === WELCOME_SLIDES.length - 1;
    useScreenTitle({ value: 'Chào mừng', deps: [] });

    const finish = React.useCallback(() => {
        markUserGuideWelcomeComplete();
        navigate(RootRoutes.AuthorizedRoutes.UserGuideTour({ item: 'start' }), { replace: true });
    }, [navigate]);

    const previous = React.useCallback(() => setIndex(prev => Math.max(0, prev - 1)), []);
    const next = React.useCallback(() => {
        if (isLast) finish();
        else setIndex(prev => Math.min(WELCOME_SLIDES.length - 1, prev + 1));
    }, [finish, isLast]);

    const renderPreviewControl = () => {
        if (slide.key === 'inventory') {
            return <div className='guide-welcome-preview-control'>
                <Stack align='center' gap={7} style={{ minWidth: 0 }}>
                    <SearchOutlined style={{ color: slide.tone, flexShrink: 0 }} />
                    <Typography.Text type='secondary' style={{ fontSize: 10.5, lineHeight: '15px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: '1 1 auto', minWidth: 0 }}>Tìm nguyên liệu hoặc lô tồn kho</Typography.Text>
                </Stack>
                <div className='guide-welcome-preview-pills' style={{ marginTop: 7 }}>
                    {['Còn hàng', 'Rau củ', 'Sắp hết hạn'].map((label, labelIndex) => <span key={label} className='guide-welcome-preview-pill' style={{ color: labelIndex === 0 ? slide.tone : '#6b6478', background: labelIndex === 0 ? `${slide.tone}10` : '#fff', borderColor: labelIndex === 0 ? `${slide.tone}35` : 'rgba(116,54,220,0.12)' }}>{label}</span>)}
                </div>
            </div>;
        }

        if (slide.key === 'plan') {
            return <div className='guide-welcome-preview-control'>
                <Stack align='center' justify='space-between' gap={7}>
                    <span className='guide-welcome-preview-pill' style={{ color: slide.tone, background: `${slide.tone}10`, borderColor: `${slide.tone}35` }}><LeftOutlined /></span>
                    <div style={{ textAlign: 'center', minWidth: 0 }}>
                        <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 11.5, lineHeight: '16px' }}>Monday, 08/06/2026</Typography.Text>
                        <Typography.Text type='secondary' style={{ display: 'block', fontSize: 9.5, lineHeight: '13px' }}>3 bữa · 6 phần</Typography.Text>
                    </div>
                    <span className='guide-welcome-preview-pill' style={{ color: slide.tone, background: `${slide.tone}10`, borderColor: `${slide.tone}35` }}><RightOutlined /></span>
                </Stack>
            </div>;
        }

        if (slide.key === 'shopping') {
            return <div className='guide-welcome-preview-control'>
                <Stack justify='space-between' align='center' gap={8} style={{ marginBottom: 7 }}>
                    <Typography.Text strong style={{ color: '#111827', fontSize: 11, lineHeight: '15px' }}>Tiến độ mua</Typography.Text>
                    <span className='guide-welcome-preview-pill' style={{ color: slide.tone, background: `${slide.tone}10`, borderColor: `${slide.tone}35` }}>7/12</span>
                </Stack>
                <div className='guide-welcome-progress-track'>
                    <div className='guide-welcome-progress-bar' style={{ width: '58%', background: `linear-gradient(90deg, ${slide.tone} 0%, #13a8a8 100%)` }} />
                </div>
            </div>;
        }

        return <div className='guide-welcome-preview-control'>
            <div className='guide-welcome-preview-pills'>
                {['Monday 3 bữa', '2 giỏ mở', '2 lô ưu tiên'].map((label, labelIndex) => <span key={label} className='guide-welcome-preview-pill' style={{ color: labelIndex === 0 ? slide.tone : '#6b6478', background: labelIndex === 0 ? `${slide.tone}10` : '#fff', borderColor: labelIndex === 0 ? `${slide.tone}35` : 'rgba(116,54,220,0.12)' }}>{label}</span>)}
            </div>
        </div>;
    };

    return <div className='guide-welcome-screen' data-testid='user-guide-welcome-page'>
        <style>{welcomeCss}</style>
        <button className='guide-welcome-arrow guide-welcome-arrow-left' type='button' aria-label='Slide trước' disabled={isFirst} onClick={previous}><LeftOutlined /></button>
        <button className='guide-welcome-arrow guide-welcome-arrow-right' type='button' aria-label={isLast ? 'Bắt đầu tour' : 'Slide sau'} onClick={next}>{isLast ? <PlayCircleOutlined /> : <RightOutlined />}</button>

        <main className='guide-welcome-main'>
            <section className='guide-welcome-stage' aria-live='polite'>
                <div className='guide-welcome-copy'>
                    <Stack align='center' gap={12} style={{ marginBottom: 18 }}>
                        <span className='guide-welcome-orb' style={{ color: slide.tone }}>{slide.icon}</span>
                        <div style={{ minWidth: 0 }}>
                            <Typography.Text style={{ display: 'block', color: slide.tone, fontSize: 13, lineHeight: '18px', fontWeight: 820 }}>{slide.eyebrow}</Typography.Text>
                            <Typography.Title level={1} style={{ margin: 0, color: '#111827', fontSize: 44, lineHeight: '52px', letterSpacing: 0 }}>{slide.title}</Typography.Title>
                        </div>
                    </Stack>
                    <Typography.Paragraph style={{ color: '#3f3658', fontSize: 16, lineHeight: '25px', marginBottom: 18, maxWidth: 560 }}>{slide.description}</Typography.Paragraph>
                    <Stack direction='column' align='stretch' gap={9} style={{ maxWidth: 520 }}>
                        {slide.points.map(point => <Box key={point} style={{ border: '1px solid rgba(116,54,220,0.12)', background: 'rgba(255,255,255,0.74)', borderRadius: 12, padding: '10px 12px' }}>
                            <Stack align='center' gap={9}>
                                <CheckCircleOutlined style={{ color: slide.tone, flexShrink: 0 }} />
                                <Typography.Text style={{ color: '#2f2545', fontSize: 13, lineHeight: '18px', fontWeight: 720 }}>{point}</Typography.Text>
                            </Stack>
                        </Box>)}
                    </Stack>
                </div>

                <div className='guide-welcome-phone' aria-hidden='true'>
                    <div className='guide-welcome-phone-inner'>
                        <div className='guide-welcome-phone-header' style={{ background: `linear-gradient(135deg, ${slide.tone} 0%, #5e2bbf 100%)` }}>
                            <Stack justify='space-between' align='center' gap={9} style={{ height: '100%' }}>
                                <Stack align='center' gap={8} style={{ minWidth: 0 }}>
                                    <span style={{ width: 36, height: 36, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.24)', color: '#fff', flexShrink: 0 }}>=</span>
                                    <div style={{ minWidth: 0 }}>
                                        <Typography.Text style={{ display: 'block', color: 'rgba(255,255,255,0.76)', fontSize: 10, lineHeight: '14px', fontWeight: 760 }}>My Recipes</Typography.Text>
                                        <Typography.Text strong style={{ display: 'block', color: '#fff', fontSize: 18, lineHeight: '22px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{slide.previewTitle}</Typography.Text>
                                    </div>
                                </Stack>
                                <Stack align='center' gap={6} style={{ flexShrink: 0 }}>
                                    <span style={{ borderRadius: 999, padding: '4px 8px', background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.22)', color: '#fff', fontSize: 10, fontWeight: 700 }}>08, 06 2026</span>
                                    <span style={{ width: 36, height: 36, borderRadius: '50%', background: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 18px rgba(34,17,83,0.22)' }}><Image src={slide.featureIcon} width={23} preview={false} alt='' /></span>
                                </Stack>
                            </Stack>
                        </div>
                        <div className='guide-welcome-preview-list'>
                            <div className='guide-welcome-mini-section'>
                                <div style={{ padding: 10, background: `linear-gradient(90deg, ${slide.tone}12 0%, rgba(255,255,255,0.96) 72%)`, borderBottom: '1px solid rgba(116,54,220,0.09)' }}>
                                    <Stack justify='space-between' align='center' gap={8}>
                                        <div style={{ minWidth: 0 }}>
                                            <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 14, lineHeight: '19px' }}>{slide.previewTitle}</Typography.Text>
                                            <Typography.Text type='secondary' style={{ display: 'block', fontSize: 10.5, lineHeight: '15px' }}>{slide.previewSubtitle}</Typography.Text>
                                        </div>
                                        <span style={{ borderRadius: 999, padding: '3px 8px', color: slide.tone, background: `${slide.tone}12`, border: `1px solid ${slide.tone}24`, fontSize: 10, lineHeight: '14px', fontWeight: 800 }}>Demo</span>
                                    </Stack>
                                </div>
                                {renderPreviewControl()}
                                <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {slide.previewRows.map(row => <div key={row.label} className='guide-welcome-preview-row'>
                                        <Stack justify='space-between' align='center' gap={10}>
                                            <div style={{ minWidth: 0 }}>
                                                <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 12.5, lineHeight: '17px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.label}</Typography.Text>
                                                <Typography.Text type='secondary' style={{ display: 'block', fontSize: 10.5, lineHeight: '15px', marginTop: 1 }}>{row.note}</Typography.Text>
                                            </div>
                                            <Typography.Text strong style={{ color: row.tone, fontSize: 14, lineHeight: '19px', flexShrink: 0 }}>{row.value}</Typography.Text>
                                        </Stack>
                                    </div>)}
                                </div>
                            </div>
                        </div>
                        <div className='guide-welcome-mini-tabbar'>
                            <div className='guide-welcome-mini-dock'>
                                {[
                                    [DishesIcon, 'Món'],
                                    [MealsIcon, 'Thực đơn'],
                                    [SuggesterIcon, 'Nấu gì'],
                                    [ShoppingListIcon, 'Mua sắm'],
                                    [BudgetIcon, 'Tính phí'],
                                ].map(([icon, label]) => <div key={String(label)} className='guide-welcome-mini-tab'>
                                    <Image src={String(icon)} preview={false} width={18} alt='' />
                                    <span>{label}</span>
                                </div>)}
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </main>

        <div className='guide-welcome-bottom'>
            <div className='guide-welcome-dots'>
                {WELCOME_SLIDES.map((item, dotIndex) => {
                    const active = dotIndex === index;
                    return <button
                        key={item.key}
                        type='button'
                        className='guide-welcome-dot'
                        aria-label={`Mở slide ${dotIndex + 1}`}
                        aria-pressed={active}
                        onClick={() => setIndex(dotIndex)}
                        style={{ width: active ? 26 : 8, background: active ? slide.tone : 'rgba(116,54,220,0.24)', transition: 'width 180ms ease, background 180ms ease' }}
                    />;
                })}
            </div>
            {isLast && <Button type='primary' onClick={finish} style={{ borderRadius: 999, background: slide.tone, borderColor: slide.tone, fontWeight: 800 }}>Bắt đầu tour</Button>}
        </div>
    </div>;
};

export default UserGuideWelcomeScreen;
