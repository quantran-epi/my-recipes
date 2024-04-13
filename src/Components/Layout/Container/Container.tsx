import React, { FunctionComponent } from 'react';
import { Layout as AntLayout, LayoutProps as AntLayoutProps } from 'antd';

interface IContainerProps extends AntLayoutProps {

}

export const Container: FunctionComponent<IContainerProps> = (props) => {
    return <AntLayout {...props} style={{ minHeight: "100%", ...props.style }} />
}