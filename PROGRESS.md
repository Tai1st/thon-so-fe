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
- [ ] Các tab còn lại của dashboard cư dân: Quỹ Thôn, Báo ANTT, Đăng Ký Lưu Trú — chưa làm.
- [ ] 4 dashboard role còn lại (village-head/association-officer/security-team/admin) — chưa làm.

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
