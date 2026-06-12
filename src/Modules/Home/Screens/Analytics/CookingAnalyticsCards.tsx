import { ClockCircleOutlined, FireOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { DishDurationHelper } from '@common/Helpers/DishDurationHelper';
import { Button } from '@components/Button';
import { Empty } from '@components/Empty';
import { Box } from '@components/Layout/Box';
import { Stack } from '@components/Layout/Stack';
import { Tag } from '@components/Tag';
import { Typography } from '@components/Typography';
import {
    CookTimeAccuracyRow,
    CookingActivityCell,
    LeftoverEfficiencyWeek,
    MemberFeedbackBreakdown,
    StaleDish,
    TopCookedDish,
} from '@modules/ScheduledMeal/Helpers/CookingAnalyticsHelper';
import dayjs from 'dayjs';
import React from 'react';

const cardStyle: React.CSSProperties = {
    border: '1px solid rgba(15,23,42,0.08)',
    borderRadius: 8,
    background: '#fff',
    padding: 12,
    minWidth: 0,
    boxShadow: '0 8px 20px rgba(15,23,42,0.05)',
};

const barTrackStyle: React.CSSProperties = {
    height: 8,
    borderRadius: 999,
    background: '#f1f5f9',
    overflow: 'hidden',
};

const EmptyCard = ({ text }: { text: string }) => <Box style={{ padding: '18px 4px' }}>
    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<Typography.Text type='secondary'>{text}</Typography.Text>} />
</Box>;

const AnalyticsCard: React.FC<{ title: string; subtitle: string; help: string; helpKey: string; openHelpKey?: string; onToggleHelp: (key: string) => void; children: React.ReactNode }> = ({ title, subtitle, help, helpKey, openHelpKey, onToggleHelp, children }) => <Box style={cardStyle}>
    <Stack justify='space-between' align='flex-start' gap={8}>
        <div style={{ minWidth: 0 }}>
            <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 14, lineHeight: '19px' }}>{title}</Typography.Text>
            <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '17px', marginTop: 2 }}>{subtitle}</Typography.Text>
        </div>
        <Button type='text' aria-label={`Giải thích ${title}`} icon={<QuestionCircleOutlined />} onClick={() => onToggleHelp(helpKey)} style={{ width: 28, height: 28, paddingInline: 0, borderRadius: 999, color: openHelpKey === helpKey ? '#13a8a8' : '#9ca3af' }} />
    </Stack>
    {openHelpKey === helpKey && <Box style={{ marginTop: 8, padding: '8px 10px', borderRadius: 6, background: 'rgba(19,168,168,0.08)', border: '1px solid rgba(19,168,168,0.18)' }}>
        <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '18px' }}>{help}</Typography.Text>
    </Box>}
    <div style={{ marginTop: 10 }}>{children}</div>
</Box>;

