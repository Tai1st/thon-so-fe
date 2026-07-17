'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { CommuneDetail, CommuneVillage, SuperAdminAdministrativeUnit } from '@/lib/types';

const CommuneLeaflet = dynamic(() => import('./commune-leaflet').then((m) => m.CommuneLeaflet), { ssr: false });

// Bản đồ xã ở superadmin — cùng bố cục/phong cách với trang danh mục công
// khai (DirectoryClient ở "/"): header thương hiệu nhẹ, ô tìm kiếm thôn, 2
// panel bên phải (Chi tiết/Danh sách). Khác biệt: có thanh điều hướng
// superadmin riêng (đăng xuất, quay lại), và "Chi tiết" hiện trạng thái
// tạo tenant thay vì chỉ link sang cổng thông tin.
export function CommuneMapClient({
  initialCommune,
  administrativeUnits,
}: {
  initialCommune: CommuneDetail;
  administrativeUnits: SuperAdminAdministrativeUnit[];
}) {
  const router = useRouter();
  const [commune] = useState(initialCommune);
  const [query, setQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [showPlaces, setShowPlaces] = useState(true);

  async function handleLogout() {
    await fetch('/api/superadmin/auth/logout', { method: 'POST' });
    router.push('/superadmin/login');
    router.refresh();
  }

  const claimedCount = commune.villages.filter((v) => v.claimed).length;
  const selected = commune.villages.find((v) => v.name === selectedName) || null;

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return commune.villages.filter((v) => v.name.toLowerCase().includes(q)).slice(0, 8);
  }, [commune.villages, query]);

  function selectVillage(name: string) {
    setSelectedName(name);
    setShowSuggestions(false);
  }

  function goToVillage(village: CommuneVillage, index: number) {
    if (village.claimed) selectVillage(village.name);
    else router.push(`/superadmin/communes/${commune._id}/villages/${index}`);
  }

  function runSearch() {
    const q = query.trim().toLowerCase();
    const index = commune.villages.findIndex((v) => v.name.toLowerCase().includes(q));
    if (index >= 0) goToVillage(commune.villages[index], index);
  }

  return (
    <div className="min-h-dvh bg-stone-50">
      {/* Thanh superadmin — đăng xuất/điều hướng, không phải header thương hiệu công khai */}
      <div className="flex items-center justify-between border-b border-stone-800 bg-stone-900 p-4 text-stone-100">
        <div>
          <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-emerald-500">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> Bản đồ Xã
          </p>
          <h1 className="font-serif text-base font-bold uppercase tracking-wide text-white">{commune.name}</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/superadmin/communes/${commune._id}/places`}
            className="rounded-xl border border-stone-700 px-3.5 py-1.5 text-xs font-semibold text-stone-300 hover:border-stone-500"
          >
            <i className="fa-solid fa-map-pin mr-1" /> Địa danh
          </Link>
          <Link href="/superadmin/communes" className="rounded-xl border border-stone-700 px-3.5 py-1.5 text-xs font-semibold text-stone-300 hover:border-stone-500">
            <i className="fa-solid fa-arrow-left mr-1" /> Danh sách Xã
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-xl bg-red-950/50 px-3.5 py-1.5 text-xs font-bold text-red-400 transition-all hover:bg-red-600 hover:text-white"
          >
            <i className="fa-solid fa-right-from-bracket" /> Đăng xuất
          </button>
        </div>
      </div>

      <div className="mx-auto mt-4.5 w-[min(1120px,calc(100%-32px))] pb-8">
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
                    onClick={() => goToVillage(v, commune.villages.indexOf(v))}
                    className="w-full border-b border-stone-100 px-3.5 py-3 text-left text-[15px] text-stone-700 last:border-0 hover:bg-stone-50 hover:text-[#9c3000]"
                  >
                    {v.name}
                    {!v.claimed && <span className="ml-2 text-xs text-stone-400">(chưa có tenant)</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chú thích trạng thái + bật/tắt lớp địa danh */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-bold text-stone-500">
            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-600" /> Đã có tenant ({claimedCount})
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-bold text-stone-500">
            <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" /> Chưa có — bấm để tạo ({commune.villages.length - claimedCount})
          </span>
          <button
            type="button"
            onClick={() => setShowPlaces((v) => !v)}
            className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors ${
              showPlaces ? 'border-blue-700 bg-blue-50 text-blue-700' : 'border-stone-200 bg-white text-stone-400'
            }`}
          >
            <i className={`fa-solid ${showPlaces ? 'fa-eye' : 'fa-eye-slash'}`} />
            Địa danh
          </button>
        </div>

        {/* Bản đồ + panel */}
        <div className="grid grid-cols-1 overflow-hidden rounded-[10px] border border-stone-200 bg-white shadow-[0_5px_16px_rgba(15,23,42,.06)] lg:grid-cols-[minmax(0,1fr)_380px]">
          <CommuneLeaflet
            villages={commune.villages}
            administrativeUnits={administrativeUnits}
            selectedName={selectedName}
            onSelect={selectVillage}
            onCreateTenant={(index) => router.push(`/superadmin/communes/${commune._id}/villages/${index}`)}
            showPlaces={showPlaces}
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
                        <InfoRow label="Trạng thái" value={selected.claimed ? 'Đã tạo tenant' : 'Chưa có tenant'} />
                        {selected.claimed && <InfoRow label="Tên cổng thông tin" value={selected.tenantName || ''} />}
                        {selected.claimed && <InfoRow label="Subdomain" value={selected.tenantSlug || ''} />}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed text-stone-500">
                    Chọn 1 thôn/buôn đã có tenant trên bản đồ hoặc trong danh sách bên dưới để xem chi tiết. Thôn chưa có
                    tenant — bấm trực tiếp để tạo mới.
                  </p>
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
                  <span className="font-bold text-stone-900">{claimedCount}</span> / {commune.villages.length} thôn đã tạo tenant
                </p>
                <div className="mt-2.5 grid max-h-[360px] gap-2 overflow-y-auto">
                  {commune.villages.map((v, index) => (
                    <VillageListItem key={v.name} index={index} village={v} active={v.name === selectedName} onClick={() => goToVillage(v, index)} />
                  ))}
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
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
  village: CommuneVillage;
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
      {village.claimed ? (
        <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-emerald-600">Đã tạo</span>
      ) : (
        <span className="shrink-0 text-[10px] uppercase tracking-wide text-amber-600">Chưa có</span>
      )}
    </button>
  );
}
