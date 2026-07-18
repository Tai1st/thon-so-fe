'use client';

import { useState } from 'react';
import { clientApi, ClientApiError } from '@/lib/client-api';
import type { ResidenceRegistrationItem } from '@/lib/types';

const STATUS_BADGE: Record<ResidenceRegistrationItem['status'], { label: string; className: string }> = {
  'Đã duyệt': { label: 'Đã duyệt', className: 'bg-emerald-50 text-emerald-600' },
  'Từ chối': { label: 'Từ chối', className: 'bg-red-50 text-red-600' },
  'Chờ duyệt': { label: 'Chờ duyệt', className: 'bg-amber-50 text-amber-600' },
};

export function SecurityTeamResidenceTab({
  registrations,
  onRegistrationsChange,
}: {
  registrations: ResidenceRegistrationItem[];
  onRegistrationsChange: (r: ResidenceRegistrationItem[]) => void;
}) {
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function showNotice(type: 'success' | 'error' | 'info', text: string) {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 4000);
  }

  async function decide(id: string, status: 'Đã duyệt' | 'Từ chối') {
    setBusyId(id);
    try {
      await clientApi(`security-team/residence-registrations/${id}/decide`, { method: 'PATCH', body: { status } });
      const res = await clientApi<ResidenceRegistrationItem[]>('security-team/residence-registrations');
      onRegistrationsChange(res);
      showNotice(status === 'Đã duyệt' ? 'success' : 'info', `Đăng ký lưu trú đã được ${status === 'Đã duyệt' ? 'phê duyệt' : 'từ chối'}.`);
    } catch (err) {
      showNotice('error', err instanceof ClientApiError ? err.message : 'Không thể xử lý.');
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
        <h4 className="font-serif text-lg font-bold text-stone-900">Duyệt Đăng Ký Lưu Trú</h4>
        <p className="text-xs text-stone-500">Xét duyệt đăng ký tạm trú cho khách/người thân do các hộ gia đình gửi lên.</p>
      </div>

      <div className="table-scroll-wrap rounded-xl border border-stone-200 bg-stone-50 text-left">
        <div className="table-scroll">
          <table className="w-full min-w-175 text-left text-xs">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-stone-500">
                <th className="min-w-35 whitespace-nowrap p-3 font-semibold">Người lưu trú</th>
                <th className="min-w-24 whitespace-nowrap p-3 font-semibold">Ảnh Căn Cước</th>
                <th className="min-w-30 whitespace-nowrap p-3 font-semibold">Quan hệ</th>
                <th className="min-w-35 whitespace-nowrap p-3 font-semibold">Hộ đăng ký</th>
                <th className="min-w-40 whitespace-nowrap p-3 font-semibold">Thời gian lưu trú</th>
                <th className="min-w-30 whitespace-nowrap p-3 text-center font-semibold">Trạng thái</th>
                <th className="min-w-35 whitespace-nowrap p-3 text-right font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200/40 text-stone-600">
              {registrations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-4 text-center text-stone-400">
                    Chưa có đăng ký lưu trú nào.
                  </td>
                </tr>
              ) : (
                registrations.map((r) => {
                  const badge = STATUS_BADGE[r.status];
                  return (
                    <tr key={r._id} className="transition-colors hover:bg-stone-50">
                      <td className="whitespace-nowrap p-3">
                        <span className="block font-bold text-stone-900">{r.guestName}</span>
                        <span className="font-mono text-[10px] text-stone-400">{r.guestCccd || 'Chưa có Căn Cước'}</span>
                      </td>
                      <td className="p-3">
                        {r.guestCccdFrontUrl || r.guestCccdBackUrl ? (
                          <div className="flex gap-1.5">
                            {r.guestCccdFrontUrl && (
                              <a href={r.guestCccdFrontUrl} target="_blank" rel="noopener">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={r.guestCccdFrontUrl} alt="Mặt trước" className="h-10 w-10 rounded-lg object-cover" />
                              </a>
                            )}
                            {r.guestCccdBackUrl && (
                              <a href={r.guestCccdBackUrl} target="_blank" rel="noopener">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={r.guestCccdBackUrl} alt="Mặt sau" className="h-10 w-10 rounded-lg object-cover" />
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-stone-300">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap p-3 text-stone-600">{r.relationship}</td>
                      <td className="whitespace-nowrap p-3">
                        <span className="block text-stone-900">{r.hostName}</span>
                        <span className="font-mono text-[10px] text-stone-400">{r.familyId}</span>
                      </td>
                      <td className="whitespace-nowrap p-3 font-mono text-stone-500">
                        {r.fromDate} → {r.toDate}
                      </td>
                      <td className="whitespace-nowrap p-3 text-center">
                        <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${badge.className}`}>{badge.label}</span>
                      </td>
                      <td className="whitespace-nowrap p-3 text-right">
                        {r.status === 'Chờ duyệt' ? (
                          <>
                            <button
                              disabled={busyId === r._id}
                              onClick={() => decide(r._id, 'Đã duyệt')}
                              className="mr-1.5 rounded bg-emerald-600 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
                            >
                              Duyệt
                            </button>
                            <button
                              disabled={busyId === r._id}
                              onClick={() => decide(r._id, 'Từ chối')}
                              className="rounded border border-stone-200 bg-stone-50 px-2.5 py-1 text-[10px] font-bold text-stone-500 hover:bg-stone-100 disabled:opacity-50"
                            >
                              Từ chối
                            </button>
                          </>
                        ) : (
                          <span className="text-[10px] text-stone-500">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