export const TopCookedDishesCard: React.FC<{ rows: TopCookedDish[]; openHelpKey?: string; onToggleHelp: (key: string) => void }> = ({ rows, openHelpKey, onToggleHelp }) => {
    const max = Math.max(1, ...rows.map(row => row.cookCount));
    return <AnalyticsCard title='Món hay nấu nhất' subtitle='Theo phiên nấu đã hoàn tất' help='Số phiên nấu đã hoàn tất, đếm theo món, sắp xếp giảm dần. Lọc theo khoảng thời gian ở trên.' helpKey='top-cooked' openHelpKey={openHelpKey} onToggleHelp={onToggleHelp}>
        {rows.length === 0 ? <EmptyCard text='Chưa có phiên nấu nào. Bắt đầu nấu món đầu tiên để xem thống kê.' /> : <Stack direction='column' align='stretch' gap={8}>
            {rows.map((row, index) => <div key={row.dishId} style={{ display: 'grid', gridTemplateColumns: '24px minmax(0, 1fr) 54px', gap: 8, alignItems: 'center' }}>
                <Typography.Text type='secondary' style={{ fontSize: 12 }}>{index + 1}</Typography.Text>
                <div style={{ minWidth: 0 }}>
                    <Typography.Text style={{ display: 'block', color: '#111827', fontSize: 12, lineHeight: '17px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.dishName}</Typography.Text>
                    <div style={barTrackStyle}><div style={{ width: `${Math.max(8, row.cookCount / max * 100)}%`, height: '100%', background: 'linear-gradient(90deg, #13a8a8, #389e0d)' }} /></div>
                </div>
                <Typography.Text strong style={{ textAlign: 'right', fontSize: 12 }}>{row.cookCount} lần</Typography.Text>
            </div>)}
        </Stack>}
    </AnalyticsCard>;
};

export const StaleDishesCard: React.FC<{ rows: StaleDish[]; openHelpKey?: string; onToggleHelp: (key: string) => void }> = ({ rows, openHelpKey, onToggleHelp }) => <AnalyticsCard title='Lâu rồi chưa nấu' subtitle='Món hoàn chỉnh nhưng 30+ ngày chưa nấu lại' help='Món đã được đánh dấu hoàn chỉnh nhưng chưa nấu lại trong 30 ngày. Bộ lọc thời gian không áp dụng vì đây là cảnh báo dài hạn.' helpKey='stale' openHelpKey={openHelpKey} onToggleHelp={onToggleHelp}>
    {rows.length === 0 ? <EmptyCard text='Đang nấu đa dạng! Tất cả món đã nấu trong 30 ngày qua.' /> : <Stack direction='column' align='stretch' gap={7}>
        {rows.map(row => <Box key={row.dishId} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 8, alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: 6 }}>
            <Typography.Text style={{ color: '#111827', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.dishName}</Typography.Text>
            <Tag color={row.daysSinceLast > 90 ? 'volcano' : 'orange'} style={{ marginRight: 0 }}>{row.daysSinceLast === 999 ? 'Chưa từng nấu' : `${row.daysSinceLast} ngày`}</Tag>
        </Box>)}
    </Stack>}
</AnalyticsCard>;

export const CookTimeAccuracyCard: React.FC<{ rows: CookTimeAccuracyRow[]; openHelpKey?: string; onToggleHelp: (key: string) => void }> = ({ rows, openHelpKey, onToggleHelp }) => <AnalyticsCard title='Độ chính xác thời gian' subtitle='Thực tế so với kế hoạch' help='Thời gian nấu thực tế trung bình (EMA) so với thời gian kế hoạch trong công thức. Cần ít nhất 2 lần nấu để hiện ra. Lệch > 20% nên cập nhật kế hoạch.' helpKey='cook-time' openHelpKey={openHelpKey} onToggleHelp={onToggleHelp}>
    {rows.length === 0 ? <EmptyCard text='Chưa có đủ dữ liệu. Nấu mỗi món ít nhất 2 lần để hiện ra so sánh.' /> : <Stack direction='column' align='stretch' gap={7}>
        {rows.map(row => <Box key={row.dishId} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 8, alignItems: 'center' }}>
            <div style={{ minWidth: 0 }}>
                <Typography.Text style={{ display: 'block', color: '#111827', fontSize: 12, lineHeight: '17px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.dishName}</Typography.Text>
                <Typography.Text type='secondary' style={{ fontSize: 11 }}>{DishDurationHelper.formatMinutes(row.plannedMinutes)} kế hoạch · {DishDurationHelper.formatMinutes(row.actualAvgMinutes)} thực tế · {row.samples} lần</Typography.Text>
            </div>
            <Tag color={Math.abs(row.variancePct) <= 15 ? 'green' : Math.abs(row.variancePct) <= 25 ? 'orange' : 'red'} style={{ marginRight: 0 }}>{row.variancePct > 0 ? '+' : ''}{row.variancePct}%</Tag>
        </Box>)}
    </Stack>}
</AnalyticsCard>;

export const MemberFeedbackCard: React.FC<{ rows: MemberFeedbackBreakdown[]; openHelpKey?: string; onToggleHelp: (key: string) => void }> = ({ rows, openHelpKey, onToggleHelp }) => <AnalyticsCard title='Khẩu vị nhà mình' subtitle='Phản hồi sau bữa ăn' help="Phản hồi 'Thích / Bình thường / Không hợp' từng thành viên ghi nhận sau bữa ăn. Top món thường được thành viên thích." helpKey='feedback' openHelpKey={openHelpKey} onToggleHelp={onToggleHelp}>
    {rows.length === 0 ? <EmptyCard text='Chưa có thành viên để hiển thị khẩu vị.' /> : <Stack direction='column' align='stretch' gap={9}>
        {rows.map(row => {
            const total = Math.max(1, row.liked + row.neutral + row.disliked);
            return <Box key={row.memberId}>
                <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 12, marginBottom: 4 }}>{row.memberName}</Typography.Text>
                <div style={{ ...barTrackStyle, height: 10, display: 'flex' }}>
                    <span style={{ width: `${row.liked / total * 100}%`, background: '#52c41a' }} />
                    <span style={{ width: `${row.neutral / total * 100}%`, background: '#1677ff' }} />
                    <span style={{ width: `${row.disliked / total * 100}%`, background: '#cf1322' }} />
                </div>
                <Typography.Text type='secondary' style={{ display: 'block', fontSize: 11.5, marginTop: 4 }}>{row.liked} thích · {row.neutral} ổn · {row.disliked} không hợp</Typography.Text>
            </Box>;
        })}
    </Stack>}
