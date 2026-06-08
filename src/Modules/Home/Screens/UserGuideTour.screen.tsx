import {
    BookOutlined,
    CalendarOutlined,
    CheckCircleOutlined,
    DatabaseOutlined,
    FireOutlined,
    LeftOutlined,
    PlayCircleOutlined,
    ReloadOutlined,
    ShoppingCartOutlined,
} from '@ant-design/icons';
import { Button } from '@components/Button';
import { Box } from '@components/Layout/Box';
import { Stack } from '@components/Layout/Stack';
import { Tag } from '@components/Tag';
import { Typography } from '@components/Typography';
import { useScreenTitle } from '@hooks';
import { RootRoutes } from '@routing/RootRoutes';
import { Progress, Tour } from 'antd';
import type { TourProps } from 'antd';
import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

type GuideTourTarget = 'screen' | 'route' | 'focus' | 'details' | 'actions';

type GuideTourItem = {
    key: string;
    label: string;
    shortLabel: string;
    routeLabel: string;
    description: string;
    tone: string;
    icon: React.ReactNode;
    focusTitle: string;
    focusDescription: string;
    detailTitle: string;
    detailRows: string[];
    actionLabels: string[];
}

type DemoTargetRefs = Record<GuideTourTarget, React.RefObject<HTMLDivElement>>;

const GUIDE_TOUR_STORAGE_KEY = 'my-recipes-user-guide-tour-done-v1';

