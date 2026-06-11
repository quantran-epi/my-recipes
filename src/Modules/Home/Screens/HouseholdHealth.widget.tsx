import { DeleteOutlined, EditOutlined, HeartOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons';
import { getHouseholdHealthStatusMeta, HOUSEHOLD_HEALTH_STATUS_META } from '@common/Helpers/HouseholdHealthHelper';
import { Button } from '@components/Button';
import { Box } from '@components/Layout/Box';
import { Stack } from '@components/Layout/Stack';
import { useMessage } from '@components/Message';
import { Modal } from '@components/Modal';
import { Tag } from '@components/Tag';
import { Typography } from '@components/Typography';
import type { HouseholdMemberProfile } from '@store/Reducers/AppContextReducer';
import {
    HouseholdHealthRecord,
    HouseholdHealthRecordType,
    HouseholdHealthSeverity,
    HouseholdHealthStatus,
    removeHealthRecord,
    setMemberHealthStatus,
    upsertHealthRecord,
    upsertMemberHealthProfile,
} from '@store/Reducers/HouseholdHealthReducer';
import { selectHealthRecordsByMember, selectMemberHealthProfile } from '@store/Selectors';
import { DatePicker, Empty, Input, InputNumber, Popconfirm, Select, Segmented } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import React, { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

type HealthProfileDraft = {
    heightCm?: number;
    weightKg?: number;
    status: HouseholdHealthStatus;
    statusNote?: string;
}

type HealthRecordDraft = {
    id?: string;
    type: HouseholdHealthRecordType;
    title: string;
    startedAt: Dayjs;
    endedAt?: Dayjs | null;
    severity?: HouseholdHealthSeverity;
    provider?: string;
    dosage?: string;
    notes?: string;
    statusAfterSave?: HouseholdHealthStatus | 'none';
}

const statusOptions = (Object.keys(HOUSEHOLD_HEALTH_STATUS_META) as HouseholdHealthStatus[]).map(status => ({
    value: status,
    label: HOUSEHOLD_HEALTH_STATUS_META[status].label,
}));

const recordTypeOptions: Array<{ value: HouseholdHealthRecordType; label: string }> = [
    { value: 'sickness', label: 'Bệnh / triệu chứng' },
    { value: 'treatment', label: 'Điều trị' },
];

const severityOptions: Array<{ value: HouseholdHealthSeverity; label: string }> = [
    { value: 'mild', label: 'Nhẹ' },
    { value: 'medium', label: 'Vừa' },
    { value: 'high', label: 'Nặng' },
];

const statusAfterSaveOptions = [
    { value: 'none', label: 'Không đổi' },
    { value: 'sick', label: 'Chuyển sang đang bệnh' },
    { value: 'recovering', label: 'Chuyển sang hồi phục' },
];

const fieldListStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr)',
    gap: 10,
    width: '100%',
};

const fieldRowStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'minmax(130px, 170px) minmax(0, 1fr)',
    gap: 12,
    alignItems: 'start',
    borderTop: '1px solid rgba(15,23,42,0.06)',
    paddingTop: 10,
};

const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 12,
    lineHeight: '16px',
    marginBottom: 5,
    color: '#374151',
};

const formatDate = (value?: string) => value ? dayjs(value).format('DD/MM/YYYY') : 'Đang diễn ra';

const createRecordDraft = (record?: HouseholdHealthRecord): HealthRecordDraft => ({
    id: record?.id,
    type: record?.type ?? 'sickness',
    title: record?.title ?? '',
    startedAt: record?.startedAt ? dayjs(record.startedAt) : dayjs(),
    endedAt: record?.endedAt ? dayjs(record.endedAt) : null,
    severity: record?.severity,
    provider: record?.provider,
    dosage: record?.dosage,
    notes: record?.notes,
    statusAfterSave: 'none',
});

