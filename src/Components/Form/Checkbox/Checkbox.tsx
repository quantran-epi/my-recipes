import React, { FunctionComponent } from 'react';
import { Checkbox as AntCheckbox, CheckboxProps as AntCheckboxProps } from 'antd';

interface ICheckboxProps extends AntCheckboxProps {

}

export const Checkbox: FunctionComponent<ICheckboxProps> = (props) => {
    return <AntCheckbox {...props} />
}