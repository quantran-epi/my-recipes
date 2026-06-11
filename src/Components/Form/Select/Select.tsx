import { Divider, Select as AntSelect, SelectProps as AntSelectProps, Tooltip } from 'antd';
import React from 'react';

type SelectProps = AntSelectProps & {
    onReload?: () => void;
}

const APP_POPUP_Z_INDEX = 4200;

type SelectedOptionsDropdownRenderProps = Pick<AntSelectProps, 'mode' | 'value' | 'defaultValue' | 'options' | 'children' | 'dropdownRender'>;

type SelectedOptionDisplay = {
    value: React.Key;
    label: React.ReactNode;
}

const selectedOptionsPanelStyle: React.CSSProperties = {
    padding: '8px 8px 7px',
    background: '#f8fafc',
};

const selectedOptionsHeaderStyle: React.CSSProperties = {
    color: '#64748b',
    fontSize: 11,
    fontWeight: 700,
    lineHeight: '14px',
    marginBottom: 6,
};

const selectedOptionsListStyle: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 5,
    maxHeight: 116,
    overflowY: 'auto',
};

const selectedOptionChipStyle: React.CSSProperties = {
    maxWidth: '100%',
    border: '1px solid #d9e2ef',
    borderRadius: 6,
    background: '#fff',
    color: '#334155',
    fontSize: 12,
    lineHeight: '16px',
    padding: '3px 7px',
    overflowWrap: 'anywhere',
};

const _renderOptionLabel = (option: any): React.ReactNode => {
    if (option?.label !== undefined && option.label !== null) return option.label;
    if (option?.value !== undefined && option.value !== null) return String(option.value);
    return '';
}

const _isMultiSelectMode = (mode: AntSelectProps['mode']) => mode === 'multiple' || mode === 'tags';

const _getOptionValue = (value: any) => {
    if (value && typeof value === 'object' && 'value' in value) return value.value;
    return value;
}

const _normalizeSelectedValues = (value: any): any[] => {
    if (Array.isArray(value)) return value;
    if (value === undefined || value === null) return [];
    return [value];
}

const _optionValueKey = (value: any) => String(_getOptionValue(value));

const _flattenOptions = (options: any[] = []): any[] => {
    return options.flatMap(option => Array.isArray(option?.options) ? _flattenOptions(option.options) : [option]);
}

const _flattenChildOptions = (children: React.ReactNode): any[] => {
    const items: any[] = [];
    React.Children.forEach(children, child => {
        if (!React.isValidElement(child)) return;
        const props = child.props as any;
        if (props?.options) {
            items.push(..._flattenOptions(props.options));
            return;
        }
        if (props?.children && props?.value === undefined) {
            items.push(..._flattenChildOptions(props.children));
            return;
        }
        items.push({
            value: props?.value,
            label: props?.label ?? props?.children,
        });
    });
    return items;
}

const _getSelectedOptionDisplays = ({ value, defaultValue, options, children }: SelectedOptionsDropdownRenderProps): SelectedOptionDisplay[] => {
    const selectedValues = _normalizeSelectedValues(value ?? defaultValue);
    if (selectedValues.length === 0) return [];

    const optionLookup = new Map<string, any>();
    _flattenOptions(options as any[]).forEach(option => optionLookup.set(_optionValueKey(option?.value), option));
    _flattenChildOptions(children).forEach(option => optionLookup.set(_optionValueKey(option?.value), option));

    return selectedValues.map(selectedValue => {
        const rawValue = _getOptionValue(selectedValue);
        const option = optionLookup.get(_optionValueKey(rawValue));
        const selectedLabel = selectedValue && typeof selectedValue === 'object' && 'label' in selectedValue ? selectedValue.label : undefined;
        const label = (selectedLabel ?? _renderOptionLabel(option)) || String(rawValue ?? '');
        return { value: _optionValueKey(rawValue), label };
    }).filter(item => item.label !== '');
}

const _renderSelectedOptionsPanel = (selectedOptions: SelectedOptionDisplay[]) => <>
    <div style={selectedOptionsPanelStyle} onMouseDown={event => event.preventDefault()}>
        <div style={selectedOptionsHeaderStyle}>Đã chọn ({selectedOptions.length})</div>
        <div style={selectedOptionsListStyle}>
            {selectedOptions.map(item => <span key={item.value} style={selectedOptionChipStyle}>{item.label}</span>)}
        </div>
    </div>
    <Divider style={{ margin: 0 }} />
</>;

export const createSelectedOptionsDropdownRender = (props: SelectedOptionsDropdownRenderProps) => {
    const { dropdownRender } = props;
    return (originNode: React.ReactElement) => {
        const menuNode = dropdownRender ? dropdownRender(originNode) : originNode;
        if (!_isMultiSelectMode(props.mode)) return menuNode;

        const selectedOptions = _getSelectedOptionDisplays(props);
        if (selectedOptions.length === 0) return menuNode;

        return <div>
            {_renderSelectedOptionsPanel(selectedOptions)}
            {menuNode}
        </div>;
    }
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
    const { dropdownStyle, dropdownRender, maxTagPlaceholder, ...selectProps } = props;
    return <AntSelect
        ref={ref as any}
        {...selectProps}
        maxTagPlaceholder={maxTagPlaceholder ?? renderResponsiveTagPlaceholder}
        dropdownRender={createSelectedOptionsDropdownRender({ ...selectProps, dropdownRender })}
        dropdownStyle={{ zIndex: APP_POPUP_Z_INDEX, ...dropdownStyle }}
    />
});
export const Option = AntSelect.Option;
