'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ClientApiError } from '@/lib/client-api';
import type { SuperAdminAdministrativeUnit } from '@/lib/types';

// Xem ghi chú trong superadmin-dashboard.tsx — proxy riêng
// /api/superadmin-backend/* (cookie superadmin_session, không phải session
// thường và không gắn x-tenant-slug).
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

type FormState = { name: string; logoUrl: string; lat: string; lng: string; mapsUrl: string };
const EMPTY_FORM: FormState = { name: '', logoUrl: '', lat: '', lng: '', mapsUrl: '' };

function toForm(u: SuperAdminAdministrativeUnit): FormState {
  return { name: u.name, logoUrl: u.logoUrl || '', lat: String(u.lat), lng: String(u.lng), mapsUrl: u.mapsUrl || '' };
}

export function AdministrativeUnitsDashboard({ initialUnits }: { initialUnits: SuperAdminAdministrativeUnit[] }) {
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
    const res = await superAdminClientApi<SuperAdminAdministrativeUnit[]>('superadmin/administrative-units');
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
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <div className="flex items-center justify-between border-b border-stone-800 bg-stone-900 p-6">
        <div>
          <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-emerald-500">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> Quản trị hệ thống
          </p>
          <h1 className="font-serif text-lg font-bold uppercase tracking-wide text-white">Trụ sở Cơ quan cấp Xã</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/superadmin" className="rounded-xl border border-stone-700 px-3.5 py-1.5 text-xs font-semibold text-stone-300 hover:border-stone-500">
            <i className="fa-solid fa-arrow-left mr-1" /> Danh sách Tenant
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
          <span className="text-xs text-stone-400">{units.length} cơ quan — hiển thị chung cho mọi tenant cùng 1 xã trên bản đồ danh mục</span>
          <button
            onClick={() => setEditing('new')}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold uppercase text-white hover:bg-emerald-500"
          >
            <i className="fa-solid fa-plus mr-1" /> Thêm cơ quan
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-stone-800 bg-stone-900">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone-800 text-stone-400">
                <th className="p-4 font-semibold">Tên cơ quan</th>
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
                          <i className="fa-solid fa-landmark" />
                        </span>
                      )}
                      {u.name}
                    </div>
                  </td>
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
                  <td colSpan={4} className="p-8 text-center text-stone-500">
                    Chưa có cơ quan nào.
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
          onClose={() => setEditing(null)}
          onSuccess={async (message) => {
            setEditing(null);
            await refresh();
            showNotice('success', message);
          }}
        />
      )}

      {deleting && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm space-y-4 rounded-3xl border border-stone-800 bg-stone-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-base font-bold uppercase tracking-wider text-white">Xác nhận xóa</h3>
              <button
                onClick={() => setDeleting(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-700 bg-stone-800 text-stone-400 hover:border-red-500 hover:text-red-400"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <p className="text-xs text-stone-400">
              Bạn có chắc muốn xóa &quot;{deleting.name}&quot;? Cơ quan này sẽ không còn hiển thị trên bản đồ danh mục nữa.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleting(null)}
                className="w-full rounded-xl border border-stone-700 bg-stone-800 py-2.5 text-xs font-bold uppercase text-stone-300 hover:bg-stone-700"
              >
                Hủy
              </button>
              <button
                onClick={confirmDelete}
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

function UnitFormModal({
  unit,
  onClose,
  onSuccess,
}: {
  unit: SuperAdminAdministrativeUnit | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const [form, setForm] = useState<FormState>(unit ? toForm(unit) : EMPTY_FORM);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const name = form.name.trim();
    const lat = Number(form.lat);
    const lng = Number(form.lng);
    if (!name) {
      setError('Vui lòng nhập tên cơ quan.');
      return;
    }
    if (!form.lat.trim() || !form.lng.trim() || Number.isNaN(lat) || Number.isNaN(lng)) {
      setError('Vui lòng nhập tọa độ (vĩ độ/kinh độ) hợp lệ.');
      return;
    }
    const body = {
      name,
      lat,
      lng,
      logoUrl: form.logoUrl.trim() || undefined,
      mapsUrl: form.mapsUrl.trim() || undefined,
    };
    setSubmitting(true);
    try {
      if (unit) {
        await superAdminClientApi(`superadmin/administrative-units/${unit._id}`, { method: 'PATCH', body });
        onSuccess(`Đã cập nhật "${name}".`);
      } else {
        await superAdminClientApi('superadmin/administrative-units', { method: 'POST', body });
        onSuccess(`Đã thêm "${name}".`);
      }
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : 'Không thể lưu.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/70 p-4">
      <div className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-stone-800 bg-stone-900 shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-stone-800 p-6">
          <h3 className="font-serif text-base font-bold uppercase tracking-wider text-white">
            {unit ? `Sửa: ${unit.name}` : 'Thêm cơ quan mới'}
          </h3>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-700 bg-stone-800 text-stone-400 hover:border-red-500 hover:text-red-400">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <form onSubmit={submit} className="flex-1 space-y-3 overflow-y-auto p-6">
          <FormField label="Tên cơ quan">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="VD: Trụ sở Đảng ủy xã"
              className="w-full rounded-xl border border-stone-700 bg-stone-800 px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
            />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Vĩ độ (lat)">
              <input
                value={form.lat}
                onChange={(e) => setForm({ ...form, lat: e.target.value })}
                placeholder="13.0348038"
                className="w-full rounded-xl border border-stone-700 bg-stone-800 px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
              />
            </FormField>
            <FormField label="Kinh độ (lng)">
              <input
                value={form.lng}
                onChange={(e) => setForm({ ...form, lng: e.target.value })}
                placeholder="108.3259734"
                className="w-full rounded-xl border border-stone-700 bg-stone-800 px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
              />
            </FormField>
          </div>
          <FormField label="URL Logo (tùy chọn)">
            <input
              value={form.logoUrl}
              onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
              placeholder="https://..."
              className="w-full rounded-xl border border-stone-700 bg-stone-800 px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
            />
          </FormField>
          <FormField label="Link Google Maps (tùy chọn)">
            <input
              value={form.mapsUrl}
              onChange={(e) => setForm({ ...form, mapsUrl: e.target.value })}
              placeholder="https://www.google.com/maps/..."
              className="w-full rounded-xl border border-stone-700 bg-stone-800 px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
            />
          </FormField>

          {error && <p className="text-[11px] font-semibold text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-emerald-600 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-lg transition-all hover:bg-emerald-500 disabled:opacity-50"
          >
            {submitting ? 'Đang lưu...' : 'Lưu'}
          </button>
        </form>
      </div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">{label}</label>
      {children}
    </div>
  );
}
