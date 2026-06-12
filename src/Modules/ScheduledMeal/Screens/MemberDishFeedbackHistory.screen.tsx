import { HistoryOutlined } from '@ant-design/icons';
import { Box } from '@components/Layout/Box';
import { Stack } from '@components/Layout/Stack';
import { Typography } from '@components/Typography';
import { useScreenTitle } from '@hooks';
import React from 'react';
import { MemberDishFeedbackHistoryWidget } from './MemberDishFeedbackHistory.widget';

export const MemberDishFeedbackHistoryScreen: React.FC = () => {
    useScreenTitle({ value: 'Phản hồi món', deps: [] });

    return <Box style={{ width: 'min(920px, calc(100vw - 24px))', margin: '0 auto', padding: '0 0 96px' }}>
        <Box style={{ border: '1px solid rgba(22,119,255,0.14)', borderRadius: 8, background: 'linear-gradient(135deg, #ffffff 0%, #f0f7ff 100%)', padding: 12, marginBottom: 12, boxShadow: '0 10px 26px rgba(15,23,42,0.07)' }}>
            <Stack align='center' gap={9} style={{ width: '100%' }}>
                <span style={{ width: 42, height: 42, borderRadius: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#e6f4ff', color: '#1677ff', border: '1px solid #91caff', flexShrink: 0 }}>
                    <HistoryOutlined />
                </span>
                <div style={{ minWidth: 0 }}>
                    <Typography.Text style={{ display: 'block', color: '#1677ff', fontSize: 12, lineHeight: '16px', fontWeight: 800 }}>Phản hồi món</Typography.Text>
                    <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 22, lineHeight: '28px' }}>Lịch sử phản hồi thành viên</Typography.Text>
                    <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '18px', marginTop: 3 }}>Xem phản hồi món theo từng thành viên và từng ngày.</Typography.Text>
                </div>
            </Stack>
        </Box>
        <MemberDishFeedbackHistoryWidget />
    </Box>;
};

export default MemberDishFeedbackHistoryScreen;
