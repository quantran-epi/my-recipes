import { CheckCircleOutlined, CloudDownloadOutlined, CloudUploadOutlined, DatabaseOutlined, GithubOutlined, ReloadOutlined, SyncOutlined, WarningOutlined } from '@ant-design/icons';
import { checkStorageHealth, StorageHealth } from '@common/Storage/AppStorage';
import { SharedSyncModal } from '@components/AppInitializer/SharedSyncModal';
import { Button } from '@components/Button';
import { Box } from '@components/Layout/Box';
import { Stack } from '@components/Layout/Stack';
import { useMessage } from '@components/Message';
import { useModal } from '@components/Modal/ModalProvider';
import { Tag } from '@components/Tag';
import { Typography } from '@components/Typography';
import { getSharedSyncHealth, SharedSyncHealth, SyncedVersions, useGistBackup, useScreenTitle, useSharedDataSync, useSharedPublish, PersonalBackupHealth, PersonalPartKey } from '@hooks';
import dayjs from 'dayjs';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

const APP_CONFIRM_Z_INDEX = 5200;

const personalPartLabels: Record<PersonalPartKey, string> = {
    appContext: 'Cài đặt, tên nhớ, mẫu dùng lại',
    inventory: 'Tồn kho',
    shoppingList: 'Lịch mua sắm',
    scheduledMeal: 'Thực đơn',
    cookingSession: 'Phiên nấu',
};

const pageStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    maxWidth: 880,
    margin: '0 auto',
    padding: '0 0 18px',
};

const cardStyle: React.CSSProperties = {
    border: '1px solid rgba(116,54,220,0.10)',
    borderRadius: 8,
    background: '#fff',
    boxShadow: '0 10px 28px rgba(74,48,130,0.08)',
    overflow: 'hidden',
};

const cardHeaderStyle: React.CSSProperties = {
    padding: '13px 13px 11px',
    background: 'linear-gradient(90deg, rgba(116,54,220,0.10) 0%, rgba(255,255,255,0.96) 72%)',
    borderBottom: '1px solid rgba(116,54,220,0.09)',
};

const metricGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 8,
};

const metricStyle: React.CSSProperties = {
    border: '1px solid #f0f0f0',
    borderRadius: 8,
    background: '#fbf9ff',
    padding: 10,
};

const formatDateTime = (value?: string | null): string => value ? new Date(value).toLocaleString('vi-VN') : 'Chưa có';

const formatBytes = (bytes: number | null): string => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

const BackupFreshnessTag: React.FC<{ lastBackupAt: string | null }> = ({ lastBackupAt }) => {
    if (!lastBackupAt) return <Tag color='red' style={{ marginInlineEnd: 0 }}>Chưa sao lưu</Tag>;
    const days = dayjs().diff(dayjs(lastBackupAt), 'day');
    if (days <= 2) return <Tag color='green' style={{ marginInlineEnd: 0 }}>Mới</Tag>;
    if (days <= 7) return <Tag color='gold' style={{ marginInlineEnd: 0 }}>{days} ngày</Tag>;
    return <Tag color='volcano' style={{ marginInlineEnd: 0 }}>Quá {days} ngày</Tag>;
};

const CardTitle: React.FC<{ icon: React.ReactNode; title: string; subtitle: string }> = ({ icon, title, subtitle }) => (
    <Stack align='center' gap={9}>
        <span style={{ width: 38, height: 38, borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#7436dc', background: 'rgba(116,54,220,0.12)', flexShrink: 0, fontSize: 18 }}>{icon}</span>
        <div style={{ minWidth: 0 }}>
            <Typography.Text strong style={{ display: 'block', fontSize: 18, lineHeight: '23px', color: '#111827' }}>{title}</Typography.Text>
            <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '17px' }}>{subtitle}</Typography.Text>
        </div>
    </Stack>
);

const Metric: React.FC<{ label: string; value: React.ReactNode; detail?: React.ReactNode }> = ({ label, value, detail }) => (
    <Box style={metricStyle}>
        <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '16px', fontWeight: 650 }}>{label}</Typography.Text>
        <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 16, lineHeight: '22px', marginTop: 2 }}>{value}</Typography.Text>
        {detail && <Typography.Text type='secondary' style={{ display: 'block', fontSize: 11, lineHeight: '15px', marginTop: 4, overflowWrap: 'anywhere' }}>{detail}</Typography.Text>}
    </Box>
);

