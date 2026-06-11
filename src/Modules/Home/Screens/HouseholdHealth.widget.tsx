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
import { DatePicker, Empty, Input, InputNumber, Popconfirm, Select, Segmented, Tooltip } from 'antd';
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
    relatedSicknessId?: string;
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
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    alignItems: 'start',
    borderTop: '1px solid rgba(15,23,42,0.06)',
    paddingTop: 10,
    width: '100%',
};

const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 12,
    lineHeight: '16px',
    marginBottom: 0,
    color: '#374151',
    textAlign: 'left',
};

const healthCss = `
.household-health-status-grid {
    width: 100%;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(126px, 1fr));
    gap: 8px;
}
.household-health-status-chip {
    min-height: 38px;
    border: 1px solid rgba(15,23,42,0.12);
    border-radius: 8px;
    background: #fff;
    padding: 8px 10px;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 8px;
    cursor: pointer;
    font: inherit;
    font-size: 12px;
    font-weight: 700;
    line-height: 16px;
    text-align: left;
    min-width: 0;
    transition: border-color 0.12s ease, background 0.12s ease, box-shadow 0.12s ease;
}
.household-health-status-chip:hover {
    border-color: rgba(22,119,255,0.42);
    box-shadow: 0 4px 12px rgba(15,23,42,0.08);
}
.household-health-status-chip-dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    flex: 0 0 auto;
}
.household-health-record-tags {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 5px;
    margin-bottom: 5px;
    min-width: 0;
}
.household-health-record-tags .ant-tag {
    margin-right: 0 !important;
    max-width: 100%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.household-health-record-modal,
.household-health-record-modal > * {
    width: 100%;
}
.household-health-record-modal .ant-input,
.household-health-record-modal .ant-input-number,
.household-health-record-modal .ant-input-number-group-wrapper,
.household-health-record-modal .ant-picker,
.household-health-record-modal .ant-select,
.household-health-record-modal .ant-segmented,
.household-health-record-modal textarea {
    width: 100% !important;
}
.household-health-history-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 10px;
    align-items: center;
    width: 100%;
}
.household-health-history-actions {
    justify-self: end;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 6px;
    flex-wrap: nowrap;
    min-width: max-content;
}
.household-health-history-actions .ant-btn {
    flex: 0 0 36px;
}
.household-health-linked-treatment-list {
    border-top: 1px solid rgba(15,23,42,0.07);
    background: #f8fafc;
    padding: 10px;
    display: grid;
    gap: 8px;
}
@media (max-width: 560px) {
    .household-health-history-row {
        grid-template-columns: minmax(0, 1fr);
    }
    .household-health-history-actions {
        width: 100%;
        justify-content: flex-end;
    }
}
`;

const historyRowStyle: React.CSSProperties = {
    width: '100%',
    border: '1px solid rgba(15,23,42,0.07)',
    borderRadius: 8,
    background: '#f8fafc',
    padding: 10,
};

const sicknessCardStyle: React.CSSProperties = {
    ...historyRowStyle,
    background: '#fff',
    padding: 0,
    overflow: 'hidden',
};

const sicknessHeaderStyle: React.CSSProperties = {
    padding: 10,
};

const treatmentRowStyle: React.CSSProperties = {
    ...historyRowStyle,
    background: '#fff',
    border: '1px solid rgba(37,99,235,0.14)',
};

const iconButtonStyle: React.CSSProperties = {
    width: 36,
    height: 36,
    paddingInline: 0,
};

const formatDate = (value?: string) => value ? dayjs(value).format('DD/MM/YYYY') : 'Đang diễn ra';

