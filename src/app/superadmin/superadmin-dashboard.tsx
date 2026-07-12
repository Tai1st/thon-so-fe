'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ClientApiError } from '@/lib/client-api';
import type { TenantRow } from './page';
import type { CommuneDetail, CommuneListItem } from '@/lib/types';

// Dùng chung clientApi() nhưng trỏ tới /api/superadmin-backend/* (không
// phải /api/backend/*) — 2 proxy khác nhau vì cookie khác nhau (session
// vs superadmin_session). Truyền path đầy đủ qua clientApi's path param.
async function superAdminClientApi<T>(
  path: string,
  options: { method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'; body?: unknown } = {},
): Promise<T> {
  const res = await fetch(`/api/superadmin-backend/${path}`, {
    method: options.method || 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ClientApiError(res.status, data.message || 'Lỗi gọi API.');
  return data as T;
}

export function SuperAdminDashboard({
  initialTenants,
  communes,
}: {
  initialTenants: TenantRow[];
  communes: CommuneListItem[];
}) {
  const router = useRouter();
  const [tenants, setTenants] = useState(initialTenants);
  const [assigningTenant, setAssigningTenant] = useState<TenantRow | null>(null);
  const [deletingTenant, setDeletingTenant] = useState<TenantRow | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const communeById = new Map(communes.map((c) => [c._id, c]));

  function showNotice(type: 'success' | 'error', text: string) {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 4000);
  }

  async function refresh() {
    const res = await superAdminClientApi<TenantRow[]>('superadmin/tenants');
    setTenants(res);
  }

  async function toggleArchive(tenant: TenantRow) {
    try {
      await superAdminClientApi(`superadmin/tenants/${tenant._id}`, {
        method: 'PATCH',
        body: { archived: !tenant.archivedAt },
      });
      await refresh();
      showNotice('success', tenant.archivedAt ? `Đã mở khóa "${tenant.name}".` : `Đã khóa "${tenant.name}".`);
    } catch (err) {
      showNotice('error', err instanceof ClientApiError ? err.message : 'Không thể cập nhật tenant.');
    }
  }

  async function handleLogout() {
    await fetch('/api/superadmin/auth/logout', { method: 'POST' });
    router.push('/superadmin/login');
    router.refresh();
  }

  async function confirmDeleteTenant() {
    if (!deletingTenant) return;
    try {
      await superAdminClientApi(`superadmin/tenants/${deletingTenant._id}`, { method: 'DELETE' });
      setDeletingTenant(null);
      await refresh();
      showNotice('success', `Đã xóa tenant "${deletingTenant.name}".`);
    } catch (err) {
      showNotice('error', err instanceof ClientApiError ? err.message : 'Không thể xóa tenant.');
    }
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <div className="flex items-center justify-between border-b border-stone-800 bg-stone-900 p-6">
        <div>
          <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-emerald-500">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> Quản trị hệ thống
          </p>
          <h1 className="font-serif text-lg font-bold uppercase tracking-wide text-white">Danh sách Tenant (Thôn)</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/superadmin/communes"
            className="rounded-xl border border-stone-700 px-3.5 py-1.5 text-xs font-semibold text-stone-300 hover:border-stone-500"
          >
            <i className="fa-solid fa-map mr-1" /> Quản lý Xã (KMZ)
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
          <span className="text-xs text-stone-400">{tenants.length} tenant</span>
          <Link
            href="/superadmin/communes"
            className="rounded-xl border border-stone-700 px-4 py-2 text-xs font-semibold text-stone-300 hover:border-emerald-500 hover:text-emerald-400"
          >
            <i className="fa-solid fa-map-location-dot mr-1" /> Tạo tenant mới từ bản đồ
          </Link>
        </div>

        <div className="overflow-x-auto rounded-xl border border-stone-800 bg-stone-900">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone-800 text-stone-400">
                <th className="p-4 font-semibold">Tên thôn</th>
                <th className="p-4 font-semibold">Slug (subdomain)</th>
                <th className="p-4 font-semibold">Thuộc xã</th>
                <th className="p-4 font-semibold text-center">Tài khoản</th>
                <th className="p-4 font-semibold text-center">Nhân khẩu</th>
                <th className="p-4 font-semibold text-center">Trạng thái</th>
                <th className="p-4 text-right font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800">
              {tenants.map((t) => (
                <tr key={t._id} className="hover:bg-stone-800/50">
                  <td className="p-4 font-bold text-white">{t.name}</td>
                  <td className="p-4 font-mono text-stone-400">{t.slug}</td>
                  <td className="p-4 text-stone-300">
                    {t.communeId && communeById.has(t.communeId) ? (
                      communeById.get(t.communeId)!.name
                    ) : (
                      <span className="text-stone-600">Chưa gán</span>
                    )}
                  </td>
                  <td className="p-4 text-center text-stone-300">{t.accountCount}</td>
                  <td className="p-4 text-center text-stone-300">{t.residentCount}</td>
                  <td className="p-4 text-center">
                    {t.archivedAt ? (
                      <span className="rounded-full bg-red-950/50 px-2 py-1 text-[9px] font-extrabold uppercase tracking-wider text-red-400">
                        Đã khóa
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-950/50 px-2 py-1 text-[9px] font-extrabold uppercase tracking-wider text-emerald-400">
                        Đang hoạt động
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setAssigningTenant(t)}
                        className="rounded bg-stone-800 px-2.5 py-1 text-[11px] font-semibold text-stone-300 transition-all hover:bg-stone-700"
                      >
                        Sửa
                      </button>
                      <button
                        onClick={() => toggleArchive(t)}
                        className={`rounded px-2.5 py-1 text-[11px] font-semibold transition-all ${
                          t.archivedAt
                            ? 'bg-emerald-950/50 text-emerald-400 hover:bg-emerald-600 hover:text-white'
                            : 'bg-red-950/50 text-red-400 hover:bg-red-600 hover:text-white'
                        }`}
                      >
                        {t.archivedAt ? 'Mở khóa' : 'Khóa'}
                      </button>
                      <button
                        onClick={() => setDeletingTenant(t)}
                        className="rounded bg-red-950/50 px-2.5 py-1 text-[11px] font-semibold text-red-400 transition-all hover:bg-red-600 hover:text-white"
                      >
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {tenants.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-stone-500">
                    Chưa có tenant nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {assigningTenant && (
        <AssignVillageModal
          tenant={assigningTenant}
          communes={communes}
          onClose={() => setAssigningTenant(null)}
          onSuccess={async (message) => {
            setAssigningTenant(null);
            await refresh();
            showNotice('success', message);
          }}
        />
      )}

      {deletingTenant && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm space-y-4 rounded-3xl border border-stone-800 bg-stone-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-base font-bold uppercase tracking-wider text-white">Xác nhận xóa tenant</h3>
              <button
                onClick={() => setDeletingTenant(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-700 bg-stone-800 text-stone-400 hover:border-red-500 hover:text-red-400"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <p className="text-xs text-stone-400">
              Bạn có chắc muốn xóa tenant &quot;{deletingTenant.name}&quot;? Toàn bộ tài khoản, nhân khẩu và dữ liệu liên
              quan sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeletingTenant(null)}
                className="w-full rounded-xl border border-stone-700 bg-stone-800 py-2.5 text-xs font-bold uppercase text-stone-300 hover:bg-stone-700"
              >
                Hủy
              </button>
              <button
                onClick={confirmDeleteTenant}
                className="w-full rounded-xl bg-red-600 py-2.5 text-xs font-bold uppercase text-white hover:bg-red-500"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AssignVillageModal({
  tenant,
  communes,
  onClose,
  onSuccess,
}: {
  tenant: TenantRow;
  communes: CommuneListItem[];
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const [selectedCommuneId, setSelectedCommuneId] = useState(tenant.communeId || '');
  const [communeDetail, setCommuneDetail] = useState<CommuneDetail | null>(null);
  const [selectedVillageIndex, setSelectedVillageIndex] = useState<number | null>(tenant.communeVillageIndex);
  const [loadingVillages, setLoadingVillages] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function loadVillages(communeId: string) {
    setLoadingVillages(true);
    setCommuneDetail(null);
    try {
      const data = await superAdminClientApi<CommuneDetail>(`superadmin/communes/${communeId}`);
      setCommuneDetail(data);
    } catch {
      setError('Không tải được danh sách thôn của xã này.');
    } finally {
      setLoadingVillages(false);
    }
  }

  function selectCommune(communeId: string) {
    setSelectedCommuneId(communeId);
    setSelectedVillageIndex(communeId === tenant.communeId ? tenant.communeVillageIndex : null);
    setError('');
    if (communeId) loadVillages(communeId);
    else setCommuneDetail(null);
  }

  async function submitAssign() {
    setError('');
    if (selectedCommuneId && selectedVillageIndex === null) {
      setError('Vui lòng chọn 1 thôn trong xã.');
      return;
    }
    setSubmitting(true);
    try {
      await superAdminClientApi(`superadmin/tenants/${tenant._id}/assign-village`, {
        method: 'PATCH',
        body: selectedCommuneId ? { communeId: selectedCommuneId, villageIndex: selectedVillageIndex } : { communeId: null },
      });
      onSuccess(selectedCommuneId ? `Đã gán "${tenant.name}" vào xã đã chọn.` : `Đã bỏ gán xã khỏi "${tenant.name}".`);
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : 'Không thể cập nhật.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/70 p-4">
      <div className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-stone-800 bg-stone-900 shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-stone-800 p-6">
          <h3 className="font-serif text-base font-bold uppercase tracking-wider text-white">Sửa: {tenant.name}</h3>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-700 bg-stone-800 text-stone-400 hover:border-red-500 hover:text-red-400">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-6">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">Thuộc xã</label>
            <select
              value={selectedCommuneId}
              onChange={(e) => selectCommune(e.target.value)}
              className="w-full rounded-xl border border-stone-700 bg-stone-800 px-3 py-2 text-xs text-white outline-none transition-colors focus:border-emerald-500"
            >
              <option value="">— Không gán xã nào —</option>
              {communes.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {selectedCommuneId && (
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">Chọn thôn</label>
              {loadingVillages && <p className="text-xs text-stone-500">Đang tải...</p>}
              {communeDetail && (
                <div className="max-h-64 space-y-1.5 overflow-y-auto rounded-xl border border-stone-800 p-2">
                  {communeDetail.villages.map((v, index) => {
                    const isOtherTenant = v.claimed && v.tenantId !== tenant._id;
                    return (
                      <label
                        key={index}
                        className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${
                          isOtherTenant ? 'cursor-not-allowed text-stone-600' : 'cursor-pointer text-stone-200 hover:bg-stone-800'
                        }`}
                      >
                        <input
                          type="radio"
                          name="village"
                          disabled={isOtherTenant}
                          checked={selectedVillageIndex === index}
                          onChange={() => setSelectedVillageIndex(index)}
                        />
                        {v.name}
                        {isOtherTenant && <span className="text-[10px] text-stone-600">(đã có tenant khác)</span>}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {error && <p className="text-[11px] font-semibold text-red-400">{error}</p>}
          <button
            onClick={submitAssign}
            disabled={submitting}
            className="w-full rounded-xl bg-emerald-600 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-lg transition-all hover:bg-emerald-500 disabled:opacity-50"
          >
            {submitting ? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>
      </div>
    </div>
  );
}
