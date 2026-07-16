'use client';

import { useState } from 'react';
import { clientApi, ClientApiError } from '@/lib/client-api';
import type { AdminAssociationItem } from '@/lib/types';
import { ConfirmDeleteModal } from './confirm-delete-modal';

export function AdminGroupsTab({
  associations,
  onAssociationsChange,
}: {
  associations: AdminAssociationItem[];
  onAssociationsChange: (a: AdminAssociationItem[]) => void;
}) {
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newBalance, setNewBalance] = useState('');

  function showNotice(type: 'success' | 'error' | 'info', text: string) {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 4000);
  }

  async function refresh() {
    const res = await clientApi<AdminAssociationItem[]>('admin/associations');
    onAssociationsChange(res);
  }

  async function createAssociation(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = newName.trim();
    const balance = parseInt(newBalance, 10) || 0;
    if (!name) return;
    try {
      await clientApi('admin/associations', { method: 'POST', body: { name, balance } });
      setNewName('');
      setNewBalance('');
      await refresh();
      showNotice('success', `Đã đăng ký hoạt động chi hội "${name}" thành công.`);
    } catch (err) {
      showNotice('error', err instanceof ClientApiError ? err.message : 'Không thể tạo chi hội.');
    }
  }

  async function saveRename(name: string) {
    const trimmed = renameValue.trim();
    if (!trimmed) return;
    try {
      await clientApi(`admin/associations/${encodeURIComponent(name)}`, { method: 'PATCH', body: { newName: trimmed } });
      setEditingName(null);
      await refresh();
      showNotice('success', `Tên chi hội đã đổi thành công sang "${trimmed}".`);
    } catch (err) {
      showNotice('error', err instanceof ClientApiError ? err.message : 'Không thể đổi tên.');
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await clientApi(`admin/associations/${encodeURIComponent(deleting)}`, { method: 'DELETE' });
      setDeleting(null);
      await refresh();
      showNotice('success', `Chi hội "${deleting}" đã được giải thể và gỡ liên kết hội viên.`);
    } catch (err) {
      showNotice('error', err instanceof ClientApiError ? err.message : 'Không thể giải thể chi hội.');
    }
  }

  return (
    <div className="space-y-6">
      {notice && (
        <div
          className={`rounded-xl border p-4 text-xs ${
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

      <div className="flex flex-col justify-between gap-4 text-left sm:flex-row sm:items-center">
        <div>
          <h4 className="font-serif text-lg font-bold text-stone-900">Quản Lý Danh Sách Hội Đoàn Thể Toàn Thôn</h4>
          <p className="text-xs text-stone-500">Thiết lập cấu trúc hoạt động, tạo mới, sửa tên hoặc xóa giải thể các chi hội đoàn thể.</p>
        </div>
      </div>

      <div className="space-y-4 rounded-2xl border border-stone-200 bg-stone-50 p-5 text-left">
        <h5 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-900">
          <i className="fa-solid fa-folder-plus text-primary-600" />
          <span>Thành Lập Chi Hội Mới</span>
        </h5>
        <form onSubmit={createAssociation} className="grid grid-cols-1 items-end gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <label className="block text-[9px] font-bold uppercase text-stone-400">Tên chi hội đoàn thể mới</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
              placeholder="Ví dụ: Chi hội Khuyến học"
              className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 outline-none focus:border-primary-500"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-[9px] font-bold uppercase text-stone-400">Số dư ngân quỹ ban đầu (đ)</label>
            <input
              type="number"
              value={newBalance}
              onChange={(e) => setNewBalance(e.target.value)}
              required
              placeholder="0"
              className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 outline-none focus:border-primary-500"
            />
          </div>
          <button type="submit" className="w-full rounded-lg bg-primary-600 py-2 text-xs font-bold uppercase text-white hover:bg-primary-500">
            Kích hoạt chi hội
          </button>
        </form>
        <p className="text-[11px] text-stone-400">
          Hội trưởng sẽ được gán khi tạo tài khoản Cán bộ Hội ở tab &quot;Quản lý Tài khoản&quot;.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-stone-200 bg-stone-50 text-left">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-stone-200 bg-stone-50 text-stone-500">
              <th className="p-4 font-semibold">Tên chi hội đoàn thể</th>
              <th className="p-4 font-semibold">Hội trưởng</th>
              <th className="p-4 font-semibold">Số lượng hội viên</th>
              <th className="p-4 font-semibold">Ngân quỹ hiện có</th>
              <th className="p-4 text-right font-semibold">Quản lý cấu trúc</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200/40 text-stone-600">
            {associations.length === 0 && (
              <tr>
                <td colSpan={5} className="p-4 text-center text-stone-400">
                  Chưa có chi hội nào trong hệ thống.
                </td>
              </tr>
            )}
            {associations.map((a) => (
              <tr key={a.name} className="transition-colors hover:bg-stone-100/50">
                <td className="p-4">
                  {editingName === a.name ? (
                    <div className="flex items-center gap-2">
                      <input
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        autoFocus
                        className="rounded border border-stone-200 bg-white px-2 py-1 text-xs text-stone-900 outline-none focus:border-primary-500"
                      />
                      <button
                        onClick={() => saveRename(a.name)}
                        className="rounded bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-emerald-500"
                      >
                        <i className="fa-solid fa-check" /> Lưu
                      </button>
                      <button
                        onClick={() => setEditingName(null)}
                        className="rounded bg-stone-100 px-2 py-1 text-[10px] font-bold text-stone-500 hover:bg-stone-200"
                      >
                        Hủy
                      </button>
                    </div>
                  ) : (
                    <span className="text-sm font-bold text-stone-900">{a.name}</span>
                  )}
                </td>
                <td className="p-4 text-xs font-semibold text-primary-600">{a.leaderName || '—'}</td>
                <td className="p-4 text-xs font-semibold text-stone-600">{a.memberCount} hội viên</td>
                <td className="p-4 font-mono font-bold text-emerald-600">{a.balance.toLocaleString('vi-VN')} đ</td>
                <td className="space-x-2 p-4 text-right">
                  {editingName !== a.name && (
                    <button
                      onClick={() => {
                        setEditingName(a.name);
                        setRenameValue(a.name);
                      }}
                      className="rounded border border-stone-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-stone-600 hover:bg-stone-100"
                    >
                      <i className="fa-solid fa-pen-to-square" /> Đổi tên
                    </button>
                  )}
                  <button
                    onClick={() => setDeleting(a.name)}
                    className="rounded bg-red-50 px-2.5 py-1 text-[10px] font-semibold text-red-600 hover:bg-red-600 hover:text-white"
                  >
                    <i className="fa-solid fa-trash" /> Xóa hội
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {deleting && (
        <ConfirmDeleteModal
          message={`Bạn có chắc muốn giải thể chi hội "${deleting}"? Hội viên sẽ được gỡ liên kết, hành động này không thể hoàn tác.`}
          onCancel={() => setDeleting(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}
