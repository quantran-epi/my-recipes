import {
    AppstoreOutlined,
    BarChartOutlined,
    BookOutlined,
    CalculatorOutlined,
    CalendarOutlined,
    CheckCircleOutlined,
    CloudUploadOutlined,
    DatabaseOutlined,
    FireOutlined,
    MedicineBoxOutlined,
    PlayCircleOutlined,
    QuestionCircleOutlined,
    ReloadOutlined,
    SearchOutlined,
    ShoppingCartOutlined,
} from '@ant-design/icons';
import { Button } from '@components/Button';
import { Box } from '@components/Layout/Box';
import { Stack } from '@components/Layout/Stack';
import { Tag } from '@components/Tag';
import { Typography } from '@components/Typography';
import { useScreenTitle } from '@hooks';
import { RootRoutes } from '@routing/RootRoutes';
import { Progress } from 'antd';
import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

type GuideStep = {
    title: string;
    desc: string;
    note?: string;
}

type GuidePage = {
    key: string;
    title: string;
    subtitle: string;
    summary: string;
    tone: string;
    icon: React.ReactNode;
    actionLabel?: string;
    actionPath?: string;
    steps: GuideStep[];
    tips: string[];
}

type GuideFlow = {
    key: string;
    label: string;
    description: string;
    pageKeys: string[];
    tone: string;
    icon: React.ReactNode;
}