const GUIDE_TOUR_ITEMS: GuideTourItem[] = [
    {
        key: 'start',
        label: 'Bắt đầu nhanh',
        shortLabel: 'Bắt đầu',
        routeLabel: 'Tổng quan',
        description: 'Nhìn việc quan trọng hôm nay trước khi quyết định nấu gì.',
        tone: '#7436dc',
        icon: <BookOutlined />,
        focusTitle: 'Việc cần nhìn trước',
        focusDescription: 'Dashboard gom thực đơn hôm nay, giỏ mua đang mở và nguyên liệu cần dùng sớm để bạn không phải mở từng trang.',
        detailTitle: 'Cách đọc nhanh',
        detailRows: ['Xem số việc cần xử lý hôm nay', 'Mở nguyên liệu sắp hết hạn trước', 'Chọn món hoặc tạo giỏ từ luồng liên quan'],
        actionLabels: ['Mở tổng quan', 'Xem gợi ý'],
    },
    {
        key: 'ingredients',
        label: 'Nguyên liệu và tồn kho',
        shortLabel: 'Kho',
        routeLabel: 'Nguyên liệu',
        description: 'Hiểu nơi quản lý nguyên liệu dùng chung và tồn kho theo từng lô.',
        tone: '#389e0d',
        icon: <DatabaseOutlined />,
        focusTitle: 'Tồn kho theo lô',
        focusDescription: 'Mỗi nguyên liệu có đơn vị, nhóm, hạn bảo quản và các lô mua riêng để app tính số lượng còn lại chính xác.',
        detailTitle: 'Thông tin nên kiểm tra',
        detailRows: ['Đơn vị và nhóm nguyên liệu', 'Lô còn số lượng và ngày mua', 'Giá và nutrition nếu muốn tính chi phí hoặc dinh dưỡng'],
        actionLabels: ['Thêm lô', 'Sửa nguyên liệu'],
    },
    {
        key: 'dishes',
        label: 'Món ăn và phiên nấu',
        shortLabel: 'Món',
        routeLabel: 'Món ăn',
        description: 'Xem cách món ăn liên kết nguyên liệu, khẩu phần, bước nấu và trừ kho.',
        tone: '#d48806',
        icon: <FireOutlined />,
        focusTitle: 'Công thức có thể tính toán',
        focusDescription: 'Món càng đủ nguyên liệu, khẩu phần và thời gian thì shopping list, nutrition và gợi ý món càng đáng tin.',
        detailTitle: 'Phần quan trọng trong món',
        detailRows: ['Nguyên liệu và lượng dùng', 'Khẩu phần gốc của công thức', 'Bước nấu và thời gian chuẩn bị/nấu'],
        actionLabels: ['Bắt đầu nấu', 'Tạo giỏ'],
    },
    {
        key: 'suggestions',
        label: 'Gợi ý món',
        shortLabel: 'Gợi ý',
        routeLabel: 'Nấu gì?',
        description: 'Thử cách app xếp hạng món theo tủ lạnh, thời gian hoặc mục tiêu dinh dưỡng.',
        tone: '#13a8a8',
        icon: <PlayCircleOutlined />,
        focusTitle: 'Món phù hợp nhất',
        focusDescription: 'Điểm gợi ý dùng dữ liệu món, tồn kho, nguyên liệu thiếu, thời gian và mục tiêu để đưa món dễ nấu lên trên.',
        detailTitle: 'Bạn có thể tương tác',
        detailRows: ['Chọn nhiều món muốn nấu', 'Xem nguyên liệu còn thiếu', 'Tạo giỏ hoặc tính nutrition từ món đã chọn'],
        actionLabels: ['Chọn món', 'Tạo giỏ'],
    },
    {
        key: 'shopping',
        label: 'Lịch mua sắm',
        shortLabel: 'Mua sắm',
        routeLabel: 'Lịch mua sắm',
        description: 'Đi qua một giỏ mua: xem món nguồn, tick đồ đã mua và nhập về kho.',
        tone: '#0958d9',
        icon: <ShoppingCartOutlined />,
        focusTitle: 'Giỏ mua đang mở',
        focusDescription: 'Danh sách mua sắm gom nguyên liệu từ món, thực đơn hoặc mẫu, rồi trừ những gì đã có trong kho.',
        detailTitle: 'Việc làm khi đi mua',
        detailRows: ['Tick nhóm nguyên liệu đã mua', 'Xem lượng còn cần mua', 'Kiểm tra ước tính chi phí nếu có giá'],
        actionLabels: ['Tick đã mua', 'Nhập kho'],
    },
    {
        key: 'meals',
        label: 'Thực đơn',
        shortLabel: 'Thực đơn',
        routeLabel: 'Thực đơn',
        description: 'Lên lịch món theo ngày, buổi ăn và khẩu phần trước khi tạo giỏ mua.',
        tone: '#1677ff',
        icon: <CalendarOutlined />,
        focusTitle: 'Ngày đang lên kế hoạch',
        focusDescription: 'Thực đơn cho biết ngày nào ăn món gì, số phần bao nhiêu và có thể gom nhiều ngày thành một giỏ mua.',
        detailTitle: 'Cách lập kế hoạch',
        detailRows: ['Chọn ngày cần nấu', 'Thêm món vào sáng, trưa hoặc tối', 'Dùng mẫu để lặp lại ngày hoặc tuần quen thuộc'],
        actionLabels: ['Thêm bữa', 'Tạo giỏ'],
    },
];

const getTourItem = (key: string | null): GuideTourItem => GUIDE_TOUR_ITEMS.find(item => item.key === key) ?? GUIDE_TOUR_ITEMS[0];

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
    window.localStorage.setItem(GUIDE_TOUR_STORAGE_KEY, JSON.stringify(keys));
};

const userGuideTourCss = `
.user-guide-tour-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(230px, 0.55fr);
    gap: 12px;
    align-items: start;
}
.user-guide-tour-topic-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(118px, 1fr));
    gap: 8px;
}
.user-guide-tour-demo-grid {
    display: grid;
    grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
    gap: 10px;
}
.user-guide-tour-action-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
}
.user-guide-tour-popover .ant-tour-inner {
    border-radius: 8px;
    box-shadow: 0 18px 44px rgba(31, 21, 71, 0.24);
}
@media (max-width: 760px) {
    .user-guide-tour-page {
        max-width: 100% !important;
        padding-bottom: 98px !important;
    }
    .user-guide-tour-grid,
    .user-guide-tour-demo-grid {
        grid-template-columns: minmax(0, 1fr);
    }
    .user-guide-tour-topic-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}
@media (max-width: 420px) {
    .user-guide-tour-topic-grid,
    .user-guide-tour-action-grid {
        grid-template-columns: minmax(0, 1fr);
    }
}
`;

