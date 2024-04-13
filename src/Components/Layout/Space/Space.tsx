import React, { FunctionComponent } from 'react';
import { Space as AntSpace, SpaceProps as AntSpaceProps } from 'antd';

export interface ISpaceProps extends AntSpaceProps {
    fullwidth?: boolean
}

export const Space: FunctionComponent<ISpaceProps> = ({
    fullwidth = false,
    ...props
}) => {
    const _styles = (): React.CSSProperties => {
        return {
            width: fullwidth ? "100%" : "auto",
            ...props.style
        }
    }

    return <AntSpace {...props} style={_styles()} />
}