const GUIDE_PAGES: GuidePage[] = [
    {
        key: 'start',
        title: 'Bắt đầu nhanh',
        subtitle: 'Luồng dùng hằng ngày từ xem tồn kho đến quyết định nấu gì.',
        summary: 'Nếu chỉ mở app trong vài phút, hãy xem dashboard, kiểm tra nguyên liệu sắp hết hạn, chọn món phù hợp, rồi tạo lịch mua sắm hoặc thực đơn.',
        tone: '#7436dc',
        icon: <BookOutlined />,
        actionLabel: 'Mở dashboard',
        actionPath: RootRoutes.AuthorizedRoutes.Root(),
        steps: [
            { title: 'Xem dashboard trước', desc: 'Dashboard gom việc cần chú ý như tồn kho, lịch mua sắm, thực đơn gần nhất và gợi ý nhanh.' },
            { title: 'Kiểm tra nguyên liệu cần xử lý', desc: 'Mở Nguyên liệu để xem tồn kho, lô sắp hết hạn và lượng còn lại. Ưu tiên dùng nguyên liệu có cảnh báo trước.' },
            { title: 'Chọn món hoặc để app gợi ý', desc: 'Mở Món ăn nếu đã biết nấu gì, hoặc dùng Gợi ý món để chọn theo tủ lạnh, thời gian, nguyên liệu hoặc mục tiêu dinh dưỡng.' },
            { title: 'Tạo thực đơn và lịch mua', desc: 'Sau khi chọn món, tạo thực đơn cho ngày cần nấu hoặc tạo lịch mua sắm để gom nguyên liệu còn thiếu.' },
        ],
        tips: ['Dùng Phân tích khi cần quyết định cho cả tuần.', 'Dùng Mẫu dùng lại cho thực đơn hoặc giỏ mua lặp lại nhiều lần.', 'Dùng Dinh dưỡng khi muốn chọn món theo kcal, đạm, chất xơ hoặc mục tiêu riêng.'],
    },
    {
        key: 'ingredients',
        title: 'Nguyên liệu và tồn kho',
        subtitle: 'Quản lý nguyên liệu dùng chung và tồn kho cá nhân theo từng lô.',
        summary: 'Nguyên liệu là nền tảng cho gợi ý món, lịch mua sắm, trừ kho sau khi nấu, cảnh báo hạn dùng và phân tích dữ liệu.',
        tone: '#389e0d',
        icon: <DatabaseOutlined />,
        actionLabel: 'Mở nguyên liệu',
        actionPath: RootRoutes.AuthorizedRoutes.IngredientRoutes.List(),
        steps: [
            { title: 'Xem danh sách nguyên liệu', desc: 'Mỗi dòng hiển thị tên, nhóm, tồn kho hiện tại, hạn bảo quản và trạng thái cần chú ý.' },
            { title: 'Thêm hoặc sửa nguyên liệu', desc: 'Admin có thể thêm nguyên liệu, đặt nhóm, đơn vị, thời hạn bảo quản, dữ liệu giá và dữ liệu dinh dưỡng.' },
            { title: 'Cập nhật tồn kho theo lô', desc: 'Khi mua thêm, ghi số lượng, ngày mua và điều kiện bảo quản. App dùng từng lô để tính hạn dùng và lượng có sẵn.' },
            { title: 'Theo dõi nguyên liệu sắp hết hạn', desc: 'Các lô gần hết hạn được đưa vào cảnh báo và phân tích rủi ro hao hụt để bạn dùng trước khi hỏng.' },
            { title: 'Dùng dữ liệu giá và nutrition', desc: 'Giá giúp ước tính chi phí mua sắm. Nutrition giúp calculator, mục tiêu dinh dưỡng và gợi ý món cho kết quả chính xác hơn.' },
        ],
        tips: ['Ghi tồn kho theo nhiều lô khi mua nhiều lần.', 'Đặt đúng đơn vị để app quy đổi khi tính món và giỏ mua.', 'Nguyên liệu luôn có sẵn sẽ không bị ép mua thêm trong shopping list.'],
    },
    {
        key: 'dishes',
        title: 'Món ăn và phiên nấu',
        subtitle: 'Quản lý công thức, khẩu phần, bước nấu và trừ tồn kho sau khi hoàn thành.',
        summary: 'Món ăn kết nối nguyên liệu, thời gian nấu, khẩu phần, nutrition, lịch mua sắm và thực đơn.',
        tone: '#d48806',
        icon: <FireOutlined />,
        actionLabel: 'Mở món ăn',
        actionPath: RootRoutes.AuthorizedRoutes.DishesRoutes.List(),
        steps: [
            { title: 'Xem và lọc món', desc: 'Danh sách món hỗ trợ tìm kiếm, lọc trạng thái và xem nhanh thông tin chính để chọn món nhanh hơn.' },
            { title: 'Quản lý nguyên liệu món', desc: 'Trong chi tiết món, thêm nguyên liệu, số lượng, đơn vị và khẩu phần gốc. Đây là dữ liệu để tính shopping list, nutrition và trừ kho.' },
            { title: 'Thêm bước nấu và thời gian', desc: 'Ghi bước nấu rõ ràng và thời lượng chuẩn bị/nấu để app gợi ý theo thời gian rảnh.' },
            { title: 'Bắt đầu nấu', desc: 'Nhấn Bắt đầu nấu trong chi tiết món. Khi hoàn thành, app ghi lịch sử nấu và trừ tồn kho theo lượng đã dùng.' },
            { title: 'Tạo lịch mua từ món', desc: 'Từ món đã chọn, tạo lịch mua sắm để app tự gom nguyên liệu còn thiếu sau khi trừ tồn kho.' },
        ],
        tips: ['Hoàn thiện món giúp gợi ý món và analytics chính xác hơn.', 'Điền khẩu phần gốc trước khi tạo shopping list theo số người ăn.', 'Có thể nấu nhiều phiên song song và chuyển phiên từ nút nổi.'],
    },
    {
        key: 'suggestions',
        title: 'Gợi ý món',
        subtitle: 'Chọn món theo nguyên liệu, tủ lạnh, thời gian hoặc mục tiêu dinh dưỡng.',
        summary: 'Gợi ý món giúp trả lời câu hỏi nên nấu gì dựa trên dữ liệu thật trong cookbook và tồn kho hiện tại.',
        tone: '#13a8a8',
        icon: <QuestionCircleOutlined />,
        steps: [
            { title: 'Gợi ý theo nguyên liệu', desc: 'Chọn nguyên liệu đang có hoặc muốn dùng. App xếp hạng món theo mức độ khớp và hiển thị nguyên liệu còn thiếu.' },
            { title: 'Gợi ý theo tủ lạnh', desc: 'Tab tủ lạnh tự đọc tồn kho còn số lượng. Mở phần chi tiết để xem nguyên liệu nào đang được tính vào điểm gợi ý.' },
            { title: 'Gợi ý theo thời gian', desc: 'Nhập số phút đang có. App ưu tiên món có tổng thời gian chuẩn bị và nấu phù hợp.' },
            { title: 'Gợi ý theo dinh dưỡng', desc: 'Chọn mục tiêu nutrition như bữa cân bằng, giàu đạm, nhẹ kcal hoặc nhiều chất xơ để xếp hạng món theo mục tiêu đó.' },
            { title: 'Tạo giỏ hàng từ món gợi ý', desc: 'Tick nhiều món rồi tạo giỏ. App gom nguyên liệu thiếu thành một lịch mua sắm.' },
        ],
        tips: ['Điểm gợi ý tốt hơn khi món có đủ nguyên liệu và khẩu phần.', 'Dữ liệu tồn kho mới giúp tab tủ lạnh hữu ích hơn.', 'Dữ liệu nutrition giúp gợi ý theo mục tiêu đáng tin hơn.'],
    },
    {
        key: 'shopping',
        title: 'Lịch mua sắm',
        subtitle: 'Chuẩn bị giỏ mua từ món, thực đơn, mẫu hoặc nguyên liệu tự chọn.',
        summary: 'Lịch mua sắm giúp biết cần mua gì sau khi đã trừ tồn kho, theo dõi tiến độ mua và cập nhật nguyên liệu về kho.',
        tone: '#0958d9',
        icon: <ShoppingCartOutlined />,
        actionLabel: 'Mở mua sắm',
        actionPath: RootRoutes.AuthorizedRoutes.ShoppingListRoutes.List(),
        steps: [
            { title: 'Tạo danh sách mới', desc: 'Chọn ngày mua, thêm món hoặc nguyên liệu. App có thể tính số lượng cần mua theo khẩu phần.' },
            { title: 'Dùng mẫu mua sắm', desc: 'Nếu có giỏ lặp lại, chọn mẫu để tạo nhanh danh sách với nguyên liệu và món đã lưu.' },
            { title: 'Tick khi đi chợ', desc: 'Mở danh sách và tick từng nhóm nguyên liệu đã mua. Tiến độ giúp biết danh sách còn bao nhiêu việc.' },
            { title: 'Ước tính chi phí', desc: 'Nếu nguyên liệu có giá, app ước tính chi phí còn cần mua. Analytics dùng dữ liệu này để chỉ ra danh sách tốn nhất.' },
            { title: 'Cập nhật về kho', desc: 'Sau khi mua, cập nhật tồn kho để nguyên liệu mới được dùng trong gợi ý món, thực đơn và cảnh báo hạn dùng.' },
        ],
        tips: ['Tạo giỏ từ thực đơn theo khoảng ngày để chuẩn bị cả tuần.', 'Đặt ngày dự kiến mua để dashboard và analytics thấy tải mua sắm.', 'Giá nguyên liệu càng đầy đủ, dự toán càng hữu ích.'],
    },
    {
        key: 'meals',
        title: 'Thực đơn',
        subtitle: 'Lên lịch món theo ngày, buổi ăn, khẩu phần và mẫu dùng lại.',
        summary: 'Thực đơn giúp bạn nhìn kế hoạch nấu theo ngày và tạo giỏ mua cho nhiều bữa cùng lúc.',
        tone: '#1677ff',
        icon: <CalendarOutlined />,
        actionLabel: 'Mở thực đơn',
        actionPath: RootRoutes.AuthorizedRoutes.ScheduledMealRoutes.List(),
        steps: [
            { title: 'Chọn ngày', desc: 'Dùng nút ngày trước/sau hoặc Chọn ngày để mở lịch. Nhãn ngày ở giữa cho biết ngày đang xem.' },
            { title: 'Thêm bữa', desc: 'Chọn buổi sáng, trưa hoặc tối, thêm món và khẩu phần. Mỗi món có thể có số phần riêng.' },
            { title: 'Tạo từ mẫu', desc: 'Dùng nút Từ mẫu để áp dụng mẫu ngày hoặc mẫu tuần đã lưu, thay vì nhập lại các bữa thường dùng.' },
            { title: 'Tạo giỏ theo khoảng ngày', desc: 'Dùng Tạo giỏ để gom nguyên liệu từ nhiều ngày thực đơn thành một lịch mua sắm.' },
            { title: 'Sao chép thực đơn', desc: 'Copy thực đơn từ một ngày sang ngày khác khi bạn muốn lặp lại kế hoạch ăn.' },
        ],
        tips: ['Dùng khẩu phần đúng để shopping list tính lượng mua sát hơn.', 'Analytics dùng thực đơn 7 đến 14 ngày tới để phát hiện ngày quá tải.', 'Mẫu tuần phù hợp cho lịch ăn lặp lại.'],
    },
    {
        key: 'nutrition',
        title: 'Dinh dưỡng',
        subtitle: 'Thiết lập mục tiêu và tính tổng dinh dưỡng từ món, giỏ mua hoặc thực đơn.',
        summary: 'Trang Dinh dưỡng gồm danh sách mục tiêu nutrition và máy tính dinh dưỡng để kiểm tra tổng kcal, đạm, tinh bột, chất béo, chất xơ và các vi chất.',
        tone: '#7436dc',
        icon: <CalculatorOutlined />,
        actionLabel: 'Mở dinh dưỡng',
        actionPath: RootRoutes.AuthorizedRoutes.NutritionGoals(),
        steps: [
            { title: 'Xem mục tiêu nutrition', desc: 'Mỗi mục tiêu là một bộ tiêu chí theo khẩu phần, ví dụ kcal trong khoảng, đạm tối thiểu hoặc chất béo tối đa.' },
            { title: 'Tạo hoặc sửa mục tiêu', desc: 'Admin có thể thêm mục tiêu mới, chọn màu nhận diện và thêm nhiều tiêu chí dinh dưỡng.' },
            { title: 'Mở máy tính dinh dưỡng', desc: 'Từ card Máy tính dinh dưỡng, mở modal để chọn nguồn tính: món ăn, lịch mua sắm hoặc thực đơn.' },
            { title: 'Tính từ món ăn', desc: 'Chọn nhiều món và chỉnh khẩu phần từng món. Nếu chọn từ món, bạn có thể tạo ngay thực đơn hoặc lịch mua sắm từ lựa chọn đó.' },
            { title: 'Đọc kết quả', desc: 'Xem tổng quan dinh dưỡng, độ phủ dữ liệu, chi tiết lượt món, mục tiêu khớp nhất và bảng toàn bộ chỉ số.' },
        ],
        tips: ['Bổ sung nutrition cho nguyên liệu trước khi tin vào kết quả.', 'Độ phủ thấp nghĩa là còn nhiều nguyên liệu chưa có dữ liệu.', 'Mục tiêu nutrition cũng được dùng trong gợi ý món.'],
    },
    {
        key: 'analytics',
        title: 'Phân tích',
        subtitle: 'Dữ liệu ra quyết định cho nấu ăn, mua sắm, tồn kho và dinh dưỡng.',
        summary: 'Analytics không thay dashboard. Trang này tập trung vào câu hỏi nên xử lý gì trước và dữ liệu nào đang ảnh hưởng đến quyết định hằng ngày.',
        tone: '#531dab',
        icon: <BarChartOutlined />,
        actionLabel: 'Mở phân tích',
        actionPath: RootRoutes.AuthorizedRoutes.Analytics(),
        steps: [
            { title: 'Xem tín hiệu quyết định', desc: 'Phần đầu chỉ ra ngày bận nhất, danh sách mua tốn nhất, rủi ro hết hạn, cân bằng bữa và lỗ hổng nutrition.' },
            { title: 'Đọc tải chuẩn bị', desc: 'Biểu đồ 7 ngày cho biết ngày nào dồn cả thực đơn và mua sắm để bạn dời lịch hoặc chuẩn bị trước.' },
            { title: 'Kiểm tra tồn kho', desc: 'Độ phủ kho theo nhóm và rủi ro hết hạn giúp biết nhóm nào thiếu, nhóm nào nên dùng trước.' },
            { title: 'Kiểm tra ngân sách mua', desc: 'Áp lực ngân sách mua sắm dùng lịch mua đang mở, tiến độ tick và giá nguyên liệu để phát hiện giỏ cần rà soát.' },
            { title: 'Kiểm tra chất lượng dữ liệu', desc: 'Chất lượng dữ liệu món ăn và hồ sơ dinh dưỡng cho biết app đã đủ dữ liệu để gợi ý, tính nutrition và lập kế hoạch chính xác chưa.' },
        ],
        tips: ['Mở dấu hỏi ở từng section để xem dữ liệu được lấy từ đâu.', 'Analytics càng hữu ích khi có lịch mua, thực đơn, giá và nutrition.', 'Dùng xếp hạng món theo mục tiêu để chọn món phù hợp nhanh hơn.'],
    },
    {
        key: 'templates',
        title: 'Mẫu dùng lại',
        subtitle: 'Lưu những thực đơn và giỏ mua thường lặp lại.',
        summary: 'Mẫu giúp giảm thao tác nhập lại khi gia đình có lịch ăn hoặc danh sách mua sắm quen thuộc.',
        tone: '#13a8a8',
        icon: <AppstoreOutlined />,
        actionLabel: 'Mở mẫu',
        actionPath: RootRoutes.AuthorizedRoutes.Templates(),
        steps: [
            { title: 'Tạo mẫu thực đơn', desc: 'Lưu một ngày hoặc một tuần món ăn để áp dụng lại trong trang Thực đơn.' },
            { title: 'Tạo mẫu mua sắm', desc: 'Lưu danh sách nguyên liệu hoặc món thường mua cùng nhau để tạo lịch mua mới nhanh hơn.' },
            { title: 'Áp dụng mẫu trong thực đơn', desc: 'Trong Thực đơn, nhấn Từ mẫu, chọn mẫu ngày hoặc tuần, rồi áp dụng vào ngày đang xem.' },
            { title: 'Áp dụng mẫu trong mua sắm', desc: 'Trong Lịch mua sắm, chọn mẫu để tạo nhanh danh sách mới với dữ liệu đã lưu.' },
        ],
        tips: ['Mẫu tuần phù hợp cho meal prep.', 'Mẫu mua sắm phù hợp cho đồ khô hoặc nguyên liệu cơ bản.', 'Sửa mẫu khi thói quen ăn uống thay đổi.'],
    },
    {
        key: 'data',
        title: 'Dữ liệu và sao lưu',
        subtitle: 'Đồng bộ dữ liệu dùng chung, sao lưu cá nhân và kiểm tra sức khỏe dữ liệu.',
        summary: 'Ứng dụng là local-first: dữ liệu ở trình duyệt của bạn, có thêm luồng sync dữ liệu dùng chung và Gist backup cho dữ liệu cá nhân.',
        tone: '#0958d9',
        icon: <CloudUploadOutlined />,
        actionLabel: 'Mở sức khỏe dữ liệu',
        actionPath: RootRoutes.AuthorizedRoutes.SyncBackupHealth(),
        steps: [
            { title: 'Phân biệt dữ liệu', desc: 'Món ăn, nguyên liệu và cấu hình dùng chung thuộc shared data. Tồn kho, lịch mua, thực đơn và phiên nấu là dữ liệu cá nhân.' },
            { title: 'Đồng bộ dữ liệu dùng chung', desc: 'Khi có bản shared data mới, app sẽ hỏi trước khi cập nhật để tránh ghi đè ngoài ý muốn.' },
            { title: 'Cấu hình Gist backup', desc: 'Trong Dữ liệu và sao lưu, nhập Gist ID và GitHub token có quyền gist để sao lưu dữ liệu cá nhân.' },
            { title: 'Sao lưu và khôi phục', desc: 'Sao lưu đẩy dữ liệu cá nhân lên Gist. Khôi phục tải dữ liệu từ Gist về và thay dữ liệu cá nhân hiện tại.' },
            { title: 'Xem sức khỏe dữ liệu', desc: 'Trang Sức khỏe dữ liệu dùng icon y tế, hiển thị trạng thái sync, backup và các điểm cần kiểm tra.' },
        ],
        tips: ['Không chia sẻ token cá nhân.', 'Nên sao lưu trước khi đổi thiết bị.', 'Nếu dữ liệu trông cũ, kiểm tra trạng thái sync và backup trước.'],
    },
    {
        key: 'search',
        title: 'Tìm kiếm nhanh',
        subtitle: 'Tìm món, nguyên liệu và lịch mua sắm từ một cửa sổ chung.',
        summary: 'Tìm kiếm toàn cục giúp mở nhanh dữ liệu mà không cần nhớ dữ liệu nằm ở màn nào.',
        tone: '#eb2f96',
        icon: <SearchOutlined />,
        steps: [
            { title: 'Mở tìm kiếm', desc: 'Nhấn icon kính lúp ở thanh tiêu đề để mở màn hình tìm kiếm toàn trang.' },
            { title: 'Nhập từ khóa', desc: 'Nhập ít nhất 2 ký tự. Kết quả được nhóm theo món ăn, nguyên liệu và lịch mua sắm.' },
            { title: 'Tìm món theo nguyên liệu', desc: 'Nếu từ khóa khớp với nguyên liệu trong món, món đó cũng xuất hiện với chip nguyên liệu khớp.' },
            { title: 'Mở chi tiết', desc: 'Nhấn kết quả để mở chi tiết món, nguyên liệu hoặc lịch mua sắm liên quan.' },
            { title: 'Dùng lịch sử tìm kiếm', desc: 'Các từ khóa gần đây giúp tìm lại nhanh những thứ thường mở.' },
        ],
        tips: ['Tìm theo tên nguyên liệu khi không nhớ tên món.', 'Dùng tìm kiếm khi đang đi chợ để mở nhanh danh sách.', 'Từ khóa ngắn nên rõ nghĩa để kết quả ít nhiễu hơn.'],
    },
    {
        key: 'health',
        title: 'Kiểm tra dữ liệu',
        subtitle: 'Các điểm nên rà soát để app gợi ý và phân tích chính xác hơn.',
        summary: 'Kết quả tốt phụ thuộc vào dữ liệu đầu vào. Trang này gom các thói quen giúp app hoạt động ổn định hơn mỗi ngày.',
        tone: '#cf1322',
        icon: <MedicineBoxOutlined />,
        steps: [
            { title: 'Hoàn thiện món quan trọng', desc: 'Ưu tiên món nấu thường xuyên: nguyên liệu, khẩu phần, thời gian, bước nấu và trạng thái hoàn thiện.' },
            { title: 'Cập nhật tồn kho sau khi mua', desc: 'Tồn kho mới giúp gợi ý theo tủ lạnh, shopping list và cảnh báo hết hạn chính xác.' },
            { title: 'Bổ sung giá nguyên liệu', desc: 'Giá giúp app ước tính chi phí lịch mua và phân tích ngân sách.' },
            { title: 'Bổ sung nutrition', desc: 'Nutrition ở nguyên liệu giúp calculator, mục tiêu dinh dưỡng và gợi ý theo nutrition đáng tin hơn.' },
            { title: 'Theo dõi backup', desc: 'Nếu dùng nhiều thiết bị, kiểm tra backup để tránh mất dữ liệu cá nhân.' },
        ],
        tips: ['Không cần hoàn thiện mọi thứ một lúc.', 'Bắt đầu từ món và nguyên liệu dùng nhiều nhất.', 'Analytics có phần chất lượng dữ liệu để biết nên bổ sung gì trước.'],
    },
];