export const SyncBackupHealthScreen = () => {
    const message = useMessage();
    const modal = useModal();
    const { pendingSync, isSyncChecking, checkNow, dismissSync, markSynced } = useSharedDataSync();
    const { lastPublishAt, hasGithubToken } = useSharedPublish();
    const {
        gistId,
        gistToken,
        lastBackupAt,
        inspectPersonalBackupHealth,
        pushPersonalData,
        pullPersonalData,
        isPushing,
        isPulling,
        testGistConfig,
        isTesting,
    } = useGistBackup();
    const [sharedHealth, setSharedHealth] = useState<SharedSyncHealth | null>(null);
    const [personalHealth, setPersonalHealth] = useState<PersonalBackupHealth | null>(null);
    const [storageHealth, setStorageHealth] = useState<StorageHealth | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    useScreenTitle({ value: 'Sức khỏe dữ liệu', deps: [] });

    const refreshHealth = useCallback(async () => {
        setRefreshing(true);
        try {
            const [nextSharedHealth, nextPersonalHealth, nextStorageHealth] = await Promise.all([
                getSharedSyncHealth(),
                inspectPersonalBackupHealth(),
                checkStorageHealth(),
            ]);
            setSharedHealth(nextSharedHealth);
            setPersonalHealth(nextPersonalHealth);
            setStorageHealth(nextStorageHealth);
        } finally {
            setRefreshing(false);
        }
    }, [inspectPersonalBackupHealth]);

    useEffect(() => {
        refreshHealth();
    }, [refreshHealth]);

    const pendingPartTags = useMemo(() => {
        const parts = personalHealth?.pendingLocalParts ?? [];
        if (parts.length === 0) return <Tag color='green' style={{ marginInlineEnd: 0 }}>Không có thay đổi chờ sao lưu</Tag>;
        return parts.map(part => <Tag key={part} color='gold' style={{ marginInlineEnd: 0 }}>{personalPartLabels[part]}</Tag>);
    }, [personalHealth]);

    const _checkShared = async (force = false) => {
        try {
            const result = await checkNow({ force });
            await refreshHealth();
            if (!result) message.success('Dữ liệu dùng chung đã mới nhất');
        } catch (err: any) {
            message.error('Kiểm tra dữ liệu dùng chung thất bại: ' + err?.message);
        }
    };

    const _onSharedSynced = async (versions: SyncedVersions) => {
        await markSynced(versions);
        await refreshHealth();
        message.success('Đã đồng bộ dữ liệu dùng chung');
    };

    const _confirmPushPersonal = () => {
        modal.confirm({
            title: 'Xác nhận sao lưu cá nhân',
            content: 'Thao tác này sẽ ghi dữ liệu cá nhân hiện tại lên Gist. Bạn có chắc muốn sao lưu?',
            okText: 'Sao lưu',
            cancelText: 'Hủy',
            centered: true,
            zIndex: APP_CONFIRM_Z_INDEX,
            onOk: async () => {
                await pushPersonalData();
                await refreshHealth();
            },
        });
    };

    const _confirmPullPersonal = () => {
        modal.confirm({
            title: 'Xác nhận khôi phục cá nhân',
            content: 'Thao tác này sẽ ghi đè dữ liệu cá nhân trên thiết bị này bằng dữ liệu từ Gist và tải lại app.',
            okText: 'Khôi phục',
            cancelText: 'Hủy',
            centered: true,
            zIndex: APP_CONFIRM_Z_INDEX,
            onOk: pullPersonalData,
        });
    };

    const storageUsageText = storageHealth?.usage !== null && storageHealth?.quota
        ? `${formatBytes(storageHealth.usage)} / ${formatBytes(storageHealth.quota)}`
        : 'Chưa đọc được';
    const storagePercent = storageHealth?.usage && storageHealth?.quota
        ? Math.round(storageHealth.usage / storageHealth.quota * 100)
        : null;

    return <Box data-testid='sync-backup-health' style={pageStyle}>
        <section style={cardStyle}>
            <div style={cardHeaderStyle}>
                <Stack justify='space-between' align='center' gap={8}>
                    <CardTitle icon={<DatabaseOutlined />} title='Tổng quan lưu trữ' subtitle='Kiểm tra IndexedDB/PWA local-first và dung lượng thiết bị.' />
                    <Button icon={<ReloadOutlined />} loading={refreshing} onClick={refreshHealth}>Làm mới</Button>
                </Stack>
            </div>
            <div style={{ padding: 12 }}>
                <div style={metricGridStyle}>
                    <Metric label='Dữ liệu bền vững' value={storageHealth?.persisted === true ? 'Đã yêu cầu giữ lại' : storageHealth?.persisted === false ? 'Chưa được giữ lại' : 'Không rõ'} detail='Trình duyệt quyết định giữ IndexedDB khi thiết bị cần dọn dung lượng.' />
                    <Metric label='Dung lượng đang dùng' value={storageUsageText} detail={storagePercent !== null ? `${storagePercent}% hạn mức trình duyệt ước tính` : 'Không có số liệu quota từ trình duyệt'} />
                    <Metric label='Trạng thái mạng' value={navigator.onLine ? 'Đang online' : 'Offline'} detail='Các thao tác GitHub/Gist chỉ chạy khi có mạng.' />
                </div>
            </div>
        </section>

        <section style={cardStyle}>
            <div style={cardHeaderStyle}>
                <CardTitle icon={<GithubOutlined />} title='Sao lưu cá nhân' subtitle='Theo dõi Gist backup, thay đổi local đang chờ và độ mới của bản sao lưu.' />
            </div>
            <div style={{ padding: 12 }}>
                <div style={metricGridStyle}>
                    <Metric label='Cấu hình Gist' value={personalHealth?.configured ? 'Đã cấu hình' : 'Chưa đủ'} detail={gistId ? `Gist ID: ${gistId}` : 'Vào Menu -> Dữ liệu & sao lưu để nhập Gist ID/token'} />
                    <Metric label='Sao lưu gần nhất' value={<Stack align='center' gap={6}><span>{formatDateTime(lastBackupAt)}</span><BackupFreshnessTag lastBackupAt={lastBackupAt} /></Stack>} detail='Nếu quá nhiều ngày chưa sao lưu, nên bấm sao lưu thủ công.' />
                    <Metric label='Checkpoint đồng bộ' value={personalHealth?.hasCheckpoint ? 'Có' : 'Chưa có'} detail='Checkpoint giúp app biết phần dữ liệu nào thay đổi sau lần sync gần nhất.' />
                </div>
                <Box style={{ ...metricStyle, marginTop: 8 }}>
                    <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '16px', fontWeight: 650 }}>Thay đổi local đang chờ sao lưu</Typography.Text>
                    <Stack wrap='wrap' gap={5} style={{ marginTop: 7 }}>{pendingPartTags}</Stack>
                    {personalHealth && <Typography.Text type='secondary' style={{ display: 'block', fontSize: 11, lineHeight: '15px', marginTop: 8 }}>
                        Dữ liệu hiện có: tồn kho {personalHealth.localCounts.inventory}, mua sắm {personalHealth.localCounts.shoppingList}, thực đơn {personalHealth.localCounts.scheduledMeal}, phiên nấu {personalHealth.localCounts.cookingSession}.
                    </Typography.Text>}
                </Box>
                <Stack wrap='wrap' gap={8} style={{ marginTop: 10 }}>
                    <Button icon={<CheckCircleOutlined />} loading={isTesting} disabled={!gistId || !gistToken} onClick={() => testGistConfig()}>Kiểm tra Gist</Button>
                    <Button icon={<CloudUploadOutlined />} loading={isPushing} disabled={!gistId || !gistToken} onClick={_confirmPushPersonal}>Sao lưu ngay</Button>
                    <Button icon={<CloudDownloadOutlined />} loading={isPulling} disabled={!gistId || !gistToken} onClick={_confirmPullPersonal}>Khôi phục từ Gist</Button>
                </Stack>
            </div>
        </section>

        <section style={cardStyle}>
            <div style={cardHeaderStyle}>
                <CardTitle icon={<SyncOutlined />} title='Dữ liệu dùng chung' subtitle='Theo dõi đồng bộ món ăn/nguyên liệu và trạng thái xuất bản admin.' />
            </div>
            <div style={{ padding: 12 }}>
                <div style={metricGridStyle}>
                    <Metric label='Kiểm tra cập nhật lần cuối' value={formatDateTime(sharedHealth?.lastCheckedAt)} detail='Chỉ kiểm tra khi bạn bấm đồng bộ hoặc kiểm tra thủ công.' />
                    <Metric label='Xuất bản admin gần nhất' value={formatDateTime(lastPublishAt)} detail={hasGithubToken ? 'Thiết bị có token xuất bản.' : 'Chưa có token xuất bản trên thiết bị này.'} />
                    <Metric label='Version đã đồng bộ' value={sharedHealth?.syncedVersions.ingredientsVersion || sharedHealth?.syncedVersions.dishesVersion ? 'Đã có' : 'Chưa có'} detail={`Nguyên liệu: ${sharedHealth?.syncedVersions.ingredientsVersion || 'chưa'} · Món ăn: ${sharedHealth?.syncedVersions.dishesVersion || 'chưa'}`} />
                </div>
                <Stack wrap='wrap' gap={8} style={{ marginTop: 10 }}>
                    <Button icon={<ReloadOutlined />} loading={isSyncChecking} onClick={() => _checkShared(false)}>Kiểm tra cập nhật</Button>
                    <Button icon={<WarningOutlined />} loading={isSyncChecking} onClick={() => _checkShared(true)}>Force sync</Button>
                </Stack>
            </div>
        </section>

        {pendingSync && <SharedSyncModal
            open={true}
            manifest={pendingSync.manifest}
            hasIngredientChanges={pendingSync.hasIngredientChanges}
            hasDishChanges={pendingSync.hasDishChanges}
            force={pendingSync.force}
            onDone={_onSharedSynced}
            onCancel={dismissSync}
        />}
    </Box>;
};
