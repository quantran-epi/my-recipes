import { Layout as AntLayout } from 'antd';
import { Box } from '../Box';

const { Content: AntContent } = AntLayout;

const HEADER_HEIGHT = 60;
const BOTTOM_NAV_HEIGHT = 80;
const CONTENT_PADDING = 15;

export const Content = ({
    children,
    ...props
}) => {
    return <AntContent {...props}>
        <Box
            id="app-content"
            data-testid="app-content"
            style={{
                padding: CONTENT_PADDING,
                backgroundColor: "#f5f5f5",
                height: `calc(100vh - ${HEADER_HEIGHT + BOTTOM_NAV_HEIGHT}px)`,
                maxHeight: `calc(100dvh - ${HEADER_HEIGHT + BOTTOM_NAV_HEIGHT}px)`,
                overflowY: "auto",
                overflowX: "hidden",
                boxSizing: "border-box",
            }}
        >
            {children}
        </Box>
    </AntContent>
}
