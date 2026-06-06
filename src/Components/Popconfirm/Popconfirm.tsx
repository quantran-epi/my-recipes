import React, { FunctionComponent } from 'react';
import { Popconfirm as AntPopconfirm, PopconfirmProps as AntPopconfirmProps } from 'antd';

interface IPopconfirmProps extends AntPopconfirmProps {
}

const APP_POPUP_Z_INDEX = 4200;

export const Popconfirm: FunctionComponent<IPopconfirmProps> = (props) => {
    return <AntPopconfirm {...props} zIndex={props.zIndex ?? APP_POPUP_Z_INDEX} cancelText={props.cancelText || "Hủy"} okText={props.okText || "Đồng ý"} />
}
