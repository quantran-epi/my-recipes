import { Select as AntSelect, SelectProps as AntSelectProps } from 'antd';
import React from 'react';

type SelectProps = AntSelectProps & {
    onReload?: () => void;
}

export const Select = React.forwardRef<typeof AntSelect, SelectProps>((props, ref) => {
    return <AntSelect ref={ref as any} {...props} />
});
export const Option = AntSelect.Option;