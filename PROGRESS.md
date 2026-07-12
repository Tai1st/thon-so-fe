# Tiến độ triển khai FE — `cong-thong-tin-thon-fe`

Theo lộ trình mục 11 của `du-an-quan-ly-thon.md` (`E:\Dev\cong-thong-tin-thon`). File này chỉ theo dõi phần **FE (Next.js)**. Xem tiến độ BE tại `E:\Dev\cong-thong-tin-thon-be\PROGRESS.md`.

## Giai đoạn 1 — Middleware phân giải tenant theo subdomain ✅

- [x] `middleware.ts` (root) — đọc header `Host`, tách subdomain, set header `x-tenant-slug` cho request (không query gì trong middleware — Edge runtime không phù hợp gọi API BE ở đây).
- [x] `src/lib/tenant.ts` — `getCurrentTenantSlug()` đọc `x-tenant-slug` từ `headers()` phía Server Component.
- [x] `src/lib/api.ts` — `apiFetch(path, { auth, tenant })` gọi BE, tự đính `x-tenant-slug` + cookie JWT.
- [x] Domain gốc (không có subdomain thôn) → render trang danh mục công khai (`DirectoryClient`) thay vì lỗi "không tìm thấy thôn".

## Giai đoạn 2 — Dashboard Cư dân (role đầu tiên) ✅