const GUIDE_FLOWS: GuideFlow[] = [
    {
        key: 'daily',
        label: 'Dùng hằng ngày',
        description: 'Mở app, chọn món, tạo giỏ và lên thực đơn nhanh.',
        pageKeys: ['start', 'suggestions', 'shopping', 'meals'],
        tone: '#7436dc',
        icon: <PlayCircleOutlined />,
    },
    {
        key: 'setup',
        label: 'Thiết lập dữ liệu',
        description: 'Hoàn thiện nguyên liệu, món ăn, giá, nutrition và backup.',
        pageKeys: ['ingredients', 'dishes', 'nutrition', 'data', 'health'],
        tone: '#389e0d',
        icon: <DatabaseOutlined />,
    },
    {
        key: 'plan',
        label: 'Lên kế hoạch tuần',
        description: 'Dùng thực đơn, mẫu, mua sắm và analytics để chuẩn bị cả tuần.',
        pageKeys: ['meals', 'templates', 'shopping', 'analytics'],
        tone: '#1677ff',
        icon: <CalendarOutlined />,
    },
    {
        key: 'nutrition-flow',
        label: 'Ăn theo mục tiêu',
        description: 'Tính dinh dưỡng, xem mục tiêu và chọn món phù hợp hơn.',
        pageKeys: ['nutrition', 'suggestions', 'analytics', 'health'],
        tone: '#d48806',
        icon: <CalculatorOutlined />,
    },
];

