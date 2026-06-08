import { CalendarOutlined, CheckCircleOutlined, LeftOutlined, PlayCircleOutlined, RightOutlined, ShoppingCartOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { Button } from '@components/Button';
import { Box } from '@components/Layout/Box';
import { Stack } from '@components/Layout/Stack';
import { Tag } from '@components/Tag';
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
    metrics: { label: string; value: string; tone: string }[];
    points: string[];
}

const WELCOME_SLIDES: WelcomeSlide[] = [
    {
        key: 'daily-flow',
        eyebrow: 'Bếp nhà mỗi ngày',
        title: 'Quyết định nấu gì nhanh hơn',
        description: 'My Recipes gom món ăn, tồn kho, thực đơn và lịch mua sắm để bạn không phải nhớ mọi thứ trong đầu.',
        tone: '#7436dc',
        icon: <ThunderboltOutlined />,
        metrics: [
            { label: 'Mở app', value: '1', tone: '#7436dc' },
            { label: 'Chọn món', value: '2', tone: '#13a8a8' },
            { label: 'Tạo giỏ', value: '3', tone: '#0958d9' },
        ],
        points: ['Xem việc cần chú ý hôm nay', 'Chọn món theo dữ liệu thật', 'Tạo kế hoạch mua và nấu từ cùng một luồng'],
    },
    {
        key: 'inventory',
        eyebrow: 'Tồn kho thực tế',
        title: 'Biết nguyên liệu nào nên dùng trước',
        description: 'Tồn kho theo từng lô giúp app cảnh báo nguyên liệu gần hết hạn và tính phần còn thiếu khi tạo giỏ mua.',
        tone: '#389e0d',
        icon: <CheckCircleOutlined />,
        metrics: [
            { label: 'Lô còn dùng', value: '8', tone: '#389e0d' },
            { label: 'Sắp hết hạn', value: '2', tone: '#d48806' },
            { label: 'Luôn có sẵn', value: '5', tone: '#13a8a8' },
        ],
        points: ['Cập nhật tồn kho sau khi mua', 'Ưu tiên nguyên liệu sắp hết hạn', 'Dùng dữ liệu kho để gợi ý món sát hơn'],
    },
    {
        key: 'meal-plan',
        eyebrow: 'Kế hoạch nấu ăn',
        title: 'Lên thực đơn rồi gom mua sắm',
        description: 'Thực đơn theo ngày và khẩu phần giúp bạn chuẩn bị cả tuần, sau đó tạo một giỏ mua sắm từ nhiều bữa.',
        tone: '#1677ff',
        icon: <CalendarOutlined />,
        metrics: [
            { label: 'Bữa hôm nay', value: '3', tone: '#1677ff' },
            { label: 'Món đã chọn', value: '5', tone: '#7436dc' },
            { label: 'Ngày tới', value: '7', tone: '#13a8a8' },
        ],
        points: ['Thêm món theo sáng, trưa, tối', 'Chỉnh khẩu phần theo số người ăn', 'Tạo giỏ mua từ một ngày hoặc nhiều ngày'],
    },
    {
        key: 'shopping',
        eyebrow: 'Đi chợ gọn hơn',
        title: 'Tick đồ đã mua và nhập về kho',
        description: 'Shopping list gom nguyên liệu từ món và thực đơn, theo dõi tiến độ mua, rồi cập nhật lại tồn kho khi hoàn tất.',
        tone: '#0958d9',
        icon: <ShoppingCartOutlined />,
        metrics: [
            { label: 'Cần mua', value: '12', tone: '#0958d9' },
            { label: 'Đã mua', value: '7', tone: '#389e0d' },
            { label: 'Còn lại', value: '5', tone: '#d48806' },
        ],
        points: ['Tick nhóm nguyên liệu khi đi mua', 'Xem số lượng còn cần mua', 'Hoàn tất để nhập nguyên liệu mới vào kho'],
    },
];

const welcomeCss = `
.user-guide-welcome-shell {
    min-height: calc(100dvh - 180px);
}
.user-guide-welcome-card {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(220px, 0.72fr);
    gap: 12px;
    align-items: stretch;
}
.user-guide-welcome-metrics {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
}
.user-guide-welcome-dot {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    border: 0;
    padding: 0;
    cursor: pointer;
}
@media (max-width: 760px) {
    .user-guide-welcome-page {
        max-width: 100% !important;
        padding-bottom: 98px !important;
    }
    .user-guide-welcome-card {
        grid-template-columns: minmax(0, 1fr);
    }
}
@media (max-width: 420px) {
    .user-guide-welcome-metrics {
        grid-template-columns: minmax(0, 1fr);
    }
}
`;