export const HouseholdHealthStatusTag: React.FC<{ status?: HouseholdHealthStatus; note?: string; compact?: boolean }> = ({ status, note, compact }) => {
    const meta = getHouseholdHealthStatusMeta(status);
    return <Tag color={meta.color} style={{ marginRight: 0, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {compact ? meta.label : `${meta.label}${note ? ` · ${note}` : ''}`}
    </Tag>;
};

export const HouseholdHealthWidget: React.FC<{ member: HouseholdMemberProfile }> = ({ member }) => {
    const dispatch = useDispatch();
    const message = useMessage();
    const profileSelector = useMemo(() => selectMemberHealthProfile(member.id), [member.id]);
    const recordsSelector = useMemo(() => selectHealthRecordsByMember(member.id), [member.id]);
    const profile = useSelector(profileSelector);
    const records = useSelector(recordsSelector);
    const [draft, setDraft] = useState<HealthProfileDraft>(() => ({
        heightCm: profile?.heightCm,
        weightKg: profile?.weightKg,
        status: profile?.status ?? 'neutral',
        statusNote: profile?.statusNote,
    }));
    const [recordDraft, setRecordDraft] = useState<HealthRecordDraft | null>(null);

    React.useEffect(() => {
        setDraft({
            heightCm: profile?.heightCm,
            weightKg: profile?.weightKg,
            status: profile?.status ?? 'neutral',
            statusNote: profile?.statusNote,
        });
    }, [member.id, profile?.heightCm, profile?.weightKg, profile?.status, profile?.statusNote]);

    const _setStatus = (status: HouseholdHealthStatus) => {
        setDraft(current => ({ ...current, status }));
        dispatch(setMemberHealthStatus({ memberId: member.id, status, statusNote: draft.statusNote }));
        message.success(`Đã cập nhật trạng thái ${member.name}`);
    };

    const _saveProfile = () => {
        dispatch(upsertMemberHealthProfile({
            memberId: member.id,
            heightCm: draft.heightCm,
            weightKg: draft.weightKg,
            status: draft.status,
            statusNote: draft.statusNote,
        }));
        message.success('Đã lưu hồ sơ sức khỏe');
    };

    const _openRecordModal = (record?: HouseholdHealthRecord) => setRecordDraft(createRecordDraft(record));

    const _saveRecord = () => {
        if (!recordDraft) return;
        if (!recordDraft.title.trim()) {
            message.warning('Vui lòng nhập tên ghi nhận');
            return;
        }

        dispatch(upsertHealthRecord({
            id: recordDraft.id,
            memberId: member.id,
            type: recordDraft.type,
            title: recordDraft.title,
            startedAt: recordDraft.startedAt.toISOString(),
            endedAt: recordDraft.endedAt?.toISOString(),
            severity: recordDraft.severity,
            provider: recordDraft.provider,
            dosage: recordDraft.dosage,
            notes: recordDraft.notes,
        }));

        if (recordDraft.statusAfterSave === 'sick' || recordDraft.statusAfterSave === 'recovering') {
            dispatch(setMemberHealthStatus({ memberId: member.id, status: recordDraft.statusAfterSave, statusNote: recordDraft.title }));
        }

        setRecordDraft(null);
        message.success('Đã lưu ghi nhận sức khỏe');
    };

    const _removeRecord = (record: HouseholdHealthRecord) => {
        dispatch(removeHealthRecord(record.id));
        message.success(`Đã xóa ${record.title}`);
    };

    return <Stack direction='column' gap={14} style={{ width: '100%' }}>
        <Box style={{ border: '1px solid rgba(15,23,42,0.08)', borderRadius: 8, background: '#fff', padding: 12 }}>
            <Stack justify='space-between' align='center' gap={8} wrap='wrap' style={{ marginBottom: 10 }}>
                <Stack align='center' gap={8} style={{ minWidth: 0 }}>
                    <HeartOutlined style={{ color: getHouseholdHealthStatusMeta(draft.status).tone }} />
                    <Typography.Text strong style={{ color: '#111827' }}>Hồ sơ sức khỏe</Typography.Text>
                </Stack>
                <HouseholdHealthStatusTag status={draft.status} note={draft.statusNote} />
            </Stack>

            <div style={fieldListStyle}>
                <div style={{ ...fieldRowStyle, borderTop: 0, paddingTop: 0 }}>
                    <Typography.Text strong style={labelStyle}>Trạng thái nhanh</Typography.Text>
                    <Segmented block value={draft.status} onChange={value => _setStatus(value as HouseholdHealthStatus)} options={statusOptions} />
                </div>
                <div style={fieldRowStyle}>
                    <Typography.Text strong style={labelStyle}>Chiều cao</Typography.Text>
                    <InputNumber min={30} max={260} step={1} value={draft.heightCm} addonAfter='cm' onChange={value => setDraft(current => ({ ...current, heightCm: value === null ? undefined : Number(value) }))} style={{ width: '100%' }} />
                </div>
                <div style={fieldRowStyle}>
                    <Typography.Text strong style={labelStyle}>Cân nặng</Typography.Text>
                    <InputNumber min={1} max={500} step={0.1} precision={1} value={draft.weightKg} addonAfter='kg' onChange={value => setDraft(current => ({ ...current, weightKg: value === null ? undefined : Number(value) }))} style={{ width: '100%' }} />
                </div>
                <div style={fieldRowStyle}>
                    <Typography.Text strong style={labelStyle}>Ghi chú trạng thái</Typography.Text>
                    <Input.TextArea value={draft.statusNote} onChange={event => setDraft(current => ({ ...current, statusNote: event.target.value }))} placeholder='Ví dụ: ho, mệt, ăn kém, đang hồi phục...' autoSize={{ minRows: 2, maxRows: 4 }} />
                </div>
            </div>
            <Stack justify='flex-end' style={{ marginTop: 12 }}>
                <Button type='primary' icon={<SaveOutlined />} onClick={_saveProfile}>Lưu sức khỏe</Button>
            </Stack>
        </Box>

        <Box style={{ border: '1px solid rgba(15,23,42,0.08)', borderRadius: 8, background: '#fff', padding: 12 }}>
            <Stack justify='space-between' align='center' gap={8} wrap='wrap' style={{ marginBottom: 10 }}>
                <div style={{ minWidth: 0 }}>
                    <Typography.Text strong style={{ display: 'block', color: '#111827' }}>Lịch sử sức khỏe</Typography.Text>
                    <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '17px' }}>Ghi lại bệnh, chăm sóc hoặc điều trị đơn giản. Đây là nhật ký gia đình, không phải tư vấn y tế.</Typography.Text>
                </div>
                <Button type='primary' icon={<PlusOutlined />} onClick={() => _openRecordModal()}>Thêm ghi nhận</Button>
            </Stack>
            {records.length === 0 ? <Empty description='Chưa có ghi nhận sức khỏe' image={Empty.PRESENTED_IMAGE_SIMPLE} /> : <Stack direction='column' gap={8} style={{ width: '100%' }}>
                {records.map(record => <Box key={record.id} style={{ border: '1px solid rgba(15,23,42,0.07)', borderRadius: 8, background: '#f8fafc', padding: 10 }}>
                    <Stack justify='space-between' align='flex-start' gap={8} wrap='wrap' style={{ width: '100%' }}>
                        <div style={{ minWidth: 0, flex: '1 1 220px' }}>
                            <Stack wrap='wrap' gap={5} style={{ marginBottom: 5 }}>
                                <Tag color={record.type === 'sickness' ? 'volcano' : 'blue'} style={{ marginRight: 0 }}>{record.type === 'sickness' ? 'Bệnh' : 'Điều trị'}</Tag>
                                {record.severity && <Tag color={record.severity === 'high' ? 'red' : record.severity === 'medium' ? 'orange' : 'green'} style={{ marginRight: 0 }}>{severityOptions.find(item => item.value === record.severity)?.label}</Tag>}
                            </Stack>
                            <Typography.Text strong style={{ display: 'block', color: '#111827', lineHeight: '18px', overflowWrap: 'anywhere' }}>{record.title}</Typography.Text>
                            <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '17px', marginTop: 3 }}>{formatDate(record.startedAt)} - {formatDate(record.endedAt)}</Typography.Text>
                            {(record.provider || record.dosage || record.notes) && <Typography.Text style={{ display: 'block', color: '#334155', fontSize: 12, lineHeight: '17px', marginTop: 5, overflowWrap: 'anywhere' }}>
                                {[record.provider, record.dosage, record.notes].filter(Boolean).join(' · ')}
                            </Typography.Text>}
                        </div>
                        <Stack gap={6} wrap='wrap'>
                            <Button icon={<EditOutlined />} onClick={() => _openRecordModal(record)}>Sửa</Button>
                            <Popconfirm title='Xóa ghi nhận này?' okText='Xóa' cancelText='Hủy' okButtonProps={{ danger: true }} onConfirm={() => _removeRecord(record)}>
                                <Button danger icon={<DeleteOutlined />}>Xóa</Button>
                            </Popconfirm>
                        </Stack>
                    </Stack>
                </Box>)}
            </Stack>}
        </Box>

        <Modal
            open={Boolean(recordDraft)}
            title={recordDraft?.id ? 'Sửa ghi nhận sức khỏe' : 'Thêm ghi nhận sức khỏe'}
            width={620}
            destroyOnClose
            onCancel={() => setRecordDraft(null)}
            okText='Lưu'
            cancelText='Hủy'
            onOk={_saveRecord}
        >
            {recordDraft && <Stack direction='column' gap={10} style={{ width: '100%' }}>
                <div>
                    <Typography.Text strong style={labelStyle}>Loại ghi nhận</Typography.Text>
                    <Segmented block value={recordDraft.type} onChange={value => setRecordDraft(current => current ? { ...current, type: value as HouseholdHealthRecordType } : current)} options={recordTypeOptions} />
                </div>
                <div>
                    <Typography.Text strong style={labelStyle}>Tên ghi nhận</Typography.Text>
                    <Input value={recordDraft.title} onChange={event => setRecordDraft(current => current ? { ...current, title: event.target.value } : current)} placeholder={recordDraft.type === 'sickness' ? 'Ví dụ: sốt, cảm cúm, đau bụng...' : 'Ví dụ: uống hạ sốt, khám bác sĩ...'} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                    <div>
                        <Typography.Text strong style={labelStyle}>Bắt đầu</Typography.Text>
                        <DatePicker value={recordDraft.startedAt} onChange={value => value && setRecordDraft(current => current ? { ...current, startedAt: value } : current)} format='DD/MM/YYYY' style={{ width: '100%' }} />
                    </div>
                    <div>
                        <Typography.Text strong style={labelStyle}>Kết thúc</Typography.Text>
                        <DatePicker allowClear value={recordDraft.endedAt} onChange={value => setRecordDraft(current => current ? { ...current, endedAt: value } : current)} format='DD/MM/YYYY' style={{ width: '100%' }} />
                    </div>
                </div>
                <div>
                    <Typography.Text strong style={labelStyle}>Mức độ</Typography.Text>
                    <Select allowClear value={recordDraft.severity} onChange={value => setRecordDraft(current => current ? { ...current, severity: value } : current)} options={severityOptions} placeholder='Chọn mức độ nếu cần' style={{ width: '100%' }} />
                </div>
                {recordDraft.type === 'treatment' && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                    <div>
                        <Typography.Text strong style={labelStyle}>Nơi/người chăm sóc</Typography.Text>
                        <Input value={recordDraft.provider} onChange={event => setRecordDraft(current => current ? { ...current, provider: event.target.value } : current)} placeholder='Bác sĩ, phòng khám, tự chăm...' />
                    </div>
                    <div>
                        <Typography.Text strong style={labelStyle}>Liều/cách dùng</Typography.Text>
                        <Input value={recordDraft.dosage} onChange={event => setRecordDraft(current => current ? { ...current, dosage: event.target.value } : current)} placeholder='Nhập tự do, app không kiểm tra y tế' />
                    </div>
                </div>}
                <div>
                    <Typography.Text strong style={labelStyle}>Cập nhật trạng thái sau khi lưu</Typography.Text>
                    <Select value={recordDraft.statusAfterSave ?? 'none'} onChange={value => setRecordDraft(current => current ? { ...current, statusAfterSave: value as HealthRecordDraft['statusAfterSave'] } : current)} options={statusAfterSaveOptions} style={{ width: '100%' }} />
                </div>
                <div>
                    <Typography.Text strong style={labelStyle}>Ghi chú</Typography.Text>
                    <Input.TextArea value={recordDraft.notes} onChange={event => setRecordDraft(current => current ? { ...current, notes: event.target.value } : current)} placeholder='Ghi chú theo dõi gia đình, không phải tư vấn y tế' autoSize={{ minRows: 3, maxRows: 5 }} />
                </div>
            </Stack>}
        </Modal>
    </Stack>;
};
