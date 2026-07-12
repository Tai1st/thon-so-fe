'use client';

import { useState } from 'react';
import { clientApi, ClientApiError } from '@/lib/client-api';
import type { PermissionLevel, PermissionMatrix, RoleFieldAccess } from '@/lib/types';

const ROLES: { key: keyof PermissionMatrix; label: string }[] = [
  { key: 'resident', label: 'Cư dân' },
  { key: 'association-officer', label: 'Cán bộ Hội' },
  { key: 'village-head', label: 'Trưởng thôn' },
  { key: 'security-team', label: 'Tổ ANTT' },
  { key: 'admin', label: 'Admin' },
];

const FIELDS: { key: keyof RoleFieldAccess; label: string }[] = [
  { key: 'cccd', label: 'Trường Số Căn Cước' },
  { key: 'dob', label: 'Trường Ngày sinh' },
  { key: 'villageFund', label: 'Sổ sách Quỹ thôn' },
  { key: 'gpsAddress', label: 'Tọa độ Địa lý GPS' },
];

const LEVEL_LABEL: Record<PermissionLevel, string> = { view: 'Xem', 'view-edit': 'Xem & Sửa', locked: 'Khóa quyền' };

export function AdminPermissionsTab({
  permissions,
  onPermissionsChange,
}: {
  permissions: PermissionMatrix;
  onPermissionsChange: (p: PermissionMatrix) => void;
}) {
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  function showNotice(type: 'success' | 'error' | 'info', text: string) {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 4000);
  }

  async function update(role: string, field: string, value: PermissionLevel) {
    const busyKey = `${role}-${field}`;
    setBusy(busyKey);
    try {
      const res = await clientApi<PermissionMatrix>('admin/permissions', { method: 'PATCH', body: { role, field, value } });
      onPermissionsChange(res);
      showNotice('success', 'Phân quyền phân hệ vai trò đã được áp dụng.');
    } catch (err) {
      showNotice('error', err instanceof ClientApiError ? err.message : 'Không thể lưu cấu hình.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      {notice && (
        <div
          className={`mb-4 rounded-xl border p-4 text-xs ${
            notice.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : notice.type === 'error'
                ? 'border-red-200 bg-red-50 text-red-700'
                : 'border-blue-200 bg-blue-50 text-blue-700'
          }`}
        >
          {notice.text}
        </div>
      )}

      <div className="text-left">
        <h4 className="font-serif text-lg font-bold text-stone-900">Bảng Ma Trận Cấu Hình Phân Quyền Dữ Liệu</h4>
        <p className="text-xs text-stone-500">Kiểm soát quyền truy cập chi tiết các trường thông tin nhạy cảm.</p>
      </div>

      <div className="table-scroll-wrap rounded-xl border border-stone-200 bg-stone-50 text-left">
        <div className="table-scroll">
        <table className="w-full min-w-175 text-left text-xs">
          <thead>
            <tr className="border-b border-stone-200 bg-stone-50 text-stone-500">
              <th className="min-w-35 whitespace-nowrap p-4 font-semibold">Nhóm vai trò (Role)</th>
              {FIELDS.map((f) => (
                <th key={f.key} className="min-w-35 whitespace-nowrap p-4 font-semibold">
                  {f.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200/40 text-stone-600">
            {ROLES.map((role) => (
              <tr key={role.key} className="transition-colors hover:bg-stone-50">
                <td className="whitespace-nowrap p-4 font-bold text-stone-900">{role.label}</td>
                {FIELDS.map((f) => (
                  <td key={f.key} className="whitespace-nowrap p-4">
                    <select
                      value={permissions[role.key][f.key]}
                      disabled={busy === `${role.key}-${f.key}`}
                      onChange={(e) => update(role.key, f.key, e.target.value as PermissionLevel)}
                      className="rounded border border-stone-200 bg-white px-2 py-1 text-xs text-stone-900 outline-none disabled:opacity-50"
                    >
                      {(Object.keys(LEVEL_LABEL) as PermissionLevel[]).map((lvl) => (
                        <option key={lvl} value={lvl}>
                          {LEVEL_LABEL[lvl]}
                        </option>
                      ))}
                    </select>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </>
  );
}
