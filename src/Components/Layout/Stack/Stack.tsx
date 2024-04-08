import Compact from 'antd/es/space/Compact';
import React, { FunctionComponent } from 'react';
import { ISpaceProps, Space } from '../Space';

interface IStackProps {
    direction?: "row" | "column";
    justify?: "flex-start" | "flex-end" | "center" | "space-between" | "space-around" | "space-evenly" | "initial" | "inherit";
    align?: "stretch" | "center" | "flex-start" | "flex-end" | "baseline" | "initial" | "inherit";
    wrap?: "nowrap" | "wrap" | "wrap-reverse" | "initial" | "inherit";
    alignSelf?: "auto" | "stretch" | "center" | "flex-start" | "flex-end" | "baseline" | "initial" | "inherit";
    gap?: ISpaceProps["size"];
    children: React.ReactNode;
    style?: React.CSSProperties;
    onClick?: () => void;
    fullwidth?: boolean;
    className?: string;
}

type StackCompoundComponent = React.FunctionComponent<IStackProps> & {
    Compact: typeof Compact;
}

const Stack: StackCompoundComponent = ({
    align,
    direction,
    justify,
    alignSelf,
    wrap,
    gap = "middle",
    children,
    style,
    onClick,
    className,
    fullwidth = false
}) => {
    const _styles = (): React.CSSProperties => {
        return {
            display: "flex",
            flexDirection: direction,
            justifyContent: justify,
            alignItems: align,
            alignSelf: alignSelf,
            flexWrap: wrap,
            width: fullwidth ? "100%" : "auto",
            ...style
        }
    }

    return <Space style={_styles()} size={gap} onClick={onClick} className={className}>
        {children}
    </Space>
}

Stack.Compact = Compact

export { Stack }