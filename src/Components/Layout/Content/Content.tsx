import { Layout as AntLayout } from 'antd';
import { Box } from '../Box';

const { Content: AntContent } = AntLayout;

const HEADER_HEIGHT = 76;
const BOTTOM_NAV_HEIGHT = 80;
const CONTENT_PADDING = 12;

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
                background: "linear-gradient(180deg, #e9e3f4 0%, #f6f3fb 52%, #ffffff 100%)",
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
