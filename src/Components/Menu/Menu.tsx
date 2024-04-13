import React, { FunctionComponent } from 'react';
import { Menu as AntMenu, MenuProps as AntMenuProps } from 'antd';

interface IMenuProps extends AntMenuProps {

}

export const Menu: FunctionComponent<IMenuProps> = (props) => {
    return <AntMenu {...props} />
}