import {
    AppstoreOutlined,
    BarChartOutlined,
    BookOutlined,
    CalculatorOutlined,
    CalendarOutlined,
    CheckCircleOutlined,
    CloudUploadOutlined,
    DatabaseOutlined,
    FireOutlined,
    MedicineBoxOutlined,
    PlayCircleOutlined,
    QuestionCircleOutlined,
    ShoppingCartOutlined,
} from '@ant-design/icons';
import { Button } from '@components/Button';
import { Box } from '@components/Layout/Box';
import { Stack } from '@components/Layout/Stack';
import { Tag } from '@components/Tag';
import { Typography } from '@components/Typography';
import { useScreenTitle } from '@hooks';
import { RootRoutes } from '@routing/RootRoutes';
import React from 'react';
import { useNavigate } from 'react-router-dom';

type GuideCard = {
    title: string;
    description: string;
    icon: React.ReactNode;
    tone: string;
}

type GuideSection = {
    title: string;
    description: string;
    cards: GuideCard[];
}

const DAILY_FLOW: GuideCard[] = [
    {
        title: 'Xem việc hôm nay',
        description: 'Bắt đầu ở Tổng quan để nhìn bữa đã lên lịch, giỏ mua đang mở và nguyên liệu nên dùng trước.',
        icon: <BookOutlined />,
        tone: '#7436dc',
    },
    {
        title: 'Chọn món hợp tình huống',
        description: 'Dùng Gợi ý món khi chưa biết nấu gì. App đọc tồn kho, thời gian rảnh và mục tiêu dinh dưỡng để xếp hạng món.',
        icon: <QuestionCircleOutlined />,
        tone: '#13a8a8',
    },
    {
        title: 'Lên bữa hoặc tạo giỏ',
        description: 'Món đã chọn có thể đi tiếp sang Thực đơn hoặc Lịch mua sắm, giúp gom nguyên liệu còn thiếu theo khẩu phần.',
        icon: <CalendarOutlined />,
        tone: '#1677ff',
    },
    {
        title: 'Đi chợ rồi nhập kho',
        description: 'Tick nguyên liệu đã mua, hoàn tất danh sách và cập nhật tồn kho để lần gợi ý kế tiếp chính xác hơn.',
        icon: <ShoppingCartOutlined />,
        tone: '#0958d9',
    },
];

const GUIDE_SECTIONS: GuideSection[] = [
    {
        title: 'Nền dữ liệu',
        description: 'Các dữ liệu này làm cho mọi tính toán trong app đáng tin hơn.',
        cards: [
            {
                title: 'Nguyên liệu và tồn kho',
                description: 'Quản lý nhóm nguyên liệu, đơn vị, giá, dinh dưỡng và từng lô tồn kho theo ngày mua, hạn dùng, nơi bảo quản.',
                icon: <DatabaseOutlined />,
                tone: '#389e0d',
            },
            {
                title: 'Món ăn',
                description: 'Công thức cần khẩu phần gốc, nguyên liệu, bước nấu và thời gian để shopping list, nutrition và gợi ý món tính đúng.',
                icon: <FireOutlined />,
                tone: '#d48806',
            },
            {
                title: 'Dữ liệu và sao lưu',
                description: 'Shared data giữ cookbook dùng chung. Dữ liệu cá nhân như tồn kho, thực đơn và giỏ mua vẫn local-first và có thể backup.',
                icon: <CloudUploadOutlined />,
                tone: '#0958d9',
            },
        ],
    },
    {
        title: 'Luồng hằng ngày',
        description: 'Những màn hình dùng nhiều nhất khi nấu, mua sắm và chuẩn bị bữa ăn.',
        cards: [
            {
                title: 'Gợi ý món',
                description: 'Chọn theo tủ lạnh, nguyên liệu, thời gian hoặc mục tiêu dinh dưỡng; sau đó tạo giỏ mua hoặc tính nutrition từ món đã chọn.',
                icon: <QuestionCircleOutlined />,
                tone: '#13a8a8',
            },
            {
                title: 'Lịch mua sắm',
                description: 'Gom nguyên liệu cần mua từ món, thực đơn hoặc mẫu. Trang chi tiết giúp tick tiến độ và nhập đồ đã mua về kho.',
                icon: <ShoppingCartOutlined />,
                tone: '#0958d9',
            },
            {
                title: 'Thực đơn',
                description: 'Lên món theo ngày, buổi ăn và khẩu phần. Có thể áp dụng mẫu hoặc tạo giỏ mua cho nhiều ngày cùng lúc.',
                icon: <CalendarOutlined />,
                tone: '#1677ff',
            },
        ],
    },
    {
        title: 'Ra quyết định',
        description: 'Dùng khi cần nhìn rộng hơn một bữa ăn hoặc một giỏ mua.',
        cards: [
            {
                title: 'Dinh dưỡng',
                description: 'Thiết lập mục tiêu và tính tổng kcal, đạm, tinh bột, chất béo, chất xơ từ món, lịch mua sắm hoặc thực đơn.',
                icon: <CalculatorOutlined />,
                tone: '#7436dc',
            },
            {
                title: 'Phân tích',
                description: 'Theo dõi tải chuẩn bị, áp lực chi phí, rủi ro hết hạn, chất lượng dữ liệu món và độ phủ dinh dưỡng.',
                icon: <BarChartOutlined />,
                tone: '#531dab',
            },
            {
                title: 'Mẫu dùng lại',
                description: 'Lưu thực đơn ngày, thực đơn tuần hoặc danh sách mua quen thuộc để tạo kế hoạch nhanh hơn.',
                icon: <AppstoreOutlined />,
                tone: '#13a8a8',
            },
        ],
    },
];

