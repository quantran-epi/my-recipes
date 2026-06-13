import { Typography } from '@components/Typography';
import { selectHouseholdMembers } from '@store/Selectors';
import { Select } from 'antd';
import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';

type HouseholdMemberPickerProps = {
    value: string[];
    onChange: (ids: string[]) => void;
    label?: string;
    style?: React.CSSProperties;
}

// Shared multi-select of household members used when starting a cooking session, so each session
// can record who is actually cooking instead of silently snapshotting the global selection.
export const HouseholdMemberPicker: React.FC<HouseholdMemberPickerProps> = ({ value, onChange, label, style }) => {
    const members = useSelector(selectHouseholdMembers);
    const options = useMemo(() => members.map(member => ({ value: member.id, label: member.name })), [members]);

    if (members.length === 0) {
        return <Typography.Text type='secondary' style={{ fontSize: 12 }}>Chưa có thành viên</Typography.Text>;
    }

    return <div style={style}>
        {label && <Typography.Text strong style={{ display: 'block', fontSize: 12, marginBottom: 5 }}>{label}</Typography.Text>}
        <Select
            mode='multiple'
            allowClear
            value={value}
            onChange={onChange}
            placeholder='Ai nấu?'
            options={options}
            style={{ width: '100%' }}
        />
    </div>;
};