const createRecordDraft = (record?: HouseholdHealthRecord, relatedSicknessId?: string): HealthRecordDraft => ({
    id: record?.id,
    type: record?.type ?? (relatedSicknessId ? 'treatment' : 'sickness'),
    relatedSicknessId: record?.relatedSicknessId ?? relatedSicknessId,
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
    const sicknessRecords = useMemo(() => records.filter(record => record.type === 'sickness'), [records]);
    const sicknessById = useMemo(() => new Map(sicknessRecords.map(record => [record.id, record])), [sicknessRecords]);
    const linkedTreatmentsBySicknessId = useMemo(() => {
        const grouped = new Map<string, HouseholdHealthRecord[]>();
        records.forEach(record => {
            if (record.type !== 'treatment' || !record.relatedSicknessId || !sicknessById.has(record.relatedSicknessId)) return;
            grouped.set(record.relatedSicknessId, [...(grouped.get(record.relatedSicknessId) ?? []), record]);
        });
        return grouped;
    }, [records, sicknessById]);
    const standaloneTreatments = useMemo(() => records.filter(record => record.type === 'treatment' && (!record.relatedSicknessId || !sicknessById.has(record.relatedSicknessId))), [records, sicknessById]);
    const sicknessOptions = useMemo(() => sicknessRecords.map(record => ({
        value: record.id,
        label: `${record.title} · ${formatDate(record.startedAt)} - ${formatDate(record.endedAt)}`,
    })), [sicknessRecords]);
    const [draft, setDraft] = useState<HealthProfileDraft>(() => ({
        heightCm: profile?.heightCm,
        weightKg: profile?.weightKg,
        status: profile?.status ?? 'neutral',
        statusNote: profile?.statusNote,
    }));
    const [recordDraft, setRecordDraft] = useState<HealthRecordDraft | null>(null);
    const availableSicknessOptions = useMemo(() => sicknessOptions.filter(option => option.value !== recordDraft?.id), [recordDraft?.id, sicknessOptions]);

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

    const _openTreatmentForSickness = (record: HouseholdHealthRecord) => setRecordDraft(createRecordDraft(undefined, record.id));

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
            relatedSicknessId: recordDraft.type === 'treatment' && recordDraft.relatedSicknessId !== recordDraft.id ? recordDraft.relatedSicknessId : undefined,
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

    const _renderHistoryActions = (record: HouseholdHealthRecord) => <div className='household-health-history-actions'>
        {record.type === 'sickness' && <Tooltip title='Thêm điều trị cho ghi nhận này'>
            <Button aria-label={`Thêm điều trị cho ${record.title}`} icon={<PlusOutlined />} onClick={() => _openTreatmentForSickness(record)} style={iconButtonStyle} />
        </Tooltip>}
        <Tooltip title='Sửa ghi nhận'>
            <Button aria-label={`Sửa ${record.title}`} icon={<EditOutlined />} onClick={() => _openRecordModal(record)} style={iconButtonStyle} />
        </Tooltip>
        <Popconfirm title='Xóa ghi nhận này?' okText='Xóa' cancelText='Hủy' okButtonProps={{ danger: true }} onConfirm={() => _removeRecord(record)}>
            <Tooltip title='Xóa ghi nhận'>
                <Button aria-label={`Xóa ${record.title}`} danger icon={<DeleteOutlined />} style={iconButtonStyle} />
            </Tooltip>
        </Popconfirm>
    </div>;

    const _renderRecordSummary = (record: HouseholdHealthRecord, showRelatedSickness = true) => {
        const relatedSickness = record.relatedSicknessId ? sicknessById.get(record.relatedSicknessId) : undefined;
        return <div style={{ minWidth: 0, width: '100%' }}>
            <div className='household-health-record-tags'>
                <Tag color={record.type === 'sickness' ? 'volcano' : 'blue'} style={{ marginRight: 0 }}>{record.type === 'sickness' ? 'Bệnh' : 'Điều trị'}</Tag>
                {record.severity && <Tag color={record.severity === 'high' ? 'red' : record.severity === 'medium' ? 'orange' : 'green'} style={{ marginRight: 0 }}>{severityOptions.find(item => item.value === record.severity)?.label}</Tag>}
                {record.type === 'treatment' && showRelatedSickness && relatedSickness && <Tag color='geekblue' style={{ marginRight: 0, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>Cho: {relatedSickness.title}</Tag>}
                {record.type === 'treatment' && showRelatedSickness && !relatedSickness && <Tag style={{ marginRight: 0 }}>Chưa nối bệnh</Tag>}
            </div>
            <Typography.Text strong style={{ display: 'block', color: '#111827', lineHeight: '18px', overflowWrap: 'anywhere' }}>{record.title}</Typography.Text>
            <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '17px', marginTop: 3 }}>{formatDate(record.startedAt)} - {formatDate(record.endedAt)}</Typography.Text>
            {(record.provider || record.dosage || record.notes) && <Typography.Text style={{ display: 'block', color: '#334155', fontSize: 12, lineHeight: '17px', marginTop: 5, overflowWrap: 'anywhere' }}>
                {[record.provider, record.dosage, record.notes].filter(Boolean).join(' · ')}
            </Typography.Text>}
        </div>;
    };

    const _renderTreatmentRow = (record: HouseholdHealthRecord, showRelatedSickness = true) => <Box key={record.id} className='household-health-history-row' style={treatmentRowStyle}>
        {_renderRecordSummary(record, showRelatedSickness)}
        {_renderHistoryActions(record)}
    </Box>;

    const _renderSicknessRow = (record: HouseholdHealthRecord) => {
        const treatments = linkedTreatmentsBySicknessId.get(record.id) ?? [];
        return <Box key={record.id} style={sicknessCardStyle}>
            <div className='household-health-history-row' style={sicknessHeaderStyle}>
                {_renderRecordSummary(record, false)}
                {_renderHistoryActions(record)}
            </div>
            {treatments.length > 0 && <div className='household-health-linked-treatment-list'>
                <Typography.Text type='secondary' style={{ fontSize: 12, lineHeight: '17px' }}>{treatments.length} điều trị / chăm sóc liên quan</Typography.Text>
                {treatments.map(treatment => _renderTreatmentRow(treatment, false))}
            </div>}
        </Box>;
    };

    return <Stack direction='column' gap={14} style={{ width: '100%' }}>
        <style>{healthCss}</style>
        <Box style={{ border: '1px solid rgba(15,23,42,0.08)', borderRadius: 8, background: '#fff', padding: 12 }}>
            <Stack justify='space-between' align='flex-start' gap={8} wrap='wrap' style={{ marginBottom: 10, width: '100%' }}>
                <Stack align='center' gap={8} style={{ minWidth: 0, justifyContent: 'flex-start', textAlign: 'left' }}>
                    <HeartOutlined style={{ color: getHouseholdHealthStatusMeta(draft.status).tone }} />
                    <Typography.Text strong style={{ color: '#111827' }}>Hồ sơ sức khỏe</Typography.Text>
                </Stack>
                <HouseholdHealthStatusTag status={draft.status} note={draft.statusNote} />
            </Stack>

            <div style={fieldListStyle}>
                <div style={{ ...fieldRowStyle, borderTop: 0, paddingTop: 0 }}>
                    <Typography.Text strong style={labelStyle}>Trạng thái nhanh</Typography.Text>
                    <div className='household-health-status-grid'>
                        {statusOptions.map(option => {
                            const meta = HOUSEHOLD_HEALTH_STATUS_META[option.value];
                            const active = draft.status === option.value;
                            return <button
                                key={option.value}
                                type='button'
                                className='household-health-status-chip'
                                aria-pressed={active}
                                onClick={() => _setStatus(option.value)}
                                style={{
                                    borderColor: active ? meta.tone : undefined,
                                    background: active ? `${meta.tone}14` : undefined,
                                    color: active ? meta.tone : undefined,
                                    boxShadow: active ? `inset 0 0 0 1px ${meta.tone}33` : undefined,
                                }}
                            >
                                <span className='household-health-status-chip-dot' style={{ background: meta.tone }} />
                                <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{option.label}</span>
                            </button>;
                        })}
                    </div>
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
                {sicknessRecords.map(_renderSicknessRow)}
                {standaloneTreatments.length > 0 && <Box style={{ width: '100%', display: 'grid', gap: 8 }}>
                    <Typography.Text type='secondary' style={{ fontSize: 12, lineHeight: '17px' }}>Điều trị / chăm sóc chưa nối với bệnh</Typography.Text>
                    {standaloneTreatments.map(treatment => _renderTreatmentRow(treatment, true))}
                </Box>}
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
            {recordDraft && <Stack className='household-health-record-modal' direction='column' gap={10} fullwidth>
                <div style={{ width: '100%' }}>
                    <Typography.Text strong style={labelStyle}>Loại ghi nhận</Typography.Text>
                    <Segmented block value={recordDraft.type} onChange={value => setRecordDraft(current => current ? { ...current, type: value as HouseholdHealthRecordType, relatedSicknessId: value === 'treatment' ? current.relatedSicknessId : undefined } : current)} options={recordTypeOptions} />
                </div>
                {recordDraft.type === 'treatment' && <div style={{ width: '100%' }}>
                    <Typography.Text strong style={labelStyle}>Liên quan đến</Typography.Text>
                    <Select allowClear value={recordDraft.relatedSicknessId} onChange={value => setRecordDraft(current => current ? { ...current, relatedSicknessId: value } : current)} options={availableSicknessOptions} disabled={availableSicknessOptions.length === 0} placeholder={availableSicknessOptions.length === 0 ? 'Chưa có bệnh/triệu chứng để nối' : 'Chọn bệnh/triệu chứng liên quan'} style={{ width: '100%' }} />
                </div>}
                <div style={{ width: '100%' }}>
                    <Typography.Text strong style={labelStyle}>Tên ghi nhận</Typography.Text>
                    <Input value={recordDraft.title} onChange={event => setRecordDraft(current => current ? { ...current, title: event.target.value } : current)} placeholder={recordDraft.type === 'sickness' ? 'Ví dụ: sốt, cảm cúm, đau bụng...' : 'Ví dụ: uống hạ sốt, khám bác sĩ...'} />
                </div>
                <div style={{ width: '100%', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                    <div style={{ width: '100%', minWidth: 0 }}>
                        <Typography.Text strong style={labelStyle}>Bắt đầu</Typography.Text>
                        <DatePicker value={recordDraft.startedAt} onChange={value => value && setRecordDraft(current => current ? { ...current, startedAt: value } : current)} format='DD/MM/YYYY' style={{ width: '100%' }} />
                    </div>
                    <div style={{ width: '100%', minWidth: 0 }}>
                        <Typography.Text strong style={labelStyle}>Kết thúc</Typography.Text>
                        <DatePicker allowClear value={recordDraft.endedAt} onChange={value => setRecordDraft(current => current ? { ...current, endedAt: value } : current)} format='DD/MM/YYYY' style={{ width: '100%' }} />
                    </div>
                </div>
                <div style={{ width: '100%' }}>
                    <Typography.Text strong style={labelStyle}>Mức độ</Typography.Text>
                    <Select allowClear value={recordDraft.severity} onChange={value => setRecordDraft(current => current ? { ...current, severity: value } : current)} options={severityOptions} placeholder='Chọn mức độ nếu cần' style={{ width: '100%' }} />
                </div>
                {recordDraft.type === 'treatment' && <div style={{ width: '100%', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                    <div style={{ width: '100%', minWidth: 0 }}>
                        <Typography.Text strong style={labelStyle}>Nơi/người chăm sóc</Typography.Text>
                        <Input value={recordDraft.provider} onChange={event => setRecordDraft(current => current ? { ...current, provider: event.target.value } : current)} placeholder='Bác sĩ, phòng khám, tự chăm...' />
                    </div>
                    <div style={{ width: '100%', minWidth: 0 }}>
                        <Typography.Text strong style={labelStyle}>Liều/cách dùng</Typography.Text>
                        <Input value={recordDraft.dosage} onChange={event => setRecordDraft(current => current ? { ...current, dosage: event.target.value } : current)} placeholder='Nhập tự do, app không kiểm tra y tế' />
                    </div>
                </div>}
                <div style={{ width: '100%' }}>
                    <Typography.Text strong style={labelStyle}>Cập nhật trạng thái sau khi lưu</Typography.Text>
                    <Select value={recordDraft.statusAfterSave ?? 'none'} onChange={value => setRecordDraft(current => current ? { ...current, statusAfterSave: value as HealthRecordDraft['statusAfterSave'] } : current)} options={statusAfterSaveOptions} style={{ width: '100%' }} />
                </div>
                <div style={{ width: '100%' }}>
                    <Typography.Text strong style={labelStyle}>Ghi chú</Typography.Text>
                    <Input.TextArea value={recordDraft.notes} onChange={event => setRecordDraft(current => current ? { ...current, notes: event.target.value } : current)} placeholder='Ghi chú theo dõi gia đình, không phải tư vấn y tế' autoSize={{ minRows: 3, maxRows: 5 }} />
                </div>
            </Stack>}
        </Modal>
    </Stack>;
};