- [x] Trang đăng nhập (`/login`) gọi `POST /auth/login`, lưu JWT cookie `httpOnly`.
- [x] Dashboard cư dân: thông tin hộ khẩu (`/households/me`), form gửi yêu cầu sửa/thêm thành viên (đủ trường: `fatherName`, `motherName`, `group`, `permanentAddress`, `temporaryAddress`, validate CCCD 12 số / SĐT 10 số / giới tính bắt buộc).
- [x] `family-gps-map.tsx` — bản đồ Leaflet định vị GPS hộ gia đình riêng (housePinIcon gốc, dùng lại thiết kế cho marker hộ trên bản đồ danh mục công khai).
- [x] Trang chủ nội dung thôn (`home-content`, ban lãnh đạo/tổ ANTT động theo BE).
- [x] **Quỹ Thôn** (`contributions-tab.tsx`) — công khai Thu/Chi toàn thôn (`GET /households/village-fund`), sổ theo dõi đóng góp nghĩa vụ của hộ (`fundObligations` trong `GET /households/me`), thanh toán qua VietQR thật (`src/lib/vietqr.ts` — bảng mã BIN + `buildVietQrUrl`, khớp `img.vietqr.io`), xác nhận chuyển khoản chuyển trạng thái sang "Chờ duyệt" (`PATCH /households/me/fund-obligations/:id/pay`).
- [x] **Báo An Ninh Trật Tự** (`incident-tab.tsx`) — form gửi tin báo kèm định vị GPS tùy chọn (`POST /incident-reports`), bảng lịch sử tin báo đã gửi của hộ (`GET /incident-reports/mine`).
- [x] **Đăng Ký Lưu Trú** (`residence-tab.tsx`) — form đăng ký tạm trú cho khách/người thân (`POST /residence-registrations`), bảng đăng ký của hộ (`GET /residence-registrations/mine`).
- [x] **Dashboard Trưởng thôn** (role thứ 2) — `village-head-portal.tsx`. `dashboard/page.tsx` rẽ nhánh riêng theo `me.role === 'village-head'`, preload `GET /village-head/residents` + `GET /village-head/village-fund` song song, KHÔNG tái dùng layout `ResidentPortal` (khác bộ tab, khác thẻ thông tin sidebar — "Tổng Quan Thôn" thay vì "Thông Tin Hộ Gia Đình").
  - `village-head-residents-tab.tsx` ("Quản lý Toàn Thôn") — bảng danh bạ toàn thôn có ô tìm kiếm, modal sửa trực tiếp (`PATCH village-head/residents/:id`, KHÔNG qua duyệt — khác `FamilyTab` của Cư dân), modal đệ trình xóa (`POST village-head/delete-requests`, nút "Yêu cầu xóa" tự khóa thành badge "Chờ duyệt" nếu hộ đã có yêu cầu đang chờ — chặn gửi trùng), modal xem/cập nhật vị trí GPS của BẤT KỲ hộ nào trong thôn (tái dùng nguyên `FamilyGpsMap` đã build cho Cư dân, vì cùng cần vẽ ranh giới tenant + 1 marker).
  - `village-head-fund-tab.tsx` ("Quản lý Quỹ Thôn") — 3 thẻ Thu/Chi/Số dư, form cập nhật tài khoản ngân hàng, bảng "chờ duyệt thanh toán" với 2 nút Duyệt/Từ chối (nối tiếp trực tiếp luồng "Đóng Qua QR" của tab Quỹ Thôn bên Cư dân), form tạo khoản thu mới áp dụng toàn thôn + bảng danh sách khoản thu (sửa/xóa), form ghi nhận thu/chi thủ công (Thu: chọn hộ + tick khoản áp dụng, tự tính tổng; Chi: nhập tay), sổ sách giao dịch (toggle Thu/Chi, xóa từng dòng), bảng hộ chưa đóng đủ quỹ (tính động từ dữ liệu thật, không phải danh sách tĩnh từ seed).
  - Thêm `DELETE` vào proxy `src/app/api/backend/[...path]/route.ts` và `clientApi()` (`src/lib/client-api.ts`) — trước đó chỉ có GET/POST/PATCH, cần cho xóa khoản thu/giao dịch quỹ thôn.
  - Đăng nhập demo: username `066070001234` / mật khẩu `doanket` (tài khoản "Trưởng thôn" thật trong dữ liệu seed).
  - Đã kiểm thử Puppeteer end-to-end: duyệt thanh toán chờ xử lý, tạo khoản thu mới, sửa nhân khẩu trực tiếp, gửi yêu cầu xóa (badge "Chờ duyệt" hiện đúng), xem vị trí GPS hộ bất kỳ trên bản đồ thật.
  - **Nhóm tab "Hộ gia đình của tôi"** — Trưởng thôn cũng là 1 cư dân có hộ gia đình thật trong thôn, nên sidebar có thêm nhóm tab thứ 2 y hệt Cư dân (Tổng quan/Thành viên & GPS/Quỹ Thôn hộ mình/Báo ANTT/Đăng ký lưu trú), tái dùng NGUYÊN `OverviewTab`/`FamilyTab`/`ContributionsTab`/`IncidentTab`/`ResidenceTab` đã build cho `ResidentPortal` (component nhận props thuần, không phụ thuộc `ResidentPortal`). `dashboard/page.tsx` có hàm dùng chung `fetchOwnHouseholdData()` (gọi 8 endpoint `/households/me` v.v., trả `null` nếu tài khoản chưa gắn `residentId` thay vì lỗi) — dùng cho cả nhánh `resident` và `village-head`. Nhóm tab này chỉ hiện khi `ownHousehold !== null`.
