'use client';

import { useState } from 'react';
import { clientApi, ClientApiError } from '@/lib/client-api';
import type { IncidentReportWithHead } from '@/lib/types';

export function SecurityTeamReportsTab({
  reports,
  onReportsChange,
}: {
  reports: IncidentReportWithHead[];
  onReportsChange: (r: IncidentReportWithHead[]) => void;
}) {
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function showNotice(type: 'success' | 'error' | 'info', text: string) {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 4000);
  }

  async function mark(id: string, status: 'Đã tiếp nhận' | 'Đã xử lý') {
    setBusyId(id);
    try {
      await clientApi(`security-team/incident-reports/${id}/status`, { method: 'PATCH', body: { status } });
      const res = await clientApi<IncidentReportWithHead[]>('security-team/incident-reports');
      onReportsChange(res);
      showNotice('success', `Tin báo đã chuyển sang trạng thái "${status}".`);
    } catch (err) {
      showNotice('error', err instanceof ClientApiError ? err.message : 'Không thể cập nhật.');
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
        <h4 className="font-serif text-lg font-bold text-stone-900">Tin Báo Từ Cư Dân</h4>
        <p className="text-xs text-stone-500">Tiếp nhận và xử lý các tin báo an ninh trật tự gửi trực tiếp từ cư dân, kèm vị trí sự việc.</p>
      </div>

      <div className="table-scroll-wrap rounded-xl border border-stone-200 bg-stone-50 text-left">
        <div className="table-scroll">
          <table className="w-full min-w-175 text-left text-xs">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-stone-500">
                <th className="min-w-35 whitespace-nowrap p-3 font-semibold">Hộ báo cáo</th>
                <th className="min-w-50 whitespace-nowrap p-3 font-semibold">Nội dung</th>
                <th className="min-w-30 whitespace-nowrap p-3 font-semibold">Vị trí</th>
                <th className="min-w-35 whitespace-nowrap p-3 font-semibold">Thời gian</th>
                <th className="min-w-35 whitespace-nowrap p-3 text-right font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200/40 text-stone-600">
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-stone-400">
                    Chưa có tin báo nào từ cư dân.
                  </td>
                </tr>
              ) : (
                reports.map((r) => (
                  <tr key={r._id} className="transition-colors hover:bg-stone-50">
                    <td className="whitespace-nowrap p-3">
                      <span className="block font-bold text-stone-900">{r.headName}</span>
                      <span className="font-mono text-[10px] text-stone-400">{r.familyId}</span>
                    </td>
                    <td className="p-3 text-stone-600">{r.content}</td>
                    <td className="whitespace-nowrap p-3 text-xs">
                      {r.lat != null ? (
                        <a
                          href={`https://www.google.com/maps?q=${r.lat},${r.lng}`}
                          target="_blank"
                          rel="noopener"
                          className="text-primary-600 hover:underline"
                        >
                          <i className="fa-solid fa-location-dot mr-1" />
                          Xem bản đồ
                        </a>
                      ) : (
                        r.locationText || <span className="text-stone-400">Không có</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap p-3 font-mono text-[11px] text-stone-500">{r.time}</td>
                    <td className="whitespace-nowrap p-3 text-right">
                      {r.status === 'Mới' ? (
                        <button
                          disabled={busyId === r._id}
                          onClick={() => mark(r._id, 'Đã tiếp nhận')}
                          className="rounded bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-600 hover:bg-blue-600 hover:text-white disabled:opacity-50"
                        >
                          Tiếp nhận
                        </button>
                      ) : r.status === 'Đã tiếp nhận' ? (
                        <button
                          disabled={busyId === r._id}
                          onClick={() => mark(r._id, 'Đã xử lý')}
                          className="rounded bg-emerald-600 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
                        >
                          Đánh dấu đã xử lý
                        </button>
                      ) : (
                        <span className="text-[10px] text-stone-500">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
