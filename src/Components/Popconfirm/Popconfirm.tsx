import React, { FunctionComponent } from 'react';
import { Popconfirm as AntPopconfirm, PopconfirmProps as AntPopconfirmProps } from 'antd';

interface IPopconfirmProps extends AntPopconfirmProps {
}

export const Popconfirm: FunctionComponent<IPopconfirmProps> = (props) => {
    return <AntPopconfirm {...props} cancelText={props.cancelText || "Hủy"} okText={props.okText || "Đồng ý"} />
}