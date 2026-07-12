'use client';

import { useState } from 'react';
import { clientApi, ClientApiError } from '@/lib/client-api';
import type { AssocFundOverview } from '@/lib/types';
import { ConfirmDeleteModal } from './confirm-delete-modal';

const VIETNAM_BANKS = [
  'Agribank - Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam',
  'Vietcombank - Ngân hàng TMCP Ngoại thương Việt Nam',
  'VietinBank - Ngân hàng TMCP Công thương Việt Nam',
  'BIDV - Ngân hàng TMCP Đầu tư và Phát triển Việt Nam',
  'Techcombank - Ngân hàng TMCP Kỹ thương Việt Nam',
  'MB Bank - Ngân hàng TMCP Quân đội',
  'ACB - Ngân hàng TMCP Á Châu',
  'VPBank - Ngân hàng TMCP Việt Nam Thịnh Vượng',
  'Sacombank - Ngân hàng TMCP Sài Gòn Thương Tín',
  'TPBank - Ngân hàng TMCP Tiên Phong',
];

function currentYearOptions(): { value: string; label: string }[] {
  const year = new Date().getFullYear();
  return [year - 1, year, year + 1, year + 2].map((y) => ({ value: String(y), label: `Năm ${y}` }));
}

export function AssociationOfficerFundTab({
  fund,
  onFundChange,
}: {
  fund: AssocFundOverview;
  onFundChange: (f: AssocFundOverview) => void;
}) {
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [deletingObligation, setDeletingObligation] = useState<{ id: string; name: string } | null>(null);
  const [editingObligation, setEditingObligation] = useState<{ id: string; name: string; amount: number; period: string } | null>(null);
  const [txType, setTxType] = useState<'Thu' | 'Chi'>('Thu');
  const [txPeriod, setTxPeriod] = useState<string>(String(new Date().getFullYear()));
  const [txMember, setTxMember] = useState('');
  const [txObligationIds, setTxObligationIds] = useState<string[]>([]);
  const [txDesc, setTxDesc] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [editingTx, setEditingTx] = useState<{ id: string; desc: string; amount: number } | null>(null);
  const [deletingTx, setDeletingTx] = useState<{ id: string; desc: string } | null>(null);

  function showNotice(type: 'success' | 'error' | 'info', text: string) {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 4000);
  }

  async function refresh() {
    const res = await clientApi<AssocFundOverview>('association-officer/fund');
    onFundChange(res);
  }

  async function saveBankInfo(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const bankName = String(form.get('bankName') || '');
    const accountNumber = String(form.get('accountNumber') || '');
    const accountHolder = String(form.get('accountHolder') || '');
    if (!bankName || !accountNumber || !accountHolder) {
      showNotice('error', 'Vui lòng nhập đầy đủ Ngân hàng, Số tài khoản và Chủ tài khoản.');
      return;
    }
    try {
      await clientApi('association-officer/fund/bank-info', { method: 'PATCH', body: { bankName, accountNumber, accountHolder } });
      await refresh();
      showNotice('success', 'Đã cập nhật thông tin tài khoản ngân hàng của quỹ hội.');
    } catch (err) {
      showNotice('error', err instanceof ClientApiError ? err.message : 'Không thể lưu.');
    }
  }

  async function createObligation(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get('name') || '').trim();
    const amount = Number(form.get('amount'));
    const period = String(form.get('period') || '');
    if (!name) return showNotice('error', 'Vui lòng nhập tên khoản thu.');
    if (!amount || amount <= 0) return showNotice('error', 'Số tiền phải lớn hơn 0.');
    try {
      await clientApi('association-officer/fund/obligations', { method: 'POST', body: { name, amount, period: `Năm ${period}` } });
      await refresh();
      showNotice('success', `Đã áp dụng khoản thu "${name}" cho toàn bộ hội viên.`);
      e.currentTarget.reset();
    } catch (err) {
      showNotice('error', err instanceof ClientApiError ? err.message : 'Không thể tạo khoản thu.');
    }
  }

  async function saveEditObligation(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingObligation) return;
    const form = new FormData(e.currentTarget);
    const name = String(form.get('name') || '').trim();
    const amount = Number(form.get('amount'));
    const period = String(form.get('period') || '');
    if (!name) return showNotice('error', 'Vui lòng nhập tên khoản thu.');
    if (!amount || amount <= 0) return showNotice('error', 'Số tiền phải lớn hơn 0.');
    try {
      await clientApi(`association-officer/fund/obligations/${editingObligation.id}`, { method: 'PATCH', body: { name, amount, period } });
      setEditingObligation(null);
      await refresh();
      showNotice('success', `Đã cập nhật khoản thu "${name}".`);
    } catch (err) {
      showNotice('error', err instanceof ClientApiError ? err.message : 'Không thể cập nhật.');
    }
  }

  async function confirmDeleteObligation() {
    if (!deletingObligation) return;
    try {
      await clientApi(`association-officer/fund/obligations/${deletingObligation.id}`, { method: 'DELETE' });
      setDeletingObligation(null);
      await refresh();
      showNotice('info', 'Đã xóa khoản thu.');
    } catch (err) {
      showNotice('error', err instanceof ClientApiError ? err.message : 'Không thể xóa.');
    }
  }

  async function approvePayment(residentId: string, obligationId: string) {
    try {
      await clientApi(`association-officer/fund/payments/${residentId}/${obligationId}/approve`, { method: 'POST' });
      await refresh();
      showNotice('success', 'Đã duyệt khoản đóng góp.');
    } catch (err) {
      showNotice('error', err instanceof ClientApiError ? err.message : 'Không thể duyệt.');
    }
  }

  async function rejectPayment(residentId: string, obligationId: string) {
    try {
      await clientApi(`association-officer/fund/payments/${residentId}/${obligationId}/reject`, { method: 'POST' });
      await refresh();
      showNotice('info', 'Đã từ chối xác nhận chuyển khoản.');
    } catch (err) {
      showNotice('error', err instanceof ClientApiError ? err.message : 'Không thể từ chối.');
    }
  }

  function toggleObligation(id: string) {
    setTxObligationIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const obligationsForPeriod = fund.feeObligations.filter((o) => o.period === `Năm ${txPeriod}`);
  const txTotal = obligationsForPeriod.filter((o) => txObligationIds.includes(o.id)).reduce((s, o) => s + o.amount, 0);

  async function saveEditTx(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingTx) return;
    const form = new FormData(e.currentTarget);
    const desc = String(form.get('desc') || '').trim();
    const amount = Number(form.get('amount'));
    if (!desc) return showNotice('error', 'Vui lòng nhập nội dung.');
    if (!amount || amount <= 0) return showNotice('error', 'Số tiền phải lớn hơn 0.');
    try {
      await clientApi(`association-officer/fund/transactions/${editingTx.id}`, { method: 'PATCH', body: { desc, amount } });
      setEditingTx(null);
      await refresh();
      showNotice('success', 'Đã cập nhật giao dịch.');
    } catch (err) {
      showNotice('error', err instanceof ClientApiError ? err.message : 'Không thể cập nhật.');
    }
  }

  async function confirmDeleteTx() {
    if (!deletingTx) return;
    try {
      await clientApi(`association-officer/fund/transactions/${deletingTx.id}`, { method: 'DELETE' });
      setDeletingTx(null);
      await refresh();
      showNotice('info', 'Đã xóa giao dịch.');
    } catch (err) {
      showNotice('error', err instanceof ClientApiError ? err.message : 'Không thể xóa.');
    }
  }

  async function submitTransaction(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (txType === 'Thu') {
        await clientApi('association-officer/fund/transactions', {
          method: 'POST',
          body: { type: 'Thu', member: txMember, obligationIds: txObligationIds },
        });
        setTxMember('');
        setTxObligationIds([]);
      } else {
        await clientApi('association-officer/fund/transactions', {
          method: 'POST',
          body: { type: 'Chi', desc: txDesc, amount: Number(txAmount) },
        });
        setTxDesc('');
        setTxAmount('');
      }
      await refresh();
      showNotice('success', 'Nhật ký sổ sách quỹ hội đã được cập nhật.');
    } catch (err) {
      showNotice('error', err instanceof ClientApiError ? err.message : 'Không thể ghi nhận giao dịch.');
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
        <h4 className="font-serif text-lg font-bold text-stone-900">Quản lý quỹ hội &amp; Sổ sách thu chi — {fund.association}</h4>
        <p className="text-xs text-stone-500">Thống kê chi tiết tài chính, tự động hóa ghi nhật ký hoạt động.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 text-left sm:grid-cols-2">
        <div className="flex flex-col justify-center rounded-2xl border border-stone-200 bg-stone-900 p-5">
          <span className="block text-[10px] font-bold uppercase tracking-widest text-primary-400">Số dư quỹ hội hiện tại</span>
          <span className="mt-1 block font-serif text-2xl font-black text-white">{fund.balance.toLocaleString('vi-VN')} đ</span>
          <span className="mt-1 block text-[10px] text-stone-400">Hệ thống đối soát tự động của chi hội</span>
        </div>

        <div className="space-y-3 rounded-xl border border-stone-200 bg-stone-50 p-4">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">Ghi nhận giao dịch mới</span>
          <form onSubmit={submitTransaction} className="space-y-2">
            <div className="inline-flex rounded-lg border border-stone-200 bg-white p-1">
              <button
                type="button"
                onClick={() => setTxType('Thu')}
                className={`rounded px-4 py-1 text-xs font-bold uppercase transition-all ${txType === 'Thu' ? 'bg-primary-600 text-white' : 'text-stone-500 hover:text-stone-900'}`}
              >
                Thu
              </button>
              <button
                type="button"
                onClick={() => setTxType('Chi')}
                className={`rounded px-4 py-1 text-xs font-bold uppercase transition-all ${txType === 'Chi' ? 'bg-primary-600 text-white' : 'text-stone-500 hover:text-stone-900'}`}
              >
                Chi
              </button>
            </div>

            {txType === 'Thu' ? (
              <div className="space-y-2">
                <span className="block text-[9px] font-bold uppercase text-stone-400">Chu kỳ</span>
                <select
                  value={txPeriod}
                  onChange={(e) => {
                    setTxPeriod(e.target.value);
                    setTxObligationIds([]);
                  }}
                  className="w-full rounded border border-stone-200 bg-white px-2 py-1.5 text-xs text-stone-900 outline-none"
                >
                  {currentYearOptions().map((y) => (
                    <option key={y.value} value={y.value}>
                      {y.label}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  list="assoc-tx-member-datalist"
                  value={txMember}
                  onChange={(e) => setTxMember(e.target.value)}
                  placeholder="Gõ để tìm hội viên..."
                  autoComplete="off"
                  className="w-full rounded border border-stone-200 bg-white px-2 py-1.5 text-xs text-stone-900 outline-none"
                />
                <span className="block text-[9px] font-bold uppercase text-stone-400">Chọn khoản thu áp dụng (Năm {txPeriod})</span>
                <div className="max-h-32 space-y-1 overflow-y-auto">
                  {obligationsForPeriod.length === 0 ? (
                    <p className="text-[11px] text-stone-400">Không có khoản thu nào áp dụng cho Năm {txPeriod} — hãy tạo ở mục phía dưới hoặc chọn chu kỳ khác.</p>
                  ) : (
                    obligationsForPeriod.map((o) => (
                      <label key={o.id} className="flex cursor-pointer items-center justify-between gap-2 rounded border border-stone-200 bg-white px-2 py-1.5 text-xs">
                        <span className="flex items-center gap-2 text-stone-600">
                          <input type="checkbox" checked={txObligationIds.includes(o.id)} onChange={() => toggleObligation(o.id)} />
                          {o.name}
                        </span>
                        <span className="font-mono text-stone-500">{o.amount.toLocaleString('vi-VN')} đ</span>
                      </label>
                    ))
                  )}
                </div>
                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="text-stone-400">Tổng tiền:</span>
                  <span className="font-mono font-bold text-emerald-600">{txTotal.toLocaleString('vi-VN')} đ</span>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  value={txDesc}
                  onChange={(e) => setTxDesc(e.target.value)}
                  placeholder="Nội dung chi"
                  className="w-full rounded border border-stone-200 bg-white px-2 py-1.5 text-xs text-stone-900 outline-none"
                />
                <input
                  type="number"
                  value={txAmount}
                  onChange={(e) => setTxAmount(e.target.value)}
                  placeholder="Số tiền"
                  className="w-full rounded border border-stone-200 bg-white px-2 py-1.5 text-xs text-stone-900 outline-none"
                />
              </div>
            )}
            <button type="submit" className="w-full rounded bg-primary-600 py-1.5 text-xs font-bold uppercase text-white hover:bg-primary-500">
              Xác nhận giao dịch
            </button>
          </form>
          <datalist id="assoc-tx-member-datalist">
            {fund.members.map((m) => (
              <option key={m._id} value={m.name} />
            ))}
          </datalist>
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-stone-200 bg-stone-50 p-4 text-left">
        <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">Thông tin tài khoản ngân hàng nhận chuyển khoản</span>
        <form onSubmit={saveBankInfo} className="grid grid-cols-1 items-end gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <label className="block text-[9px] font-bold uppercase text-stone-400">Ngân hàng</label>
            <select name="bankName" defaultValue={fund.bankInfo.bankName} className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 outline-none focus:border-primary-500">
              <option value="">-- Chọn ngân hàng --</option>
              {VIETNAM_BANKS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-[9px] font-bold uppercase text-stone-400">Số tài khoản</label>
            <input name="accountNumber" defaultValue={fund.bankInfo.accountNumber} className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 outline-none focus:border-primary-500" />
          </div>
          <div className="space-y-1">
            <label className="block text-[9px] font-bold uppercase text-stone-400">Chủ tài khoản</label>
            <input name="accountHolder" defaultValue={fund.bankInfo.accountHolder} className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 outline-none focus:border-primary-500" />
          </div>
          <button type="submit" className="w-full rounded-lg bg-primary-600 py-2 text-xs font-bold uppercase text-white hover:bg-primary-500 sm:col-span-3">
            Lưu thông tin ngân hàng
          </button>
        </form>
      </div>

      <div className="space-y-3 rounded-xl border border-stone-200 bg-stone-50 p-4 text-left">
        <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">Tạo khoản thu hội phí mới (áp dụng cho mọi hội viên)</span>
        <form onSubmit={createObligation} className="grid grid-cols-1 items-end gap-2 sm:grid-cols-4">
          <div className="space-y-1 sm:col-span-2">
            <label className="block text-[9px] font-bold uppercase text-stone-400">Tên khoản thu</label>
            <input name="name" placeholder="VD: Hội phí đợt 2 năm 2026" className="w-full rounded border border-stone-200 bg-white px-2 py-1.5 text-xs text-stone-900 outline-none" />
          </div>
          <div className="space-y-1">
            <label className="block text-[9px] font-bold uppercase text-stone-400">Chu kỳ</label>
            <select name="period" className="w-full rounded border border-stone-200 bg-white px-2 py-1.5 text-xs text-stone-900 outline-none">
              {currentYearOptions().map((y) => (
                <option key={y.value} value={y.value}>
                  {y.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-[9px] font-bold uppercase text-stone-400">Số tiền / hội viên</label>
            <input name="amount" type="number" placeholder="Số tiền" className="w-full rounded border border-stone-200 bg-white px-2 py-1.5 text-xs text-stone-900 outline-none" />
          </div>
          <button type="submit" className="w-full rounded bg-primary-600 py-1.5 text-xs font-bold uppercase text-white hover:bg-primary-500 sm:col-span-4">
            Tạo khoản thu hội phí
          </button>
        </form>
      </div>

      <div className="space-y-3 text-left">
        <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">Danh sách khoản thu hội phí</span>
        <div className="table-scroll-wrap rounded-xl border border-stone-200 bg-stone-50">
          <div className="table-scroll">
            <table className="w-full min-w-125 text-left text-xs">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-stone-500">
                  <th className="min-w-50 whitespace-nowrap p-3 font-semibold">Tên khoản thu</th>
                  <th className="min-w-25 whitespace-nowrap p-3 font-semibold">Chu kỳ</th>
                  <th className="min-w-30 whitespace-nowrap p-3 text-right font-semibold">Số tiền / hội viên</th>
                  <th className="min-w-35 whitespace-nowrap p-3 text-right font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200/40 text-stone-600">
                {fund.feeObligations.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-stone-400">
                      Chưa có khoản thu hội phí nào.
                    </td>
                  </tr>
                ) : (
                  fund.feeObligations.map((o) => (
                    <tr key={o.id} className="transition-colors hover:bg-stone-50">
                      <td className="whitespace-nowrap p-3 font-semibold text-stone-900">{o.name}</td>
                      <td className="whitespace-nowrap p-3 text-stone-600">{o.period}</td>
                      <td className="whitespace-nowrap p-3 text-right font-mono font-bold text-primary-600">{o.amount.toLocaleString('vi-VN')} đ</td>
                      <td className="space-x-2 whitespace-nowrap p-3 text-right">
                        <button
                          onClick={() => setEditingObligation(o)}
                          className="rounded border border-stone-200 bg-stone-50 px-2.5 py-1 text-[10px] text-stone-600 hover:bg-stone-100"
                        >
                          <i className="fa-solid fa-pen-to-square mr-1" /> Sửa
                        </button>
                        <button
                          onClick={() => setDeletingObligation(o)}
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

      <div className="space-y-3 text-left">
        <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">
          Xác nhận chuyển khoản hội phí đang chờ duyệt ({fund.pendingPayments.length})
        </span>
        <div className="table-scroll-wrap rounded-xl border border-stone-200 bg-stone-50">
          <div className="table-scroll">
            <table className="w-full min-w-175 text-left text-xs">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-stone-500">
                  <th className="min-w-35 whitespace-nowrap p-3 font-semibold">Hội viên</th>
                  <th className="min-w-40 whitespace-nowrap p-3 font-semibold">Khoản thu</th>
                  <th className="min-w-30 whitespace-nowrap p-3 text-right font-semibold">Số tiền</th>
                  <th className="min-w-35 whitespace-nowrap p-3 font-semibold">Thời gian báo</th>
                  <th className="min-w-35 whitespace-nowrap p-3 text-right font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200/40 text-stone-600">
                {fund.pendingPayments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-stone-400">
                      Không có xác nhận chuyển khoản nào đang chờ duyệt.
                    </td>
                  </tr>
                ) : (
                  fund.pendingPayments.map((p) => (
                    <tr key={`${p.residentId}-${p.obligationId}`} className="transition-colors hover:bg-stone-50">
                      <td className="whitespace-nowrap p-3 font-bold text-stone-900">{p.memberName}</td>
                      <td className="whitespace-nowrap p-3 text-stone-600">{p.name}</td>
                      <td className="whitespace-nowrap p-3 text-right font-mono font-bold text-blue-600">{p.amount.toLocaleString('vi-VN')} đ</td>
                      <td className="whitespace-nowrap p-3 font-mono text-[11px] text-stone-500">{p.date}</td>
                      <td className="space-x-1.5 whitespace-nowrap p-3 text-right">
                        <button
                          onClick={() => approvePayment(p.residentId, p.obligationId)}
                          className="rounded bg-emerald-600 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-emerald-500"
                        >
                          Duyệt
                        </button>
                        <button
                          onClick={() => rejectPayment(p.residentId, p.obligationId)}
                          className="rounded border border-stone-200 bg-stone-50 px-2.5 py-1 text-[10px] font-bold text-stone-500 hover:bg-stone-100"
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

      <div className="space-y-3 text-left">
        <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">Nhật ký lịch sử giao dịch</span>
        <div className="table-scroll-wrap rounded-xl border border-stone-200 bg-stone-50">
          <div className="table-scroll">
            <table className="w-full min-w-175 text-left text-xs">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-stone-500">
                  <th className="min-w-25 whitespace-nowrap p-3 font-semibold">Phân loại</th>
                  <th className="min-w-50 whitespace-nowrap p-3 font-semibold">Diễn giải nội dung</th>
                  <th className="min-w-30 whitespace-nowrap p-3 text-right font-semibold">Số tiền</th>
                  <th className="min-w-30 whitespace-nowrap p-3 text-center font-semibold">Ngày thực hiện</th>
                  <th className="min-w-30 whitespace-nowrap p-3 font-semibold">Cán bộ lập</th>
                  <th className="min-w-35 whitespace-nowrap p-3 text-right font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200/40 text-stone-600">
                {fund.txs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-stone-400">
                      Chưa có giao dịch phát sinh nào.
                    </td>
                  </tr>
                ) : (
                  fund.txs.map((tx) => {
                    const desc = tx.type === 'Thu' && tx.member ? `${tx.member} - ${tx.desc}` : tx.desc;
                    return (
                      <tr key={tx.id} className="transition-colors hover:bg-stone-50">
                        <td className="whitespace-nowrap p-3">
                          <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${tx.type === 'Thu' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>{tx.type}</span>
                        </td>
                        <td className="whitespace-nowrap p-3 text-stone-600">{desc}</td>
                        <td className="whitespace-nowrap p-3 text-right font-mono font-bold text-stone-900">
                          {tx.type === 'Thu' ? '+' : '-'}
                          {tx.amount.toLocaleString('vi-VN')} đ
                        </td>
                        <td className="whitespace-nowrap p-3 text-center font-mono text-stone-500">{tx.date}</td>
                        <td className="whitespace-nowrap p-3 text-stone-400">{tx.officer}</td>
                        <td className="space-x-1.5 whitespace-nowrap p-3 text-right">
                          {tx.id && (
                            <>
                              <button
                                onClick={() => setEditingTx({ id: tx.id!, desc, amount: tx.amount })}
                                className="rounded border border-stone-200 bg-white px-2.5 py-1 text-[10px] text-stone-600 hover:bg-stone-100"
                              >
                                <i className="fa-solid fa-pen-to-square mr-1" /> Sửa
                              </button>
                              <button
                                onClick={() => setDeletingTx({ id: tx.id!, desc })}
                                className="rounded bg-red-50 px-2.5 py-1 text-[10px] font-semibold text-red-600 hover:bg-red-600 hover:text-white"
                              >
                                <i className="fa-solid fa-trash mr-1" /> Xóa
                              </button>
                            </>
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

      {editingObligation && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-stone-950/80 p-4">
          <div className="w-full max-w-md space-y-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-bold uppercase tracking-wider text-stone-900">Sửa khoản thu</h5>
              <button onClick={() => setEditingObligation(null)} className="text-stone-400 hover:text-stone-900">
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <form onSubmit={saveEditObligation} className="space-y-3">
              <div className="space-y-1">
                <label className="block text-[9px] font-bold uppercase text-stone-400">Tên khoản thu</label>
                <input name="name" defaultValue={editingObligation.name} className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 outline-none" />
              </div>
              <div className="space-y-1">
                <label className="block text-[9px] font-bold uppercase text-stone-400">Chu kỳ</label>
                <input name="period" defaultValue={editingObligation.period} className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 outline-none" />
              </div>
              <div className="space-y-1">
                <label className="block text-[9px] font-bold uppercase text-stone-400">Số tiền / hội viên</label>
                <input name="amount" type="number" defaultValue={editingObligation.amount} className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 outline-none" />
              </div>
              <button type="submit" className="w-full rounded-xl bg-primary-600 py-2.5 text-xs font-bold uppercase text-white hover:bg-primary-500">
                Lưu thay đổi
              </button>
            </form>
          </div>
        </div>
      )}

      {editingTx && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-stone-950/80 p-4">
          <div className="w-full max-w-md space-y-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-bold uppercase tracking-wider text-stone-900">Sửa giao dịch</h5>
              <button onClick={() => setEditingTx(null)} className="text-stone-400 hover:text-stone-900">
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <form onSubmit={saveEditTx} className="space-y-3">
              <div className="space-y-1">
                <label className="block text-[9px] font-bold uppercase text-stone-400">Diễn giải nội dung</label>
                <input name="desc" defaultValue={editingTx.desc} className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 outline-none" />
              </div>
              <div className="space-y-1">
                <label className="block text-[9px] font-bold uppercase text-stone-400">Số tiền</label>
                <input name="amount" type="number" defaultValue={editingTx.amount} className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 outline-none" />
              </div>
              <button type="submit" className="w-full rounded-xl bg-primary-600 py-2.5 text-xs font-bold uppercase text-white hover:bg-primary-500">
                Lưu thay đổi
              </button>
            </form>
          </div>
        </div>
      )}

      {deletingTx && (
        <ConfirmDeleteModal
          message={`Bạn có chắc muốn xóa giao dịch "${deletingTx.desc}"? Hành động này không thể hoàn tác.`}
          onCancel={() => setDeletingTx(null)}
          onConfirm={confirmDeleteTx}
        />
      )}

      {deletingObligation && (
        <ConfirmDeleteModal
          message={`Bạn có chắc muốn xóa khoản thu "${deletingObligation.name}"? Hành động này không thể hoàn tác.`}
          onCancel={() => setDeletingObligation(null)}
          onConfirm={confirmDeleteObligation}
        />
      )}
    </>
  );
}
