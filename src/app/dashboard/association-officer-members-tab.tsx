'use client';

import { useState } from 'react';
import { clientApi, ClientApiError } from '@/lib/client-api';
import type { AssociationMember, AssociationMembersResponse } from '@/lib/types';
import { ConfirmDeleteModal } from './confirm-delete-modal';

export function AssociationOfficerMembersTab({
  data,
  onDataChange,
}: {
  data: AssociationMembersResponse;
  onDataChange: (d: AssociationMembersResponse) => void;
}) {
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [addName, setAddName] = useState('');
  const [editing, setEditing] = useState<{ _id: string; name: string; phone: string } | null>(null);
  const [editPhone, setEditPhone] = useState('');
  const [removing, setRemoving] = useState<AssociationMember | null>(null);

  function showNotice(type: 'success' | 'error' | 'info', text: string) {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 4000);
  }

  async function refresh() {
    const res = await clientApi<AssociationMembersResponse>('association-officer/members');
    onDataChange(res);
  }

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    if (!addName.trim()) {
      showNotice('error', 'Vui lòng chọn một cư dân hợp lệ từ danh sách gợi ý.');
      return;
    }
    try {
      await clientApi('association-officer/members', { method: 'POST', body: { name: addName.trim() } });
      setAddName('');
      await refresh();
      showNotice('success', `Đã thêm hội viên ${addName.trim()} thành công.`);
    } catch (err) {
      showNotice('error', err instanceof ClientApiError ? err.message : 'Không thể thêm hội viên.');
    }
  }

  async function confirmRemoveMember() {
    if (!removing) return;
    try {
      await clientApi(`association-officer/members/${removing._id}`, { method: 'DELETE' });
      setRemoving(null);
      await refresh();
      showNotice('info', `Đã gỡ nhân khẩu ${removing.name} khỏi hội nhóm.`);
    } catch (err) {
      showNotice('error', err instanceof ClientApiError ? err.message : 'Không thể gỡ hội viên.');
    }
  }

  async function savePhone(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    try {
      await clientApi(`association-officer/members/${editing._id}/phone`, { method: 'PATCH', body: { phone: editPhone } });
      setEditing(null);
      await refresh();
      showNotice('success', `Đã lưu số điện thoại mới cho ${editing.name}.`);
    } catch (err) {
      showNotice('error', err instanceof ClientApiError ? err.message : 'Không thể lưu.');
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
        <h4 className="font-serif text-lg font-bold text-stone-900">Quản lý Hội viên — {data.association}</h4>
        <p className="text-xs text-stone-500">Tra cứu, thêm mới hoặc loại bỏ hội viên khỏi hội nhóm.</p>
      </div>

      <div className="space-y-4 rounded-2xl border border-stone-200 bg-stone-50 p-5 text-left">
        <h5 className="text-xs font-bold uppercase tracking-wider text-stone-900">Thêm nhân khẩu vào {data.association}</h5>
        <form onSubmit={addMember} className="flex flex-col items-end gap-3 sm:flex-row">
          <div className="w-full flex-grow space-y-1">
            <label className="block text-[9px] font-bold uppercase text-stone-400">Tìm cư dân chưa tham gia Hội</label>
            <input
              type="text"
              list="assoc-nonmember-datalist"
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              placeholder="Gõ để tìm cư dân..."
              autoComplete="off"
              className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 outline-none focus:border-primary-500"
            />
            <datalist id="assoc-nonmember-datalist">
              {data.nonMembers.map((m) => (
                <option key={m._id} value={m.name}>
                  {m.dob} - {m.group}
                </option>
              ))}
            </datalist>
          </div>
          <button type="submit" className="shrink-0 rounded-lg bg-primary-600 px-4 py-2 text-xs font-bold text-white hover:bg-primary-500">
            Ghi nhận Hội viên
          </button>
        </form>
      </div>

      <div className="space-y-3 text-left">
        <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">Danh sách Hội viên hiện hành ({data.members.length} người)</span>
        <div className="table-scroll-wrap rounded-xl border border-stone-200 bg-stone-50">
          <div className="table-scroll">
            <table className="w-full min-w-150 text-left text-xs">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-stone-500">
                  <th className="min-w-35 whitespace-nowrap p-3 font-semibold">Thành viên</th>
                  <th className="min-w-30 whitespace-nowrap p-3 font-semibold">Ngày sinh</th>
                  <th className="min-w-30 whitespace-nowrap p-3 font-semibold">Địa bàn</th>
                  <th className="min-w-35 whitespace-nowrap p-3 font-semibold">Số điện thoại</th>
                  <th className="min-w-40 whitespace-nowrap p-3 text-right font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200/40 text-stone-600">
                {data.members.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-stone-400">
                      Chưa có hội viên nào.
                    </td>
                  </tr>
                ) : (
                  data.members.map((m) => (
                    <tr key={m._id} className="transition-colors hover:bg-stone-50">
                      <td className="whitespace-nowrap p-3 font-bold text-stone-900">{m.name}</td>
                      <td className="whitespace-nowrap p-3 font-mono text-stone-500">{m.dob}</td>
                      <td className="whitespace-nowrap p-3 text-stone-600">{m.group}</td>
                      <td className="whitespace-nowrap p-3 font-mono text-stone-500">{m.phone || 'Chưa có SĐT'}</td>
                      <td className="space-x-2 whitespace-nowrap p-3 text-right">
                        <button
                          onClick={() => {
                            setEditing(m);
                            setEditPhone(m.phone || '');
                          }}
                          className="rounded border border-stone-300 bg-stone-100 px-2 py-1 text-[10px] font-semibold text-stone-600 transition-all hover:bg-primary-600 hover:text-white"
                        >
                          <i className="fa-solid fa-pen-to-square" /> Sửa
                        </button>
                        <button
                          onClick={() => setRemoving(m)}
                          className="rounded bg-red-50 px-2 py-1 text-[10px] text-red-600 transition-all hover:bg-red-600 hover:text-white"
                        >
                          Gỡ khỏi Hội
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

      {editing && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-stone-950/80 p-4">
          <div className="w-full max-w-sm space-y-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-bold uppercase tracking-wider text-stone-900">Sửa SĐT — {editing.name}</h5>
              <button onClick={() => setEditing(null)} className="text-stone-400 hover:text-stone-900">
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <form onSubmit={savePhone} className="space-y-3">
              <input
                type="text"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="Số điện thoại"
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-800 outline-none focus:border-primary-500"
              />
              <button type="submit" className="w-full rounded-xl bg-primary-600 py-2.5 text-xs font-bold uppercase text-white hover:bg-primary-500">
                Lưu
              </button>
            </form>
          </div>
        </div>
      )}

      {removing && (
        <ConfirmDeleteModal
          title="Xác nhận gỡ hội viên"
          message={`Bạn có chắc muốn gỡ nhân khẩu "${removing.name}" khỏi hội nhóm?`}
          onCancel={() => setRemoving(null)}
          onConfirm={confirmRemoveMember}
        />
      )}
    </>
  );
}