const GUIDE_PROGRESS_STORAGE_KEY = 'my-recipes-user-guide-progress-v1';

const TOUR_GUIDE_PAGE_KEYS = new Set(['start', 'ingredients', 'dishes', 'suggestions', 'shopping', 'meals']);

const getGuidePage = (key: string | null): GuidePage => GUIDE_PAGES.find(item => item.key === key) ?? GUIDE_PAGES[0];

const getGuideFlow = (key: string | null): GuideFlow => GUIDE_FLOWS.find(item => item.key === key) ?? GUIDE_FLOWS[0];

const getStepId = (pageKey: string, index: number) => `${pageKey}:${index}`;

const getPageStepIds = (page: GuidePage) => page.steps.map((_, index) => getStepId(page.key, index));

const getAllStepIds = () => GUIDE_PAGES.flatMap(getPageStepIds);

const readCompletedGuideSteps = (): string[] => {
    if (typeof window === 'undefined') return [];

    try {
        const raw = window.localStorage.getItem(GUIDE_PROGRESS_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
    } catch {
        return [];
    }
};

const writeCompletedGuideSteps = (ids: string[]) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(GUIDE_PROGRESS_STORAGE_KEY, JSON.stringify(ids));
};

const userGuideCss = `
.user-guide-layout {
    display: grid;
    grid-template-columns: minmax(min(260px, 100%), 0.78fr) minmax(0, 1.72fr);
    gap: 12px;
    align-items: start;
}
.user-guide-mobile-picker {
    display: none;
}
.user-guide-desktop-nav {
    display: block;
}
.user-guide-flow-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(142px, 1fr));
    gap: 8px;
}
.user-guide-progress-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 104px;
    gap: 10px;
    align-items: center;
}
.user-guide-flow-sequence {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(116px, 1fr));
    gap: 7px;
}
.user-guide-step-card {
    transition: border-color 140ms ease, background 140ms ease, transform 140ms ease;
}
.user-guide-step-card:active {
    transform: scale(0.995);
}
@media (max-width: 760px) {
    .user-guide-page {
        max-width: 100% !important;
        padding: 0 0 96px !important;
    }
    .user-guide-layout {
        display: flex;
        flex-direction: column;
        gap: 10px;
        width: 100%;
        min-width: 0;
    }
    .user-guide-desktop-nav {
        display: none;
    }
    .user-guide-mobile-picker {
        display: block;
        position: sticky;
        top: 0;
        z-index: 5;
    }
    .user-guide-hero,
    .user-guide-content-panel {
        box-shadow: 0 8px 18px rgba(74,48,130,0.07) !important;
    }
    .user-guide-content-header {
        flex-direction: column !important;
        align-items: stretch !important;
    }
    .user-guide-content-heading {
        align-items: flex-start !important;
    }
    .user-guide-action-wrap {
        width: 100%;
    }
    .user-guide-action-wrap button {
        width: 100%;
    }
    .user-guide-flow-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .user-guide-progress-grid {
        grid-template-columns: minmax(0, 1fr);
    }
}
@media (max-width: 420px) {
    .user-guide-flow-grid,
    .user-guide-flow-sequence {
        grid-template-columns: minmax(0, 1fr);
    }
    .user-guide-step-row {
        gap: 7px !important;
    }
    .user-guide-step-number {
        width: 24px !important;
        height: 24px !important;
    }
}
`;

