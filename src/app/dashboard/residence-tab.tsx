'use client';

import { useState } from 'react';
import { clientApi, ClientApiError } from '@/lib/client-api';
import type { ResidenceRegistrationItem } from '@/lib/types';

const STATUS_BADGE: Record<ResidenceRegistrationItem['status'], { label: string; className: string; icon: string }> = {
  'Đã duyệt': { label: 'Đã duyệt', className: 'bg-emerald-50 text-emerald-600', icon: 'fa-check' },
  'Từ chối': { label: 'Từ chối', className: 'bg-red-50 text-red-600', icon: 'fa-xmark' },
  'Chờ duyệt': { label: 'Chờ duyệt', className: 'bg-amber-50 text-amber-600', icon: 'fa-clock' },
};

const EMPTY_FORM = { guestName: '', guestCccd: '', relationship: '', reason: '', fromDate: '', toDate: '' };

export function ResidenceTab({
  registrations,
  onRegistrationsChange,
}: {
  registrations: ResidenceRegistrationItem[];
  onRegistrationsChange: (r: ResidenceRegistrationItem[]) => void;
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  function showNotice(type: 'success' | 'error' | 'info', text: string) {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 4000);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.guestName.trim() || !form.relationship.trim() || !form.fromDate || !form.toDate) {
      showNotice('error', 'Vui lòng nhập đầy đủ Họ tên, Quan hệ, Từ ngày và Đến ngày.');
      return;
    }
    setSubmitting(true);
    try {
      await clientApi('residence-registrations', { method: 'POST', body: form });
      const res = await clientApi<ResidenceRegistrationItem[]>('residence-registrations/mine');
      onRegistrationsChange(res);
      setForm(EMPTY_FORM);
      showNotice('info', 'Đăng ký lưu trú đang chờ Tổ ANTT phê duyệt.');
    } catch (err) {
      showNotice('error', err instanceof ClientApiError ? err.message : 'Không thể gửi đăng ký.');
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
        <h4 className="font-serif text-lg font-bold text-stone-900">Đăng Ký Lưu Trú Cho Người Thân</h4>
        <p className="text-xs text-stone-500">
          Gửi đăng ký tạm trú cho khách/người thân đến ở lại nhà bạn để Tổ ANTT duyệt và theo dõi.
        </p>
      </div>

      <form onSubmit={submit} className="grid grid-cols-1 gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-5 text-left sm:grid-cols-2">
        <Field label="Họ tên người lưu trú *" value={form.guestName} onChange={(v) => setForm({ ...form, guestName: v })} />
        <Field label="Số Căn Cước" value={form.guestCccd} onChange={(v) => setForm({ ...form, guestCccd: v })} />
        <Field
          label="Quan hệ với chủ hộ *"
          placeholder="VD: Anh/chị, bạn bè..."
          value={form.relationship}
          onChange={(v) => setForm({ ...form, relationship: v })}
        />
        <Field label="Lý do lưu trú" value={form.reason} onChange={(v) => setForm({ ...form, reason: v })} />
        <DateField label="Từ ngày *" value={form.fromDate} onChange={(v) => setForm({ ...form, fromDate: v })} />
        <DateField label="Đến ngày *" value={form.toDate} onChange={(v) => setForm({ ...form, toDate: v })} />
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-lg transition-all hover:from-primary-500 hover:to-primary-600 disabled:opacity-50 sm:col-span-2"
        >
          Gửi đăng ký lưu trú
        </button>
      </form>

      <div className="space-y-3 text-left">
        <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">Đăng ký của hộ bạn</span>
        <div className="table-scroll-wrap rounded-xl border border-stone-200 bg-stone-50">
          <div className="table-scroll">
            <table className="w-full min-w-125 text-left text-xs">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-stone-500">
                  <th className="min-w-40 whitespace-nowrap bg-stone-50 p-4 font-semibold">Người lưu trú</th>
                  <th className="min-w-30 whitespace-nowrap p-4 font-semibold">Quan hệ</th>
                  <th className="min-w-40 whitespace-nowrap p-4 font-semibold">Thời gian lưu trú</th>
                  <th className="min-w-30 whitespace-nowrap p-4 text-center font-semibold">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200/40 text-stone-600">
                {registrations.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-stone-400">
                      Bạn chưa đăng ký lưu trú nào.
                    </td>
                  </tr>
                ) : (
                  registrations.map((r) => {
                    const badge = STATUS_BADGE[r.status];
                    return (
                      <tr key={r._id} className="transition-colors hover:bg-stone-50">
                        <td className="whitespace-nowrap bg-stone-50 p-4 font-bold text-stone-900">{r.guestName}</td>
                        <td className="whitespace-nowrap p-4 text-stone-600">{r.relationship}</td>
                        <td className="whitespace-nowrap p-4 font-mono text-stone-500">
                          {r.fromDate} → {r.toDate}
                        </td>
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

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">{label}</label>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-800 outline-none transition-colors focus:border-primary-500"
      />
    </div>
  );
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">{label}</label>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-800 outline-none transition-colors focus:border-primary-500"
      />
    </div>
  );
}
