'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import type { AdministrativeUnitItem, PublicCommune, PublicCommuneVillage } from '@/lib/types';

const DirectoryLeaflet = dynamic(() => import('./directory-leaflet').then((m) => m.DirectoryLeaflet), { ssr: false });

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
      <main className="flex min-h-screen items-center justify-center bg-stone-50 px-4 text-center">
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
      className="min-h-screen"
      style={{
        background:
          'radial-gradient(circle at 18% 12%, rgba(22,163,74,.10), transparent 30%), radial-gradient(circle at 82% 6%, rgba(14,165,233,.09), transparent 28%), linear-gradient(180deg, #f5fbf7 0%, #eef8f1 42%, #e8f5ef 100%)',
      }}
    >
      <CommuneSection commune={commune} administrativeUnits={administrativeUnits} />
    </div>
  );
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
  const [showAdminUnits, setShowAdminUnits] = useState(true);

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
      <header className="grid grid-cols-1 items-center gap-4 border-b border-stone-200 bg-white px-6 py-4.5 sm:grid-cols-[1fr_auto]">
        <div className="flex items-center gap-3.5">
          <img src="/logo.png" alt="Logo" className="h-14 w-14 rounded-2xl border border-orange-200 object-cover shadow-sm" />
          <div>
            <h1 className="font-serif text-2xl font-extrabold leading-tight text-[#9c3000]">{commune.name}</h1>
            <span className="mt-1 block text-sm text-stone-500">Tra cứu thông tin thôn/buôn trong một chạm</span>
          </div>
        </div>
      </header>

      <div className="mx-auto mt-4.5 w-[min(1120px,calc(100%-32px))]">
        {/* Ô tìm kiếm */}
        <div className="relative z-[1100] mb-3 rounded-[10px] border border-stone-200 bg-white p-3 shadow-sm">
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
                placeholder="Nhập tên thôn, buôn..."
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

        {/* Bật/tắt lớp hiển thị trên bản đồ */}
        <div className="mb-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowHouseholds((v) => !v)}
            className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors ${
              showHouseholds ? 'border-[#9c3000] bg-[#fff7ed] text-[#9c3000]' : 'border-stone-200 bg-white text-stone-400'
            }`}
          >
            <i className={`fa-solid ${showHouseholds ? 'fa-eye' : 'fa-eye-slash'}`} />
            Dân cư
          </button>
          <button
            type="button"
            onClick={() => setShowAdminUnits((v) => !v)}
            className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors ${
              showAdminUnits ? 'border-blue-700 bg-blue-50 text-blue-700' : 'border-stone-200 bg-white text-stone-400'
            }`}
          >
            <i className={`fa-solid ${showAdminUnits ? 'fa-eye' : 'fa-eye-slash'}`} />
            Cơ quan nhà nước
          </button>
        </div>

        {/* Bản đồ + panel */}
        <div className="grid grid-cols-1 overflow-hidden rounded-[10px] border border-stone-200 bg-white shadow-[0_5px_16px_rgba(15,23,42,.06)] lg:grid-cols-[minmax(0,1fr)_380px]">
          <DirectoryLeaflet
            villages={commune.villages}
            administrativeUnits={administrativeUnits}
            selectedName={selectedName}
            onSelect={selectVillage}
            showHouseholds={showHouseholds}
            showAdminUnits={showAdminUnits}
          />

          <aside className="border-t border-stone-200 lg:border-l lg:border-t-0">
            <section>
              <div className="flex items-center gap-2 border-b border-stone-200 bg-white px-4 py-3.5 text-sm font-bold text-stone-800">
                <i className="fa-solid fa-file-lines text-stone-400" />
                Chi tiết
              </div>
              <div className="p-4">
                {selected ? (
                  <div>
                    <h2 className="mb-3 font-serif text-lg font-extrabold text-[#9c3000]">{selected.name}</h2>
                    <table className="w-full border-collapse text-[14px]">
                      <tbody>
                        <InfoRow label="Trạng thái" value={selected.tenantSlug ? 'Đã có cổng thông tin' : 'Chưa có cổng thông tin'} />
                        {selected.tenantSlug && <InfoRow label="Tên cổng thông tin" value={selected.tenantName || ''} />}
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
                ) : (
                  <p className="text-sm leading-relaxed text-stone-500">Chọn 1 thôn/buôn trên bản đồ hoặc trong danh sách bên dưới để xem chi tiết.</p>
                )}
              </div>
            </section>

            <section className="border-t border-stone-200">
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
          </aside>
        </div>
      </div>

      <footer className="mx-auto mt-6 w-[min(1120px,calc(100%-32px))] border-t border-stone-300 py-5 text-center text-xs font-semibold text-stone-400">
        Cổng thông tin điện tử {commune.name}
      </footer>
    </div>
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
        <span className="truncate">{village.name}</span>
      </span>
      {!village.tenantSlug && <span className="shrink-0 text-[10px] uppercase tracking-wide text-stone-400">Chưa có</span>}
    </button>
  );
}