- [x] **Dashboard Admin** (role thứ 3) — `admin-portal.tsx`, `dashboard/page.tsx` rẽ nhánh `me.role === 'admin'`, preload song song 5 endpoint (`admin/requests/pending`, `admin/accounts`, `admin/permissions`, `admin/home-content`, `admin/logs`). 5 tab riêng, sidebar hiện badge đỏ số yêu cầu đang chờ duyệt:
  - `admin-requests-tab.tsx` ("Duyệt Yêu Cầu") — 3 bảng trong cùng 1 trang (xóa nhân khẩu/sửa thông tin/thêm thành viên), mỗi dòng có nút Duyệt/Từ chối riêng, bảng "sửa thông tin" hiện diff từng trường thay đổi (label cũ → mới, chỉ hiện field thực sự đổi).
  - `admin-accounts-tab.tsx` ("Quản lý Tài khoản") — bảng toàn bộ tài khoản kèm số cư dân chưa có tài khoản, nút "Đồng bộ tài khoản toàn bộ cư dân", modal sửa (đổi vai trò/chức vụ/hội phụ trách — chặn đổi vai trò của Admin), nút Reset Pass (hash lại mật khẩu mặc định thật, không phải giả lập) và Khóa/Mở tài khoản (chặn khóa Admin).
  - `admin-permissions-tab.tsx` ("Cấu hình Phân quyền") — bảng ma trận 5 role × 4 trường dữ liệu, mỗi ô là 1 dropdown Xem/Xem & Sửa/Khóa quyền, lưu ngay khi đổi (không cần nút Lưu riêng).
  - `admin-home-content-tab.tsx` ("Quản lý Trang chủ") — form đường dây nóng ANTT + 5 khối CRUD riêng (Tin tức, Sản phẩm, Lịch sự kiện, Chỉ số thống kê, Thư viện ảnh), mỗi khối có nút thêm mới + modal sửa (trừ Thư viện ảnh chỉ thêm/xóa, khớp hành vi bản mẫu) + nút xóa 2 lần bấm để xác nhận.
  - `admin-logs-tab.tsx` ("Nhật ký Hệ thống") — bảng đọc `AuditLog`, nút "Làm mới" tự gọi lại API (không tự động poll).
  - Route mới `PUT` được thêm vào proxy `src/app/api/backend/[...path]/route.ts` và `clientApi()` — cần cho `PUT /admin/home-content/security`.
  - Đăng nhập demo: username `admin` / mật khẩu `doanket`.
  - Đã kiểm thử Puppeteer end-to-end: duyệt yêu cầu xóa nhân khẩu (bảng tự rỗng sau khi duyệt), nhật ký ghi lại đúng hành động vừa làm sau khi bấm "Làm mới", đăng tin tức mới xuất hiện ngay trong danh sách.
- [ ] 2 dashboard role còn lại (association-officer/security-team) — Cán bộ Hội (quản lý hội viên/quỹ hội/vay vốn), Tổ ANTT (duyệt tin báo/lưu trú, danh bạ, biên bản) — chưa làm.
- [x] **Chuẩn responsive cho MỌI bảng nhiều cột trong dashboard** — áp dụng đồng loạt cho cả 10 file có `<table>` (Cư dân: `contributions-tab`/`family-tab`/`incident-tab`/`residence-tab`; Trưởng thôn: `village-head-residents-tab`/`village-head-fund-tab` — 4 bảng; Admin: `admin-requests-tab` — 3 bảng/`admin-accounts-tab`/`admin-permissions-tab`/`admin-logs-tab`):
  - Bọc mỗi bảng bằng `<div class="table-scroll-wrap">` (không cuộn, chỉ để đặt fade-hint) → `<div class="table-scroll">` (`overflow-x: auto`, cuộn thật) → `<table>` — KHÔNG đặt `overflow-x` thẳng lên `<table>`. 2 class CSS này định nghĩa trong `globals.css`.
  - `<table>` có `min-w-*` tổng (Tailwind scale, vd `min-w-105`/`min-w-175`/`min-w-225`) + mỗi `<th>`/`<td>` có `min-w-*` riêng + `whitespace-nowrap` — cột không tự co ép khi thiếu chỗ, phải cuộn ngang thay vì ép chữ khó đọc. Cột nội dung dài tự nhiên nhiều dòng (vd "Thay đổi đề nghị" ở `admin-requests-tab`, "Chi tiết" ở `admin-logs-tab`) CỐ Ý không đặt `whitespace-nowrap` để không bị 1 dòng quá dài.
  - Cuộn CẢ BẢNG như 1 khối kể cả header (không dùng sticky column cho cột đầu/cột cuối) — quyết định của user sau khi thử qua, tránh cảm giác "chỉ phần giữa cuộn được còn 2 biên đứng yên".
  - Fade-hint mờ mép phải (`.table-scroll-wrap::after`) gợi ý còn nội dung để cuộn tiếp — cố định theo khung nhìn, không cần JS theo dõi `scrollLeft`.
  - Cột "Thao tác" có từ 3 nút trở lên (`village-head-residents-tab`, `admin-accounts-tab`) — component dùng chung `table-actions-menu.tsx` (`<TableActionsMenu actions={[...]} />`): desktop vẫn hiện đủ nút trên 1 hàng (`hidden sm:flex`), mobile gộp thành menu 3 chấm (`sm:hidden`, tự đóng khi click ra ngoài). Cột có 1-2 nút giữ nguyên hiện inline luôn, không cần menu.
  - Test bằng Puppeteer: cuộn `.table-scroll` bằng `scrollLeft` xác nhận header+body di chuyển cùng lúc (390px và 1440px viewport), xác nhận kebab menu chỉ hiện đúng cột cuối sau khi cuộn tới, không vỡ layout header/body.

