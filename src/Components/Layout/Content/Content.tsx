import { Layout as AntLayout } from 'antd';
import { Box } from '../Box';

const { Content: AntContent } = AntLayout;

export const Content = ({
    children,
    ...props
}) => {
    return <AntContent {...props}>
        <Box style={{ padding: 15, backgroundColor: "#f5f5f5" }}>
            {children}
        </Box>
    </AntContent>
}