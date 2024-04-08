import { Spin as AntSpin, SpinProps as AntSpinProps } from 'antd';
import { FunctionComponent } from 'react';

interface ISpinProps extends AntSpinProps {

}

export const Spin: FunctionComponent<ISpinProps> = (props) => {
    return <AntSpin {...props} />
}