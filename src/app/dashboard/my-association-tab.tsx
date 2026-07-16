'use client';

import { useState } from 'react';
import { clientApi, ClientApiError } from '@/lib/client-api';
import { buildVietQrUrl } from '@/lib/vietqr';
import type { MemberFundEntry, MyAssociationOverview } from '@/lib/types';

const STATUS_BADGE: Record<MemberFundEntry['status'], { label: string; className: string; icon: string }> = {
  'Đã đóng': { label: 'Đã hoàn thành', className: 'bg-emerald-50 text-emerald-600', icon: 'fa-check' },
  'Chờ duyệt': { label: 'Chờ duyệt', className: 'bg-blue-50 text-blue-600', icon: 'fa-clock' },
  'Chưa đóng': { label: 'Chưa thanh toán', className: 'bg-amber-50 text-amber-600', icon: 'fa-circle-exclamation' },
};

// Hội đoàn thể CÁ NHÂN đang tham gia (khác với Cán bộ Hội quản lý cả hội) —
// chỉ xem thông tin quỹ hội (thu/chi, ngân hàng) + tự đóng hội phí của
// chính mình, không có quyền chỉnh sửa (đó thuộc Cán bộ Hội).
export function MyAssociationTab({
  data,
  onDataChange,
}: {
  data: MyAssociationOverview;
  onDataChange: (d: MyAssociationOverview) => void;
}) {
  const [payingId, setPayingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  function showNotice(type: 'success' | 'error' | 'info', text: string) {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 4000);
  }

  const payingFee = payingId ? data.myFees.find((f) => f.id === payingId) : null;
  const qrUrl = payingFee ? buildVietQrUrl(data.bankInfo, payingFee.amount, payingFee.memo) : null;

  async function confirmPayment() {
    if (!payingFee) return;
    try {
      const res = await clientApi<{ myFees: MemberFundEntry[] }>(`households/my-association/fees/${payingFee.id}/pay`, {
        method: 'PATCH',
      });
      onDataChange({ ...data, myFees: res.myFees });
      setPayingId(null);
      showNotice('info', `Đã gửi xác nhận chuyển khoản hội phí "${payingFee.name}", đang chờ Cán bộ Hội duyệt.`);
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

      <div className="text-left">
        <h4 className="font-serif text-lg font-bold text-stone-900">{data.association}</h4>
        <p className="text-xs text-stone-500">
          Hội trưởng: <span className="font-semibold text-primary-600">{data.leaderName || 'Chưa có tài khoản phụ trách'}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 text-left sm:grid-cols-2">
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
          <span className="block text-[10px] font-bold uppercase tracking-widest text-emerald-600">Tổng thu</span>
          <span className="mt-1 block text-lg font-bold text-stone-900">{data.thuTotal.toLocaleString('vi-VN')} đ</span>
        </div>
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
          <span className="block text-[10px] font-bold uppercase tracking-widest text-red-600">Tổng chi</span>
          <span className="mt-1 block text-lg font-bold text-stone-900">{data.chiTotal.toLocaleString('vi-VN')} đ</span>
        </div>
      </div>

      <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-left">
        <span className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-primary-600">
          Thông tin chuyển khoản đóng hội phí
        </span>
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-stone-400">Ngân hàng:</span>
            <span className="font-bold text-stone-900">{data.bankInfo.bankName || 'Chưa cập nhật'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-400">Số tài khoản:</span>
            <span className="font-mono font-bold text-stone-900">{data.bankInfo.accountNumber || 'Chưa cập nhật'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-400">Chủ tài khoản:</span>
            <span className="font-bold text-stone-900">{data.bankInfo.accountHolder || 'Chưa cập nhật'}</span>
          </div>
        </div>
      </div>

      <div className="space-y-3 border-t border-stone-200 pt-6 text-left">
        <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">Nghĩa vụ hội phí của tôi</span>
        <div className="table-scroll-wrap rounded-xl border border-stone-200 bg-stone-50">
          <div className="table-scroll">
            <table className="w-full min-w-175 text-left text-xs">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-stone-500">
                  <th className="min-w-50 whitespace-nowrap bg-stone-50 p-4 font-semibold">Khoản hội phí</th>
                  <th className="min-w-25 whitespace-nowrap p-4 font-semibold">Chu kỳ</th>
                  <th className="min-w-30 whitespace-nowrap p-4 text-right font-semibold">Số tiền</th>
                  <th className="min-w-35 whitespace-nowrap p-4 text-center font-semibold">Trạng thái</th>
                  <th className="min-w-40 whitespace-nowrap bg-stone-50 p-4 text-right font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200/40 text-stone-600">
                {data.myFees.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-stone-400">
                      Chưa có khoản hội phí nào.
                    </td>
                  </tr>
                ) : (
                  data.myFees.map((f) => {
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
                            <span className="text-[10px] font-semibold text-blue-600">Đang chờ Cán bộ Hội duyệt</span>
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
      </div>

      <div className="space-y-2 text-left">
        <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">Chi tiết thu theo hội viên</span>
        <div className="table-scroll-wrap rounded-xl border border-stone-200 bg-stone-50">
          <div className="table-scroll">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-stone-500">
                  <th className="p-3 font-semibold">Tên thành viên</th>
                  <th className="p-3 text-right font-semibold">Số tiền đóng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200/40 text-stone-600">
                {data.thuItems.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="p-3 text-center text-stone-400">
                      Chưa có khoản thu nào.
                    </td>
                  </tr>
                ) : (
                  data.thuItems.map((tx, idx) => (
                    <tr key={idx} className="transition-colors hover:bg-stone-50">
                      <td className="p-3 font-semibold text-stone-900">{tx.member ? `${tx.member} - ${tx.desc}` : tx.desc}</td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-600">{tx.amount.toLocaleString('vi-VN')} đ</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="space-y-2 text-left">
        <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">Các khoản chi của hội</span>
        <div className="divide-y divide-stone-200/40 rounded-xl border border-stone-200 bg-stone-50 px-4">
          {data.chiItems.length === 0 ? (
            <p className="py-2 text-xs text-stone-400">Chưa có khoản chi nào.</p>
          ) : (
            data.chiItems.map((tx, idx) => (
              <div key={idx} className="flex items-center justify-between py-2 text-xs">
                <div>
                  <span className="block text-stone-600">{tx.desc}</span>
                  <span className="font-mono text-[11px] text-stone-400">{tx.date}</span>
                </div>
                <span className="font-mono font-bold text-red-600">-{tx.amount.toLocaleString('vi-VN')} đ</span>
              </div>
            ))
          )}
        </div>
      </div>

      {payingFee && (
        <div className="grid grid-cols-1 items-center gap-6 rounded-2xl border border-primary-200 bg-primary-50 p-6 text-left md:grid-cols-12">
          <div className="space-y-4 md:col-span-8">
            <div className="flex items-center gap-2 text-primary-700">
              <i className="fa-solid fa-qrcode text-lg" />
              <h5 className="text-sm font-bold uppercase tracking-wider">Thanh toán hội phí qua QR chuẩn</h5>
            </div>
            <p className="text-xs leading-relaxed text-stone-600">
              Quét mã QR để hoàn thành nghĩa vụ. Cán bộ Hội sẽ xác nhận và cập nhật trạng thái ngay khi giao dịch thành công.
            </p>
            <div className="space-y-2 rounded-xl border border-stone-200 bg-white p-3.5 text-xs">
              <div className="flex justify-between">
                <span className="text-stone-400">Ngân hàng thụ hưởng:</span>
                <span className="font-bold text-stone-900">{data.bankInfo.bankName || 'Chưa cập nhật'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Số tài khoản:</span>
                <span className="font-mono font-bold text-stone-900">{data.bankInfo.accountNumber || 'Chưa cập nhật'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Chủ tài khoản:</span>
                <span className="font-bold text-stone-900">{data.bankInfo.accountHolder || 'Chưa cập nhật'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Mã giao dịch đối soát:</span>
                <span className="font-mono font-bold text-primary-600">{payingFee.memo}</span>
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
              src={qrUrl || `https://placehold.co/150x150/ffffff/000000?text=${payingFee.id}`}
              alt="Mã QR Chuyển Khoản VietQR"
              className="h-36 w-36 rounded-xl border-4 border-white"
            />
          </div>
        </div>
      )}
    </>
  );
}
