import type { Metadata, Viewport } from 'next';
import { Montserrat, Playfair_Display } from 'next/font/google';
import { getTenantSlug } from '@/lib/tenant';
import { apiFetch } from '@/lib/api';
import type { HomeContent, PublicTenant } from '@/lib/types';
import '@fortawesome/fontawesome-free/css/all.min.css';
import 'leaflet/dist/leaflet.css';
import './globals.css';

// Font chính (sans) và font tiêu đề (serif) — đồng bộ với bản mẫu
// E:\Dev\cong-thong-tin-thon (mục 2 du-an-quan-ly-thon.md).
const montserrat = Montserrat({
  variable: '--font-sans',
  subsets: ['latin', 'vietnamese'],
  weight: ['300', '400', '500', '600', '700', '800'],
});

const playfairDisplay = Playfair_Display({
  variable: '--font-serif',
  subsets: ['latin', 'vietnamese'],
  weight: ['600', '700', '800'],
});

// viewportFit "cover" mở khóa env(safe-area-inset-*) (tai thỏ/vạch home).
// interactiveWidget "resizes-content" là cơ chế CHUẨN của WebKit để layout
// viewport tự co lại đúng bằng bàn phím ảo khi hiện lên — nhờ vậy các đơn
// vị dvh (xem globals.css/các portal) luôn phản ánh đúng chiều cao đang
// thấy được, không cần đo window.innerHeight bằng JS (cách làm cũ, dễ vỡ,
// để lại khoảng trống khi đóng bàn phím vì giá trị đo bị lệch nhịp).
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content',
};

const DEFAULT_METADATA: Metadata = {
  title: 'Cổng Thông Tin Điện Tử - Tra cứu Thôn/Buôn',
  description: 'Cổng thông tin điện tử tra cứu các thôn/buôn trên địa bàn.',
  icons: { icon: '/favicon.ico' },
};

// Title/description phải theo đúng tenant đang truy cập (subdomain), không
// được hard-code tên 1 thôn cụ thể — đọc slug do middleware set rồi tra
// tên thật qua /tenants/public (khớp danh sách hiển thị ở trang danh mục).
export async function generateMetadata(): Promise<Metadata> {
  const slug = await getTenantSlug();
  if (!slug) return DEFAULT_METADATA;

  try {
    const [tenants, homeContent] = await Promise.all([
      apiFetch<PublicTenant[]>('/tenants/public', { auth: false }),
      apiFetch<HomeContent>('/home-content', { auth: false }),
    ]);
    const tenant = tenants.find((t) => t.slug === slug);
    if (!tenant) return DEFAULT_METADATA;
    return {
      title: `Cổng Thông Tin Điện Tử ${tenant.name}`,
      description: `Cổng thông tin điện tử ${tenant.name}`,
      icons: { icon: homeContent.logoUrl || '/favicon.ico' },
    };
  } catch {
    return DEFAULT_METADATA;
  }
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" className={`${montserrat.variable} ${playfairDisplay.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-stone-50 font-sans text-stone-800">{children}</body>
    </html>
  );
}