const createTourSteps = (item: GuideTourItem, targetRefs: DemoTargetRefs): TourProps['steps'] => [
    {
        title: 'Đây là màn hình tour riêng',
        description: 'Tour này dùng bản mô phỏng nhẹ trong module Hướng dẫn. Trang thật không bị gắn target hay chạy logic tour.',
        target: () => targetRefs.screen.current,
        placement: 'bottom',
        nextButtonProps: { children: 'Tiếp tục' },
    },
    {
        title: `Điểm đến: ${item.routeLabel}`,
        description: 'Khi dùng app thật, đây là khu vực hoặc tính năng bạn sẽ mở. Trong tour, phần này chỉ giúp bạn nhận diện ngữ cảnh.',
        target: () => targetRefs.route.current,
        placement: 'bottom',
        prevButtonProps: { children: 'Trước' },
        nextButtonProps: { children: 'Tiếp tục' },
    },
    {
        title: item.focusTitle,
        description: item.focusDescription,
        target: () => targetRefs.focus.current,
        placement: 'right',
        prevButtonProps: { children: 'Trước' },
        nextButtonProps: { children: 'Tiếp tục' },
    },
    {
        title: item.detailTitle,
        description: 'Bạn có thể chạm vào từng dòng demo để thấy trạng thái chọn. Tour vẫn ở màn hình hướng dẫn và không sửa dữ liệu thật.',
        target: () => targetRefs.details.current,
        placement: 'left',
        prevButtonProps: { children: 'Trước' },
        nextButtonProps: { children: 'Tiếp tục' },
    },
    {
        title: 'Thử thao tác chính',
        description: 'Các nút ở đây chỉ đổi trạng thái demo. Sau khi hiểu luồng, bạn có thể quay lại hướng dẫn hoặc mở trang thật từ trang hướng dẫn.',
        target: () => targetRefs.actions.current,
        placement: 'top',
        prevButtonProps: { children: 'Trước' },
        nextButtonProps: { children: 'Xong' },
    },
];

const DemoMetric: React.FunctionComponent<{ label: string; value: string | number; tone: string }> = ({ label, value, tone }) => {
    return <Box style={{ border: `1px solid ${tone}20`, borderRadius: 8, background: `${tone}08`, padding: 9, minWidth: 0 }}>
        <Typography.Text strong style={{ display: 'block', color: tone, fontSize: 18, lineHeight: '23px' }}>{value}</Typography.Text>
        <Typography.Text type='secondary' style={{ display: 'block', fontSize: 10, lineHeight: '14px', fontWeight: 700 }}>{label}</Typography.Text>
    </Box>;
};

