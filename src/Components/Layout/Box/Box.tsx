import React, { FunctionComponent } from 'react';

interface IBoxProps {
    id?: string;
    width?: string | number;
    height?: string | number;
    style?: React.CSSProperties;
    children?: React.ReactNode;
    className?: string;
    onClick?: () => void;
    visible?: boolean;
}

export const Box = React.forwardRef<HTMLDivElement, IBoxProps>(({
    id,
    width,
    height,
    style,
    children,
    className,
    onClick,
    visible = true
}, ref) => {
    const _style = (): React.CSSProperties => {
        let o: React.CSSProperties = {};

        if (width !== undefined) o.width = width;
        if (height !== undefined) o.height = height;
        if (!visible) o.display = "none";
        return {
            ...o,
            ...style
        }
    }

    return <div ref={ref} id={id} style={_style()} className={className} onClick={onClick}>
        {children}
    </div>
})