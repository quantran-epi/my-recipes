import { Select as AntSelect, SelectProps as AntSelectProps } from 'antd';
import React from 'react';

type SelectProps = AntSelectProps & {
    onReload?: () => void;
}

const APP_POPUP_Z_INDEX = 4200;

export const Select = React.forwardRef<typeof AntSelect, SelectProps>((props, ref) => {
    return <AntSelect
        ref={ref as any}
        {...props}
        dropdownStyle={{ zIndex: APP_POPUP_Z_INDEX, ...props.dropdownStyle }}
    />
});
export const Option = AntSelect.Option;