const WelcomeMetric: React.FunctionComponent<{ label: string; value: string; tone: string }> = ({ label, value, tone }) => {
    return <Box style={{ border: `1px solid ${tone}22`, borderRadius: 8, background: `${tone}09`, padding: 10, minWidth: 0 }}>
        <Typography.Text strong style={{ display: 'block', color: tone, fontSize: 22, lineHeight: '27px' }}>{value}</Typography.Text>
        <Typography.Text type='secondary' style={{ display: 'block', fontSize: 11, lineHeight: '15px', fontWeight: 720 }}>{label}</Typography.Text>
    </Box>;
};

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

    return <Box data-testid='user-guide-welcome-page' className='user-guide-welcome-page user-guide-welcome-shell' style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12, padding: '0 0 14px', maxWidth: 920, margin: '0 auto' }}>
        <style>{welcomeCss}</style>
        <Box style={{ borderRadius: 8, padding: 14, background: 'linear-gradient(135deg, #ffffff 0%, #f6fffb 46%, #fbf9ff 100%)', border: '1px solid rgba(116,54,220,0.12)', boxShadow: '0 14px 34px rgba(74,48,130,0.10)' }}>
            <div className='user-guide-welcome-card'>
                <Box style={{ minWidth: 0 }}>
                    <Stack align='center' gap={8} wrap='wrap' style={{ marginBottom: 14 }}>
                        <span style={{ width: 44, height: 44, borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: slide.tone, background: `${slide.tone}12`, border: `1px solid ${slide.tone}24`, fontSize: 21, flexShrink: 0 }}>{slide.icon}</span>
                        <div style={{ minWidth: 0 }}>
                            <Typography.Text style={{ display: 'block', color: slide.tone, fontSize: 12, lineHeight: '16px', fontWeight: 780 }}>{slide.eyebrow}</Typography.Text>
                            <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 24, lineHeight: '30px' }}>{slide.title}</Typography.Text>
                        </div>
                    </Stack>
                    <Typography.Text style={{ display: 'block', color: '#2f2545', fontSize: 13, lineHeight: '20px', marginBottom: 14 }}>{slide.description}</Typography.Text>
                    <div className='user-guide-welcome-metrics'>
                        {slide.metrics.map(metric => <WelcomeMetric key={metric.label} {...metric} />)}
                    </div>
                </Box>

                <Box style={{ border: `1px solid ${slide.tone}18`, borderRadius: 8, background: `${slide.tone}07`, padding: 12, minWidth: 0 }}>
                    <Stack justify='space-between' align='center' gap={8} style={{ marginBottom: 10 }}>
                        <Typography.Text strong style={{ color: '#111827', fontSize: 14, lineHeight: '19px' }}>Bạn sẽ dùng để làm gì?</Typography.Text>
                        <Tag color='purple' style={{ marginInlineEnd: 0 }}>{index + 1}/{WELCOME_SLIDES.length}</Tag>
                    </Stack>
                    <Stack direction='column' align='stretch' gap={8}>
                        {slide.points.map(point => <Box key={point} style={{ border: '1px solid rgba(116,54,220,0.10)', borderRadius: 8, background: '#fff', padding: 9 }}>
                            <Stack align='flex-start' gap={8}>
                                <CheckCircleOutlined style={{ color: slide.tone, marginTop: 2, flexShrink: 0 }} />
                                <Typography.Text style={{ color: '#2f2545', fontSize: 12, lineHeight: '17px', fontWeight: 700 }}>{point}</Typography.Text>
                            </Stack>
                        </Box>)}
                    </Stack>
                </Box>
            </div>

            <Stack justify='space-between' align='center' gap={10} wrap='wrap' style={{ marginTop: 14 }}>
                <Button icon={<LeftOutlined />} disabled={isFirst} onClick={previous} style={{ borderRadius: 999 }}>Trước</Button>
                <Stack align='center' gap={7}>
                    {WELCOME_SLIDES.map((item, dotIndex) => {
                        const active = dotIndex === index;
                        return <button
                            key={item.key}
                            type='button'
                            className='user-guide-welcome-dot'
                            aria-label={`Mở slide ${dotIndex + 1}`}
                            aria-pressed={active}
                            onClick={() => setIndex(dotIndex)}
                            style={{ width: active ? 22 : 8, background: active ? slide.tone : 'rgba(116,54,220,0.22)', transition: 'width 160ms ease, background 160ms ease' }}
                        />;
                    })}
                </Stack>
                <Button type='primary' icon={isLast ? <PlayCircleOutlined /> : <RightOutlined />} onClick={next} style={{ borderRadius: 999, background: slide.tone, borderColor: slide.tone, fontWeight: 760 }}>{isLast ? 'Bắt đầu tour' : 'Tiếp'}</Button>
            </Stack>
        </Box>
    </Box>;
};

export default UserGuideWelcomeScreen;
