'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ClientApiError } from '@/lib/client-api';
import type { CommuneDetail, SuperAdminAdministrativeUnit } from '@/lib/types';
import { categoryIcon, categoryLabel, DeleteUnitModal, superAdminClientApi, UnitFormModal } from '../../../_shared/administrative-unit-shared';

export function CommunePlacesDashboard({
  commune,
  initialUnits,
}: {
  commune: CommuneDetail;
  initialUnits: SuperAdminAdministrativeUnit[];
}) {
  const router = useRouter();
  const [units, setUnits] = useState(initialUnits);
  const [editing, setEditing] = useState<SuperAdminAdministrativeUnit | 'new' | null>(null);
  const [deleting, setDeleting] = useState<SuperAdminAdministrativeUnit | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  function showNotice(type: 'success' | 'error', text: string) {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 4000);
  }

  async function refresh() {
    const res = await superAdminClientApi<SuperAdminAdministrativeUnit[]>(`superadmin/administrative-units?communeId=${commune._id}`);
    setUnits(res);
  }

  async function handleLogout() {
    await fetch('/api/superadmin/auth/logout', { method: 'POST' });
    router.push('/superadmin/login');
    router.refresh();
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await superAdminClientApi(`superadmin/administrative-units/${deleting._id}`, { method: 'DELETE' });
      setDeleting(null);
      await refresh();
      showNotice('success', `Đã xóa "${deleting.name}".`);
    } catch (err) {
      showNotice('error', err instanceof ClientApiError ? err.message : 'Không thể xóa.');
    }
  }

  return (
    <div className="min-h-dvh bg-stone-950 text-stone-100">
      <div className="flex items-center justify-between border-b border-stone-800 bg-stone-900 p-6">
        <div>
          <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-emerald-500">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> Quản trị hệ thống
          </p>
          <h1 className="font-serif text-lg font-bold uppercase tracking-wide text-white">Địa danh: {commune.name}</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/superadmin/communes/${commune._id}`}
            className="rounded-xl border border-stone-700 px-3.5 py-1.5 text-xs font-semibold text-stone-300 hover:border-stone-500"
          >
            <i className="fa-solid fa-map mr-1" /> Xem bản đồ
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

      <div className="mx-auto max-w-5xl space-y-6 p-6">
        {notice && (
          <div
            className={`rounded-xl border p-4 text-xs ${
              notice.type === 'success'
                ? 'border-emerald-800 bg-emerald-950/50 text-emerald-400'
                : 'border-red-800 bg-red-950/50 text-red-400'
            }`}
          >
            {notice.text}
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-xs text-stone-400">
            {units.length} địa danh của xã &quot;{commune.name}&quot; — trụ sở cơ quan, quán ăn, tạp hóa... hiển thị trên bản đồ danh mục
          </span>
          <button
            onClick={() => setEditing('new')}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold uppercase text-white hover:bg-emerald-500"
          >
            <i className="fa-solid fa-plus mr-1" /> Thêm địa danh
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-stone-800 bg-stone-900">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone-800 text-stone-400">
                <th className="p-4 font-semibold">Tên địa danh</th>
                <th className="p-4 font-semibold">Loại</th>
                <th className="p-4 font-semibold">Tọa độ</th>
                <th className="p-4 font-semibold">Link Google Maps</th>
                <th className="p-4 text-right font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800">
              {units.map((u) => (
                <tr key={u._id} className="hover:bg-stone-800/50">
                  <td className="p-4 font-bold text-white">
                    <div className="flex items-center gap-2.5">
                      {u.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={u.logoUrl} alt={u.name} className="h-8 w-8 shrink-0 rounded-lg object-cover" />
                      ) : (
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-stone-800 text-stone-500">
                          <i className={`fa-solid ${categoryIcon(u.category)}`} />
                        </span>
                      )}
                      {u.name}
                    </div>
                  </td>
                  <td className="p-4 text-stone-300">{categoryLabel(u.category)}</td>
                  <td className="p-4 font-mono text-stone-400">
                    {u.lat}, {u.lng}
                  </td>
                  <td className="max-w-60 truncate p-4 text-stone-400">
                    {u.mapsUrl ? (
                      <a href={u.mapsUrl} target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline">
                        {u.mapsUrl}
                      </a>
                    ) : (
                      <span className="text-stone-600">—</span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditing(u)}
                        className="rounded bg-stone-800 px-2.5 py-1 text-[11px] font-semibold text-stone-300 transition-all hover:bg-stone-700"
                      >
                        Sửa
                      </button>
                      <button
                        onClick={() => setDeleting(u)}
                        className="rounded bg-red-950/50 px-2.5 py-1 text-[11px] font-semibold text-red-400 transition-all hover:bg-red-600 hover:text-white"
                      >
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {units.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-stone-500">
                    Chưa có địa danh nào cho xã này.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <UnitFormModal
          unit={editing === 'new' ? null : editing}
          communeId={commune._id}
          communeName={commune.name}
          onClose={() => setEditing(null)}
          onSuccess={async (message) => {
            setEditing(null);
            await refresh();
            showNotice('success', message);
          }}
        />
      )}

      {deleting && <DeleteUnitModal unit={deleting} onCancel={() => setDeleting(null)} onConfirm={confirmDelete} />}
    </div>
  );
}