const DATA_HABITS: GuideCard[] = [
    {
        title: 'Cập nhật tồn kho sau khi mua',
        description: 'Tồn kho mới giúp Gợi ý món, Lịch mua sắm, Analytics và cảnh báo hạn dùng có dữ liệu đúng.',
        icon: <CheckCircleOutlined />,
        tone: '#389e0d',
    },
    {
        title: 'Ưu tiên món hay nấu',
        description: 'Không cần hoàn thiện tất cả công thức một lúc. Bắt đầu từ món gia đình dùng nhiều nhất.',
        icon: <FireOutlined />,
        tone: '#d48806',
    },
    {
        title: 'Bổ sung giá và nutrition',
        description: 'Giá làm dự toán mua sắm hữu ích hơn. Nutrition làm calculator và gợi ý theo mục tiêu đáng tin hơn.',
        icon: <MedicineBoxOutlined />,
        tone: '#cf1322',
    },
];

const userGuideCss = `
.user-guide-page {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 0 0 18px;
    max-width: 1040px;
    margin: 0 auto;
}
.user-guide-hero {
    border-radius: 8px;
    padding: 16px;
    background: linear-gradient(135deg, #ffffff 0%, #f7fffb 47%, #fbf9ff 100%);
    border: 1px solid rgba(116,54,220,0.12);
    box-shadow: 0 12px 28px rgba(74,48,130,0.08);
}
.user-guide-hero-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.4fr) minmax(250px, 0.8fr);
    gap: 14px;
    align-items: stretch;
}
.user-guide-action-panel {
    border-radius: 8px;
    border: 1px solid rgba(116,54,220,0.12);
    background: rgba(255,255,255,0.78);
    padding: 12px;
}
.user-guide-flow-grid,
.user-guide-card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 10px;
}
.user-guide-card {
    border-radius: 8px;
    border: 1px solid rgba(116,54,220,0.10);
    background: #fff;
    padding: 12px;
    box-shadow: 0 8px 18px rgba(15,23,42,0.05);
    min-width: 0;
}
.user-guide-section {
    border-radius: 8px;
    border: 1px solid rgba(116,54,220,0.10);
    background: #fff;
    padding: 14px;
    box-shadow: 0 10px 24px rgba(15,23,42,0.06);
}
.user-guide-tips {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 10px;
}
@media (max-width: 760px) {
    .user-guide-page {
        max-width: 100% !important;
        padding: 0 0 96px !important;
    }
    .user-guide-hero,
    .user-guide-section {
        box-shadow: 0 8px 18px rgba(74,48,130,0.07) !important;
    }
    .user-guide-hero-grid {
        grid-template-columns: minmax(0, 1fr);
    }
    .user-guide-action-row {
        flex-direction: column !important;
        align-items: stretch !important;
    }
    .user-guide-action-row button {
        width: 100%;
    }
    .user-guide-flow-grid,
    .user-guide-card-grid,
    .user-guide-tips {
        grid-template-columns: minmax(0, 1fr);
    }
}
`;

const GuideInfoCard: React.FC<GuideCard> = ({ title, description, icon, tone }) => {
    return <Box className='user-guide-card'>
        <Stack align='flex-start' gap={10}>
            <span style={{ width: 36, height: 36, borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: tone, background: `${tone}12`, border: `1px solid ${tone}24`, flexShrink: 0, fontSize: 17 }}>{icon}</span>
            <div style={{ minWidth: 0 }}>
                <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 14, lineHeight: '19px' }}>{title}</Typography.Text>
                <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '18px', marginTop: 4 }}>{description}</Typography.Text>
            </div>
        </Stack>
    </Box>;
};

