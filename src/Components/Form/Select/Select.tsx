import { Select as AntSelect, SelectProps as AntSelectProps, Tooltip } from 'antd';
import React from 'react';

type SelectProps = AntSelectProps & {
    onReload?: () => void;
}

const APP_POPUP_Z_INDEX = 4200;

const _renderOptionLabel = (option: any): React.ReactNode => {
    if (option?.label !== undefined && option.label !== null) return option.label;
    if (option?.value !== undefined && option.value !== null) return String(option.value);
    return '';
}

export const renderResponsiveTagPlaceholder = (omittedValues: any[]) => {
    const labels = omittedValues.map(_renderOptionLabel).filter(Boolean);
    return <Tooltip
        trigger={['hover', 'focus', 'click']}
        title={<div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxWidth: 260 }}>
            {labels.map((label, index) => <span key={index} style={{ overflowWrap: 'anywhere' }}>{label}</span>)}
        </div>}
        overlayStyle={{ zIndex: APP_POPUP_Z_INDEX + 1 }}
    >
        <span aria-label={`${omittedValues.length} mục đã chọn bị ẩn`}>+{omittedValues.length}</span>
    </Tooltip>;
}

export const Select = React.forwardRef<typeof AntSelect, SelectProps>((props, ref) => {
    const { dropdownStyle, maxTagPlaceholder, ...selectProps } = props;
    return <AntSelect
        ref={ref as any}
        {...selectProps}
        maxTagPlaceholder={maxTagPlaceholder ?? renderResponsiveTagPlaceholder}
        dropdownStyle={{ zIndex: APP_POPUP_Z_INDEX, ...dropdownStyle }}
    />
});
export const Option = AntSelect.Option;
