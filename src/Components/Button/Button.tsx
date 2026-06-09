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
    const _styles = (): React.CSSProperties => {
        return {
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 999,
            fontWeight: 650,
            backgroundColor: color,
            borderColor: color,
            ...style
        }
    }

    const _getType = useCallback(() => {
        if (type === "secondary") return "primary";
        return type;
    }, [type])

    return <AntButton type={_getType()} size={size} block={fullwidth} style={_styles()} {...props} />
}
