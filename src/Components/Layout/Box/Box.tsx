import React from 'react';

interface IBoxProps extends React.HTMLAttributes<HTMLDivElement> {
    width?: string | number;
    height?: string | number;
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
    visible = true,
    ...props
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

    return <div {...props} ref={ref} id={id} style={_style()} className={className} onClick={onClick}>
        {children}
    </div>
})