## Giai đoạn 3 — Superadmin (FE) ✅

- [x] `/superadmin/login`, danh sách tenant (`/superadmin/tenants`) kèm số tài khoản/nhân khẩu, tạo tenant mới, khóa/mở tenant.
- [x] Nhập KMZ theo Xã — form upload, xem danh sách thôn đã tách từ Placemark, bấm 1 thôn để tạo tenant trực tiếp từ thôn đó (không cần nhập tay tọa độ/ranh giới).
- [x] Gán/bỏ gán Xã-Thôn cho tenant đã có sẵn — chọn thôn trên bản đồ (không bắt buộc phải tạo tenant mới mới gán được).

## Giai đoạn 4 — Trang danh mục công khai (`/` ở domain gốc) ✅

Trang này hiển thị bản đồ tất cả thôn của **1 xã** (xã mới nhất — nếu superadmin quản lý nhiều xã, trang chỉ hiện xã gần nhất được tạo, không xếp chồng nhiều xã), khớp đúng phong cách trực quan/hành vi của bản mẫu gốc `tra-cuu.html`.

- [x] `src/app/page.tsx` — domain gốc gọi song song `GET /communes/public` + `GET /administrative-units`, render `<DirectoryClient>`.
- [x] `directory-client.tsx` — ô tìm kiếm có gợi ý trực tiếp, panel "Chi tiết"/"Danh sách" theo màu thương hiệu bản gốc (`#9c3000`), danh sách thôn có số thứ tự, `goToTenant(slug)` điều hướng sang subdomain thôn (không hardcode domain gốc — dùng `window.location.host`).
- [x] `directory-leaflet.tsx` — bản đồ Leaflet client-only (`next/dynamic(ssr:false)`):
  - **Bảng màu đúng bản gốc**: 12 màu rút trực tiếp từ `REGIONS[].color` trong `tra-cuu.html` (không băm ngẫu nhiên), gán tuần tự theo thứ tự thôn, lặp lại mỗi 12 thôn — áp dụng cho MỌI thôn kể cả thôn chưa có cổng thông tin số (chưa gán tenant).
  - **Hiệu ứng viền chạy khi chọn thôn** (`.directory-village-selected` trong `globals.css`, khớp `.area-border-selected` bản gốc): `stroke-dasharray` + `@keyframes` chạy, giữ nguyên màu nền riêng của thôn (không đổi sang màu highlight khác). Áp dụng qua `poly.getElement()?.classList.toggle(...)` vì Leaflet chỉ đọc option `className` lúc tạo layer, không phản ứng với `setStyle()` sau đó.
  - **Nhãn tên thôn không nền trắng**: tooltip `permanent` với `className: 'directory-area-label'`, CSS xóa nền/viền/box-shadow mặc định của Leaflet tooltip, chỉ giữ chữ với text-shadow viền trắng 4 hướng.
  - **Font đúng bản gốc**: `.leaflet-container { font-family: var(--font-sans) !important; }` — Leaflet tự ép font riêng, phải ghi đè (đúng vướng mắc mà chính `tra-cuu.html` cũng từng gặp và tự sửa).
  - **Marker hộ gia đình có tên hộ thật** (không phải tên thôn/tenant chung chung) — BE trả `households: {lat,lng,name}[]`, tooltip hiện đúng tên chủ hộ.
  - **Marker trụ sở cơ quan nhà nước** — pin xanh dương, ảnh/logo riêng từng cơ quan nhúng qua SVG `<clipPath>`+`<image>` (lấy từ `AdministrativeUnit.logoUrl` qua `GET /administrative-units`), lùi về icon tòa nhà chung nếu đơn vị không có logo.
  - **Chọn loại bản đồ**: `L.control.layers` 3 lớp nền — Bản đồ (OSM) / Vệ tinh (Esri World Imagery) / Địa hình (OpenTopoMap).
  - **Bật/tắt lớp Cư dân và Cơ quan nhà nước độc lập** — 2 `L.layerGroup()` riêng, điều khiển qua 2 nút bấm rõ ràng ngay dưới ô tìm kiếm (không chỉ ẩn trong control góc bản đồ), không cần build lại bản đồ khi bật/tắt.
  - **Chỉ hiện đúng 1 xã**: `DirectoryClient` chỉ lấy `communes[0]`, không lặp qua toàn bộ danh sách xã.
