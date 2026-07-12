'use client';

import { useState } from 'react';
import { clientApi, ClientApiError } from '@/lib/client-api';
import type { IncidentReportItem } from '@/lib/types';

const STATUS_BADGE: Record<IncidentReportItem['status'], { label: string; className: string; icon: string }> = {
  'Đã xử lý': { label: 'Đã xử lý', className: 'bg-emerald-50 text-emerald-600', icon: 'fa-check' },
  'Đã tiếp nhận': { label: 'Đã tiếp nhận', className: 'bg-blue-50 text-blue-600', icon: 'fa-eye' },
  Mới: { label: 'Mới gửi', className: 'bg-amber-50 text-amber-600', icon: 'fa-clock' },
};

export function IncidentTab({
  reports,
  onReportsChange,
}: {
  reports: IncidentReportItem[];
  onReportsChange: (r: IncidentReportItem[]) => void;
}) {
  const [content, setContent] = useState('');
  const [locationText, setLocationText] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  function showNotice(type: 'success' | 'error' | 'info', text: string) {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 4000);
  }

  function captureLocation() {
    if (!navigator.geolocation) {
      showNotice('error', 'Trình duyệt của bạn không hỗ trợ định vị GPS.');
      return;
    }
    setGpsBusy(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
        setGpsBusy(false);
      },
      () => {
        setGpsBusy(false);
        showNotice('error', 'Không thể lấy vị trí GPS. Bạn vẫn có thể gửi tin báo kèm mô tả địa điểm bằng chữ.');
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) {
      showNotice('error', 'Vui lòng nhập nội dung sự việc cần báo.');
      return;
    }
    setSubmitting(true);
    try {
      await clientApi('incident-reports', {
        method: 'POST',
        body: { content: content.trim(), locationText: locationText.trim(), lat: coords?.lat, lng: coords?.lng },
      });
      const res = await clientApi<IncidentReportItem[]>('incident-reports/mine');
      onReportsChange(res);
      setContent('');
      setLocationText('');
      setCoords(null);
      showNotice('success', 'Tổ An ninh trật tự đã nhận được tin báo của bạn.');
    } catch (err) {
      showNotice('error', err instanceof ClientApiError ? err.message : 'Không thể gửi tin báo.');
    } finally {
      setSubmitting(false);
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
        <h4 className="font-serif text-lg font-bold text-stone-900">Báo An Ninh Trật Tự</h4>
        <p className="text-xs text-stone-500">Gửi tin báo trực tiếp đến Tổ An ninh trật tự thôn kèm vị trí hiện tại của bạn.</p>
      </div>

      <form onSubmit={submit} className="space-y-3 rounded-2xl border border-stone-200 bg-stone-50 p-5 text-left">
        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">Nội dung sự việc</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            required
            placeholder="Mô tả ngắn gọn sự việc cần báo..."
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-800 outline-none transition-colors focus:border-primary-500"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">Địa điểm cụ thể (nếu cần)</label>
          <input
            type="text"
            value={locationText}
            onChange={(e) => setLocationText(e.target.value)}
            placeholder="VD: Trước cổng Nhà văn hóa thôn"
            className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-800 outline-none transition-colors focus:border-primary-500"
          />
        </div>
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={captureLocation}
            disabled={gpsBusy}
            className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wider text-stone-700 transition-all hover:border-primary-500 disabled:opacity-50"
          >
            <i className="fa-solid fa-location-crosshairs text-primary-400" /> Đính kèm vị trí GPS hiện tại
          </button>
          {coords && (
            <span className="text-stone-400">
              Đã đính kèm: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
            </span>
          )}
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-gradient-to-r from-red-600 to-red-700 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-lg transition-all hover:from-red-500 hover:to-red-600 disabled:opacity-50"
        >
          <i className="fa-solid fa-paper-plane mr-1" /> Gửi tin báo đến Tổ ANTT
        </button>
      </form>

      <div className="space-y-3 text-left">
        <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">Tin báo bạn đã gửi</span>
        <div className="table-scroll-wrap rounded-xl border border-stone-200 bg-stone-50">
          <div className="table-scroll">
            <table className="w-full min-w-125 text-left text-xs">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-stone-500">
                  <th className="min-w-60 whitespace-nowrap bg-stone-50 p-4 font-semibold">Nội dung / Vị trí</th>
                  <th className="min-w-35 whitespace-nowrap p-4 font-semibold">Thời gian gửi</th>
                  <th className="min-w-30 whitespace-nowrap p-4 text-center font-semibold">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200/40 text-stone-600">
                {reports.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-4 text-center text-stone-400">
                      Bạn chưa gửi tin báo nào.
                    </td>
                  </tr>
                ) : (
                  reports.map((r) => {
                    const badge = STATUS_BADGE[r.status];
                    return (
                      <tr key={r._id} className="transition-colors hover:bg-stone-50">
                        <td className="bg-stone-50 p-4">
                          <span className="block text-xs text-stone-900">{r.content}</span>
                          <span className="font-mono text-[10px] text-stone-400">
                            {r.locationText || (r.lat != null ? `${r.lat.toFixed(5)}, ${r.lng?.toFixed(5)}` : 'Không kèm vị trí')}
                          </span>
                        </td>
                        <td className="whitespace-nowrap p-4 font-mono text-[11px] text-stone-500">{r.time}</td>
                        <td className="whitespace-nowrap p-4 text-center">
                          <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${badge.className}`}>
                            <i className={`fa-solid ${badge.icon} mr-1`} /> {badge.label}
                          </span>
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
    </>
  );
}
