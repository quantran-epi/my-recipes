import React, { FunctionComponent } from 'react';
import { Input as AntInput, InputProps as AntInputProps } from 'antd';

interface IInputProps extends AntInputProps {

}

export const Input = React.forwardRef<any, IInputProps>((props, ref: any) => {
    return <AntInput {...props} ref={ref} />
})

export const TextArea = AntInput.TextArea;