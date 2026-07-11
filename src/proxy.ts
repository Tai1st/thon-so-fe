import { NextRequest, NextResponse } from "next/server";

// Tách subdomain từ Host header, forward sang header x-tenant-slug cho
// Server Component/Route Handler đọc (mục 4 tài liệu thiết kế). Middleware
// CHỈ tách chuỗi, không query DB ở đây (Edge runtime không hợp để gọi
// Mongo) — việc resolve tenant thật nằm ở BE khi FE gọi API kèm header này.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

// Tổng quát hóa theo SỐ NHÃN của hostname thay vì hardcode 1 domain gốc cố
// định — nhờ vậy hệ thống chạy đúng trên BẤT KỲ domain thật nào (mỗi xã có
// thể dùng domain riêng) mà không cần sửa code: "xyz.tenxa.vn" hay
// "xyz.dlieya.vn" đều hiểu "xyz" là subdomain/tenant slug, còn truy cập
// đúng domain gốc (2 nhãn, vd "tenxa.vn") thì coi là trang danh mục, không
// có tenant slug nào. Superadmin không đi qua middleware này — dùng route
// riêng theo path (`/superadmin/*`) ở domain gốc, xem PROGRESS.md.
function extractTenantSlug(host: string): string | null {
  const hostname = host.split(":")[0]; // bỏ port nếu có (dev)

  // Dev local: "<slug>.localhost" — vd doanket.localhost:3000
  if (hostname.endsWith(".localhost")) {
    const slug = hostname.slice(0, -".localhost".length);
    return slug || null;
  }
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return null; // domain gốc khi dev — không có subdomain
  }

  // "a.b" (2 nhãn) = domain gốc của 1 xã, vd "tenxa.vn" — không subdomain.
  // "a.b.c" (>2 nhãn) = có subdomain, nhãn đầu tiên là tenant slug.
  const labels = hostname.split(".");
  if (labels.length <= 2) return null;
  return labels[0] || null;
}

export function proxy(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const slug = extractTenantSlug(host);

  const requestHeaders = new Headers(request.headers);
  if (slug) {
    requestHeaders.set("x-tenant-slug", slug);
  } else {
    requestHeaders.delete("x-tenant-slug");
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}
