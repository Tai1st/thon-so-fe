import type { Metadata } from 'next';
import { Montserrat, Playfair_Display } from 'next/font/google';
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

export const metadata: Metadata = {
  title: 'Cổng Thông Tin Điện Tử Thôn Đoàn Kết',
  description: 'Cổng thông tin điện tử Thôn Đoàn Kết - Xã Dliê Ya - Đắk Lắk',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" className={`${montserrat.variable} ${playfairDisplay.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-stone-50 font-sans text-stone-800">{children}</body>
    </html>
  );
}
