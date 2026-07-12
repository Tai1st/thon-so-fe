'use client';

import { useState } from 'react';
import { clientApi, ClientApiError } from '@/lib/client-api';
import type { AdminPendingRequests } from '@/lib/types';

const EDITABLE_MEMBER_FIELDS: { key: string; label: string }[] = [
  { key: 'name', label: 'Họ và tên' },
  { key: 'relation', label: 'Quan hệ với chủ hộ' },
  { key: 'dob', label: 'Ngày sinh' },
  { key: 'cccd', label: 'Số Căn Cước' },
  { key: 'gender', label: 'Giới tính' },
  { key: 'phone', label: 'Số điện thoại' },
  { key: 'fatherName', label: 'Họ tên cha' },
  { key: 'motherName', label: 'Họ tên mẹ' },
  { key: 'group', label: 'Nhóm cư trú' },
  { key: 'permanentAddress', label: 'Địa chỉ thường trú' },
  { key: 'temporaryAddress', label: 'Địa chỉ tạm trú' },
];

export function AdminRequestsTab({
  requests,
  onRequestsChange,
}: {
  requests: AdminPendingRequests;
  onRequestsChange: (r: AdminPendingRequests) => void;
}) {
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function showNotice(type: 'success' | 'error' | 'info', text: string) {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 4000);
  }

  async function refresh() {
    const res = await clientApi<AdminPendingRequests>('admin/requests/pending');
    onRequestsChange(res);
  }

  async function act(kind: 'delete' | 'member-edit' | 'new-member', id: string, action: 'approve' | 'reject', successMsg: string) {
    setBusyId(id);
    try {
      await clientApi(`admin/requests/${kind}/${id}/${action}`, { method: 'POST' });
      await refresh();
      showNotice(action === 'approve' ? 'success' : 'info', successMsg);
    } catch (err) {
      showNotice('error', err instanceof ClientApiError ? err.message : 'Không thể xử lý yêu cầu này.');
    } finally {
      setBusyId(null);
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
        <h4 className="font-serif text-lg font-bold text-stone-900">Kiểm duyệt &amp; Phê duyệt yêu cầu xóa dữ liệu</h4>
        <p className="text-xs text-stone-500">Kiểm tra thông tin đệ trình từ Trưởng thôn/Cư dân và đưa ra quyết định phê duyệt tối cao.</p>
      </div>

      <div className="table-scroll-wrap rounded-xl border border-stone-200 bg-stone-50 text-left">
        <div className="table-scroll">
          <table className="w-full min-w-175 text-left text-xs">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-stone-500">
                <th className="min-w-40 whitespace-nowrap p-3 font-semibold">Nhân khẩu đề nghị</th>
                <th className="min-w-40 whitespace-nowrap p-3 font-semibold">Lý do đính kèm</th>
                <th className="min-w-35 whitespace-nowrap p-3 font-semibold">Thời gian lập</th>
                <th className="min-w-35 whitespace-nowrap p-3 font-semibold">Đơn vị đề xuất</th>
                <th className="min-w-35 whitespace-nowrap p-3 text-right font-semibold">Phê duyệt tối cao</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200/40 text-stone-600">
              {requests.deleteRequests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-stone-400">
                    Hiện không có yêu cầu xóa dữ liệu nào chờ phê duyệt.
                  </td>
                </tr>
              ) : (
                requests.deleteRequests.map((r) => (
                  <tr key={r._id} className="transition-colors hover:bg-stone-50">
                    <td className="whitespace-nowrap p-3 text-xs font-bold text-stone-900">{r.residentName}</td>
                    <td className="p-3 text-xs font-medium text-red-600">{r.reason}</td>
                    <td className="whitespace-nowrap p-3 font-mono text-[11px] text-stone-500">{r.time}</td>
                    <td className="whitespace-nowrap p-3 text-xs font-medium text-stone-600">{r.submittedBy}</td>
                    <td className="space-x-2 whitespace-nowrap p-3 text-right">
                      <button
                        disabled={busyId === r._id}
                        onClick={() => act('delete', r._id, 'approve', `Nhân khẩu ${r.residentName} đã được gỡ khỏi cơ sở dữ liệu Thôn.`)}
                        className="rounded bg-emerald-600 px-3 py-1 text-[11px] font-bold text-white transition-all hover:bg-emerald-500 disabled:opacity-50"
                      >
                        Duyệt xóa
                      </button>
                      <button
                        disabled={busyId === r._id}
                        onClick={() => act('delete', r._id, 'reject', `Đã từ chối đơn đề nghị xóa nhân khẩu ${r.residentName}.`)}
                        className="rounded border border-stone-200 bg-stone-50 px-3 py-1 text-[11px] font-bold text-stone-500 transition-all hover:bg-stone-100 disabled:opacity-50"
                      >
                        Từ chối
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-3 border-t border-stone-200 pt-6 text-left">
        <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">Yêu cầu sửa thông tin nhân khẩu</span>
        <div className="table-scroll-wrap rounded-xl border border-stone-200 bg-stone-50">
          <div className="table-scroll">
            <table className="w-full min-w-175 text-left text-xs">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-stone-500">
                  <th className="min-w-35 whitespace-nowrap p-3 font-semibold">Nhân khẩu</th>
                  <th className="min-w-60 whitespace-nowrap p-3 font-semibold">Thay đổi đề nghị</th>
                  <th className="min-w-35 whitespace-nowrap p-3 font-semibold">Thời gian lập</th>
                  <th className="min-w-35 whitespace-nowrap p-3 font-semibold">Người đề xuất</th>
                  <th className="min-w-35 whitespace-nowrap p-3 text-right font-semibold">Phê duyệt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200/40 text-stone-600">
                {requests.memberEditRequests.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-stone-400">
                      Hiện không có yêu cầu sửa thông tin nào chờ phê duyệt.
                    </td>
                  </tr>
                ) : (
                  requests.memberEditRequests.map((r) => {
                    const changes = EDITABLE_MEMBER_FIELDS.filter(
                      (f) => String((r.newValues as Record<string, string>)[f.key] ?? '') !== String((r.oldValues as Record<string, string>)[f.key] ?? ''),
                    );
                    return (
                      <tr key={r._id} className="transition-colors hover:bg-stone-50">
                        <td className="whitespace-nowrap p-3 align-top text-xs font-bold text-stone-900">{r.residentName}</td>
                        <td className="space-y-0.5 p-3 align-top text-xs">
                          {changes.map((f) => (
                            <div key={f.key}>
                              <span className="text-stone-400">{f.label}:</span>{' '}
                              <span className="text-stone-500">&quot;{(r.oldValues as Record<string, string>)[f.key] || ''}&quot;</span> →{' '}
                              <span className="font-semibold text-primary-600">&quot;{(r.newValues as Record<string, string>)[f.key]}&quot;</span>
                            </div>
                          ))}
                        </td>
                        <td className="whitespace-nowrap p-3 align-top font-mono text-[11px] text-stone-500">{r.time}</td>
                        <td className="whitespace-nowrap p-3 align-top text-xs font-medium text-stone-600">{r.submittedBy}</td>
                        <td className="whitespace-nowrap p-3 text-right align-top">
                          <button
                            disabled={busyId === r._id}
                            onClick={() => act('member-edit', r._id, 'approve', `Đã cập nhật thông tin mới cho ${r.residentName}.`)}
                            className="mr-2 rounded bg-emerald-600 px-3 py-1 text-[11px] font-bold text-white transition-all hover:bg-emerald-500 disabled:opacity-50"
                          >
                            Duyệt
                          </button>
                          <button
                            disabled={busyId === r._id}
                            onClick={() => act('member-edit', r._id, 'reject', `Đã từ chối yêu cầu sửa thông tin của ${r.residentName}.`)}
                            className="rounded border border-stone-200 bg-stone-50 px-3 py-1 text-[11px] font-bold text-stone-500 transition-all hover:bg-stone-100 disabled:opacity-50"
                          >
                            Từ chối
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="space-y-3 border-t border-stone-200 pt-6 text-left">
        <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">Yêu cầu thêm thành viên mới</span>
        <div className="table-scroll-wrap rounded-xl border border-stone-200 bg-stone-50">
          <div className="table-scroll">
            <table className="w-full min-w-225 text-left text-xs">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-stone-500">
                  <th className="min-w-35 whitespace-nowrap p-3 font-semibold">Họ và tên</th>
                  <th className="min-w-30 whitespace-nowrap p-3 font-semibold">Quan hệ</th>
                  <th className="min-w-30 whitespace-nowrap p-3 font-semibold">Ngày sinh</th>
                  <th className="min-w-25 whitespace-nowrap p-3 font-semibold">Hộ</th>
                  <th className="min-w-35 whitespace-nowrap p-3 font-semibold">Thời gian lập</th>
                  <th className="min-w-35 whitespace-nowrap p-3 font-semibold">Người đề xuất</th>
                  <th className="min-w-35 whitespace-nowrap p-3 text-right font-semibold">Phê duyệt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200/40 text-stone-600">
                {requests.newMemberRequests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-4 text-center text-stone-400">
                      Hiện không có yêu cầu thêm thành viên nào chờ phê duyệt.
                    </td>
                  </tr>
                ) : (
                  requests.newMemberRequests.map((r) => (
                    <tr key={r._id} className="transition-colors hover:bg-stone-50">
                      <td className="whitespace-nowrap p-3 text-xs font-bold text-stone-900">{r.name}</td>
                      <td className="whitespace-nowrap p-3 text-xs text-stone-600">{r.relation}</td>
                      <td className="whitespace-nowrap p-3 font-mono text-xs text-stone-500">{r.dob}</td>
                      <td className="whitespace-nowrap p-3 font-mono text-xs text-stone-500">{r.familyId}</td>
                      <td className="whitespace-nowrap p-3 font-mono text-[11px] text-stone-500">{r.time}</td>
                      <td className="whitespace-nowrap p-3 text-xs font-medium text-stone-600">{r.submittedBy}</td>
                      <td className="space-x-2 whitespace-nowrap p-3 text-right">
                        <button
                          disabled={busyId === r._id}
                          onClick={() => act('new-member', r._id, 'approve', `Đã thêm thành viên "${r.name}" vào hồ sơ nhân khẩu.`)}
                          className="rounded bg-emerald-600 px-3 py-1 text-[11px] font-bold text-white transition-all hover:bg-emerald-500 disabled:opacity-50"
                        >
                          Duyệt
                        </button>
                        <button
                          disabled={busyId === r._id}
                          onClick={() => act('new-member', r._id, 'reject', `Đã từ chối yêu cầu thêm thành viên "${r.name}".`)}
                          className="rounded border border-stone-200 bg-stone-50 px-3 py-1 text-[11px] font-bold text-stone-500 transition-all hover:bg-stone-100 disabled:opacity-50"
                        >
                          Từ chối
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
    </>
  );
}
