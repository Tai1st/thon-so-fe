'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ADMINISTRATIVE_UNIT_CATEGORIES } from '@/lib/types';
import type { AdministrativeUnitCategory, AdministrativeUnitItem, PublicCommune, PublicCommuneVillage } from '@/lib/types';

const DirectoryLeaflet = dynamic(() => import('./directory-leaflet').then((m) => m.DirectoryLeaflet), { ssr: false });

const EMBLEM_URL = 'https://i.ibb.co/ZppJTsk6/quoc-huy-vector.jpg';

// Trang danh mục tra cứu thôn/buôn ở domain gốc (mục 4.1 tài liệu thiết
// kế) — bố cục/màu sắc dựng lại theo đúng tra-cuu.html gốc: header
// thương hiệu, ô tìm kiếm có gợi ý, layout bản đồ + 2 panel bên phải
// (Chi tiết / Danh sách), dữ liệu thật lấy từ Commune (nhập KMZ qua
// superadmin) thay cho mảng REGIONS tĩnh của bản mẫu.
export function DirectoryClient({
  communes,
  administrativeUnits,
}: {
  communes: PublicCommune[];
  administrativeUnits: AdministrativeUnitItem[];
}) {
  if (communes.length === 0) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-stone-50 px-4 text-center">
        <div>
          <h1 className="text-lg font-bold text-stone-900">Chưa có xã nào được thiết lập</h1>
          <p className="mt-2 max-w-sm text-sm text-stone-500">
            Quản trị hệ thống chưa nhập dữ liệu bản đồ xã nào. Vui lòng quay lại sau.
          </p>
        </div>
      </main>
    );
  }

  // 1 domain chỉ phục vụ 1 xã (không lặp qua mọi Commune superadmin đang
  // quản lý) — lấy xã mới nhập gần nhất (findAllPublic() đã sort
  // createdAt desc). Nhiều xã/nhiều domain vẫn quản lý được ở tầng
  // superadmin, chỉ trang công khai này chỉ hiện đúng 1 xã tương ứng.
  const commune = communes[0];

  return (
    <div
      className="min-h-dvh"
      style={{
        background:
          'radial-gradient(circle at 18% 12%, rgba(22,163,74,.10), transparent 30%), radial-gradient(circle at 82% 6%, rgba(14,165,233,.09), transparent 28%), linear-gradient(180deg, #f5fbf7 0%, #eef8f1 42%, #e8f5ef 100%)',
      }}
    >
      <CommuneSection commune={commune} administrativeUnits={administrativeUnits} />
    </div>
  );
}

function formatNumber(n: number): string {
  return n.toLocaleString('vi-VN', { maximumFractionDigits: n < 100 ? 1 : 0 });
}

