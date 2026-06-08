import { CalendarOutlined, CheckCircleOutlined, LeftOutlined, PlayCircleOutlined, RightOutlined, ShoppingCartOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { Button } from '@components/Button';
import { Box } from '@components/Layout/Box';
import { Stack } from '@components/Layout/Stack';
import { Typography } from '@components/Typography';
import { useScreenTitle } from '@hooks';
import { RootRoutes } from '@routing/RootRoutes';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { markUserGuideWelcomeComplete } from './UserGuideOnboardingStorage';

type WelcomeSlide = {
    key: string;
    eyebrow: string;
    title: string;
    description: string;
    tone: string;
    icon: React.ReactNode;
    previewTitle: string;
    previewRows: { label: string; value: string; note: string; tone: string }[];
    points: string[];
}

const WELCOME_SLIDES: WelcomeSlide[] = [
    {
        key: 'today',
        eyebrow: 'My Recipes',
        title: 'Bếp nhà trong một màn hình',
        description: 'Mở app là thấy hôm nay cần nấu gì, cần mua gì và nguyên liệu nào nên dùng trước.',
        tone: '#7436dc',
        icon: <ThunderboltOutlined />,
        previewTitle: 'Tổng quan hôm nay',
        previewRows: [
            { label: 'Việc cần xem', value: '4', note: 'Thực đơn, mua sắm, tồn kho', tone: '#7436dc' },
            { label: 'Gợi ý món', value: '3', note: 'Dựa trên nguyên liệu còn lại', tone: '#389e0d' },
            { label: 'Giỏ đang mở', value: '2', note: 'Có thể tiếp tục đi mua', tone: '#0958d9' },
        ],
        points: ['Đọc dashboard trước', 'Chọn món từ dữ liệu thật', 'Đi tiếp sang thực đơn hoặc mua sắm'],
    },
    {
        key: 'inventory',
        eyebrow: 'Tồn kho',
        title: 'Biết nguyên liệu nào phải xử lý',
        description: 'Tồn kho theo lô giúp app tính hạn dùng, lượng còn lại và nguyên liệu còn thiếu khi tạo giỏ.',
        tone: '#389e0d',
        icon: <CheckCircleOutlined />,
        previewTitle: 'Kho lạnh',
        previewRows: [
            { label: 'Rau cải', value: '2 ngày', note: 'Nên dùng trước', tone: '#d48806' },
            { label: 'Ức gà', value: '450g', note: 'Đủ cho 2 phần', tone: '#389e0d' },
            { label: 'Trứng', value: '8 quả', note: 'Luôn dễ ghép món', tone: '#13a8a8' },
        ],
        points: ['Cập nhật sau khi mua', 'Theo dõi lô sắp hết hạn', 'Để gợi ý món chính xác hơn'],
    },
    {
        key: 'plan',
        eyebrow: 'Thực đơn',
        title: 'Lên lịch bữa ăn rồi gom mua sắm',
        description: 'Chọn món theo ngày, chỉnh khẩu phần, sau đó tạo một danh sách mua cho nhiều bữa.',
        tone: '#1677ff',
        icon: <CalendarOutlined />,
        previewTitle: 'Thứ Hai, 08/06/2026',
        previewRows: [
            { label: 'Sáng', value: 'Cháo yến mạch', note: '1 phần', tone: '#1677ff' },
            { label: 'Trưa', value: 'Cơm gà', note: '2 phần', tone: '#7436dc' },
            { label: 'Tối', value: 'Canh rau', note: '3 phần', tone: '#389e0d' },
        ],
        points: ['Lập kế hoạch theo ngày', 'Dùng khẩu phần đúng', 'Tạo giỏ mua từ nhiều bữa'],
    },
    {
        key: 'shopping',
        eyebrow: 'Mua sắm',
        title: 'Đi chợ gọn và nhập kho sau khi mua',
        description: 'Danh sách mua sắm gom nguyên liệu còn thiếu, theo dõi tiến độ và đưa đồ đã mua về tồn kho.',
        tone: '#0958d9',
        icon: <ShoppingCartOutlined />,
        previewTitle: 'Giỏ cuối tuần',
        previewRows: [
            { label: 'Đã mua', value: '7/12', note: 'Còn 5 mục', tone: '#389e0d' },
            { label: 'Ước tính', value: '320k', note: 'Dựa trên giá nguyên liệu', tone: '#0958d9' },
            { label: 'Từ thực đơn', value: '4 bữa', note: 'Tự gom nguyên liệu', tone: '#7436dc' },
        ],
        points: ['Tick khi đi mua', 'Xem phần còn thiếu', 'Hoàn tất để nhập kho'],
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
    background: linear-gradient(180deg, #f3eefc 0%, #fff 58%, #fbfffd 100%);
}
.guide-welcome-phone-header {
    padding: 14px;
    color: #fff;
}
.guide-welcome-preview-list {
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 9px;
}
.guide-welcome-preview-row {
    border-radius: 14px;
    border: 1px solid rgba(116,54,220,0.10);
    background: rgba(255,255,255,0.94);
    padding: 10px;
    box-shadow: 0 8px 18px rgba(74,48,130,0.07);
}
.guide-welcome-arrow {
    position: absolute;
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
    position: absolute;
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
                            <Typography.Text style={{ color: 'rgba(255,255,255,0.76)', fontSize: 11, lineHeight: '15px', fontWeight: 760 }}>My Recipes</Typography.Text>
                            <Typography.Text strong style={{ display: 'block', color: '#fff', fontSize: 20, lineHeight: '25px', marginTop: 2 }}>{slide.previewTitle}</Typography.Text>
                        </div>
                        <div className='guide-welcome-preview-list'>
                            {slide.previewRows.map(row => <div key={row.label} className='guide-welcome-preview-row'>
                                <Stack justify='space-between' align='center' gap={10}>
                                    <div style={{ minWidth: 0 }}>
                                        <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 13, lineHeight: '18px' }}>{row.label}</Typography.Text>
                                        <Typography.Text type='secondary' style={{ display: 'block', fontSize: 11, lineHeight: '15px', marginTop: 1 }}>{row.note}</Typography.Text>
                                    </div>
                                    <Typography.Text strong style={{ color: row.tone, fontSize: 16, lineHeight: '21px', flexShrink: 0 }}>{row.value}</Typography.Text>
                                </Stack>
                            </div>)}
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
