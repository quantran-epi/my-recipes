import React, { FunctionComponent } from 'react';
import { Checkbox as AntCheckbox, CheckboxProps as AntCheckboxProps } from 'antd';

interface ICheckboxProps extends AntCheckboxProps {

}

export const Checkbox = React.forwardRef<typeof AntCheckbox, ICheckboxProps>((props, ref) => {
    return <AntCheckbox ref={ref as any} {...props} />
}) 