- [x] `src/lib/types.ts` — `PublicCommuneVillage.households[].name`, `AdministrativeUnitItem`.
- [x] Kiểm thử bằng Puppeteer (headless Edge) sau mỗi thay đổi UI — screenshot + assertion DOM (`getComputedStyle`, `classList`, `animationName`) trước khi báo đã xong; không chỉ đọc code.

### Vướng mắc kỹ thuật đã gặp (đọc trước khi động vào bản đồ/CSS — tránh lặp lại)

1. **Leaflet `className` không phản ứng với `setStyle()` sau khi layer đã tạo** — chỉ áp dụng lúc `_initPath`. Phải dùng `poly.getElement()?.classList.toggle('my-class', condition)` trực tiếp trên DOM. `poly.getElement()` trả `Element` chứ không phải `HTMLElement` → không dùng được `L.DomUtil.addClass/removeClass` (lỗi kiểu TS), phải dùng `classList` thuần.
2. **Stacking-context z-index**: dropdown gợi ý tìm kiếm (`z-[2000]`) từng bị bản đồ Leaflet che dù chính nó có z-index cao hơn — vì z-index con chỉ có ý nghĩa trong stacking context của chính cha nó; cha (`z-[50]`) thua các phần tử nội bộ Leaflet (~1000). Sửa bằng cách nâng z-index của **thẻ cha bọc ngoài** lên `z-[1100]`, không chỉ riêng dropdown.
3. **Dev server Next.js/Turbopack cache class Tailwind arbitrary-value mới** (vd `z-[1100]`) — nhiều lần class mới thêm tính ra `auto` dù đã có trong `className` DOM, cho đến khi tắt hẳn dev server (kill process qua `netstat`+`Stop-Process`), xóa `.next`, chạy lại `npm run dev`. Thành thói quen chuẩn: sau mọi thay đổi CSS/Tailwind class mới, restart sạch cache trước khi kết luận "vẫn lỗi".
4. `.leaflet-container` tự ép `font-family` (Helvetica Neue/Arial) — luôn phải override bằng `!important`.

## Giai đoạn 5 — Hạ tầng VPS (chưa bắt đầu, phần chung với BE)

- [ ] nginx wildcard subdomain, SSL, PM2 — xem `PROGRESS.md` của BE.

---
**Cách chạy lại từ đầu:**
```
cd E:\Dev\cong-thong-tin-thon-fe
npm run dev -- -p 3001   # BE chạy ở port 3000 (xem PROGRESS.md của BE)
```
Domain gốc `http://localhost:3001/` → trang danh mục công khai. Subdomain thôn dùng `*.localhost` (vd `doanket.localhost:3001`) — trình duyệt hiện đại resolve thẳng về 127.0.0.1, không cần sửa hosts file.
