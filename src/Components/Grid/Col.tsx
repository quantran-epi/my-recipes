import React, { FunctionComponent } from 'react';
import { Col as AntCol, ColProps as AntColProps } from 'antd';

interface IColProps extends AntColProps {

}

export const Col: FunctionComponent<IColProps> = (props) => {
    return <AntCol {...props} />
}
