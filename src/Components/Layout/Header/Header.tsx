import React, { FunctionComponent } from 'react';
import { Layout as AntLayout, LayoutProps as AntLayoutProps } from 'antd';

const { Header: AntHeader } = AntLayout;

interface IHeaderProps extends AntLayoutProps {

}

export const Header: FunctionComponent<IHeaderProps> = (props) => {
    return <AntHeader {...props} />
}