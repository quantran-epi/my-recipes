import React, { FunctionComponent, useCallback } from 'react';
import { Button as AntButton, ButtonProps as AntButtonProps } from 'antd';

interface IButtonProps extends Omit<AntButtonProps, "type"> {
    color?: string;
    fullwidth?: boolean;
    type?: AntButtonProps["type"] | "secondary";
}

export const Button: FunctionComponent<IButtonProps> = ({
    style,
    color,
    fullwidth = false,
    type,
    ...props
}) => {
    const _styles = (): React.CSSProperties => {
        return {
            backgroundColor: color,
            borderColor: color,
            ...style
        }
    }

    const _getType = useCallback(() => {
        if (type == "secondary") return "primary";
        return type;
    }, [type])

    return <AntButton type={_getType()} block={fullwidth} style={_styles()} {...props} />
}