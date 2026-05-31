# 📖 Hướng dẫn sử dụng My Recipes

## Mục lục
1. [Tổng quan](#tổng-quan)
2. [Vai trò người dùng](#vai-trò-người-dùng)
3. [Nguyên liệu & Tồn kho](#nguyên-liệu--tồn-kho)
4. [Món ăn](#món-ăn)
5. [Lịch mua sắm](#lịch-mua-sắm)
6. [Thực đơn](#thực-đơn)
7. [Nấu ăn](#nấu-ăn)
8. [Đồng bộ dữ liệu dùng chung](#đồng-bộ-dữ-liệu-dùng-chung)
9. [Sao lưu dữ liệu cá nhân (Gist)](#sao-lưu-dữ-liệu-cá-nhân-gist)
10. [Xuất bản dữ liệu (Admin)](#xuất-bản-dữ-liệu-admin)
11. [Dữ liệu được lưu ở đâu?](#dữ-liệu-được-lưu-ở-đâu)

---

## Tổng quan

**My Recipes** là ứng dụng quản lý công thức nấu ăn hoạt động hoàn toàn offline (PWA). Dữ liệu được chia thành hai phần:

| Loại | Nội dung | Ai quản lý? |
|---|---|---|
| **Dùng chung** | Nguyên liệu, Món ăn | Admin xuất bản, mọi người đồng bộ |
| **Cá nhân** | Tồn kho, Lịch mua sắm, Thực đơn, Lịch sử nấu | Mỗi thiết bị lưu riêng |

---

## Vai trò người dùng

### 👤 Người dùng thường
- Xem danh sách nguyên liệu và món ăn
- Bắt đầu nấu, hoàn thành nấu, khấu trừ tồn kho
- Tạo và quản lý lịch mua sắm, thực đơn
- Đồng bộ dữ liệu dùng chung khi có cập nhật mới

### 🔐 Admin
Để mở quyền admin:
1. Mở **Menu** (≡) góc trên trái
2. Nhấn **"Mở quyền admin"**
3. Nhập mã PIN → **Xác nhận**

Khi là admin, bạn có thêm quyền:
- Thêm / sửa / xoá nguyên liệu và món ăn
- Xuất bản dữ liệu dùng chung lên GitHub
- Sao lưu toàn bộ dữ liệu lên GitHub (legacy backup)

Để khoá lại: nhấn **"Khoá quyền admin"** trong menu.

---

## Nguyên liệu & Tồn kho

### Xem danh sách nguyên liệu
- Vào tab **Nguyên liệu** hoặc chọn từ menu bên trái
- Tìm kiếm theo tên bằng thanh tìm kiếm phía trên

### Thêm / Sửa / Xoá nguyên liệu *(chỉ Admin)*
- **Thêm**: nhấn nút **＋** góc trên phải
- **Sửa**: nhấn icon ✏️ bên cạnh nguyên liệu
- **Xoá**: nhấn icon 🗑️ → xác nhận

### Cập nhật tồn kho
Mọi người dùng đều có thể cập nhật tồn kho của thiết bị mình:
1. Nhấn vào **badge tồn kho** (ví dụ: `500 g`) bên cạnh tên nguyên liệu
2. Nhập số lượng và đơn vị → **Lưu**

Badge màu:
- 🟢 Xanh lá: còn nhiều
- 🟡 Vàng: sắp hết (≤ 2)
- 🔴 Đỏ: hết hàng
- ⚪ Xám: chưa cập nhật

---

## Món ăn

### Xem danh sách món ăn
- Vào tab **Món ăn** (icon mì)
- Lọc theo thẻ (tag) bằng cách nhấn các tag bên dưới thanh tìm kiếm
- Nhấn vào ảnh hoặc tên món để xem chi tiết nguyên liệu và các bước thực hiện

### Thêm / Sửa / Xoá món ăn *(chỉ Admin)*
- **Thêm**: nhấn **＋**
- **Sửa / Xoá / Nhân bản**: nhấn icon ⋮ (HolderOutlined) bên phải → chọn hành động

### Bắt đầu nấu
1. Nhấn icon ⋮ → **"Bắt đầu nấu"** 🔥
2. Chọn số khẩu phần → **Bắt đầu**
3. Một **pill cam** sẽ xuất hiện ở đáy màn hình khi đang nấu

---

## Lịch mua sắm

### Tạo lịch mua sắm
1. Vào tab **Mua sắm**
2. Nhấn **＋** → đặt tên, chọn ngày dự kiến
3. Thêm món ăn hoặc nguyên liệu thủ công vào danh sách

### Sử dụng danh sách
- Tick vào từng nguyên liệu khi đã mua xong
- Danh sách tự động gom nhóm nguyên liệu theo loại
- Số lượng trong tồn kho hiện tại được hiển thị bên cạnh để so sánh

---

## Thực đơn

### Tạo thực đơn
1. Vào tab **Thực đơn**
2. Nhấn **＋** → đặt tên, chọn ngày
3. Thêm món ăn vào buổi **Sáng / Trưa / Tối**

### Chọn nhiều thực đơn
- Nhấn giữ (hoặc nhấn icon chọn) trên một thực đơn để vào chế độ chọn nhiều
- Khi đã chọn ít nhất 1 thực đơn, **FloatButton** xuất hiện ở góc dưới phải:
  - 🛒 **Tạo lịch mua sắm** từ các thực đơn đã chọn
  - 🧹 **Bỏ chọn tất cả**

---

## Nấu ăn

### Bắt đầu một phiên nấu
1. Vào **Món ăn** → nhấn **⋮** → **"Bắt đầu nấu"**
2. Nhập số khẩu phần → **Bắt đầu**

### Theo dõi đang nấu
- **Pill cam** hiển thị tên món đang nấu ở đáy màn hình
- Nếu có nhiều món đang nấu cùng lúc: pill hiển thị `(+N)`

### Hoàn thành nấu
1. Nhấn vào **pill cam**
2. Xem danh sách nguyên liệu sẽ bị khấu trừ
3. Nhấn **"Hoàn thành"** → tồn kho được cập nhật tự động

---

## Đồng bộ dữ liệu dùng chung

Khi admin xuất bản dữ liệu mới (nguyên liệu / món ăn), bạn sẽ nhận được thông báo **tự động khi mở app** (kiểm tra mỗi ngày 1 lần khi có mạng).

### Cửa sổ đồng bộ
- Hiển thị danh sách thay đổi: **Mới** 🟢 / **Thay đổi** 🔵 / **Đã xoá** 🔴
- Mặc định: mục mới và thay đổi được chọn sẵn, mục xoá bỏ chọn
- ⚠️ **Cảnh báo tác động**: nếu một món ăn bị xoá/thay đổi đang được dùng trong lịch mua sắm hoặc thực đơn của bạn, cảnh báo màu vàng sẽ xuất hiện

### Cách đồng bộ thủ công
1. Mở **Menu** → nhấn **"Đồng bộ ngay"**

### Cách đồng bộ có chọn lọc
1. Khi cửa sổ đồng bộ xuất hiện, bỏ tick các mục bạn **không** muốn cập nhật
2. Nhấn **"Đồng bộ (N)"** để áp dụng
3. Nhấn **"Để sau"** để nhắc lại vào lần mở app tiếp theo

---

## Sao lưu dữ liệu cá nhân (Gist)

Tính năng này cho phép bạn sao lưu **dữ liệu cá nhân** (tồn kho, lịch mua sắm, thực đơn) vào **GitHub Gist** của riêng bạn — hữu ích khi đổi thiết bị hoặc xoá bộ nhớ.

### Thiết lập
1. Mở **Menu** → mục **"Sao lưu cá nhân (Gist)"** (nhấn để mở rộng)
2. Nhập **Gist ID**: ID của Gist bạn đã tạo sẵn trên GitHub
3. Nhập **GitHub Personal Access Token** (PAT): cần quyền `gist`
4. Nhấn **"Lưu cấu hình"**

> **Tạo PAT**: GitHub → Settings → Developer settings → Personal access tokens → Generate new token → chọn scope `gist`
>
> **Tạo Gist**: [gist.github.com](https://gist.github.com) → tạo một Gist mới (public hoặc secret đều được) → lấy ID từ URL

### Sao lưu
- Nhấn **"Sao lưu"** 🔼 → dữ liệu cá nhân được đẩy lên Gist dưới tên file `my-recipes-personal.json`

### Khôi phục
- Nhấn **"Khôi phục"** 🔽 → dữ liệu được kéo từ Gist và ghi đè lên thiết bị → app tự tải lại

> ⚠️ Khôi phục sẽ **ghi đè toàn bộ** dữ liệu cá nhân hiện tại trên thiết bị.

---

## Xuất bản dữ liệu (Admin)

Tính năng này cho phép admin cập nhật danh sách nguyên liệu và món ăn cho tất cả người dùng.

### Quy trình
1. Thêm / sửa / xoá nguyên liệu và món ăn theo ý muốn
2. Mở **Menu** → nhấn **"Xuất bản dữ liệu dùng chung"** 🟢
3. App tự động:
   - So sánh dữ liệu hiện tại với lần xuất bản trước
   - Tạo danh sách thay đổi (thêm / sửa / xoá từng mục)
   - Đẩy `shared-data.json` và `shared-manifest.json` lên nhánh `main` của repository

### Lần xuất bản tiếp theo
- Chỉ những mục **thực sự thay đổi** mới được ghi nhận trong manifest
- Người dùng sẽ chỉ thấy thông báo khi có thay đổi mới so với lần họ đã đồng bộ

---

## Dữ liệu được lưu ở đâu?

| Khoá localStorage | Nội dung |
|---|---|
| `persist:shared` | Nguyên liệu + Món ăn (dữ liệu dùng chung) |
| `persist:personal` | Tồn kho, Lịch mua sắm, Thực đơn, Lịch sử nấu |
| `shared_last_checked` | Thời điểm kiểm tra cập nhật gần nhất |
| `shared_synced_versions` | Phiên bản dữ liệu dùng chung đã đồng bộ |
| `personal_gist_id` | Gist ID cấu hình sao lưu cá nhân |
| `personal_gist_token` | GitHub PAT cấu hình sao lưu cá nhân |

> App hoạt động hoàn toàn **offline**. Dữ liệu chỉ rời thiết bị khi bạn chủ động nhấn **Sao lưu** hoặc **Xuất bản**.
