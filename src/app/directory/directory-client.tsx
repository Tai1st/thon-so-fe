'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import type { PublicCommune } from '@/lib/types';

const DirectoryLeaflet = dynamic(() => import('./directory-leaflet').then((m) => m.DirectoryLeaflet), { ssr: false });

// Trang danh mục tra cứu thôn/buôn ở domain gốc (mục 4.1 tài liệu thiết
// kế) — dựa theo bố cục tra-cuu.html gốc: ô tìm kiếm + bản đồ + danh sách,
// bấm vào 1 thôn đã có cổng thông tin sẽ điều hướng sang đúng subdomain
// của thôn đó, cùng domain hiện tại (không hardcode tên miền).
export function DirectoryClient({ communes }: { communes: PublicCommune[] }) {
  const [query, setQuery] = useState('');
  const [hovered, setHovered] = useState<string | null>(null);

  function goToTenant(slug: string) {
    const host = window.location.host;
    window.location.href = `${window.location.protocol}//${slug}.${host}`;
  }

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

  return (
    <main className="min-h-screen bg-stone-50">
      {communes.map((commune) => (
        <CommuneSection key={commune._id} commune={commune} query={query} setQuery={setQuery} hovered={hovered} setHovered={setHovered} onNavigate={goToTenant} />
      ))}
    </main>
  );
}

function CommuneSection({
  commune,
  query,
  setQuery,
  hovered,
  setHovered,
  onNavigate,
}: {
  commune: PublicCommune;
  query: string;
  setQuery: (v: string) => void;
  hovered: string | null;
  setHovered: (v: string | null) => void;
  onNavigate: (slug: string) => void;
}) {
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commune.villages;
    return commune.villages.filter((v) => v.name.toLowerCase().includes(q));
  }, [commune.villages, query]);

  const availableCount = commune.villages.filter((v) => v.tenantSlug).length;

  return (
    <section className="mx-auto max-w-6xl space-y-6 px-4 py-10">
      <div className="text-center">
        <p className="text-[10px] font-bold uppercase tracking-widest text-primary-600">Cổng thông tin điện tử</p>
        <h1 className="font-serif text-2xl font-black text-stone-900 sm:text-3xl">{commune.name}</h1>
        <p className="mt-1 text-sm text-stone-500">Tra cứu thông tin thôn/buôn trong một chạm</p>
      </div>

      <div className="mx-auto max-w-md">
        <div className="flex items-center gap-2 rounded-2xl border border-stone-200 bg-white px-4 py-2.5 shadow-sm">
          <i className="fa-solid fa-magnifying-glass text-stone-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nhập tên thôn, buôn..."
            className="w-full text-sm text-stone-800 outline-none placeholder:text-stone-400"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <DirectoryLeaflet villages={commune.villages} highlightName={hovered} onNavigate={onNavigate} />
        </div>

        <div className="space-y-3 lg:col-span-4">
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span>
              <span className="font-bold text-stone-900">{availableCount}</span> / {commune.villages.length} thôn đã có cổng thông tin
            </span>
          </div>
          <div className="max-h-[60vh] space-y-2 overflow-y-auto rounded-2xl border border-stone-200 bg-white p-2 sm:max-h-[70vh]">
            {filtered.map((v) => (
              <button
                key={v.name}
                disabled={!v.tenantSlug}
                onMouseEnter={() => setHovered(v.name)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => v.tenantSlug && onNavigate(v.tenantSlug)}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                  v.tenantSlug ? 'text-stone-800 hover:bg-primary-50' : 'cursor-not-allowed text-stone-400'
                }`}
              >
                <span className="font-semibold">{v.name}</span>
                {v.tenantSlug ? (
                  <i className="fa-solid fa-chevron-right text-xs text-primary-500" />
                ) : (
                  <span className="text-[10px] uppercase tracking-wide text-stone-400">Chưa có</span>
                )}
              </button>
            ))}
            {filtered.length === 0 && <p className="p-4 text-center text-xs text-stone-400">Không tìm thấy thôn/buôn phù hợp.</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