function CommuneSection({
  commune,
  administrativeUnits,
}: {
  commune: PublicCommune;
  administrativeUnits: AdministrativeUnitItem[];
}) {
  const [query, setQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [showHouseholds, setShowHouseholds] = useState(true);
  const [showBoundaries, setShowBoundaries] = useState(true);
  const [showLegend, setShowLegend] = useState(true);

  // Chỉ hiện pill/checkbox cho những loại địa danh THẬT SỰ có ở xã này,
  // tránh danh sách 9 mục cố định trong khi phần lớn rỗng.
  const categoriesPresent = useMemo(() => {
    const present = new Set(administrativeUnits.map((u) => u.category));
    return ADMINISTRATIVE_UNIT_CATEGORIES.filter((c) => present.has(c.slug));
  }, [administrativeUnits]);

  // Hiện/ẩn TỪNG loại địa danh độc lập (không phải chọn 1 loại duy nhất) —
  // dùng chung state cho cả dãy pill lọc nhanh và khung "Lớp bản đồ" checkbox
  // bên panel phải, mặc định hiện hết. Set rỗng ban đầu, lười khởi tạo full
  // set khi categoriesPresent đã sẵn sàng (tránh phải liệt kê tay).
  const [hiddenCategories, setHiddenCategories] = useState<Set<AdministrativeUnitCategory>>(new Set());

  function toggleCategory(slug: AdministrativeUnitCategory) {
    setHiddenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  const allCategoriesVisible = hiddenCategories.size === 0;

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return commune.villages.filter((v) => v.name.toLowerCase().includes(q)).slice(0, 8);
  }, [commune.villages, query]);

  const selected = commune.villages.find((v) => v.name === selectedName) || null;
  const availableCount = commune.villages.filter((v) => v.tenantSlug).length;

  function selectVillage(name: string) {
    setSelectedName(name);
    setShowSuggestions(false);
  }

  function goToTenant(slug: string) {
    const host = window.location.host;
    window.location.href = `${window.location.protocol}//${slug}.${host}`;
  }

  function runSearch() {
    const q = query.trim().toLowerCase();
    const match = commune.villages.find((v) => v.name.toLowerCase().includes(q));
    if (match) selectVillage(match.name);
  }

  return (
    <div>
      {/* Header thương hiệu */}
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex w-[min(1400px,calc(100%-32px))] flex-wrap items-center justify-between gap-4 px-2 py-3.5">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={EMBLEM_URL} alt="Quốc huy" className="h-11 w-11 rounded-full border border-orange-200 object-cover shadow-sm" />
            <div>
              <span className="block text-[11px] font-bold uppercase tracking-wide text-stone-500">Cổng thông tin điện tử</span>
              <h1 className="font-serif text-lg font-extrabold uppercase leading-tight text-[#9c3000]">{commune.name}</h1>
            </div>
          </div>

          <nav className="hidden items-center gap-6 text-sm font-semibold text-stone-600 lg:flex">
            <a href="#" className="text-emerald-700">
              Trang chủ
            </a>
            <a href="#map" className="border-b-2 border-emerald-600 pb-1 text-emerald-700">
              Bản đồ
            </a>
            <a href="#" className="hover:text-emerald-700">
              Giới thiệu
            </a>
            <a href="#" className="hover:text-emerald-700">
              Tin tức
            </a>
            <a href="#" className="hover:text-emerald-700">
              Dịch vụ công
            </a>
            <a href="#" className="hover:text-emerald-700">
              Dữ liệu
            </a>
            <a href="#" className="hover:text-emerald-700">
              Liên hệ
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <div className="relative hidden sm:block">
              <i className="fa-solid fa-magnifying-glass pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-stone-400" />
              <input
                type="text"
                placeholder="Nhập địa điểm cần tìm..."
                onFocus={() => document.getElementById('directory-search')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                className="w-56 rounded-full border border-stone-200 bg-stone-50 py-2 pl-8 pr-3 text-xs text-stone-700 outline-none focus:border-emerald-400"
              />
            </div>
            <button className="rounded-full bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-600">Đăng nhập</button>
          </div>
        </div>
      </header>

      <div id="map" className="mx-auto mt-4.5 w-[min(1120px,calc(100%-32px))] scroll-mt-4">
        {/* Ô tìm kiếm */}
        <div id="directory-search" className="relative z-[1100] mb-3 rounded-[10px] border border-stone-200 bg-white p-3 shadow-sm">
          <div className="relative">
            <div className="grid grid-cols-[1fr_auto] gap-2.5">
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={(e) => e.key === 'Enter' && runSearch()}
                placeholder="Nhập tên thôn, buôn hoặc địa điểm cần tìm..."
                className="min-h-[46px] w-full rounded-[7px] border-2 border-stone-200 px-3.5 py-2.5 text-[15px] outline-none focus:border-blue-500 focus:shadow-[0_0_0_4px_rgba(59,130,246,.12)]"
              />
              <button
                type="button"
                onClick={runSearch}
                className="inline-flex min-h-[46px] min-w-[82px] items-center justify-center gap-2 whitespace-nowrap rounded-[7px] border border-[#9c3000] bg-[#9c3000] px-3.5 font-semibold text-white shadow-[0_2px_5px_rgba(156,48,0,.16)] hover:bg-[#802000]"
              >
                <i className="fa-solid fa-magnifying-glass text-sm" />
                Tra cứu
              </button>
            </div>
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-[2000] max-h-[245px] overflow-auto rounded-lg border border-stone-200 bg-white shadow-[0_14px_28px_rgba(15,23,42,.14)]">
                {suggestions.map((v) => (
                  <button
                    key={v.name}
                    onClick={() => selectVillage(v.name)}
                    className="w-full border-b border-stone-100 px-3.5 py-3 text-left text-[15px] text-stone-700 last:border-0 hover:bg-stone-50 hover:text-[#9c3000]"
                  >
                    {v.name}
                    {!v.tenantSlug && <span className="ml-2 text-xs text-stone-400">(chưa có cổng thông tin)</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bản đồ + panel */}
        <div className="overflow-hidden rounded-[10px] border border-stone-200 bg-white shadow-[0_5px_16px_rgba(15,23,42,.06)] lg:grid lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="relative">
            {/* Lọc theo loại địa danh — đa chọn, "Tất cả" = hiện hết. Nổi
                trên bản đồ (không phải thanh riêng bên trên) để khớp bố cục
                bản mẫu. */}
            <div className="absolute left-3 right-3 top-3 z-[1000] flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setHiddenCategories(new Set())}
                className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-bold shadow-sm transition-colors ${
                  allCategoriesVisible ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-stone-200 bg-white text-stone-500 hover:border-stone-300'
                }`}
              >
                Tất cả
              </button>
              <button
                type="button"
                onClick={() => setShowBoundaries((v) => !v)}
                className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-bold shadow-sm transition-colors ${
                  showBoundaries ? 'border-stone-700 bg-white text-stone-700' : 'border-stone-200 bg-white text-stone-400'
                }`}
              >
                <i className="fa-solid fa-draw-polygon" />
                Thôn, buôn
              </button>
              <button
                type="button"
                onClick={() => setShowHouseholds((v) => !v)}
                className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-bold shadow-sm transition-colors ${
                  showHouseholds ? 'border-[#9c3000] bg-white text-[#9c3000]' : 'border-stone-200 bg-white text-stone-400'
                }`}
              >
                <i className={`fa-solid ${showHouseholds ? 'fa-eye' : 'fa-eye-slash'}`} />
                Dân cư
              </button>
              {categoriesPresent.map((c) => {
                const visible = !hiddenCategories.has(c.slug);
                return (
                  <button
                    key={c.slug}
                    type="button"
                    onClick={() => toggleCategory(c.slug)}
                    className="inline-flex items-center gap-2 rounded-full border bg-white px-3.5 py-1.5 text-xs font-bold shadow-sm transition-colors"
                    style={visible ? { borderColor: c.color, color: c.color } : { borderColor: '#e7e5e4', color: '#a8a29e' }}
                  >
                    <i className={`fa-solid ${c.icon}`} />
                    {c.label}
                  </button>
                );
              })}
            </div>

            <DirectoryLeaflet
              villages={commune.villages}
              administrativeUnits={administrativeUnits}
              selectedName={selectedName}
              onSelect={selectVillage}
              showHouseholds={showHouseholds}
              showBoundaries={showBoundaries}
              hiddenCategories={hiddenCategories}
            />
            {showLegend && categoriesPresent.length > 0 && (
              <div className="absolute bottom-3 right-3 z-[1000] w-52 rounded-lg border border-stone-200 bg-white/95 p-3 shadow-[0_8px_20px_rgba(15,23,42,.12)] backdrop-blur">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-800">Chú thích</span>
                  <button onClick={() => setShowLegend(false)} className="text-stone-400 hover:text-stone-700">
                    <i className="fa-solid fa-xmark text-xs" />
                  </button>
                </div>
                <div className="space-y-1.5">
                  {categoriesPresent.map((c) => (
                    <div key={c.slug} className="flex items-center gap-2 text-[11px] text-stone-600">
                      <span
                        className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[8px] text-white"
                        style={{ backgroundColor: c.color }}
                      >
                        <i className={`fa-solid ${c.icon}`} />
                      </span>
                      {c.label}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <aside className="border-t border-stone-200 lg:border-l lg:border-t-0">
            <section className="border-b border-stone-200 p-4">
              <span className="mb-3 block text-sm font-bold text-stone-800">Thông tin {commune.name}</span>
              <div className="grid grid-cols-3 gap-2">
                <StatTile icon="fa-map-location-dot" label="Diện tích" value={formatNumber(commune.areaKm2)} unit="km²" color="#16a34a" />
                <StatTile icon="fa-people-group" label="Dân số" value={formatNumber(commune.totalPopulation)} unit="người" color="#e11d48" />
                <StatTile
                  icon="fa-arrow-trend-up"
                  label="Mật độ dân số"
                  value={formatNumber(commune.densityPerKm2)}
                  unit="người/km²"
                  color="#ea580c"
                />
              </div>
              <div className="mt-2 flex items-center gap-2.5 rounded-xl border border-stone-200 bg-stone-50 p-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm">
                  <i className="fa-solid fa-house-chimney" />
                </span>
                <div>
                  <span className="block text-[10px] uppercase tracking-wide text-stone-400">Tổng số hộ</span>
                  <span className="font-serif text-lg font-extrabold text-stone-900">
                    {formatNumber(commune.totalHouseholds)} <span className="text-xs font-semibold text-stone-500">hộ</span>
                  </span>
                </div>
              </div>
            </section>

            {selected && (
              <section className="border-t border-stone-200">
                <div className="flex items-center gap-2 border-b border-stone-200 bg-white px-4 py-3.5 text-sm font-bold text-stone-800">
                  <i className="fa-solid fa-file-lines text-stone-400" />
                  Chi tiết
                </div>
                <div className="p-4">
                  <h2 className="mb-3 font-serif text-lg font-extrabold text-[#9c3000]">{selected.name}</h2>
                  <table className="w-full border-collapse text-[14px]">
                    <tbody>
                      <InfoRow label="Trạng thái" value={selected.tenantSlug ? 'Đã có cổng thông tin' : 'Chưa có cổng thông tin'} />
                      {selected.tenantSlug && <InfoRow label="Tên cổng thông tin" value={selected.tenantName || ''} />}
                      <InfoRow label="Số hộ" value={`${formatNumber(selected.householdCount)} hộ`} />
                      <InfoRow label="Dân số" value={`${formatNumber(selected.populationCount)} người`} />
                      <InfoRow label="Diện tích" value={`${formatNumber(selected.areaKm2)} km²`} />
                    </tbody>
                  </table>
                  {selected.tenantSlug && (
                    <button
                      onClick={() => goToTenant(selected.tenantSlug as string)}
                      className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#9c3000] bg-[#fff7ed] px-4 py-2 text-xs font-bold text-[#9c3000] hover:bg-[#ffedd5]"
                    >
                      Truy cập cổng thông tin
                      <i className="fa-solid fa-arrow-right" />
                    </button>
                  )}
                </div>
              </section>
            )}

            <section id="directory-village-list" className="border-t border-stone-200 scroll-mt-4">
              <div className="flex items-center gap-2 border-b border-stone-200 bg-white px-4 py-3.5 text-sm font-bold text-stone-800">
                <i className="fa-solid fa-list text-stone-400" />
                Danh sách
              </div>
              <div className="p-4">
                <p className="text-sm text-stone-500">
                  <span className="font-bold text-stone-900">{availableCount}</span> / {commune.villages.length} thôn đã có cổng thông tin
                </p>
                <div className="mt-2.5 grid max-h-[360px] gap-2 overflow-y-auto">
                  {commune.villages.map((v, index) => (
                    <VillageListItem key={v.name} index={index} village={v} active={v.name === selectedName} onClick={() => selectVillage(v.name)} />
                  ))}
                </div>
              </div>
            </section>

            <section className="border-t border-stone-200">
              <div className="flex items-center gap-2 border-b border-stone-200 bg-white px-4 py-3.5 text-sm font-bold text-stone-800">
                <i className="fa-solid fa-layer-group text-stone-400" />
                Lớp bản đồ
              </div>
              <div className="space-y-2 p-4">
                <LayerCheckbox label="Ranh giới thôn, buôn" checked={showBoundaries} onChange={() => setShowBoundaries((v) => !v)} />
                <LayerCheckbox label="Dân cư" checked={showHouseholds} onChange={() => setShowHouseholds((v) => !v)} />
                {categoriesPresent.map((c) => (
                  <LayerCheckbox
                    key={c.slug}
                    label={c.label}
                    checked={!hiddenCategories.has(c.slug)}
                    onChange={() => toggleCategory(c.slug)}
                  />
                ))}
              </div>
            </section>
          </aside>
        </div>
      </div>

      <footer className="mx-auto mt-6 w-[min(1120px,calc(100%-32px))] border-t border-stone-300 py-5 text-center text-xs font-semibold text-stone-400">
        Cổng thông tin điện tử {commune.name}
      </footer>
    </div>
  );
}

function StatTile({ icon, label, value, unit, color }: { icon: string; label: string; value: string; unit: string; color: string }) {
  return (
    <div className="rounded-xl border border-stone-200 p-2.5" style={{ backgroundColor: `${color}0d` }}>
      <span className="flex h-7 w-7 items-center justify-center rounded-lg text-xs text-white" style={{ backgroundColor: color }}>
        <i className={`fa-solid ${icon}`} />
      </span>
      <span className="mt-1.5 block text-[9px] uppercase tracking-wide text-stone-500">{label}</span>
      <span className="block font-serif text-sm font-extrabold leading-tight text-stone-900">
        {value} <span className="text-[9px] font-semibold text-stone-500">{unit}</span>
      </span>
    </div>
  );
}

function LayerCheckbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-sm text-stone-700">
      <input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500" />
      {label}
    </label>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-b border-stone-100 last:border-0">
      <th className="w-2/5 py-2.5 pr-3.5 text-left font-extrabold text-stone-700">{label}</th>
      <td className="py-2.5 text-left text-stone-600">{value}</td>
    </tr>
  );
}

function VillageListItem({
  index,
  village,
  active,
  onClick,
}: {
  index: number;
  village: PublicCommuneVillage;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center justify-between gap-3 rounded-[7px] border px-3 py-2.5 text-left text-sm transition-colors ${
        active ? 'border-[#9c3000] bg-[#fff7ed] text-[#9c3000]' : 'border-stone-200 bg-white text-stone-700 hover:border-[#9c3000] hover:text-[#9c3000]'
      }`}
    >
      <span className="inline-flex min-w-0 items-center gap-2">
        <b className="flex h-[26px] min-w-[28px] shrink-0 items-center justify-center rounded-full border border-stone-200 bg-stone-50 text-xs text-stone-900">
          {index + 1}
        </b>
        <span className="min-w-0">
          <span className="block truncate">{village.name}</span>
          {village.tenantSlug && (
            <span className="block text-[10px] text-stone-400">
              {formatNumber(village.householdCount)} hộ · {formatNumber(village.populationCount)} người
            </span>
          )}
        </span>
      </span>
      {!village.tenantSlug && <span className="shrink-0 text-[10px] uppercase tracking-wide text-stone-400">Chưa có</span>}
    </button>
  );
}
