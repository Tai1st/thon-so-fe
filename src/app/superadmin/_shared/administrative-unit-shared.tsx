'use client';

import { useState } from 'react';
import { ClientApiError } from '@/lib/client-api';
import { ADMINISTRATIVE_UNIT_CATEGORIES } from '@/lib/types';
import type { AdministrativeUnitCategory, SuperAdminAdministrativeUnit } from '@/lib/types';
import { ImageUrlInput } from '@/components/image-url-input';

// Xem ghi chú trong superadmin-dashboard.tsx — proxy riêng
// /api/superadmin-backend/* (cookie superadmin_session, không phải session
// thường và không gắn x-tenant-slug).
export async function superAdminClientApi<T>(
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

export type UnitFormState = {
  name: string;
  category: AdministrativeUnitCategory;
  logoUrl: string;
  lat: string;
  lng: string;
  mapsUrl: string;
};

export function emptyUnitForm(): UnitFormState {
  return { name: '', category: 'khac', logoUrl: '', lat: '', lng: '', mapsUrl: '' };
}

export function unitToForm(u: SuperAdminAdministrativeUnit): UnitFormState {
  return {
    name: u.name,
    category: u.category,
    logoUrl: u.logoUrl || '',
    lat: String(u.lat),
    lng: String(u.lng),
    mapsUrl: u.mapsUrl || '',
  };
}

export function categoryIcon(category: AdministrativeUnitCategory): string {
  return ADMINISTRATIVE_UNIT_CATEGORIES.find((c) => c.slug === category)?.icon || 'fa-map-pin';
}

export function categoryLabel(category: AdministrativeUnitCategory): string {
  return ADMINISTRATIVE_UNIT_CATEGORIES.find((c) => c.slug === category)?.label || 'Khác';
}

// Luôn thêm/sửa địa danh trong ngữ cảnh 1 xã cụ thể (trang
// /superadmin/communes/[id]/places) — xã không đổi được ở đây, chỉ hiển
// thị read-only, tenant/địa danh mới luôn gán theo đúng xã đang xem.
export function UnitFormModal({
  unit,
  communeId,
  communeName,
  onClose,
  onSuccess,
}: {
  unit: SuperAdminAdministrativeUnit | null;
  communeId: string;
  communeName: string;
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const [form, setForm] = useState<UnitFormState>(unit ? unitToForm(unit) : emptyUnitForm());
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const name = form.name.trim();
    const lat = Number(form.lat);
    const lng = Number(form.lng);
    if (!name) {
      setError('Vui lòng nhập tên địa danh.');
      return;
    }
    if (!form.lat.trim() || !form.lng.trim() || Number.isNaN(lat) || Number.isNaN(lng)) {
      setError('Vui lòng nhập tọa độ (vĩ độ/kinh độ) hợp lệ.');
      return;
    }
    const body = {
      name,
      category: form.category,
      communeId,
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
            {unit ? `Sửa: ${unit.name}` : 'Thêm địa danh mới'}
          </h3>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-700 bg-stone-800 text-stone-400 hover:border-red-500 hover:text-red-400">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <form onSubmit={submit} className="flex-1 space-y-3 overflow-y-auto p-6">
          <FormField label="Tên địa danh">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="VD: Trụ sở Đảng ủy xã, Quán ăn Cô Ba..."
              className="w-full rounded-xl border border-stone-700 bg-stone-800 px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
            />
          </FormField>
          <FormField label="Loại địa danh">
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as AdministrativeUnitCategory })}
              className="w-full rounded-xl border border-stone-700 bg-stone-800 px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
            >
              {ADMINISTRATIVE_UNIT_CATEGORIES.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.label}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Thuộc xã">
            <div className="w-full rounded-xl border border-stone-800 bg-stone-950 px-3 py-2 text-xs text-stone-400">{communeName}</div>
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
          <ImageUrlInput
            label="Logo (tùy chọn)"
            value={form.logoUrl}
            onChange={(v) => setForm({ ...form, logoUrl: v })}
            uploadUrl="/api/superadmin-backend/uploads"
            variant="dark"
          />
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

export function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">{label}</label>
      {children}
    </div>
  );
}

export function DeleteUnitModal({
  unit,
  onCancel,
  onConfirm,
}: {
  unit: SuperAdminAdministrativeUnit;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm space-y-4 rounded-3xl border border-stone-800 bg-stone-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-base font-bold uppercase tracking-wider text-white">Xác nhận xóa</h3>
          <button
            onClick={onCancel}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-700 bg-stone-800 text-stone-400 hover:border-red-500 hover:text-red-400"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <p className="text-xs text-stone-400">
          Bạn có chắc muốn xóa &quot;{unit.name}&quot;? Địa danh này sẽ không còn hiển thị trên bản đồ danh mục nữa.
        </p>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="w-full rounded-xl border border-stone-700 bg-stone-800 py-2.5 text-xs font-bold uppercase text-stone-300 hover:bg-stone-700"
          >
            Hủy
          </button>
          <button onClick={onConfirm} className="w-full rounded-xl bg-red-600 py-2.5 text-xs font-bold uppercase text-white hover:bg-red-500">
            Xóa
          </button>
        </div>
      </div>
    </div>
  );
}
