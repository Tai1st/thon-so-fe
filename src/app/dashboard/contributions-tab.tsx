'use client';

import { useState } from 'react';
import { clientApi, ClientApiError } from '@/lib/client-api';
import { buildVietQrUrl } from '@/lib/vietqr';
import type { FundObligation, HouseholdData, VillageFund } from '@/lib/types';

const STATUS_BADGE: Record<FundObligation['status'], { label: string; className: string; icon: string }> = {
  'Đã đóng': { label: 'Đã hoàn thành', className: 'bg-emerald-50 text-emerald-600', icon: 'fa-check' },
  'Chờ duyệt': { label: 'Chờ duyệt', className: 'bg-blue-50 text-blue-600', icon: 'fa-clock' },
  'Chưa đóng': { label: 'Chưa thanh toán', className: 'bg-amber-50 text-amber-600', icon: 'fa-circle-exclamation' },
};

export function ContributionsTab({
  household,
  villageFund,
  onHouseholdChange,
}: {
  household: HouseholdData;
  villageFund: VillageFund;
  onHouseholdChange: (h: HouseholdData) => void;
}) {
  const [ledgerView, setLedgerView] = useState<'thu' | 'chi'>('thu');
  const [payingId, setPayingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  function showNotice(type: 'success' | 'error' | 'info', text: string) {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 4000);
  }

  const thuByHousehold = new Map<string, number>();
  villageFund.thu.forEach((t) => thuByHousehold.set(t.household, (thuByHousehold.get(t.household) || 0) + t.amount));
  const ledgerRows =
    ledgerView === 'thu'
      ? [...thuByHousehold.entries()].map(([household, amount]) => ({ label: household, amount, positive: true }))
      : villageFund.chi.map((c) => ({ label: c.desc, amount: c.amount, positive: false }));

  const payingFund = payingId ? household.fundObligations.find((f) => f.id === payingId) : null;
  const qrUrl = payingFund ? buildVietQrUrl(villageFund.bankInfo, payingFund.amount, payingFund.memo) : null;

  async function confirmPayment() {
    if (!payingFund) return;
    try {
      const res = await clientApi<{ fundObligations: FundObligation[] }>(
        `households/me/fund-obligations/${payingFund.id}/pay`,
        { method: 'PATCH' },
      );
      onHouseholdChange({ ...household, fundObligations: res.fundObligations });
      setPayingId(null);
      showNotice('info', `Đã gửi xác nhận chuyển khoản quỹ "${payingFund.name}", đang chờ Trưởng thôn duyệt.`);
    } catch (err) {
      showNotice('error', err instanceof ClientApiError ? err.message : 'Không thể gửi xác nhận thanh toán.');
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

      <div className="space-y-4 text-left">
        <div>
          <h4 className="font-serif text-lg font-bold text-stone-900">Công Khai Quỹ Thôn Toàn Xã</h4>
          <p className="text-xs text-stone-500">
            Minh bạch các khoản thu (đóng góp từ các hộ) và chi (sử dụng quỹ) của toàn thôn.
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-xl bg-amber-50 p-3.5 text-xs text-amber-600">
          <i className="fa-solid fa-house-circle-exclamation text-base" />
          <span>
            <strong>{villageFund.unpaidHouseholds}</strong> / {villageFund.totalHouseholds} hộ chưa đóng quỹ thôn năm{' '}
            {new Date().getFullYear()}
          </span>
        </div>

        <div className="inline-flex rounded-xl border border-stone-200 bg-stone-50 p-1">
          <button
            onClick={() => setLedgerView('thu')}
            className={`rounded-lg px-5 py-1.5 text-xs font-bold uppercase tracking-wider transition-all ${
              ledgerView === 'thu' ? 'bg-primary-600 text-white' : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            Thu
          </button>
          <button
            onClick={() => setLedgerView('chi')}
            className={`rounded-lg px-5 py-1.5 text-xs font-bold uppercase tracking-wider transition-all ${
              ledgerView === 'chi' ? 'bg-primary-600 text-white' : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            Chi
          </button>
        </div>

        <div className="table-scroll-wrap rounded-xl border border-stone-200 bg-stone-50">
          <div className="table-scroll">
            <table className="w-full min-w-105 text-left text-xs">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-stone-500">
                  <th className="min-w-55 whitespace-nowrap bg-stone-50 p-3 font-semibold">
                    {ledgerView === 'thu' ? 'Tên hộ đóng' : 'Nội dung chi'}
                  </th>
                  <th className="min-w-35 whitespace-nowrap p-3 text-right font-semibold">Số tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200/40 text-stone-600">
                {ledgerRows.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="p-4 text-center text-stone-400">
                      Chưa có dữ liệu.
                    </td>
                  </tr>
                ) : (
                  ledgerRows.map((row, idx) => (
                    <tr key={idx} className="transition-colors hover:bg-stone-50">
                      <td className="bg-stone-50 p-3 font-semibold text-stone-900">{row.label}</td>
                      <td className={`p-3 text-right font-mono font-bold ${row.positive ? 'text-emerald-600' : 'text-red-600'}`}>
                        {row.positive ? '+' : '-'}
                        {row.amount.toLocaleString('vi-VN')} đ
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 border-t border-stone-200 pt-6 text-left sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="font-serif text-lg font-bold text-stone-900">Sổ Theo Dõi Đóng Góp Của Hộ Gia Đình Bạn</h4>
          <p className="text-xs text-stone-500">Minh bạch các hoạt động đóng góp, xây dựng nông thôn mới nâng cao.</p>
        </div>
      </div>

      <div className="table-scroll-wrap rounded-xl border border-stone-200 bg-stone-50 text-left">
        <div className="table-scroll">
          <table className="w-full min-w-175 text-left text-xs">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-stone-500">
                <th className="min-w-50 whitespace-nowrap bg-stone-50 p-4 font-semibold">Khoản Đóng Góp</th>
                <th className="min-w-25 whitespace-nowrap p-4 font-semibold">Chu kỳ</th>
                <th className="min-w-30 whitespace-nowrap p-4 text-right font-semibold">Số tiền</th>
                <th className="min-w-35 whitespace-nowrap p-4 text-center font-semibold">Trạng thái</th>
                <th className="min-w-40 whitespace-nowrap bg-stone-50 p-4 text-right font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200/40 text-stone-600">
              {household.fundObligations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-stone-400">
                    Chưa có khoản đóng góp nào.
                  </td>
                </tr>
              ) : (
                household.fundObligations.map((f) => {
                  const badge = STATUS_BADGE[f.status];
                  return (
                    <tr key={f.id} className="transition-colors hover:bg-stone-50">
                      <td className="bg-stone-50 p-4">
                        <span className="block text-xs font-bold text-stone-900">{f.name}</span>
                        <span className="font-mono text-[10px] text-stone-400">{f.memo}</span>
                      </td>
                      <td className="whitespace-nowrap p-4 font-medium text-stone-600">{f.period}</td>
                      <td className="whitespace-nowrap p-4 text-right font-mono font-bold text-stone-900">
                        {f.amount.toLocaleString('vi-VN')} đ
                      </td>
                      <td className="whitespace-nowrap p-4 text-center">
                        <span className={`inline-block rounded-full px-2 py-1 text-center text-[9px] font-extrabold uppercase tracking-wider ${badge.className}`}>
                          <i className={`fa-solid ${badge.icon} mr-1`} /> {badge.label}
                        </span>
                      </td>
                      <td className="whitespace-nowrap bg-stone-50 p-4 text-right">
                        {f.status === 'Đã đóng' ? (
                          <span className="font-mono text-[10px] text-stone-400">{f.date}</span>
                        ) : f.status === 'Chờ duyệt' ? (
                          <span className="text-[10px] font-semibold text-blue-600">Đang chờ Trưởng thôn duyệt</span>
                        ) : (
                          <button
                            onClick={() => setPayingId(f.id)}
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-bold uppercase text-white shadow-md transition-all hover:bg-emerald-500"
                          >
                            Đóng Qua QR
                          </button>
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

      {payingFund && (
        <div className="grid grid-cols-1 items-center gap-6 rounded-2xl border border-primary-200 bg-primary-50 p-6 text-left md:grid-cols-12">
          <div className="space-y-4 md:col-span-8">
            <div className="flex items-center gap-2 text-primary-700">
              <i className="fa-solid fa-qrcode text-lg" />
              <h5 className="text-sm font-bold uppercase tracking-wider">Thanh toán đóng góp nghĩa vụ qua QR chuẩn</h5>
            </div>
            <p className="text-xs leading-relaxed text-stone-600">
              Quét mã QR để hoàn thành nghĩa vụ. Ban quản trị sẽ cập nhật tức thời trạng thái đóng góp cho hộ gia đình của
              bạn ngay khi giao dịch thành công.
            </p>
            <div className="space-y-2 rounded-xl border border-stone-200 bg-white p-3.5 text-xs">
              <div className="flex justify-between">
                <span className="text-stone-400">Ngân hàng thụ hưởng:</span>
                <span className="font-bold text-stone-900">{villageFund.bankInfo.bankName || 'Chưa cập nhật'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Số tài khoản:</span>
                <span className="font-mono font-bold text-stone-900">{villageFund.bankInfo.accountNumber || 'Chưa cập nhật'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Chủ tài khoản:</span>
                <span className="font-bold text-stone-900">{villageFund.bankInfo.accountHolder || 'Chưa cập nhật'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Mã giao dịch đối soát:</span>
                <span className="font-mono font-bold text-primary-600">{payingFund.memo}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={confirmPayment}
                className="rounded-xl bg-primary-600 px-4 py-2 text-xs font-bold uppercase text-white shadow-lg transition-colors hover:bg-primary-500"
              >
                Tôi đã chuyển khoản thành công
              </button>
              <button
                onClick={() => setPayingId(null)}
                className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-bold uppercase text-stone-500 hover:bg-stone-50"
              >
                Hủy
              </button>
            </div>
          </div>
          <div className="flex justify-center md:col-span-4">
            <img
              src={qrUrl || `https://placehold.co/150x150/ffffff/000000?text=${payingFund.id}`}
              alt="Mã QR Chuyển Khoản VietQR"
              className="h-36 w-36 rounded-xl border-4 border-white"
            />
          </div>
        </div>
      )}
    </>
  );
}
