'use client';

import { useState } from 'react';
import { clientApi, ClientApiError } from '@/lib/client-api';
import type { IncidentMinutesItem, IncidentReportWithHead } from '@/lib/types';
import { ConfirmDeleteModal } from './confirm-delete-modal';

export function SecurityTeamMinutesTab({
  minutes,
  reports,
  onMinutesChange,
}: {
  minutes: IncidentMinutesItem[];
  reports: IncidentReportWithHead[];
  onMinutesChange: (m: IncidentMinutesItem[]) => void;
}) {
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [deletingMinutes, setDeletingMinutes] = useState<IncidentMinutesItem | null>(null);

  function showNotice(type: 'success' | 'error' | 'info', text: string) {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 4000);
  }

  async function refresh() {
    const res = await clientApi<IncidentMinutesItem[]>('security-team/incident-minutes');
    onMinutesChange(res);
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const title = String(form.get('title') || '').trim();
    const content = String(form.get('content') || '').trim();
    if (!title || !content) {
      showNotice('error', 'Vui lòng nhập Tiêu đề và Nội dung diễn biến sự việc.');
      return;
    }
    try {
      await clientApi('security-team/incident-minutes', {
        method: 'POST',
        body: {
          relatedReportId: String(form.get('relatedReportId') || '') || undefined,
          title,
          location: String(form.get('location') || ''),
          involvedPeople: String(form.get('involvedPeople') || ''),
          content,
        },
      });
      await refresh();
      showNotice('success', `Đã lưu biên bản sự việc "${title}".`);
      e.currentTarget.reset();
    } catch (err) {
      showNotice('error', err instanceof ClientApiError ? err.message : 'Không thể lập biên bản.');
    }
  }

  async function confirmDelete() {
    if (!deletingMinutes) return;
    try {
      await clientApi(`security-team/incident-minutes/${deletingMinutes._id}`, { method: 'DELETE' });
      setDeletingMinutes(null);
      await refresh();
      showNotice('info', 'Đã xóa biên bản.');
    } catch (err) {
      showNotice('error', err instanceof ClientApiError ? err.message : 'Không thể xóa.');
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
        <h4 className="font-serif text-lg font-bold text-stone-900">Biên Bản Sự Việc</h4>
        <p className="text-xs text-stone-500">Lập biên bản chính thức sau khi xử lý sự việc an ninh trật tự. Chỉ Tổ ANTT xem được mục này.</p>
      </div>

      <div className="space-y-4 rounded-2xl border border-stone-200 bg-stone-50 p-5 text-left">
        <h5 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-900">
          <i className="fa-solid fa-file-signature text-primary-600" />
          <span>Lập biên bản mới</span>
        </h5>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">Liên kết tin báo (nếu có)</label>
            <select
              name="relatedReportId"
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-800 outline-none focus:border-primary-500"
            >
              <option value="">Không liên kết tin báo nào</option>
              {reports.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.content.slice(0, 40)} ({r.time})
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">Tiêu đề biên bản</label>
            <input name="title" required className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-800 outline-none focus:border-primary-500" />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">Địa điểm xảy ra</label>
              <input name="location" className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-800 outline-none focus:border-primary-500" />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">Người liên quan</label>
              <input
                name="involvedPeople"
                placeholder="Họ tên các bên liên quan"
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-800 outline-none focus:border-primary-500"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">Nội dung diễn biến sự việc</label>
            <textarea
              name="content"
              rows={4}
              required
              className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-800 outline-none focus:border-primary-500"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-lg transition-all hover:from-primary-500 hover:to-primary-600"
          >
            Lập biên bản
          </button>
        </form>
      </div>

      <div className="space-y-3 text-left">
        <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">Danh sách biên bản đã lập</span>
        <div className="table-scroll-wrap rounded-xl border border-stone-200 bg-stone-50">
          <div className="table-scroll">
            <table className="w-full min-w-175 text-left text-xs">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-stone-500">
                  <th className="min-w-35 whitespace-nowrap p-3 font-semibold">Tiêu đề</th>
                  <th className="min-w-50 whitespace-nowrap p-3 font-semibold">Nội dung</th>
                  <th className="min-w-30 whitespace-nowrap p-3 font-semibold">Địa điểm</th>
                  <th className="min-w-35 whitespace-nowrap p-3 font-semibold">Thời gian lập</th>
                  <th className="min-w-30 whitespace-nowrap p-3 text-right font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200/40 text-stone-600">
                {minutes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-stone-400">
                      Chưa có biên bản sự việc nào.
                    </td>
                  </tr>
                ) : (
                  minutes.map((m) => (
                    <tr key={m._id} className="transition-colors hover:bg-stone-50">
                      <td className="whitespace-nowrap p-3 align-top font-semibold text-stone-900">{m.title}</td>
                      <td className="p-3 align-top text-stone-600">{m.content}</td>
                      <td className="whitespace-nowrap p-3 align-top text-stone-500">{m.location || '-'}</td>
                      <td className="whitespace-nowrap p-3 align-top font-mono text-[11px] text-stone-500">{m.time}</td>
                      <td className="whitespace-nowrap p-3 text-right align-top">
                        <button
                          onClick={() => setDeletingMinutes(m)}
                          className="rounded bg-red-50 px-2.5 py-1 text-[10px] font-semibold text-red-600 hover:bg-red-600 hover:text-white"
                        >
                          <i className="fa-solid fa-trash mr-1" /> Xóa
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

      {deletingMinutes && (
        <ConfirmDeleteModal
          message={`Bạn có chắc muốn xóa biên bản "${deletingMinutes.title}"? Hành động này không thể hoàn tác.`}
          onCancel={() => setDeletingMinutes(null)}
          onConfirm={confirmDelete}
        />
      )}
    </>
  );
}
