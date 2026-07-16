'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { clientApi } from '@/lib/client-api';
import type { HomeContent, HouseholdLocation, PublicTenant, SecurityTeamResident } from '@/lib/types';

const FamilyGpsMap = dynamic(() => import('./family-gps-map').then((m) => m.FamilyGpsMap), { ssr: false });

export function SecurityTeamResidentsTab({ residents, siteName }: { residents: SecurityTeamResident[]; siteName: string }) {
  const [query, setQuery] = useState('');
  const [locationTarget, setLocationTarget] = useState<SecurityTeamResident | null>(null);

  const q = query.trim().toLowerCase();
  const filtered = !q
    ? residents
    : residents.filter((r) => [r.name, r.cccd, r.phone, r.familyId, r.group].some((f) => (f || '').toLowerCase().includes(q)));

  return (
    <>
      <div className="text-left">
        <h4 className="font-serif text-lg font-bold text-stone-900">Quản Lý Dân Cư (Chỉ xem)</h4>
        <p className="text-xs text-stone-500">Tra cứu thông tin nhân khẩu toàn thôn phục vụ công tác an ninh trật tự. Không có quyền chỉnh sửa.</p>
      </div>

      <div className="space-y-3 text-left">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">
            Danh bạ cư dân toàn {siteName} ({filtered.length}/{residents.length} nhân khẩu)
          </span>
          <div className="relative w-full sm:w-64">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-stone-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm theo tên, Căn Cước, SĐT, mã hộ..."
              className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2 pl-8 pr-3 text-xs text-stone-900 outline-none transition-colors focus:border-primary-500"
            />
          </div>
        </div>

        <div className="table-scroll-wrap rounded-xl border border-stone-200 bg-stone-50">
          <div className="table-scroll">
            <table className="w-full min-w-175 text-left text-xs">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-stone-500">
                  <th className="min-w-40 whitespace-nowrap p-3 font-semibold">Họ và Tên</th>
                  <th className="min-w-35 whitespace-nowrap p-3 font-semibold">Quan hệ với chủ hộ</th>
                  <th className="min-w-30 whitespace-nowrap p-3 font-semibold">Ngày sinh</th>
                  <th className="min-w-35 whitespace-nowrap p-3 font-semibold">Số điện thoại</th>
                  <th className="min-w-25 whitespace-nowrap p-3 font-semibold">Mã hộ</th>
                  <th className="min-w-30 whitespace-nowrap p-3 font-semibold">Địa bàn</th>
                  <th className="min-w-25 whitespace-nowrap p-3 text-right font-semibold">Vị trí</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200/40 text-stone-600">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-4 text-center text-stone-400">
                      Không tìm thấy nhân khẩu phù hợp.
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => (
                    <tr key={r._id} className="transition-colors hover:bg-stone-50">
                      <td className="whitespace-nowrap p-3 font-bold text-stone-900">{r.name}</td>
                      <td className="whitespace-nowrap p-3 text-stone-600">{r.relation || (r.isHouseholder ? 'Chủ hộ' : 'Thành viên')}</td>
                      <td className="whitespace-nowrap p-3 font-mono text-stone-600">{r.dob}</td>
                      <td className="whitespace-nowrap p-3 font-mono text-stone-500">{r.phone || 'Chưa có SĐT'}</td>
                      <td className="whitespace-nowrap p-3 font-mono text-stone-400">{r.familyId}</td>
                      <td className="whitespace-nowrap p-3 text-stone-600">{r.group}</td>
                      <td className="whitespace-nowrap p-3 text-right">
                        <button
                          onClick={() => setLocationTarget(r)}
                          className="rounded bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-600 transition-all hover:bg-emerald-600 hover:text-white"
                        >
                          <i className="fa-solid fa-location-dot" /> Vị trí
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {locationTarget && <ViewLocationModal familyId={locationTarget.familyId} onClose={() => setLocationTarget(null)} />}
    </>
  );
}

function ViewLocationModal({ familyId, onClose }: { familyId: string; onClose: () => void }) {
  const [location, setLocation] = useState<HouseholdLocation | null>(null);
  const [tenant, setTenant] = useState<PublicTenant | undefined>(undefined);
  const [gpsBusy, setGpsBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [loc, tenants, homeContent] = await Promise.all([
        clientApi<HouseholdLocation>(`security-team/households/${familyId}/location`),
        clientApi<PublicTenant[]>('tenants/public'),
        clientApi<HomeContent>('home-content'),
      ]);
      if (!cancelled) {
        setLocation(loc);
        setTenant(tenants.find((t) => t.slug === homeContent.slug) || tenants[0]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [familyId]);

  function updateGps() {
    if (!navigator.geolocation) return;
    setGpsBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const res = await clientApi<{ gpsCoord: { lat: number; lng: number } }>(`security-team/households/${familyId}/gps`, {
          method: 'PATCH',
          body: { lat: position.coords.latitude, lng: position.coords.longitude },
        });
        setLocation((prev) => (prev ? { ...prev, gpsCoord: res.gpsCoord } : prev));
        setGpsBusy(false);
      },
      () => setGpsBusy(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-stone-950/80 p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-stone-200 p-6">
          <h3 className="font-serif text-base font-bold uppercase tracking-wider text-stone-900">Vị Trí Hộ Gia Đình</h3>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 bg-stone-50 text-stone-500 hover:border-red-300 hover:text-red-500">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-6 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="block text-[10px] uppercase text-stone-400">Mã hộ</span>
              <span className="font-mono font-bold text-stone-900">{familyId}</span>
            </div>
            <div>
              <span className="block text-[10px] uppercase text-stone-400">Chủ hộ</span>
              <span className="font-bold text-stone-900">{location?.headName ?? '...'}</span>
            </div>
            <div className="col-span-2">
              <span className="block text-[10px] uppercase text-stone-400">Số nhà</span>
              <span className="font-bold text-stone-900">{location?.houseNumber || 'Chưa cập nhật'}</span>
            </div>
          </div>

          {location && <FamilyGpsMap familyId={familyId} gpsCoord={location.gpsCoord} tenant={tenant} />}

          <div className="flex gap-2">
            <button
              onClick={updateGps}
              disabled={gpsBusy}
              className="flex-1 rounded-xl border border-stone-200 bg-stone-50 py-2 text-[11px] font-bold uppercase tracking-wider text-stone-700 transition-all hover:border-primary-500 disabled:opacity-50"
            >
              <i className="fa-solid fa-location-crosshairs mr-1 text-primary-400" /> Cập nhật vị trí hiện tại
            </button>
            <a
              href={location?.gpsCoord ? `https://www.google.com/maps?q=${location.gpsCoord.lat},${location.gpsCoord.lng}` : undefined}
              target={location?.gpsCoord ? '_blank' : undefined}
              rel="noopener"
              className={`flex-1 rounded-xl bg-emerald-50 py-2 text-center text-[11px] font-bold uppercase tracking-wider text-emerald-600 ${
                location?.gpsCoord ? 'hover:bg-emerald-100' : 'pointer-events-none opacity-40'
              }`}
            >
              <i className="fa-brands fa-google" /> Google Maps
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