</AnalyticsCard>;

export const CookingActivityCard: React.FC<{ rows: CookingActivityCell[]; openHelpKey?: string; onToggleHelp: (key: string) => void }> = ({ rows, openHelpKey, onToggleHelp }) => <AnalyticsCard title='Hoạt động nấu nướng' subtitle='Ô đậm hơn khi nấu nhiều hơn' help='Số phiên nấu mỗi ngày. Ô đậm = nấu nhiều, ô nhạt = nấu ít hoặc không nấu.' helpKey='activity' openHelpKey={openHelpKey} onToggleHelp={onToggleHelp}>
    {rows.length === 0 ? <EmptyCard text='Chưa có phiên nấu nào trong khoảng thời gian này.' /> : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 14px)', gap: 4, alignItems: 'center' }}>
        {rows.map(row => <span key={row.date} title={`${dayjs(row.date).format('DD/MM/YYYY')}: ${row.sessionCount} phiên`} style={{ width: 14, height: 14, borderRadius: 4, background: row.sessionCount <= 0 ? '#f1f5f9' : row.sessionCount === 1 ? '#b7eb8f' : '#389e0d', border: '1px solid rgba(15,23,42,0.05)' }} />)}
    </div>}
</AnalyticsCard>;

export const LeftoverEfficiencyCard: React.FC<{ rows: LeftoverEfficiencyWeek[]; openHelpKey?: string; onToggleHelp: (key: string) => void }> = ({ rows, openHelpKey, onToggleHelp }) => <AnalyticsCard title='Hiệu quả phần còn lại' subtitle='Ăn hết, còn lại, hoặc bỏ đi' help='Tỷ lệ phần còn lại được ăn hết, bỏ đi hoặc còn trong tủ. Tính theo storedAt. Mục tiêu > 80% ăn hết.' helpKey='leftover-efficiency' openHelpKey={openHelpKey} onToggleHelp={onToggleHelp}>
    {rows.length === 0 ? <EmptyCard text='Chưa có phần còn lại nào được ghi nhận. Đánh dấu phần dư khi hoàn tất bữa ăn.' /> : <Stack direction='column' align='stretch' gap={8}>
        {rows.map(row => <Box key={row.weekStart}>
            <Stack justify='space-between' align='center' gap={8}>
                <Typography.Text style={{ color: '#111827', fontSize: 12 }}>Tuần {dayjs(row.weekStart).format('DD/MM')}</Typography.Text>
                <Typography.Text strong style={{ fontSize: 12, color: row.finishedPct >= 80 ? '#389e0d' : '#fa8c16' }}>{row.finishedPct}% ăn hết</Typography.Text>
            </Stack>
            <div style={{ ...barTrackStyle, marginTop: 5, display: 'flex' }}>
                <span style={{ width: `${row.finished / row.total * 100}%`, background: '#52c41a' }} />
                <span style={{ width: `${row.available / row.total * 100}%`, background: '#1677ff' }} />
                <span style={{ width: `${row.discarded / row.total * 100}%`, background: '#cf1322' }} />
            </div>
        </Box>)}
    </Stack>}
</AnalyticsCard>;