const GuideTourDemo: React.FunctionComponent<{
    item: GuideTourItem;
    targetRefs: DemoTargetRefs;
    selectedRows: string[];
    onToggleRow: (row: string) => void;
    demoActionCount: number;
    onDemoAction: () => void;
}> = ({ item, targetRefs, selectedRows, onToggleRow, demoActionCount, onDemoAction }) => {
    return <Box ref={targetRefs.screen} style={{ border: `1px solid ${item.tone}22`, borderRadius: 8, background: '#fff', boxShadow: '0 14px 34px rgba(74,48,130,0.10)', overflow: 'hidden' }}>
        <div style={{ height: 5, background: `linear-gradient(90deg, ${item.tone} 0%, #13a8a8 100%)` }} />
        <div style={{ padding: 12 }}>
            <Box ref={targetRefs.route} style={{ border: `1px solid ${item.tone}22`, borderRadius: 8, background: `${item.tone}08`, padding: 11, marginBottom: 10 }}>
                <Stack justify='space-between' align='center' gap={10}>
                    <Stack align='center' gap={9} style={{ minWidth: 0 }}>
                        <span style={{ width: 38, height: 38, borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: item.tone, background: '#fff', border: `1px solid ${item.tone}22`, flexShrink: 0, fontSize: 18 }}>{item.icon}</span>
                        <div style={{ minWidth: 0 }}>
                            <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 17, lineHeight: '22px' }}>{item.routeLabel}</Typography.Text>
                            <Typography.Text type='secondary' style={{ display: 'block', fontSize: 11, lineHeight: '15px', marginTop: 2 }}>Mô phỏng riêng cho hướng dẫn</Typography.Text>
                        </div>
                    </Stack>
                    <Tag color='purple' style={{ marginInlineEnd: 0 }}>Demo</Tag>
                </Stack>
            </Box>

            <div className='user-guide-tour-demo-grid'>
                <Box ref={targetRefs.focus} style={{ border: `1px solid ${item.tone}20`, borderRadius: 8, background: '#fcfcfd', padding: 11, minWidth: 0 }}>
                    <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 15, lineHeight: '20px', marginBottom: 5 }}>{item.focusTitle}</Typography.Text>
                    <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '17px', marginBottom: 10 }}>{item.description}</Typography.Text>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                        <DemoMetric label='Việc chính' value={item.detailRows.length} tone={item.tone} />
                        <DemoMetric label='Đã thử' value={demoActionCount} tone='#13a8a8' />
                    </div>
                </Box>

                <Box ref={targetRefs.details} style={{ border: '1px solid rgba(116,54,220,0.12)', borderRadius: 8, background: '#fff', padding: 10, minWidth: 0 }}>
                    <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 13, lineHeight: '18px', marginBottom: 8 }}>{item.detailTitle}</Typography.Text>
                    <Stack direction='column' align='stretch' gap={7}>
                        {item.detailRows.map((row, index) => {
                            const selected = selectedRows.includes(row);
                            return <button key={row} type='button' aria-pressed={selected} onClick={() => onToggleRow(row)} style={{ width: '100%', border: `1px solid ${selected ? `${item.tone}44` : '#eef2f7'}`, borderRadius: 8, background: selected ? `${item.tone}0f` : '#fcfcfd', padding: 9, textAlign: 'left', cursor: 'pointer' }}>
                                <Stack align='flex-start' gap={8}>
                                    <span style={{ width: 24, height: 24, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: selected ? item.tone : '#fff', background: selected ? '#fff' : item.tone, border: selected ? `1px solid ${item.tone}44` : 'none', flexShrink: 0, fontSize: 11, fontWeight: 800 }}>{selected ? <CheckCircleOutlined /> : index + 1}</span>
                                    <Typography.Text style={{ color: selected ? item.tone : '#2f2545', fontSize: 12, lineHeight: '17px', fontWeight: 700 }}>{row}</Typography.Text>
                                </Stack>
                            </button>;
                        })}
                    </Stack>
                </Box>
            </div>

            <Box ref={targetRefs.actions} style={{ border: `1px solid ${item.tone}18`, borderRadius: 8, background: `${item.tone}07`, padding: 10, marginTop: 10 }}>
                <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 13, lineHeight: '18px', marginBottom: 8 }}>Thao tác demo</Typography.Text>
                <div className='user-guide-tour-action-grid'>
                    {item.actionLabels.map((label, index) => <Button key={label} type={index === 0 ? 'primary' : 'default'} onClick={onDemoAction} style={{ borderRadius: 8, background: index === 0 ? item.tone : undefined, borderColor: index === 0 ? item.tone : `${item.tone}33`, color: index === 0 ? '#fff' : item.tone, fontWeight: 750 }}>{label}</Button>)}
                </div>
                <Typography.Text type='secondary' style={{ display: 'block', fontSize: 10.5, lineHeight: '15px', marginTop: 7 }}>Demo count: {demoActionCount}. Không có dữ liệu thật nào bị thay đổi.</Typography.Text>
            </Box>
        </div>
    </Box>;
};

