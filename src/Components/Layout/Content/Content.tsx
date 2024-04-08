import { Layout as AntLayout } from 'antd';

const { Content: AntContent } = AntLayout;

export const Content = ({
    children,
    ...props
}) => {
    return <AntContent {...props}>
        {children}
    </AntContent>
}