export const UserGuideScreen: React.FC = () => {
    const navigate = useNavigate();
    useScreenTitle({ value: 'Hướng dẫn', deps: [] });

    const openWelcome = React.useCallback(() => {
        navigate(RootRoutes.AuthorizedRoutes.UserGuideWelcome());
    }, [navigate]);

    const openTour = React.useCallback(() => {
        navigate(RootRoutes.AuthorizedRoutes.UserGuideTour({ item: 'start' }));
    }, [navigate]);

    return <Box data-testid='user-guide-page' className='user-guide-page'>
        <style>{userGuideCss}</style>
        <Box className='user-guide-hero'>
            <div className='user-guide-hero-grid'>
                <div style={{ minWidth: 0 }}>
                    <Typography.Text style={{ display: 'block', color: '#7436dc', fontSize: 12, lineHeight: '16px', fontWeight: 800 }}>My Recipes</Typography.Text>
                    <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 26, lineHeight: '33px', marginTop: 2 }}>Hướng dẫn sử dụng</Typography.Text>
                    <Typography.Paragraph style={{ color: '#4b3f63', fontSize: 14, lineHeight: '22px', margin: '8px 0 0' }}>
                        Một bản tóm tắt gọn cho những luồng quan trọng nhất: chuẩn bị dữ liệu, chọn món, lên thực đơn, đi chợ, kiểm tra dinh dưỡng và sao lưu.
                    </Typography.Paragraph>
                    <Stack gap={7} wrap='wrap' style={{ marginTop: 12 }}>
                        <Tag color='purple' style={{ marginInlineEnd: 0 }}>Local-first</Tag>
                        <Tag color='green' style={{ marginInlineEnd: 0 }}>Daily workflow</Tag>
                        <Tag color='blue' style={{ marginInlineEnd: 0 }}>Mobile friendly</Tag>
                    </Stack>
                </div>
                <Box className='user-guide-action-panel'>
                    <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 15, lineHeight: '20px' }}>Học bằng màn hình thật</Typography.Text>
                    <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '18px', marginTop: 5 }}>
                        Welcome onboarding và tour đều dùng các mảnh UI thật với dữ liệu minh họa, tách khỏi dữ liệu thật của bạn.
                    </Typography.Text>
                    <Stack className='user-guide-action-row' gap={8} wrap='wrap' style={{ marginTop: 12 }}>
                        <Button type='primary' icon={<PlayCircleOutlined />} onClick={openTour} style={{ borderRadius: 999, background: '#7436dc', borderColor: '#7436dc', fontWeight: 760 }}>Bắt đầu tour</Button>
                        <Button icon={<BookOutlined />} onClick={openWelcome} style={{ borderRadius: 999, color: '#7436dc', borderColor: 'rgba(116,54,220,0.28)', fontWeight: 740 }}>Xem welcome</Button>
                    </Stack>
                </Box>
            </div>
        </Box>

        <Box className='user-guide-section'>
            <Stack align='center' gap={9} style={{ marginBottom: 10 }}>
                <span style={{ width: 34, height: 34, borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#7436dc', background: '#7436dc12', border: '1px solid #7436dc24', flexShrink: 0 }}><PlayCircleOutlined /></span>
                <div style={{ minWidth: 0 }}>
                    <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 17, lineHeight: '23px' }}>Luồng dùng hằng ngày</Typography.Text>
                    <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '18px' }}>Mở app, quyết định món, tạo kế hoạch và cập nhật dữ liệu sau khi mua.</Typography.Text>
                </div>
            </Stack>
            <div className='user-guide-flow-grid'>
                {DAILY_FLOW.map(item => <GuideInfoCard key={item.title} {...item} />)}
            </div>
        </Box>

        {GUIDE_SECTIONS.map(section => <Box key={section.title} className='user-guide-section'>
            <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 17, lineHeight: '23px' }}>{section.title}</Typography.Text>
            <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '18px', marginTop: 3, marginBottom: 10 }}>{section.description}</Typography.Text>
            <div className='user-guide-card-grid'>
                {section.cards.map(item => <GuideInfoCard key={item.title} {...item} />)}
            </div>
        </Box>)}

        <Box className='user-guide-section'>
            <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 17, lineHeight: '23px' }}>Thói quen giúp app tính tốt hơn</Typography.Text>
            <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '18px', marginTop: 3, marginBottom: 10 }}>Không cần làm tất cả ngay. Ba việc dưới đây tạo hiệu quả rõ nhất.</Typography.Text>
            <div className='user-guide-tips'>
                {DATA_HABITS.map(item => <GuideInfoCard key={item.title} {...item} />)}
            </div>
        </Box>
    </Box>;
};
