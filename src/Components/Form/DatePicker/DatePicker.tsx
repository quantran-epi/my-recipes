import { DatePicker as AntDatePicker, DatePickerProps as AntDatePickerProps } from 'antd';
import React from 'react';

const APP_POPUP_Z_INDEX = 4200;

const DatePickerBase = React.forwardRef<any, any>((props, ref) => {
    return <AntDatePicker
        ref={ref}
        {...props}
        popupStyle={{ zIndex: APP_POPUP_Z_INDEX, ...props.popupStyle }}
    />;
});

const RangePicker = React.forwardRef<any, any>((props, ref) => {
    return <AntDatePicker.RangePicker
        ref={ref}
        {...props}
        popupStyle={{ zIndex: APP_POPUP_Z_INDEX, ...props.popupStyle }}
    />;
});

export const DatePicker = Object.assign(DatePickerBase, {
    RangePicker,
});

export type { AntDatePickerProps };