export const UserGuideScreen: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const activePage = getGuidePage(searchParams.get('page'));
    const activeFlow = getGuideFlow(searchParams.get('flow'));
    const activeIndex = GUIDE_PAGES.findIndex(item => item.key === activePage.key);
    const [completedStepIds, setCompletedStepIds] = React.useState<string[]>(readCompletedGuideSteps);
    useScreenTitle({ value: 'Hướng dẫn', deps: [] });

    const completedStepSet = React.useMemo(() => new Set(completedStepIds), [completedStepIds]);
    const allStepIds = React.useMemo(() => getAllStepIds(), []);
    const activePageStepIds = React.useMemo(() => getPageStepIds(activePage), [activePage]);
    const activeFlowPages = React.useMemo(() => activeFlow.pageKeys.map(key => getGuidePage(key)), [activeFlow]);
    const activeFlowStepIds = React.useMemo(() => activeFlowPages.flatMap(getPageStepIds), [activeFlowPages]);
    const activeFlowTourKey = React.useMemo(() => activeFlow.pageKeys.find(key => TOUR_GUIDE_PAGE_KEYS.has(key)) ?? 'start', [activeFlow]);
    const activePageHasTour = TOUR_GUIDE_PAGE_KEYS.has(activePage.key);
    const completedActiveSteps = activePageStepIds.filter(id => completedStepSet.has(id)).length;
    const completedFlowSteps = activeFlowStepIds.filter(id => completedStepSet.has(id)).length;
    const activePagePercent = activePageStepIds.length > 0 ? Math.round(completedActiveSteps / activePageStepIds.length * 100) : 0;
    const activeFlowPercent = activeFlowStepIds.length > 0 ? Math.round(completedFlowSteps / activeFlowStepIds.length * 100) : 0;
    const overallPercent = allStepIds.length > 0 ? Math.round(completedStepIds.length / allStepIds.length * 100) : 0;

    const updateCompletedSteps = React.useCallback((ids: string[]) => {
        const validIds = new Set(allStepIds);
        const nextIds = Array.from(new Set(ids.filter(id => validIds.has(id))));
        setCompletedStepIds(nextIds);
        writeCompletedGuideSteps(nextIds);
    }, [allStepIds]);

    const selectPage = React.useCallback((key: string) => {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.set('page', key);
        nextParams.set('flow', activeFlow.key);
        setSearchParams(nextParams);
    }, [activeFlow.key, searchParams, setSearchParams]);

    const selectFlow = React.useCallback((key: string) => {
        const nextFlow = getGuideFlow(key);
        setSearchParams({ page: nextFlow.pageKeys[0], flow: nextFlow.key });
    }, [setSearchParams]);

    const toggleStep = React.useCallback((stepId: string) => {
        if (completedStepSet.has(stepId)) updateCompletedSteps(completedStepIds.filter(id => id !== stepId));
        else updateCompletedSteps([...completedStepIds, stepId]);
    }, [completedStepIds, completedStepSet, updateCompletedSteps]);

    const completeActivePage = React.useCallback(() => {
        updateCompletedSteps([...completedStepIds, ...activePageStepIds]);
    }, [activePageStepIds, completedStepIds, updateCompletedSteps]);

    const resetActivePage = React.useCallback(() => {
        const activeIds = new Set(activePageStepIds);
        updateCompletedSteps(completedStepIds.filter(id => !activeIds.has(id)));
    }, [activePageStepIds, completedStepIds, updateCompletedSteps]);

    const resetAllProgress = React.useCallback(() => {
        updateCompletedSteps([]);
    }, [updateCompletedSteps]);

    const openTour = React.useCallback((key: string) => {
        navigate(RootRoutes.AuthorizedRoutes.UserGuideTour({ item: key }));
    }, [navigate]);

    const previousPage = activeIndex > 0 ? GUIDE_PAGES[activeIndex - 1] : undefined;
    const nextPage = activeIndex < GUIDE_PAGES.length - 1 ? GUIDE_PAGES[activeIndex + 1] : undefined;

    return <Box data-testid='user-guide-page' className='user-guide-page' style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 0 14px', maxWidth: 1040, margin: '0 auto' }}>
        <style>{userGuideCss}</style>
        <Box className='user-guide-hero' style={{ borderRadius: 8, padding: 14, background: 'linear-gradient(135deg, #ffffff 0%, #f6fffb 48%, #fbf9ff 100%)', border: '1px solid rgba(116,54,220,0.12)', boxShadow: '0 12px 28px rgba(74,48,130,0.08)' }}>
            <Stack justify='space-between' align='flex-start' gap={12} wrap='wrap'>
                <div style={{ minWidth: 0 }}>
                    <Typography.Text style={{ display: 'block', color: '#7436dc', fontSize: 12, lineHeight: '16px', fontWeight: 750 }}>My Recipes</Typography.Text>
                    <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 22, lineHeight: '28px' }}>Hướng dẫn tương tác</Typography.Text>
                    <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '17px', marginTop: 3 }}>Chọn guide item, bắt đầu tour riêng và học bằng popup highlight trên màn hình mô phỏng.</Typography.Text>
                </div>
                <Stack align='center' gap={8} wrap='wrap' style={{ flexShrink: 0 }}>
                    <Button icon={<PlayCircleOutlined />} onClick={() => openTour('start')} style={{ borderRadius: 999, color: '#7436dc', borderColor: 'rgba(116,54,220,0.28)', fontWeight: 750 }}>Daily tour</Button>
                    <Tag color='purple' style={{ marginInlineEnd: 0 }}>{GUIDE_PAGES.length} trang</Tag>
                    <Tag color='green' style={{ marginInlineEnd: 0 }}>{completedStepIds.length}/{allStepIds.length} bước</Tag>
                </Stack>
            </Stack>
            <div className='user-guide-progress-grid' style={{ marginTop: 12 }}>
                <div style={{ minWidth: 0 }}>
                    <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 12, lineHeight: '16px', marginBottom: 5 }}>Tiến độ checklist đọc nhanh</Typography.Text>
                    <Progress percent={overallPercent} size='small' strokeColor='#7436dc' trailColor='rgba(116,54,220,0.12)' />
                </div>
                <Button icon={<ReloadOutlined />} onClick={resetAllProgress} disabled={completedStepIds.length === 0} style={{ borderRadius: 999, color: '#7436dc', borderColor: 'rgba(116,54,220,0.28)' }}>Làm lại</Button>
            </div>
        </Box>

        <Box style={{ border: `1px solid ${activeFlow.tone}22`, borderRadius: 8, background: '#fff', padding: 12, boxShadow: '0 10px 24px rgba(15,23,42,0.06)' }}>
            <Stack justify='space-between' align='flex-start' gap={10} style={{ marginBottom: 10 }}>
                <Stack align='center' gap={9} style={{ minWidth: 0 }}>
                    <span style={{ width: 34, height: 34, borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: activeFlow.tone, background: `${activeFlow.tone}12`, border: `1px solid ${activeFlow.tone}24`, flexShrink: 0 }}>{activeFlow.icon}</span>
                    <div style={{ minWidth: 0 }}>
                        <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 15, lineHeight: '20px' }}>{activeFlow.label}</Typography.Text>
                        <Typography.Text type='secondary' style={{ display: 'block', fontSize: 11, lineHeight: '15px', marginTop: 2 }}>{activeFlow.description}</Typography.Text>
                    </div>
                </Stack>
                <Stack align='center' gap={7} wrap='wrap' style={{ flexShrink: 0 }}>
                    <Tag color={activeFlowPercent === 100 ? 'green' : 'blue'} style={{ marginInlineEnd: 0 }}>{activeFlowPercent}%</Tag>
                    <Button size='small' icon={<PlayCircleOutlined />} onClick={() => openTour(activeFlowTourKey)} style={{ borderRadius: 999, color: activeFlow.tone, borderColor: `${activeFlow.tone}33` }}>Start tour</Button>
                </Stack>
            </Stack>
            <div className='user-guide-flow-grid'>
                {GUIDE_FLOWS.map(flow => {
                    const active = flow.key === activeFlow.key;
                    return <button key={flow.key} type='button' onClick={() => selectFlow(flow.key)} aria-pressed={active} style={{ minWidth: 0, border: `1px solid ${active ? flow.tone : 'rgba(116,54,220,0.10)'}`, borderRadius: 8, background: active ? `${flow.tone}10` : '#fff', padding: 10, textAlign: 'left', cursor: 'pointer' }}>
                        <Stack align='center' gap={8}>
                            <span style={{ width: 28, height: 28, borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: flow.tone, background: `${flow.tone}12`, border: `1px solid ${flow.tone}22`, flexShrink: 0 }}>{flow.icon}</span>
                            <div style={{ minWidth: 0 }}>
                                <Typography.Text strong style={{ display: 'block', color: active ? flow.tone : '#111827', fontSize: 12, lineHeight: '16px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{flow.label}</Typography.Text>
                                <Typography.Text type='secondary' style={{ display: 'block', fontSize: 10, lineHeight: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{flow.pageKeys.length} mục</Typography.Text>
                            </div>
                        </Stack>
                    </button>;
                })}
            </div>
            <div className='user-guide-flow-sequence' style={{ marginTop: 10 }}>
                {activeFlowPages.map((page, index) => {
                    const pageIds = getPageStepIds(page);
                    const doneCount = pageIds.filter(id => completedStepSet.has(id)).length;
                    const active = page.key === activePage.key;
                    return <button key={`${activeFlow.key}-${page.key}`} type='button' onClick={() => selectPage(page.key)} style={{ border: `1px solid ${active ? page.tone : `${page.tone}22`}`, borderRadius: 8, background: active ? `${page.tone}10` : '#fcfcfd', padding: '8px 9px', textAlign: 'left', cursor: 'pointer', minWidth: 0 }}>
                        <Stack justify='space-between' align='center' gap={7}>
                            <Stack align='center' gap={6} style={{ minWidth: 0 }}>
                                <span style={{ color: page.tone, flexShrink: 0 }}>{page.icon}</span>
                                <Typography.Text strong style={{ color: active ? page.tone : '#111827', fontSize: 11, lineHeight: '15px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{index + 1}. {page.title}</Typography.Text>
                            </Stack>
                            <Tag color={doneCount === pageIds.length ? 'green' : 'default'} style={{ marginInlineEnd: 0, flexShrink: 0 }}>{doneCount}/{pageIds.length}</Tag>
                        </Stack>
                    </button>;
                })}
            </div>
        </Box>

        <Box className='user-guide-mobile-picker' style={{ border: `1px solid ${activePage.tone}22`, borderRadius: 8, background: '#fff', padding: 10, boxShadow: '0 8px 18px rgba(15,23,42,0.08)' }}>
            <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 12, lineHeight: '16px', marginBottom: 6 }}>Trang hướng dẫn</Typography.Text>
            <select
                aria-label='Chọn trang hướng dẫn'
                value={activePage.key}
                onChange={event => selectPage(event.target.value)}
                style={{ width: '100%', height: 38, borderRadius: 8, border: `1px solid ${activePage.tone}33`, background: `${activePage.tone}08`, color: '#111827', fontSize: 13, fontWeight: 700, padding: '0 10px' }}
            >
                {GUIDE_PAGES.map((page, index) => <option key={page.key} value={page.key}>{index + 1}. {page.title}</option>)}
            </select>
        </Box>

        <div className='user-guide-layout'>
            <Box className='user-guide-desktop-nav' style={{ border: '1px solid rgba(116,54,220,0.12)', borderRadius: 8, background: '#fff', padding: 10, boxShadow: '0 10px 24px rgba(15,23,42,0.06)' }}>
                <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 13, lineHeight: '18px', marginBottom: 8 }}>Trang hướng dẫn</Typography.Text>
                <Stack direction='column' align='stretch' gap={7}>
                    {GUIDE_PAGES.map((page, index) => {
                        const active = page.key === activePage.key;
                        const pageStepIds = getPageStepIds(page);
                        const pageDoneCount = pageStepIds.filter(id => completedStepSet.has(id)).length;
                        return <button key={page.key} type='button' onClick={() => selectPage(page.key)} style={{ width: '100%', border: `1px solid ${active ? page.tone : 'rgba(116,54,220,0.10)'}`, borderRadius: 8, background: active ? `${page.tone}0f` : '#fff', padding: 9, textAlign: 'left', cursor: 'pointer' }}>
                            <Stack align='center' justify='space-between' gap={8}>
                                <Stack align='center' gap={8} style={{ minWidth: 0 }}>
                                <span style={{ width: 28, height: 28, borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: page.tone, background: `${page.tone}12`, border: `1px solid ${page.tone}22`, flexShrink: 0 }}>{page.icon}</span>
                                <div style={{ minWidth: 0 }}>
                                    <Typography.Text strong style={{ display: 'block', color: active ? page.tone : '#111827', fontSize: 12, lineHeight: '16px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{index + 1}. {page.title}</Typography.Text>
                                    <Typography.Text type='secondary' style={{ display: 'block', fontSize: 10, lineHeight: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{page.subtitle}</Typography.Text>
                                </div>
                                </Stack>
                                <Tag color={pageDoneCount === pageStepIds.length ? 'green' : 'default'} style={{ marginInlineEnd: 0, flexShrink: 0 }}>{pageDoneCount}/{pageStepIds.length}</Tag>
                            </Stack>
                        </button>;
                    })}
                </Stack>
            </Box>

            <Box className='user-guide-content-panel' style={{ border: `1px solid ${activePage.tone}22`, borderRadius: 8, background: '#fff', boxShadow: '0 12px 30px rgba(74,48,130,0.09)', overflow: 'hidden', width: '100%', minWidth: 0 }}>
                <div style={{ height: 5, background: `linear-gradient(90deg, ${activePage.tone} 0%, #13a8a8 100%)` }} />
                <div style={{ padding: 14 }}>
                    <Stack className='user-guide-content-header' justify='space-between' align='flex-start' gap={12} wrap='wrap' style={{ marginBottom: 12 }}>
                        <Stack className='user-guide-content-heading' align='flex-start' gap={10} style={{ minWidth: 0 }}>
                            <span style={{ width: 42, height: 42, borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: activePage.tone, background: `${activePage.tone}12`, border: `1px solid ${activePage.tone}24`, flexShrink: 0, fontSize: 18 }}>{activePage.icon}</span>
                            <div style={{ minWidth: 0 }}>
                                <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 20, lineHeight: '26px' }}>{activePage.title}</Typography.Text>
                                <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '17px', marginTop: 2 }}>{activePage.subtitle}</Typography.Text>
                            </div>
                        </Stack>
                        <div className='user-guide-action-wrap' style={{ flexShrink: 0 }}>
                            <Stack gap={7} wrap='wrap' justify='flex-end'>
                                {activePageHasTour && <Button type='primary' icon={<PlayCircleOutlined />} onClick={() => openTour(activePage.key)} style={{ borderRadius: 999, background: activePage.tone, borderColor: activePage.tone, fontWeight: 750 }}>Bắt đầu tour</Button>}
                                {activePage.actionPath && activePage.actionLabel && <Button onClick={() => navigate(activePage.actionPath!)} style={{ borderRadius: 999, color: activePage.tone, borderColor: `${activePage.tone}33`, fontWeight: 700 }}>{activePage.actionLabel}</Button>}
                            </Stack>
                        </div>
                    </Stack>

                    <Box style={{ border: `1px solid ${activePage.tone}18`, borderRadius: 8, background: `${activePage.tone}08`, padding: 11, marginBottom: 12 }}>
                        <Stack justify='space-between' align='flex-start' gap={10} style={{ marginBottom: 9 }}>
                            <Typography.Text style={{ display: 'block', color: '#2f2545', fontSize: 12, lineHeight: '18px', flex: 1 }}>{activePage.summary}</Typography.Text>
                            <Tag color={activePagePercent === 100 ? 'green' : 'purple'} style={{ marginInlineEnd: 0, flexShrink: 0 }}>{completedActiveSteps}/{activePageStepIds.length}</Tag>
                        </Stack>
                        <Progress percent={activePagePercent} size='small' strokeColor={activePage.tone} trailColor={`${activePage.tone}18`} />
                    </Box>

                    <Stack justify='space-between' align='center' gap={8} wrap='wrap' style={{ marginBottom: 10 }}>
                        <Typography.Text strong style={{ color: '#111827', fontSize: 13, lineHeight: '18px' }}>Checklist đọc nhanh</Typography.Text>
                        <Stack gap={6} wrap='wrap' justify='flex-end'>
                            <Button size='small' disabled={activePagePercent === 100} onClick={completeActivePage} style={{ borderRadius: 999, color: activePage.tone, borderColor: `${activePage.tone}33` }}>Xong trang</Button>
                            <Button size='small' disabled={completedActiveSteps === 0} onClick={resetActivePage} style={{ borderRadius: 999 }}>Làm lại trang</Button>
                        </Stack>
                    </Stack>

                    <Stack direction='column' align='stretch' gap={9}>
                        {activePage.steps.map((step, index) => {
                            const stepId = getStepId(activePage.key, index);
                            const completed = completedStepSet.has(stepId);
                            return <button
                                key={`${activePage.key}-${step.title}`}
                                type='button'
                                className='user-guide-step-card'
                                aria-pressed={completed}
                                onClick={() => toggleStep(stepId)}
                                style={{ width: '100%', border: `1px solid ${completed ? `${activePage.tone}44` : '#eef2f7'}`, borderRadius: 8, background: completed ? `${activePage.tone}0f` : '#fcfcfd', padding: 10, textAlign: 'left', cursor: 'pointer' }}
                            >
                                <Stack className='user-guide-step-row' align='flex-start' gap={9}>
                                    <span className='user-guide-step-number' style={{ width: 26, height: 26, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: completed ? activePage.tone : '#fff', background: completed ? '#fff' : activePage.tone, border: completed ? `1px solid ${activePage.tone}44` : 'none', fontSize: 12, lineHeight: '16px', fontWeight: 800, flexShrink: 0 }}>
                                        {completed ? <CheckCircleOutlined /> : index + 1}
                                    </span>
                                    <div style={{ minWidth: 0 }}>
                                        <Typography.Text strong style={{ display: 'block', color: completed ? activePage.tone : '#111827', fontSize: 13, lineHeight: '18px' }}>{step.title}</Typography.Text>
                                        <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '17px', marginTop: 2 }}>{step.desc}</Typography.Text>
                                        {step.note && <Typography.Text style={{ display: 'block', color: activePage.tone, fontSize: 11, lineHeight: '15px', marginTop: 4, fontWeight: 700 }}>{step.note}</Typography.Text>}
                                    </div>
                                </Stack>
                            </button>;
                        })}
                    </Stack>

                    <Box style={{ border: '1px solid rgba(116,54,220,0.10)', borderRadius: 8, background: '#fbf9ff', padding: 11, marginTop: 12 }}>
                        <Typography.Text strong style={{ display: 'block', color: '#111827', fontSize: 13, lineHeight: '18px', marginBottom: 7 }}>Mẹo dùng tốt hơn</Typography.Text>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(210px, 100%), 1fr))', gap: 7 }}>
                            {activePage.tips.map(tip => <Stack key={tip} align='flex-start' gap={7} style={{ border: '1px solid #f0edf8', borderRadius: 8, background: '#fff', padding: 8 }}>
                                <CheckCircleOutlined style={{ color: activePage.tone, marginTop: 2, flexShrink: 0 }} />
                                <Typography.Text type='secondary' style={{ fontSize: 11, lineHeight: '16px' }}>{tip}</Typography.Text>
                            </Stack>)}
                        </div>
                    </Box>

                    <Stack justify='space-between' align='center' gap={8} wrap='wrap' style={{ marginTop: 12 }}>
                        <Button disabled={!previousPage} onClick={() => previousPage && selectPage(previousPage.key)} style={{ borderRadius: 999 }}>Trang trước</Button>
                        <Typography.Text type='secondary' style={{ fontSize: 11 }}>{activeIndex + 1}/{GUIDE_PAGES.length}</Typography.Text>
                        <Button disabled={!nextPage} onClick={() => nextPage && selectPage(nextPage.key)} style={{ borderRadius: 999 }}>Trang sau</Button>
                    </Stack>
                </div>
            </Box>
        </div>
    </Box>;
};
