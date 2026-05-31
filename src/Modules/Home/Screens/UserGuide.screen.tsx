import { QuestionCircleOutlined } from '@ant-design/icons';
import { Box } from '@components/Layout/Box';
import { Stack } from '@components/Layout/Stack';
import { Modal } from '@components/Modal';
import { Typography } from '@components/Typography';
import { Collapse } from 'antd';
import React from 'react';

type UserGuideScreenProps = {
    open: boolean;
    onClose: () => void;
};

type GuideSection = {
    key: string;
    emoji: string;
    title: string;
    steps: { title: string; desc: string }[];
};

const GUIDE: GuideSection[] = [
    {
        key: 'ingredient',
        emoji: '🥦',
        title: 'Quản lý nguyên liệu',
        steps: [
            { title: 'Xem danh sách', desc: 'Vào mục Nguyên liệu. Mỗi dòng hiển thị tên, phân loại, thời hạn bảo quản và lượng tồn kho hiện tại.' },
            { title: 'Thêm nguyên liệu (Admin)', desc: 'Nhấn nút + ở góc trên bên phải. Điền tên, phân loại và chọn thời hạn bảo quản phù hợp.' },
            { title: 'Cập nhật tồn kho', desc: 'Nhấn vào badge số lượng (ví dụ: 300 g) bên phải tên. Thêm lô hàng mới với số lượng và ngày mua để theo dõi hạn sử dụng từng lô.' },
            { title: 'Nhiều lô hàng', desc: 'Nhấn Thêm lô hàng để ghi riêng 100g mua hôm nay và 200g mua tuần trước. Hệ thống tự tính lô nào hết hạn sớm nhất.' },
            { title: 'Dùng trước hết hạn 🔴', desc: 'Nhấn nút lửa 🔴 trên thanh tìm kiếm để xem các nguyên liệu dễ hỏng còn trong tủ. Chọn nhiều nguyên liệu rồi nhấn Gợi ý món để tìm món phù hợp.' },
            { title: 'Thống kê 📊', desc: 'Nhấn nút biểu đồ 📊 để xem tổng lượng mua và nấu theo khoảng thời gian. Dữ liệu lấy từ danh sách mua sắm đã tích và phiên nấu hoàn thành.' },
        ],
    },
    {
        key: 'dish',
        emoji: '🍜',
        title: 'Món ăn & Nấu ăn',
        steps: [
            { title: 'Xem món ăn', desc: 'Vào mục Món ăn. Nhấn vào một món để xem chi tiết nguyên liệu, thời gian và các bước thực hiện.' },
            { title: 'Bắt đầu nấu', desc: 'Trong trang chi tiết món, nhấn Bắt đầu nấu. Hệ thống tạo phiên nấu và hướng dẫn từng bước. Sau bước cuối nhấn Hoàn thành để ghi lại và tự động trừ tồn kho.' },
            { title: 'Lịch sử nấu ăn', desc: 'Vào Menu → Lịch sử nấu ăn để xem các phiên đã nấu theo ngày, thời lượng và trạng thái hoàn thành / huỷ.' },
        ],
    },
    {
        key: 'suggester',
        emoji: '💡',
        title: 'Gợi ý món ăn',
        steps: [
            { title: 'Theo nguyên liệu', desc: 'Chọn tab Nguyên liệu, tick các nguyên liệu bạn có rồi nhấn Gợi ý món. Kết quả xếp theo mức độ phù hợp và hiển thị nguyên liệu còn thiếu.' },
            { title: 'Theo tủ lạnh 🧊', desc: 'Chọn tab Tủ lạnh — hệ thống tự đọc toàn bộ tồn kho > 0 và gợi ý ngay. Nhấn vào dải xanh để xem chi tiết từng nguyên liệu và số lượng.' },
            { title: 'Theo thời gian ⏱', desc: 'Chọn tab Thời gian, nhập số phút bạn có. Hệ thống lọc các món có tổng thời gian (chuẩn bị + nấu) nhỏ hơn hoặc bằng con số đó.' },
            { title: 'Tạo giỏ hàng', desc: 'Tick chọn các món muốn nấu rồi nhấn Tạo giỏ hàng — danh sách mua sắm tự động tổng hợp các nguyên liệu còn thiếu.' },
        ],
    },
    {
        key: 'shopping',
        emoji: '🛒',
        title: 'Lịch mua sắm',
        steps: [
            { title: 'Tạo danh sách', desc: 'Vào Lịch mua sắm → nhấn +. Đặt tên, ngày dự kiến mua và thêm nguyên liệu cần mua cùng số lượng.' },
            { title: 'Tick nguyên liệu', desc: 'Khi đi chợ, mở danh sách và tick từng nguyên liệu đã mua. Hệ thống tự so sánh với tồn kho hiện tại.' },
            { title: 'Giỏ hàng theo khoảng ngày', desc: 'Trong Thực đơn, nhấn Giỏ hàng theo khoảng ngày, chọn từ ngày đến ngày — hệ thống tổng hợp tất cả nguyên liệu cần mua cho các bữa trong khoảng đó.' },
        ],
    },
    {
        key: 'schedule',
        emoji: '📅',
        title: 'Lên thực đơn',
        steps: [
            { title: 'Thêm bữa ăn', desc: 'Vào Thực đơn, nhấn vào một ngày trên lịch rồi chọn Thêm bữa. Chọn buổi (sáng/trưa/tối), thêm món ăn và số người ăn.' },
            { title: 'Copy thực đơn', desc: 'Nhấn icon Copy ở một ngày để sao chép toàn bộ bữa ăn sang ngày khác.' },
            { title: 'Tên món trực tiếp', desc: 'Tên các món ăn hiển thị ngay trên ô lịch dưới dạng tag nhỏ, không cần mở chi tiết.' },
        ],
    },
    {
        key: 'backup',
        emoji: '☁️',
        title: 'Sao lưu dữ liệu cá nhân',
        steps: [
            { title: 'Cấu hình Gist', desc: 'Vào Menu → Sao lưu cá nhân. Điền Gist ID và GitHub Personal Access Token (scope: gist). Nhấn Lưu cấu hình.' },
            { title: 'Sao lưu', desc: 'Nhấn Sao lưu để đẩy dữ liệu cá nhân (tồn kho, lịch mua sắm, thực đơn) lên Gist. Thời điểm sao lưu gần nhất hiển thị bên dưới nút.' },
            { title: 'Khôi phục', desc: 'Nhấn Khôi phục để tải dữ liệu từ Gist về. Toàn bộ dữ liệu cục bộ sẽ bị thay thế — hãy chắc chắn bạn đã sao lưu trước.' },
            { title: 'Đổi thiết bị', desc: 'Trên thiết bị mới, điền cùng Gist ID + Token rồi nhấn Khôi phục để lấy lại toàn bộ dữ liệu.' },
        ],
    },
];

