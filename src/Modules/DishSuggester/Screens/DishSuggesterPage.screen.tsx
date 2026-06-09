import { Image } from '@components/Image';
import { Box } from '@components/Layout/Box';
import { Stack } from '@components/Layout/Stack';
import { Typography } from '@components/Typography';
import { useScreenTitle } from '@hooks';
import React from 'react';
import NoodlesIcon from '../../../../assets/icons/noodles.png';
import { DishSuggesterScreen } from './DishSuggester.screen';

const pageCss = `
.dish-suggester-page {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 0 0 18px;
    max-width: 860px;
    margin: 0 auto;
}
.dish-suggester-page-hero {
    border-radius: 8px;
    border: 1px solid rgba(116,54,220,0.12);
    background: linear-gradient(135deg, #ffffff 0%, #f7fffb 48%, #fbf9ff 100%);
    box-shadow: 0 12px 28px rgba(74,48,130,0.08);
    padding: 14px;
}
.dish-suggester-page-panel {
    border-radius: 8px;
    border: 1px solid rgba(116,54,220,0.10);
    background: #fff;
    box-shadow: 0 10px 24px rgba(15,23,42,0.06);
    padding: 14px;
}
@media (max-width: 760px) {
    .dish-suggester-page {
        max-width: 100% !important;
        padding: 0 0 96px !important;
    }
    .dish-suggester-page-hero,
    .dish-suggester-page-panel {
        box-shadow: 0 8px 18px rgba(74,48,130,0.07) !important;
    }
}
`;

export const DishSuggesterPageScreen: React.FC = () => {
    useScreenTitle({ value: 'Nấu gì?', deps: [] });

    return <Box className='dish-suggester-page' data-testid='dish-suggester-page'>
        <style>{pageCss}</style>
        <Box className='dish-suggester-page-hero'>
            <Stack align='center' gap={10}>
                <span style={{ width: 44, height: 44, borderRadius: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#7436dc12', border: '1px solid #7436dc24', flexShrink: 0 }}>
                    <Image src={NoodlesIcon} preview={false} width={28} alt='' />
                </span>
                <div style={{ minWidth: 0 }}>
                    <Typography.Text style={{ display: 'block', color: '#7436dc', fontSize: 12, lineHeight: '16px', fontWeight: 800 }}>My Recipes</Typography.Text>
                    <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 24, lineHeight: '31px' }}>Nấu gì hôm nay?</Typography.Text>
                    <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '18px', marginTop: 3 }}>Ưu tiên món nấu ngay theo tủ lạnh, thời gian, ngân sách mua thêm và khẩu vị nhà. Các hành động bên dưới mở modal ngay trong trang này.</Typography.Text>
                </div>
            </Stack>
        </Box>
        <Box className='dish-suggester-page-panel'>
            <DishSuggesterScreen open={true} onClose={() => undefined} initialMode='cookNow' pageInline actionMode='modal' />
        </Box>
    </Box>;
};

export default DishSuggesterPageScreen;
