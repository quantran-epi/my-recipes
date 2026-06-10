import React, { FunctionComponent, useCallback } from 'react';
import { Button as AntButton, ButtonProps as AntButtonProps } from 'antd';

interface IButtonProps extends Omit<AntButtonProps, "type" | "size"> {
    color?: string;
    fullwidth?: boolean;
    type?: AntButtonProps["type"] | "secondary";
    size?: Exclude<AntButtonProps["size"], "small">;
}

export const Button: FunctionComponent<IButtonProps> = ({
    style,
    color,
    fullwidth = false,
    type,
    size,
    ...props
}) => {
    const _isExplicitCircleButton = (): boolean => {
        const hasChildren = React.Children.count(props.children) > 0;
        const isEqualSize = style?.width !== undefined && style?.height !== undefined && style.width === style.height;
        const requestedRadius = style?.borderRadius;

        return Boolean(props.icon)
            && !hasChildren
            && isEqualSize
            && (requestedRadius === 999 || requestedRadius === "999px" || requestedRadius === "50%");
    }

    const _getBorderRadius = (): React.CSSProperties["borderRadius"] => {
        const requestedRadius = style?.borderRadius;

        if (_isExplicitCircleButton()) return requestedRadius;
        if (typeof requestedRadius === "number" && requestedRadius > 10) return 8;
        if (typeof requestedRadius === "string") {
            const parsedRadius = Number.parseFloat(requestedRadius);
            if (requestedRadius === "50%" || requestedRadius === "999" || requestedRadius === "999px" || parsedRadius > 10) return 8;
        }

        return requestedRadius ?? 8;
    }

    const _styles = (): React.CSSProperties => {
        return {
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 650,
            backgroundColor: color,
            borderColor: color,
            ...style,
            borderRadius: _getBorderRadius(),
        }
    }

    const _getType = useCallback(() => {
        if (type === "secondary") return "primary";
        return type;
    }, [type])

    return <AntButton type={_getType()} size={size} block={fullwidth} style={_styles()} {...props} />
}