export const UserGuideScreen: React.FC<UserGuideScreenProps> = ({ open, onClose }) => {
    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={null}
            destroyOnClose
            title={
                <Stack gap={8} align="center">
                    <QuestionCircleOutlined style={{ color: '#1677ff' }} />
                    <span>Hướng dẫn sử dụng</span>
                </Stack>
            }
            style={{ top: 16 }}
        >
            <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 14 }}>
                Nhấn vào từng mục để xem hướng dẫn chi tiết.
            </Typography.Text>

            <Collapse
                accordion
                size="small"
                style={{ background: 'transparent' }}
                items={GUIDE.map(section => ({
                    key: section.key,
                    label: (
                        <Stack gap={8} align="center">
                            <span style={{ fontSize: 18 }}>{section.emoji}</span>
                            <Typography.Text strong style={{ fontSize: 14 }}>{section.title}</Typography.Text>
                        </Stack>
                    ),
                    children: (
                        <Box style={{ paddingLeft: 4 }}>
                            {section.steps.map((step, i) => (
                                <Box
                                    key={i}
                                    style={{
                                        marginBottom: 12,
                                        paddingLeft: 10,
                                        borderLeft: '3px solid #1677ff22',
                                    }}
                                >
                                    <Stack gap={6} align="center" style={{ marginBottom: 3 }}>
                                        <div style={{
                                            width: 20, height: 20, borderRadius: '50%',
                                            background: '#1677ff', color: '#fff',
                                            fontSize: 11, fontWeight: 700,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            flexShrink: 0,
                                        }}>
                                            {i + 1}
                                        </div>
                                        <Typography.Text strong style={{ fontSize: 13 }}>{step.title}</Typography.Text>
                                    </Stack>
                                    <Typography.Text type="secondary" style={{ fontSize: 12, paddingLeft: 26, display: 'block' }}>
                                        {step.desc}
                                    </Typography.Text>
                                </Box>
                            ))}
                        </Box>
                    ),
                }))}
            />
        </Modal>
    );
};
