import React, { FunctionComponent } from 'react';
import { Row as AntRow, RowProps as AntRowProps } from 'antd';

interface IRowProps extends AntRowProps {

}

export const Row: FunctionComponent<IRowProps> = (props) => {
    return <AntRow {...props} />
}
