'use client';

import { useEffect, useState } from 'react';
import { clientApi, ClientApiError } from '@/lib/client-api';
import { buildResidentGroups } from '@/lib/types';
import type { AdminAccountItem, AdminAccountsResponse } from '@/lib/types';
import { TableActionsMenu } from './table-actions-menu';

function isoToDmy(iso: string): string {
  const parts = iso.split('-');
  if (parts.length !== 3) return '';
  const [y, m, d] = parts;
  return `${d}/${m}/${y}`;
}

const ROLE_LABELS: Record<string, string> = {
  resident: 'Cư dân',
  'association-officer': 'Cán bộ Hội',
  'village-head': 'Trưởng thôn',
  'security-team': 'Tổ ANTT',
  admin: 'Admin',
};
const ROLES = Object.keys(ROLE_LABELS);

export function AdminAccountsTab({
  accountsRes,
  oldVillages,
  onAccountsChange,
}: {
  accountsRes: AdminAccountsResponse;
  oldVillages: string[] | undefined;
  onAccountsChange: (a: AdminAccountsResponse) => void;
}) {
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [editing, setEditing] = useState<AdminAccountItem | null>(null);
  const [addingResident, setAddingResident] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  function showNotice(type: 'success' | 'error' | 'info', text: string) {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 4000);
  }

  async function refresh() {
    const res = await clientApi<AdminAccountsResponse>('admin/accounts');
    onAccountsChange(res);
  }

  async function resetPassword(acc: AdminAccountItem) {
    setBusyId(acc._id);
    try {
      await clientApi(`admin/accounts/${acc._id}/reset-password`, { method: 'POST' });
      showNotice('success', `Mật khẩu của ${acc.name} đã được reset thành mặc định ('doanket').`);
    } catch (err) {
      showNotice('error', err instanceof ClientApiError ? err.message : 'Không thể reset mật khẩu.');
    } finally {
      setBusyId(null);
    }
  }

  async function toggleLock(acc: AdminAccountItem) {
    setBusyId(acc._id);
    try {
      await clientApi(`admin/accounts/${acc._id}/${acc.status === 'active' ? 'lock' : 'unlock'}`, { method: 'POST' });
      await refresh();
      showNotice('info', `Tài khoản ${acc.name} hiện đã chuyển sang trạng thái: ${acc.status === 'active' ? 'Đã khóa' : 'Hoạt động'}.`);
    } catch (err) {
      showNotice('error', err instanceof ClientApiError ? err.message : 'Không thể đổi trạng thái.');
    } finally {
      setBusyId(null);
    }
  }

  async function sync() {
    setSyncing(true);
    try {
      const res = await clientApi<{ created: number; skipped: number }>('admin/accounts/sync', { method: 'POST' });
      await refresh();
      showNotice(
        res.created > 0 ? 'success' : 'info',
        res.created > 0
          ? `Đã tạo ${res.created} tài khoản mới cho cư dân chưa có tài khoản.${res.skipped > 0 ? ` Bỏ qua ${res.skipped} cư dân chưa có Căn Cước hợp lệ.` : ''}`
          : `Mọi cư dân đã có tài khoản.${res.skipped > 0 ? ` Còn ${res.skipped} cư dân chưa có Căn Cước hợp lệ.` : ''}`,
      );
    } catch (err) {
      showNotice('error', err instanceof ClientApiError ? err.message : 'Không thể đồng bộ.');
    } finally {
      setSyncing(false);
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

      <div className="flex flex-col gap-4 text-left sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="font-serif text-lg font-bold text-stone-900">Quản lý tài khoản, Cấp quyền &amp; Đổi mật khẩu</h4>
          <p className="text-xs text-stone-500">Tài khoản đăng nhập được tự động cấp theo Căn Cước khi nhân khẩu được duyệt thêm — mỗi cư dân có đúng một tài khoản.</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={() => setAddingResident(true)}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg transition-all hover:bg-emerald-500"
          >
            <i className="fa-solid fa-user-plus" /> Thêm cư dân mới
          </button>
          <button
            onClick={sync}
            disabled={syncing}
            className="flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg transition-all hover:bg-primary-500 disabled:opacity-50"
          >
            <i className="fa-solid fa-arrows-rotate" /> Đồng bộ tài khoản toàn bộ cư dân
          </button>
        </div>
      </div>
      <p className="-mt-2 text-[11px] text-stone-400">
        {accountsRes.unaccountedCount} / {accountsRes.residentCount} cư dân chưa có tài khoản đăng nhập
        {accountsRes.unaccountedCount > 0 ? ' (thiếu Căn Cước hợp lệ — bấm "Đồng bộ" sau khi cập nhật)' : ''}.
      </p>

      <div className="table-scroll-wrap rounded-xl border border-stone-200 bg-stone-50 text-left">
        <div className="table-scroll">
          <table className="w-full min-w-225 text-left text-xs">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-stone-500">
                <th className="min-w-40 whitespace-nowrap p-3 font-semibold">Tên tài khoản</th>
                <th className="min-w-35 whitespace-nowrap p-3 font-semibold">Tên đăng nhập</th>
                <th className="min-w-40 whitespace-nowrap p-3 font-semibold">Nhóm vai trò (phân quyền)</th>
                <th className="min-w-35 whitespace-nowrap p-3 font-semibold">Chức vụ</th>
                <th className="min-w-30 whitespace-nowrap p-3 font-semibold">Hoạt động cuối</th>
                <th className="min-w-25 whitespace-nowrap p-3 font-semibold">Trạng thái</th>
                <th className="min-w-30 whitespace-nowrap p-3 text-right font-semibold">Quản trị</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200/40 text-stone-600">
              {accountsRes.accounts.map((acc) => (
                <tr key={acc._id} className="transition-colors hover:bg-stone-50">
                  <td className="whitespace-nowrap p-3">
                    <span className="block font-bold text-stone-900">{acc.name}</span>
                    <span className="font-mono text-[10px] text-stone-400">ID: {acc._id.slice(-6)}</span>
                  </td>
                  <td className="whitespace-nowrap p-3 font-mono text-stone-600">{acc.username}</td>
                  <td className="whitespace-nowrap p-3">
                    <span className="block font-semibold text-stone-900">{ROLE_LABELS[acc.role] || acc.role}</span>
                    {acc.role === 'association-officer' && acc.assoc && <span className="block text-[10px] text-stone-400">Phụ trách: {acc.assoc}</span>}
                  </td>
                  <td className="whitespace-nowrap p-3 text-stone-600">{acc.position || <span className="text-stone-300">—</span>}</td>
                  <td className="whitespace-nowrap p-3 font-mono text-[10px] text-stone-500">{acc.lastActive}</td>
                  <td className="whitespace-nowrap p-3">
                    {acc.status === 'active' ? (
                      <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">Đang mở</span>
                    ) : (
                      <span className="rounded bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">Đã khóa</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap p-3 text-right">
                    <div className="hidden items-center justify-end gap-2 sm:flex">
                      <button
                        onClick={() => setEditing(acc)}
                        className="rounded border border-stone-200 bg-stone-50 px-2 py-1 text-[10px] text-stone-600 hover:bg-stone-100"
                      >
                        <i className="fa-solid fa-pen-to-square mr-1" /> Sửa
                      </button>
                      <button
                        disabled={busyId === acc._id}
                        onClick={() => resetPassword(acc)}
                        className="rounded border border-stone-200 bg-stone-50 px-2 py-1 text-[10px] text-stone-600 hover:bg-stone-100 disabled:opacity-50"
                      >
                        Reset Pass
                      </button>
                      {acc.role !== 'admin' &&
                        (acc.status === 'active' ? (
                          <button
                            disabled={busyId === acc._id}
                            onClick={() => toggleLock(acc)}
                            className="rounded border border-stone-200 bg-stone-50 px-2 py-1 text-[10px] text-stone-600 hover:bg-stone-100 disabled:opacity-50"
                          >
                            Khóa tài khoản
                          </button>
                        ) : (
                          <button
                            disabled={busyId === acc._id}
                            onClick={() => toggleLock(acc)}
                            className="rounded bg-emerald-50 px-2 py-1 text-[10px] text-emerald-600 disabled:opacity-50"
                          >
                            Mở tài khoản
                          </button>
                        ))}
                    </div>
                    <TableActionsMenu
                      actions={[
                        { label: 'Sửa', icon: 'fa-pen-to-square', onClick: () => setEditing(acc) },
                        { label: 'Reset Pass', icon: 'fa-key', onClick: () => resetPassword(acc), disabled: busyId === acc._id },
                        ...(acc.role !== 'admin'
                          ? [
                              acc.status === 'active'
                                ? { label: 'Khóa tài khoản', icon: 'fa-lock', onClick: () => toggleLock(acc), danger: true, disabled: busyId === acc._id }
                                : { label: 'Mở tài khoản', icon: 'fa-lock-open', onClick: () => toggleLock(acc), disabled: busyId === acc._id },
                            ]
                          : []),
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <EditAccountModal
          account={editing}
          onClose={() => setEditing(null)}
          onSuccess={async (msg) => {
            setEditing(null);
            await refresh();
            showNotice('success', msg);
          }}
        />
      )}

      {addingResident && (
        <AddResidentModal
          groups={buildResidentGroups(oldVillages)}
          onClose={() => setAddingResident(false)}
          onSuccess={async (msg) => {
            setAddingResident(false);
            await refresh();
            showNotice('success', msg);
          }}
        />
      )}
    </>
  );
}

function AddResidentModal({
  groups,
  onClose,
  onSuccess,
}: {
  groups: string[];
  onClose: () => void;
  onSuccess: (msg: string) => void;
}) {
  const [form, setForm] = useState({
    name: '',
    dobIso: '',
    gender: 'unknown',
    cccd: '',
    phone: '',
    relation: '',
    isHouseholder: false,
    familyId: '',
    permanentAddress: '',
    temporaryAddress: '',
    group: groups[0],
    fatherName: '',
    motherName: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!form.name.trim() || !form.dobIso || !form.relation.trim()) {
      setError('Vui lòng nhập đầy đủ Họ tên, Ngày sinh và Quan hệ với chủ hộ.');
      return;
    }
    if (!form.isHouseholder && !form.familyId.trim()) {
      setError('Vui lòng nhập Mã hộ đã tồn tại — chỉ chủ hộ mới được tự động tạo hộ mới.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await clientApi<{ resident: { familyId: string }; accountCreated: boolean }>('admin/accounts/residents', {
        method: 'POST',
        body: {
          name: form.name.trim(),
          dob: isoToDmy(form.dobIso),
          gender: form.gender,
          cccd: form.cccd.trim(),
          phone: form.phone.trim(),
          relation: form.relation.trim(),
          isHouseholder: form.isHouseholder,
          familyId: form.isHouseholder ? undefined : form.familyId.trim(),
          permanentAddress: form.permanentAddress.trim(),
          temporaryAddress: form.temporaryAddress.trim(),
          group: form.group,
          fatherName: form.fatherName.trim(),
          motherName: form.motherName.trim(),
        },
      });
      onSuccess(
        `Đã thêm cư dân "${form.name.trim()}" vào hộ ${res.resident.familyId}.${
          res.accountCreated ? ' Đã tự động cấp tài khoản đăng nhập.' : ''
        }`,
      );
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : 'Không thể thêm cư dân.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-stone-950/80 p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-stone-100 p-6">
          <h3 className="font-serif text-base font-bold uppercase tracking-wider text-stone-900">Thêm cư dân mới</h3>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 bg-stone-50 text-stone-500 hover:border-red-300 hover:text-red-500">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <form onSubmit={submit} className="flex-1 space-y-3 overflow-y-auto p-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">Họ và tên *</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-800 outline-none focus:border-primary-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">Ngày sinh *</label>
              <input
                type="date"
                value={form.dobIso}
                onChange={(e) => setForm({ ...form, dobIso: e.target.value })}
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-800 outline-none focus:border-primary-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">Quan hệ với chủ hộ *</label>
              <input
                value={form.relation}
                onChange={(e) => setForm({ ...form, relation: e.target.value })}
                placeholder="VD: Chủ hộ, Con, Vợ/Chồng..."
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-800 outline-none focus:border-primary-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">Giới tính</label>
              <div className="flex h-[34px] items-center gap-4 text-xs text-stone-700">
                <label className="flex items-center gap-1.5">
                  <input type="radio" checked={form.gender === 'male'} onChange={() => setForm({ ...form, gender: 'male' })} /> Nam
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="radio" checked={form.gender === 'female'} onChange={() => setForm({ ...form, gender: 'female' })} /> Nữ
                </label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-stone-500">
                <input type="checkbox" checked={form.isHouseholder} onChange={(e) => setForm({ ...form, isHouseholder: e.target.checked, familyId: '' })} />
                Là chủ hộ (tự tạo hộ mới)
              </label>
              {form.isHouseholder ? (
                <p className="rounded-xl border border-dashed border-stone-200 bg-stone-50 px-3 py-2 text-[11px] text-stone-500">
                  Mã hộ sẽ được hệ thống tự động tạo mới.
                </p>
              ) : (
                <>
                  <input
                    value={form.familyId}
                    onChange={(e) => setForm({ ...form, familyId: e.target.value })}
                    placeholder="VD: FAM-090 (mã hộ đã tồn tại)"
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-800 outline-none focus:border-primary-500"
                  />
                  <p className="text-[10px] text-stone-400">Bắt buộc nhập đúng Mã hộ đã tồn tại — thành viên phải thuộc 1 hộ có sẵn.</p>
                </>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">Nhóm cư trú</label>
              <select
                value={form.group}
                onChange={(e) => setForm({ ...form, group: e.target.value })}
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-800 outline-none focus:border-primary-500"
              >
                {groups.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">Căn Cước (CCCD)</label>
              <input
                value={form.cccd}
                onChange={(e) => setForm({ ...form, cccd: e.target.value.replace(/\D/g, '').slice(0, 12) })}
                placeholder="12 số — để trống nếu chưa có"
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-800 outline-none focus:border-primary-500"
              />
              <p className="text-[10px] text-stone-400">Có CCCD thì hệ thống tự cấp tài khoản đăng nhập (mật khẩu mặc định theo thôn).</p>
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">Số điện thoại</label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-800 outline-none focus:border-primary-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">Họ tên cha</label>
              <input
                value={form.fatherName}
                onChange={(e) => setForm({ ...form, fatherName: e.target.value })}
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-800 outline-none focus:border-primary-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">Họ tên mẹ</label>
              <input
                value={form.motherName}
                onChange={(e) => setForm({ ...form, motherName: e.target.value })}
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-800 outline-none focus:border-primary-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">Địa chỉ thường trú</label>
            <input
              value={form.permanentAddress}
              onChange={(e) => setForm({ ...form, permanentAddress: e.target.value })}
              placeholder="VD: Thôn Đoàn Kết, xã Dliê Ya, tỉnh Đắk Lắk"
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-800 outline-none focus:border-primary-500"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">Địa chỉ tạm trú</label>
            <input
              value={form.temporaryAddress}
              onChange={(e) => setForm({ ...form, temporaryAddress: e.target.value })}
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-800 outline-none focus:border-primary-500"
            />
          </div>

          {error && <p className="text-[11px] font-semibold text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-lg transition-all hover:from-primary-500 hover:to-primary-600 disabled:opacity-50"
          >
            {submitting ? 'Đang tạo...' : 'Tạo cư dân mới'}
          </button>
        </form>
      </div>
    </div>
  );
}

function EditAccountModal({
  account,
  onClose,
  onSuccess,
}: {
  account: AdminAccountItem;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}) {
  const [role, setRole] = useState(account.role);
  const [position, setPosition] = useState(account.position || '');
  const [assoc, setAssoc] = useState(account.assoc || '');
  const [associations, setAssociations] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    clientApi<string[]>('admin/accounts/associations').then(setAssociations);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (role === 'association-officer' && !assoc) {
      setError('Vui lòng chọn hội mà tài khoản này sẽ phụ trách.');
      return;
    }
    setSubmitting(true);
    try {
      await clientApi(`admin/accounts/${account._id}`, {
        method: 'PATCH',
        body: { role, position, assoc: role === 'association-officer' ? assoc : undefined },
      });
      onSuccess(`Đã cập nhật tài khoản ${account.name}.`);
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : 'Không thể cập nhật.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-stone-950/80 p-4">
      <div className="w-full max-w-md space-y-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-base font-bold uppercase tracking-wider text-stone-900">Sửa tài khoản — {account.name}</h3>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 bg-stone-50 text-stone-500 hover:border-red-300 hover:text-red-500">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">Vai trò (phân quyền)</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={account.role === 'admin'}
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-800 outline-none focus:border-primary-500 disabled:opacity-50"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>
          {role === 'association-officer' && (
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">Hội phụ trách</label>
              <select
                value={assoc}
                onChange={(e) => setAssoc(e.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-800 outline-none focus:border-primary-500"
              >
                <option value="">-- Chọn hội --</option>
                {associations.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">Chức vụ (hiển thị công khai)</label>
            <input
              type="text"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="VD: Trưởng thôn, Bí thư chi bộ..."
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-800 outline-none focus:border-primary-500"
            />
          </div>
          {error && <p className="text-[11px] font-semibold text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-lg transition-all hover:from-primary-500 hover:to-primary-600 disabled:opacity-50"
          >
            Lưu thay đổi
          </button>
        </form>
      </div>
    </div>
  );
}
