import React, { FunctionComponent } from "react";
import { Divider as AntDivider, DividerProps as AntDividerProps } from 'antd';

interface IDividerProps extends AntDividerProps {
    margin?: number | string;
}

export const Divider: FunctionComponent<IDividerProps> = ({
    style,
    margin,
    type = "horizontal",
    ...props
}) => {
    const _style = (): React.CSSProperties => {
        let _margin = {} as React.CSSProperties;
        switch (type) {
            case "horizontal":
                _margin.marginTop = margin;
                _margin.marginBottom = margin;
                break;
            case "vertical":
                _margin.marginLeft = margin;
                _margin.marginRight = margin;
                break;
        }


        return {
            ..._margin,
            ...style
        }
    }

    return <AntDivider {...props} type={type} style={_style()} />
}