export const UserGuideTourScreen: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const item = getTourItem(searchParams.get('item'));
    const [tourOpen, setTourOpen] = React.useState(true);
    const [current, setCurrent] = React.useState(0);
    const [selectedRows, setSelectedRows] = React.useState<string[]>([]);
    const [demoActionCount, setDemoActionCount] = React.useState(0);
    const [completedTours, setCompletedTours] = React.useState<string[]>(readCompletedTours);
    useScreenTitle({ value: 'Tour hướng dẫn', deps: [] });

    const targetRefs = React.useMemo<DemoTargetRefs>(() => ({
        screen: React.createRef<HTMLDivElement>(),
        route: React.createRef<HTMLDivElement>(),
        focus: React.createRef<HTMLDivElement>(),
        details: React.createRef<HTMLDivElement>(),
        actions: React.createRef<HTMLDivElement>(),
    }), []);

    React.useEffect(() => {
        setCurrent(0);
        setTourOpen(true);
        setSelectedRows([]);
        setDemoActionCount(0);
    }, [item.key]);

    const tourSteps = React.useMemo(() => createTourSteps(item, targetRefs), [item, targetRefs]);
    const completed = completedTours.includes(item.key);
    const completedPercent = Math.round(completedTours.length / GUIDE_TOUR_ITEMS.length * 100);

    const selectItem = React.useCallback((key: string) => {
        setSearchParams({ item: key });
    }, [setSearchParams]);

    const markCompleted = React.useCallback(() => {
        const next = Array.from(new Set([...completedTours, item.key]));
        setCompletedTours(next);
        writeCompletedTours(next);
    }, [completedTours, item.key]);

    const finishTour = React.useCallback(() => {
        markCompleted();
        setTourOpen(false);
    }, [markCompleted]);

    const resetTour = React.useCallback(() => {
        setCurrent(0);
        setTourOpen(true);
    }, []);

    const toggleRow = React.useCallback((row: string) => {
        setSelectedRows(prev => prev.includes(row) ? prev.filter(item => item !== row) : [...prev, row]);
    }, []);

    return <Box data-testid='user-guide-tour-page' className='user-guide-tour-page' style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 0 14px', maxWidth: 1040, margin: '0 auto' }}>
        <style>{userGuideTourCss}</style>
        <Box style={{ borderRadius: 8, padding: 13, background: 'linear-gradient(135deg, #ffffff 0%, #f6fffb 48%, #fbf9ff 100%)', border: '1px solid rgba(116,54,220,0.12)', boxShadow: '0 12px 28px rgba(74,48,130,0.08)' }}>
            <Stack justify='space-between' align='flex-start' gap={10} wrap='wrap'>
                <Stack align='center' gap={9} style={{ minWidth: 0 }}>
                    <Button aria-label='Về hướng dẫn' icon={<LeftOutlined />} onClick={() => navigate(RootRoutes.AuthorizedRoutes.UserGuide({ page: item.key }))} style={{ width: 36, height: 36, borderRadius: 999, paddingInline: 0, color: item.tone, borderColor: `${item.tone}33` }} />
                    <div style={{ minWidth: 0 }}>
                        <Typography.Text style={{ display: 'block', color: item.tone, fontSize: 12, lineHeight: '16px', fontWeight: 780 }}>Interactive tour</Typography.Text>
                        <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 21, lineHeight: '27px' }}>{item.label}</Typography.Text>
                        <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '17px', marginTop: 2 }}>{item.description}</Typography.Text>
                    </div>
                </Stack>
                <Stack align='center' gap={7} wrap='wrap' style={{ flexShrink: 0 }}>
                    <Tag color={completed ? 'green' : 'purple'} style={{ marginInlineEnd: 0 }}>{completed ? 'Đã xong' : 'Đang học'}</Tag>
                    <Button icon={<ReloadOutlined />} onClick={resetTour} style={{ borderRadius: 999, color: item.tone, borderColor: `${item.tone}33` }}>Bắt đầu lại</Button>
                </Stack>
            </Stack>
            <div style={{ marginTop: 10 }}>
                <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 12, lineHeight: '16px', marginBottom: 5 }}>Tiến độ tour đã hoàn thành</Typography.Text>
                <Progress percent={completedPercent} size='small' strokeColor={item.tone} trailColor={`${item.tone}18`} />
            </div>
        </Box>

        <div className='user-guide-tour-grid'>
            <GuideTourDemo
                item={item}
                targetRefs={targetRefs}
                selectedRows={selectedRows}
                onToggleRow={toggleRow}
                demoActionCount={demoActionCount}
                onDemoAction={() => setDemoActionCount(prev => prev + 1)}
            />

            <Box style={{ border: '1px solid rgba(116,54,220,0.12)', borderRadius: 8, background: '#fff', padding: 11, boxShadow: '0 10px 24px rgba(15,23,42,0.06)' }}>
                <Stack justify='space-between' align='center' gap={8} style={{ marginBottom: 9 }}>
                    <Typography.Text strong style={{ color: '#111827', fontSize: 13, lineHeight: '18px' }}>Chọn guide item</Typography.Text>
                    <Button size='small' type='primary' icon={<PlayCircleOutlined />} onClick={resetTour} style={{ borderRadius: 999, background: item.tone, borderColor: item.tone }}>Start</Button>
                </Stack>
                <div className='user-guide-tour-topic-grid'>
                    {GUIDE_TOUR_ITEMS.map(topic => {
                        const active = topic.key === item.key;
                        const done = completedTours.includes(topic.key);
                        return <button key={topic.key} type='button' aria-pressed={active} onClick={() => selectItem(topic.key)} style={{ border: `1px solid ${active ? topic.tone : 'rgba(116,54,220,0.10)'}`, borderRadius: 8, background: active ? `${topic.tone}10` : '#fff', padding: 9, textAlign: 'left', cursor: 'pointer', minWidth: 0 }}>
                            <Stack align='center' gap={7}>
                                <span style={{ width: 28, height: 28, borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: topic.tone, background: `${topic.tone}12`, border: `1px solid ${topic.tone}22`, flexShrink: 0 }}>{done ? <CheckCircleOutlined /> : topic.icon}</span>
                                <div style={{ minWidth: 0 }}>
                                    <Typography.Text strong style={{ display: 'block', color: active ? topic.tone : '#111827', fontSize: 12, lineHeight: '16px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{topic.shortLabel}</Typography.Text>
                                    <Typography.Text type='secondary' style={{ display: 'block', fontSize: 10, lineHeight: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{topic.routeLabel}</Typography.Text>
                                </div>
                            </Stack>
                        </button>;
                    })}
                </div>
                <Box style={{ marginTop: 10, border: `1px solid ${item.tone}18`, borderRadius: 8, background: `${item.tone}07`, padding: 10 }}>
                    <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 12, lineHeight: '16px', marginBottom: 4 }}>Tách khỏi trang thật</Typography.Text>
                    <Typography.Text type='secondary' style={{ display: 'block', fontSize: 11, lineHeight: '16px' }}>Tour này chỉ render UI mô phỏng trong route Hướng dẫn. Các trang thật như Món ăn, Thực đơn, Mua sắm và Nguyên liệu không bị thêm target hay logic tour.</Typography.Text>
                </Box>
            </Box>
        </div>

        <Tour
            open={tourOpen}
            current={current}
            onChange={setCurrent}
            onClose={finishTour}
            onFinish={finishTour}
            steps={tourSteps}
            rootClassName='user-guide-tour-popover'
            disabledInteraction={false}
            gap={{ offset: 8, radius: 8 }}
            mask={{ color: 'rgba(20, 14, 45, 0.56)' }}
            zIndex={3600}
        />
    </Box>;
};

export default UserGuideTourScreen;
