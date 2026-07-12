'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import type { HomeContent, NewsItem, PublicRoster, RosterMember } from '@/lib/types';

const NEWS_FILTERS: { slug: string; label: string }[] = [
  { slug: 'all', label: 'Tất cả' },
  { slug: 'hanh-chinh', label: 'Hành chính' },
  { slug: 'san-xuat', label: 'Sản xuất' },
  { slug: 'doan-the', label: 'Đoàn thể' },
];

function runSiteSearch(query: string) {
  const q = query.trim();
  if (!q) return;
  const site = typeof window !== 'undefined' ? window.location.hostname : '';
  window.open(`https://www.google.com/search?q=${encodeURIComponent('site:' + site + ' ' + q)}`, '_blank');
}

// Trang chủ công khai của 1 thôn — dựng theo đúng bố cục + hành vi tương
// tác của bản mẫu E:\Dev\cong-thong-tin-thon\index.html (mục 2
// du-an-quan-ly-thon.md): hero+bảng tin (có bộ lọc, modal chi tiết), dải
// thống kê chồng mép hero, 4 thẻ (sản vật/ban tự quản/ANTT có sơ đồ cây/
// dịch vụ công), gallery scroll ngang, header có tìm kiếm+Facebook,
// header/bottom-nav riêng cho mobile, footer 3 cột.
export function VillageHomePage({
  slug,
  content,
  roster,
}: {
  slug: string;
  content: HomeContent;
  roster: PublicRoster;
}) {
  const [newsFilter, setNewsFilter] = useState('all');
  const [newsDetail, setNewsDetail] = useState<NewsItem | null>(null);
  const [infoModal, setInfoModal] = useState<'leadership' | 'security' | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [mobileSearchValue, setMobileSearchValue] = useState('');
  const [mobileHeroSlide, setMobileHeroSlide] = useState(0);
  const galleryRef = useRef<HTMLDivElement>(null);
  const mobileHeroTrackRef = useRef<HTMLDivElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);

  function focusMobileSearch() {
    mobileSearchInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    mobileSearchInputRef.current?.focus();
  }

  function handleMobileHeroScroll() {
    const track = mobileHeroTrackRef.current;
    if (!track) return;
    setMobileHeroSlide(Math.round(track.scrollLeft / track.clientWidth));
  }

  const visibleNews = newsFilter === 'all' ? content.news : content.news.filter((n) => n.categorySlug === newsFilter);
  const chief = roster.security.find((m) => m.title === 'Tổ Trưởng');
  const deputies = roster.security.filter((m) => m.title === 'Tổ Phó');
  const others = roster.security.filter((m) => m.title !== 'Tổ Trưởng' && m.title !== 'Tổ Phó');
  const siteName = content.siteName || 'Thôn Đoàn Kết';
  const logoUrl = content.logoUrl || '/logo.png';
  const heroImage = content.heroImage || 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1600';
  const oldVillageNames = (content.oldVillages || []).map((v) => (v.toLowerCase().startsWith('thôn') ? v : `Thôn ${v}`));
  const mergerClause =
    oldVillageNames.length >= 2
      ? `Sau dấu mốc lịch sử sáp nhập giữa ${oldVillageNames.slice(0, -1).join(', ')} và ${oldVillageNames[oldVillageNames.length - 1]}`
      : `Cùng chung tay xây dựng ${siteName}`;
  const heroIntro = `${mergerClause}, chúng ta cùng xây dựng một cộng đồng đoàn kết - phát triển - văn minh - bền vững, hướng tới nông nghiệp công nghệ cao và hệ thống chính trị cơ sở vững mạnh.`;
  const heroIntroShort = `${mergerClause}, chúng ta cùng xây dựng cộng đồng đoàn kết – phát triển – văn minh – bền vững.`;

  function scrollGallery(dir: number) {
    galleryRef.current?.scrollBy({ left: dir * 300, behavior: 'smooth' });
  }

  // Trang danh mục tra cứu thôn/buôn nằm ở domain gốc (không có subdomain),
  // khác origin với trang chủ 1 thôn cụ thể — phải điều hướng bằng tách
  // nhãn đầu (subdomain) khỏi host hiện tại, không dùng Link/href tương đối.
  function goToDirectory() {
    const host = window.location.host;
    const parts = host.split('.');
    const rootHost = parts.length > 1 ? parts.slice(1).join('.') : host;
    window.location.href = `${window.location.protocol}//${rootHost}/`;
  }

  return (
    <div className="flex min-h-screen flex-col pb-16 lg:pb-0">
      {/* ===== MOBILE HEADER (< lg) ===== */}
      <header className="sticky top-0 z-40 border-b border-stone-200 bg-white lg:hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <button onClick={() => setMobileMenuOpen(true)} className="shrink-0 text-xl text-stone-600">
              <i className="fa-solid fa-bars"></i>
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} alt={`Logo ${siteName}`} className="h-11 w-11 shrink-0 rounded-full object-cover ring-2 ring-primary-100" />
            <div className="min-w-0">
              <p className="truncate text-[9px] font-bold uppercase tracking-widest text-primary-600">Cổng Thông Tin Điện Tử</p>
              <h1 className="truncate text-sm font-bold uppercase leading-tight text-red-600">{siteName} – Xã Dliê Ya</h1>
            </div>
          </div>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 lg:hidden" onClick={() => setMobileMenuOpen(false)}>
          <div
            className="h-full w-1/2 max-w-xs space-y-1 overflow-y-auto bg-primary-800 p-5 text-xs font-bold uppercase tracking-wide text-primary-50"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between border-b border-primary-600/50 pb-4">
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoUrl} alt="Logo" className="h-9 w-9 rounded-full object-cover ring-2 ring-primary-500/40" />
                <span className="text-[11px] font-black normal-case text-white">{siteName}</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-700 text-primary-100 hover:bg-primary-600"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            {['Trang chủ', 'Giới thiệu', 'Tin tức - Thông báo', 'Sản vật địa phương', 'Ban tự quản', 'An ninh trật tự', 'Dịch vụ công'].map(
              (label, i) => (
                <a
                  key={i}
                  href={`#${['home', 'about', 'news', 'nong-san', 'system', 'security', 'services'][i]}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block rounded-lg px-3 py-2.5 transition-all hover:bg-primary-700"
                >
                  {label}
                </a>
              ),
            )}
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                goToDirectory();
              }}
              className="block w-full rounded-lg px-3 py-2.5 text-left transition-all hover:bg-primary-700"
            >
              Tra cứu Thôn/Buôn
            </button>
            <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="block rounded-lg px-3 py-2.5 transition-all hover:bg-primary-700">
              Đăng nhập hệ thống
            </Link>
          </div>
        </div>
      )}

      {/* ===== DESKTOP HEADER + NAV (>= lg) ===== */}
      <header className="hidden border-b border-stone-200 bg-white lg:block">
        <div className="mx-auto flex max-w-[1600px] flex-col items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:px-8">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} alt={`Logo ${siteName}`} className="h-14 w-14 rounded-full object-cover shadow-sm ring-2 ring-primary-100" />
            <div className="text-center lg:text-left">
              <p className="text-[11px] font-bold uppercase tracking-widest text-primary-600">Cổng Thông Tin Điện Tử</p>
              <h1 className="font-sans text-lg font-bold uppercase leading-tight text-red-600 md:text-2xl">
                {siteName} – Xã Dliê Ya, Đắk Lắk
              </h1>
              <p className="text-[11px] uppercase tracking-wide text-primary-600">Nền tảng số cho một cộng đồng mới</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <a href="#" className="inline-flex items-center gap-2 text-sm font-semibold text-primary-700 transition-colors hover:text-primary-800">
              <i className="fa-brands fa-facebook text-lg"></i> Fanpage Facebook
            </a>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                runSiteSearch(searchValue);
              }}
              className="relative"
            >
              <button type="submit" className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-400 transition-colors hover:text-primary-600">
                <i className="fa-solid fa-magnifying-glass"></i>
              </button>
              <input
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Tìm kiếm thông tin..."
                className="w-56 rounded-xl border border-stone-200 bg-stone-50 py-2.5 pl-9 pr-3 text-sm text-stone-700 placeholder:text-stone-400 outline-none transition-all focus:bg-white focus:ring-2 focus:ring-primary-400"
              />
            </form>
          </div>
        </div>

        <nav className="sticky top-0 z-30 bg-primary-700">
          <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
            <div className="flex h-14 items-center justify-between">
              <div className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-primary-50">
                {[
                  ['home', 'Trang chủ'],
                  ['about', 'Giới thiệu'],
                  ['news', 'Tin tức - Thông báo'],
                  ['nong-san', 'Sản vật địa phương'],
                  ['system', 'Ban tự quản'],
                  ['security', 'An ninh trật tự'],
                  ['services', 'Dịch vụ công'],
                ].map(([href, label]) => (
                  <a key={href} href={`#${href}`} className="rounded-lg px-3 py-2 transition-colors hover:bg-primary-600">
                    {label}
                  </a>
                ))}
                <button onClick={goToDirectory} className="rounded-lg px-3 py-2 uppercase transition-colors hover:bg-primary-600">
                  Tra cứu Thôn/Buôn
                </button>
                <a href="#gallery" className="rounded-lg px-3 py-2 transition-colors hover:bg-primary-600">
                  Liên hệ
                </a>
              </div>
              <Link
                href="/login"
                className="flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-primary-700 shadow-sm transition-all hover:bg-primary-50"
              >
                <i className="fa-solid fa-fingerprint"></i> Đăng Nhập
              </Link>
            </div>
          </div>
        </nav>
      </header>

      {/* ===== MOBILE HERO CAROUSEL + QUICK ICONS (< lg) ===== */}
      <section className="px-4 pt-4 lg:hidden">
        <div
          ref={mobileHeroTrackRef}
          onScroll={handleMobileHeroScroll}
          className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto rounded-2xl"
        >
          <div className="grid w-full shrink-0 snap-center grid-cols-2 gap-3">
            <div className="flex flex-col justify-center space-y-2 rounded-2xl bg-primary-800 p-4 text-white">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 text-[11px]">
                <i className="fa-solid fa-star"></i>
              </span>
              <h2 className="font-serif text-sm font-black leading-snug">TẦM VÓC MỚI – KHÁT VỌNG MỚI</h2>
              <p className="text-[11px] leading-relaxed text-primary-100">{heroIntroShort}</p>
            </div>
            <div className="grid grid-cols-1 gap-3 rounded-2xl border border-stone-200 bg-white p-3">
              {content.stats.map((s) => (
                <div key={s.id} className="flex items-center gap-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-xs text-primary-600">
                    <i className={`fa-solid ${s.icon}`}></i>
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-black leading-none text-stone-900">
                      {s.value} <span className="text-[10px] font-semibold text-primary-600">{s.unit}</span>
                    </p>
                    <p className="truncate text-[9px] text-stone-400">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="w-full shrink-0 snap-center">
            <div className="relative h-56 overflow-hidden rounded-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={content.gallery[0]?.image || heroImage}
                alt="Hoạt động thôn"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950/85 to-transparent"></div>
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary-300">Hình ảnh hoạt động</span>
                <p className="mt-1 text-sm font-semibold leading-snug text-white">
                  {content.gallery[0]?.caption || 'Hoạt động nổi bật của thôn'}
                </p>
              </div>
            </div>
          </div>

          <div className="w-full shrink-0 snap-center">
            <div className="flex h-56 flex-col items-center justify-center gap-2 rounded-2xl bg-red-600 p-5 text-center text-white">
              <i className="fa-solid fa-shield-halved text-3xl"></i>
              <h3 className="text-sm font-bold uppercase tracking-wide">Đường dây nóng An ninh trật tự</h3>
              <p className="text-[11px] text-red-100">Tiếp nhận thông tin – Xử lý kịp thời 24/7</p>
              <a href={`tel:${content.security.hotline}`} className="mt-1 rounded-lg bg-white px-4 py-2 text-sm font-black text-red-600">
                {content.security.hotlineDisplay}
              </a>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-1.5 pt-3">
          {[0, 1, 2].map((i) => (
            <span key={i} className={`h-1.5 w-1.5 rounded-full transition-colors ${mobileHeroSlide === i ? 'bg-primary-600' : 'bg-stone-300'}`} />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3 pt-4">
          <a href="#news" className="flex flex-col items-center gap-2 rounded-2xl border border-stone-200 bg-white py-4 shadow-sm">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <i className="fa-solid fa-bullhorn"></i>
            </span>
            <span className="text-center text-[11px] font-semibold leading-tight text-stone-600">Thông báo</span>
          </a>
          <a href="#nong-san" className="flex flex-col items-center gap-2 rounded-2xl border border-stone-200 bg-white py-4 shadow-sm">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
              <i className="fa-solid fa-leaf"></i>
            </span>
            <span className="text-center text-[11px] font-semibold leading-tight text-stone-600">Sản vật địa phương</span>
          </a>
          <a href="#system" className="flex flex-col items-center gap-2 rounded-2xl border border-stone-200 bg-white py-4 shadow-sm">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <i className="fa-solid fa-people-group"></i>
            </span>
            <span className="text-center text-[11px] font-semibold leading-tight text-stone-600">Ban tự quản</span>
          </a>
          <a href="#security" className="flex flex-col items-center gap-2 rounded-2xl border border-stone-200 bg-white py-4 shadow-sm">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <i className="fa-solid fa-shield-halved"></i>
            </span>
            <span className="text-center text-[11px] font-semibold leading-tight text-stone-600">Tổ ANTT cơ sở</span>
          </a>
          <a href="#services" className="flex flex-col items-center gap-2 rounded-2xl border border-stone-200 bg-white py-4 shadow-sm">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <i className="fa-solid fa-building-shield"></i>
            </span>
            <span className="text-center text-[11px] font-semibold leading-tight text-stone-600">Dịch vụ công</span>
          </a>
          <button type="button" onClick={focusMobileSearch} className="flex flex-col items-center gap-2 rounded-2xl border border-stone-200 bg-white py-4 shadow-sm">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
              <i className="fa-solid fa-magnifying-glass"></i>
            </span>
            <span className="text-center text-[11px] font-semibold leading-tight text-stone-600">Tra cứu</span>
          </button>
        </div>

        <div className="pt-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              runSiteSearch(mobileSearchValue);
            }}
            className="relative"
          >
            <button type="submit" className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-400 transition-colors hover:text-primary-600">
              <i className="fa-solid fa-magnifying-glass"></i>
            </button>
            <input
              ref={mobileSearchInputRef}
              type="text"
              value={mobileSearchValue}
              onChange={(e) => setMobileSearchValue(e.target.value)}
              placeholder="Tìm kiếm thông tin..."
              className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-9 pr-3 text-sm text-stone-700 placeholder:text-stone-400 outline-none transition-all focus:ring-2 focus:ring-primary-400"
            />
          </form>
        </div>
      </section>

      <main id="home" className="flex-1">
        {/* Hero + Bảng tin */}
        <section className="mx-auto max-w-[1600px] px-4 pt-4 sm:px-6 lg:px-8 lg:pt-8">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="relative hidden min-h-[460px] items-end overflow-hidden rounded-3xl shadow-lg lg:col-span-8 lg:flex">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={heroImage}
                alt="Cánh đồng Tây Nguyên"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950/85 via-stone-950/40 to-transparent"></div>
              <div className="relative z-10 max-w-xl space-y-4 p-8 pb-16 md:p-10 lg:pb-20">
                <span className="inline-flex items-center gap-2 rounded-full border border-primary-300/40 bg-primary-500/20 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-primary-100">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary-300"></span> Đắk Lắk · Việt Nam
                </span>
                <h2 className="font-serif text-3xl font-black leading-tight text-white md:text-4xl">TẦM VÓC MỚI – KHÁT VỌNG MỚI</h2>
                <p className="text-sm leading-relaxed text-stone-200">{heroIntro}</p>
                <a
                  href="#about"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-6 py-3 text-xs font-bold uppercase tracking-wide text-white shadow-lg transition-colors hover:bg-primary-500"
                >
                  Xem chi tiết <i className="fa-solid fa-arrow-right text-[10px]"></i>
                </a>
              </div>
            </div>

            <div id="news" className="scroll-mt-20 flex flex-col rounded-3xl border border-stone-200 bg-white shadow-sm lg:col-span-4">
              <div className="space-y-3 border-b border-stone-100 p-5">
                <h3 className="font-serif text-lg font-bold text-stone-900">Bảng Tin &amp; Thông Báo</h3>
                <div className="flex flex-wrap gap-2">
                  {NEWS_FILTERS.map((f) => (
                    <button
                      key={f.slug}
                      onClick={() => setNewsFilter(f.slug)}
                      className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all ${
                        newsFilter === f.slug ? 'bg-primary-600 text-white' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="max-h-[420px] flex-1 divide-y divide-stone-100 overflow-y-auto">
                {visibleNews.length ? (
                  visibleNews.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => setNewsDetail(n)}
                      className="flex w-full items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-stone-50"
                    >
                      <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${n.colorClass}`}>
                        <i className="fa-solid fa-bullhorn text-xs"></i>
                      </div>
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-sm font-semibold leading-snug text-stone-800">{n.title}</p>
                        <p className="mt-1 text-[11px] text-stone-500">
                          {n.category} · {n.date}
                        </p>
                      </div>
                    </button>
                  ))
                ) : (
                  <p className="py-8 text-center text-sm text-stone-500">Chưa có thông báo nào.</p>
                )}
              </div>
              <div className="border-t border-stone-100 p-4 text-right">
                <a href="#news" className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 hover:text-primary-700">
                  Xem tất cả tin tức <i className="fa-solid fa-arrow-right-long text-[10px]"></i>
                </a>
              </div>
            </div>

            <div id="about" className="relative z-20 -mt-14 hidden scroll-mt-24 lg:col-span-8 lg:-mt-16 lg:block">
              <div className="grid grid-cols-1 divide-stone-100 rounded-2xl border border-stone-200 bg-white shadow-lg sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                {content.stats.map((s) => (
                  <div key={s.id} className="p-6">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                        <i className={`fa-solid ${s.icon}`}></i>
                      </div>
                      <h3 className="text-sm font-bold text-stone-700">{s.label}</h3>
                    </div>
                    <div className="mb-3 flex items-baseline gap-1 font-serif text-3xl font-black text-stone-900">
                      {s.value} <span className="font-sans text-base font-semibold text-primary-600">{s.unit}</span>
                    </div>
                    <div className="space-y-1.5 border-t border-stone-100 pt-3 text-xs text-stone-400">
                      {s.breakdown.map((b, i) => (
                        <div key={i} className="flex justify-between">
                          <span>{b.label}</span>
                          <span className="font-medium text-stone-700">{b.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:hidden">
              {content.stats.map((s) => (
                <div key={s.id} className="rounded-2xl border border-stone-200 bg-white p-4">
                  <p className="text-2xl font-black text-stone-900">
                    {s.value} <span className="text-sm font-normal text-primary-600">{s.unit}</span>
                  </p>
                  <p className="text-xs uppercase tracking-wide text-stone-500">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 4 cột: Sản vật / Ban tự quản / An ninh / Dịch vụ công */}
        <section className="mx-auto max-w-[1600px] px-4 pb-16 pt-10 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div id="nong-san" className="scroll-mt-20 space-y-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                  <i className="fa-solid fa-seedling"></i>
                </div>
                <h3 className="font-serif text-base font-bold text-stone-900">Sản vật địa phương</h3>
              </div>
              <p className="text-xs text-stone-500">{content.products.length} nông sản chủ lực đạt chuẩn VietGAP</p>
              <div className="grid grid-cols-3 gap-3">
                {content.products.map((p) => (
                  <div key={p.id} className="group flex flex-col items-center gap-1.5 text-center" title={p.name}>
                    <div className="aspect-square w-full overflow-hidden rounded-xl border border-stone-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.image}
                        alt={p.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    </div>
                    <span className="text-[11px] font-semibold leading-tight text-stone-600 group-hover:text-primary-600">
                      {p.name}
                    </span>
                  </div>
                ))}
              </div>
              <a href="#nong-san" className="block border-t border-stone-100 pt-3 text-center text-xs font-semibold text-primary-600 hover:text-primary-700">
                Xem thêm sản phẩm →
              </a>
            </div>

            <div id="system" className="scroll-mt-20 space-y-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                  <i className="fa-solid fa-landmark"></i>
                </div>
                <h3 className="font-serif text-base font-bold text-stone-900">Ban Tự Quản</h3>
              </div>
              <div className="text-xs">
                {roster.leadership.length ? (
                  roster.leadership.map((l, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 border-b border-stone-100 py-2 last:border-0">
                      <span className="text-stone-400">{l.role}:</span>
                      {l.phone ? (
                        <a href={`tel:${l.phone}`} className="text-right font-semibold text-stone-800 transition-colors hover:text-primary-600">
                          {l.name}
                        </a>
                      ) : (
                        <span className="text-right font-semibold text-stone-800">{l.name}</span>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="py-4 text-center text-stone-500">Chưa có nhân sự nào.</p>
                )}
              </div>
              <button
                onClick={() => setInfoModal('leadership')}
                className="block w-full border-t border-stone-100 pt-3 text-center text-xs font-semibold text-primary-600 hover:text-primary-700"
              >
                Xem đầy đủ →
              </button>
            </div>

            <div id="security" className="scroll-mt-20 space-y-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <i className="fa-solid fa-shield-halved"></i>
                </div>
                <h3 className="font-serif text-base font-bold text-stone-900">Tổ An Ninh Trật Tự</h3>
              </div>
              <p className="text-center text-[11px] uppercase tracking-wide text-stone-400">Sơ đồ phân nhiệm</p>
              <div className="flex flex-col items-center gap-2 py-1">
                {chief && (
                  <div className="rounded-lg bg-primary-600 px-3 py-2 text-center text-[11px] font-bold text-white shadow-sm">
                    {chief.title}
                    <br />
                    <span className="font-normal">{chief.name}</span>
                  </div>
                )}
                {deputies.length > 0 && (
                  <>
                    <div className="h-3 w-px bg-stone-300"></div>
                    <div className="flex items-start gap-3">
                      {deputies.map((d, i) => (
                        <div key={i} className="rounded-lg border border-primary-100 bg-primary-50 px-3 py-2 text-center text-[11px] font-bold text-primary-700">
                          {d.title}
                          <br />
                          <span className="font-normal">{d.name}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                {others.length > 0 && <div className="pt-1 text-[11px] text-stone-500">Tổ viên ({others.length} người)</div>}
                {content.security.slogan && (
                  <p className="pt-1 text-center text-[11px] italic text-stone-500">&quot;{content.security.slogan}&quot;</p>
                )}
              </div>
              <a
                href={`tel:${content.security.hotline}`}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-red-700"
              >
                <i className="fa-solid fa-phone"></i> {content.security.hotlineDisplay}
              </a>
              <p className="text-center text-[11px] text-stone-400">Tiếp nhận thông tin – Xử lý kịp thời</p>
              <button
                onClick={() => setInfoModal('security')}
                className="block w-full border-t border-stone-100 pt-3 text-center text-xs font-semibold text-primary-600 hover:text-primary-700"
              >
                Xem chi tiết →
              </button>
            </div>

            <div id="services" className="scroll-mt-20 space-y-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                  <i className="fa-solid fa-address-card"></i>
                </div>
                <h3 className="font-serif text-base font-bold text-stone-900">Dịch Vụ Công Dân Số</h3>
              </div>
              <ul className="space-y-3 text-xs text-stone-600">
                {[
                  ['fa-people-roof', 'Tra cứu hộ khẩu, nhân khẩu'],
                  ['fa-chart-column', 'Xem báo cáo quyết toán quỹ nông thôn mới'],
                  ['fa-triangle-exclamation', 'Gửi phản ánh an ninh trật tự trực tuyến'],
                  ['fa-file-lines', 'Các thủ tục hành chính khác'],
                ].map(([icon, label]) => (
                  <li key={label}>
                    <Link href="/login" className="flex items-center gap-2.5 transition-colors hover:text-primary-600">
                      <i className={`fa-solid ${icon} w-4 text-primary-500`}></i> {label}
                    </Link>
                  </li>
                ))}
              </ul>
              <Link href="/login" className="block border-t border-stone-100 pt-3 text-center text-xs font-semibold text-primary-600 hover:text-primary-700">
                Xem tất cả dịch vụ →
              </Link>
            </div>
          </div>
        </section>

        {/* Hình ảnh hoạt động + Liên kết nhanh */}
        <section id="gallery" className="mx-auto max-w-[1600px] scroll-mt-20 px-4 pb-16 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm lg:col-span-8">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-serif text-base font-bold uppercase text-stone-900">
                  <i className="fa-solid fa-images text-primary-500"></i> Hình Ảnh Hoạt Động
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => scrollGallery(-1)}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 text-stone-500 transition-colors hover:bg-stone-50"
                  >
                    <i className="fa-solid fa-chevron-left text-xs"></i>
                  </button>
                  <button
                    onClick={() => scrollGallery(1)}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 text-stone-500 transition-colors hover:bg-stone-50"
                  >
                    <i className="fa-solid fa-chevron-right text-xs"></i>
                  </button>
                </div>
              </div>
              <div ref={galleryRef} className="no-scrollbar flex gap-4 overflow-x-auto scroll-smooth pb-1">
                {content.gallery.map((g) => (
                  <div key={g.id} className="w-56 shrink-0 overflow-hidden rounded-xl border border-stone-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={g.image} alt={g.caption} className="h-36 w-full object-cover" />
                    <p className="line-clamp-2 p-2 text-[11px] leading-snug text-stone-600">{g.caption}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm lg:col-span-4">
              <h3 className="font-serif text-base font-bold uppercase text-stone-900">Liên Kết Nhanh</h3>
              <div className="grid grid-cols-2 gap-3 text-xs font-bold">
                <a href="#news" className="flex flex-col items-center gap-2 rounded-xl bg-red-50 py-4 text-red-600 transition-colors hover:bg-red-100">
                  <i className="fa-solid fa-bullhorn text-lg"></i> Văn bản chỉ đạo
                </a>
                <a href="#schedule" className="flex flex-col items-center gap-2 rounded-xl bg-blue-50 py-4 text-blue-600 transition-colors hover:bg-blue-100">
                  <i className="fa-solid fa-calendar-days text-lg"></i> Lịch công tác
                </a>
                <Link href="/login" className="flex flex-col items-center gap-2 rounded-xl bg-primary-50 py-4 text-primary-700 transition-colors hover:bg-primary-100">
                  <i className="fa-solid fa-file-signature text-lg"></i> Biểu mẫu đơn từ
                </Link>
                <Link href="/login" className="flex flex-col items-center gap-2 rounded-xl bg-amber-50 py-4 text-amber-600 transition-colors hover:bg-amber-100">
                  <i className="fa-solid fa-circle-question text-lg"></i> Hỏi đáp thường gặp
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Lịch công tác */}
        <section id="schedule" className="mx-auto max-w-[1600px] scroll-mt-20 px-4 pb-16 sm:px-6 lg:px-8">
          <h3 className="font-serif text-lg font-bold text-stone-900">Lịch Công Tác</h3>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {content.schedule.map((s) => (
              <div key={s.id} className="flex items-center gap-4 rounded-2xl border border-stone-200 bg-white p-4">
                <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-primary-50 text-primary-700">
                  <span className="text-lg font-black leading-none">{s.day}</span>
                  <span className="text-[9px] uppercase leading-none">{s.month}</span>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-stone-900">{s.title}</p>
                  <p className="text-[11px] text-stone-500">
                    {s.location} — {s.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* ===== MOBILE BOTTOM TAB BAR (< lg) ===== */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 grid grid-cols-5 border-t border-stone-200 bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.06)] lg:hidden">
        <a href="#home" className="flex flex-col items-center justify-center gap-1 py-2 text-primary-600">
          <i className="fa-solid fa-house text-lg"></i>
          <span className="text-[10px] font-semibold">Trang chủ</span>
        </a>
        <a href="#news" className="flex flex-col items-center justify-center gap-1 py-2 text-stone-500">
          <i className="fa-regular fa-bell text-lg"></i>
          <span className="text-[10px] font-semibold">Thông báo</span>
        </a>
        <Link href="/login" className="-mt-5 flex flex-col items-center justify-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-600 text-white shadow-lg">
            <i className="fa-solid fa-shield-halved text-lg"></i>
          </span>
          <span className="mt-0.5 text-[9px] font-semibold text-primary-700">Phản ánh ANTT</span>
        </Link>
        <button type="button" onClick={focusMobileSearch} className="flex flex-col items-center justify-center gap-1 py-2 text-stone-500">
          <i className="fa-solid fa-magnifying-glass text-lg"></i>
          <span className="text-[10px] font-semibold">Tra cứu</span>
        </button>
        <Link href="/login" className="flex flex-col items-center justify-center gap-1 py-2 text-stone-500">
          <i className="fa-regular fa-user text-lg"></i>
          <span className="text-[10px] font-semibold">Tài khoản</span>
        </Link>
      </nav>

      <footer className="border-t border-stone-200 bg-primary-900 text-primary-100">
        <div className="mx-auto grid max-w-[1600px] grid-cols-1 items-center gap-5 px-4 py-6 text-xs sm:px-6 lg:grid-cols-3 lg:px-8">
          <div className="space-y-2 text-center lg:text-left">
            <p className="flex items-center justify-center gap-2 lg:justify-start">
              <i className="fa-solid fa-map-location-dot text-primary-300"></i> {siteName} – Xã Dliê Ya – Tỉnh Đắk Lắk
            </p>
            <p className="flex items-center justify-center gap-2 lg:justify-start">
              <i className="fa-solid fa-phone text-primary-300"></i> Đường dây nóng ANTT:{' '}
              <a href={`tel:${content.security.hotline}`} className="underline hover:text-white">
                {content.security.hotlineDisplay}
              </a>
            </p>
          </div>
          <div className="space-y-1.5 text-center">
            <p className="font-semibold text-white">Cổng Thông Tin Điện Tử {siteName}</p>
            <p className="text-primary-300">&copy; 2026. All rights reserved.</p>
            <p className="text-primary-300">Thôn: {slug}</p>
          </div>
          <div className="flex flex-col items-center gap-2 lg:items-end">
            <span className="text-primary-300">Kết nối với chúng tôi</span>
            <div className="flex gap-3">
              <a href="#" className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-800 text-white transition-colors hover:bg-primary-700">
                <i className="fa-brands fa-facebook-f"></i>
              </a>
              <a href="#" className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-800 text-white transition-colors hover:bg-primary-700">
                <i className="fa-brands fa-youtube"></i>
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* ===== Modal: chi tiết tin tức ===== */}
      {newsDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4" onClick={() => setNewsDetail(null)}>
          <div className="relative w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-stone-100 p-6">
              <div className="flex items-center gap-2">
                <span className={`rounded px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${newsDetail.colorClass}`}>
                  {newsDetail.category}
                </span>
                <span className="font-mono text-xs text-stone-400">{newsDetail.date}</span>
              </div>
              <button
                onClick={() => setNewsDetail(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 bg-stone-50 text-stone-400 transition-colors hover:border-red-200 hover:text-red-500"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div className="space-y-4 p-6">
              <h3 className="font-serif text-xl font-bold leading-snug text-stone-900">{newsDetail.title}</h3>
              <div className="h-0.5 w-16 rounded bg-primary-500"></div>
              <p className="whitespace-pre-line text-xs leading-relaxed text-stone-600 md:text-sm">{newsDetail.content}</p>
            </div>
            <div className="border-t border-stone-100 bg-stone-50/60 p-6 text-right">
              <button
                onClick={() => setNewsDetail(null)}
                className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-bold text-stone-600 transition-all hover:bg-stone-100"
              >
                Đã đọc và đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Modal: Ban Tự Quản / Tổ ANTT chi tiết ===== */}
      {infoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4" onClick={() => setInfoModal(null)}>
          <div
            className="relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-stone-100 p-6">
              <h3 className="font-serif text-lg font-bold text-stone-900">
                {infoModal === 'leadership' ? 'Ban Tự Quản & Hệ Thống Chính Trị' : 'Tổ An Ninh Trật Tự Cơ Sở'}
              </h3>
              <button
                onClick={() => setInfoModal(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 bg-stone-50 text-stone-400 transition-colors hover:border-red-200 hover:text-red-500"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div className="space-y-3 overflow-y-auto p-6">
              {infoModal === 'leadership' ? (
                <RosterModalList members={roster.leadership} accent="primary" />
              ) : (
                <>
                  {content.security.slogan && (
                    <p className="border-b border-stone-100 pb-2 text-center text-xs italic text-stone-400">
                      &quot;{content.security.slogan}&quot;
                    </p>
                  )}
                  <RosterModalList members={roster.security} accent="emerald" useTitle />
                  <a
                    href={`tel:${content.security.hotline}`}
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-red-700"
                  >
                    <i className="fa-solid fa-phone"></i> Đường Dây Nóng 24/7 · {content.security.hotlineDisplay}
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RosterModalList({
  members,
  accent,
  useTitle,
}: {
  members: RosterMember[];
  accent: 'primary' | 'emerald';
  useTitle?: boolean;
}) {
  if (!members.length) {
    return <p className="py-6 text-center text-sm text-stone-500">Chưa có nhân sự nào.</p>;
  }
  const accentClass = accent === 'primary' ? 'text-primary-600' : 'text-emerald-600';
  return (
    <div className="divide-y divide-stone-100">
      {members.map((m, i) => (
        <div key={i} className="flex items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <p className={`text-[11px] font-bold uppercase tracking-wide ${accentClass}`}>{useTitle ? m.title : m.role}</p>
            <p className="text-sm font-semibold text-stone-800">{m.name}</p>
          </div>
          {m.phone && (
            <a
              href={`tel:${m.phone}`}
              className="shrink-0 rounded-lg bg-primary-50 px-3 py-1.5 text-xs font-bold text-primary-600 transition-colors hover:bg-primary-100"
            >
              <i className="fa-solid fa-phone mr-1"></i>
              {m.phoneDisplay}
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
