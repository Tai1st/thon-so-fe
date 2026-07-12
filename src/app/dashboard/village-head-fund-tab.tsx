'use client';

import { useState } from 'react';
import { clientApi, ClientApiError } from '@/lib/client-api';
import type { FundObligationDef, VillageFundOverview } from '@/lib/types';
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
  const years = [year - 1, year, year + 1, year + 2];
  return years.map((y) => ({ value: String(y), label: `Năm ${y}` }));
}

export function VillageHeadFundTab({
  fund,
  onFundChange,
}: {
  fund: VillageFundOverview;
  onFundChange: (f: VillageFundOverview) => void;
}) {
  const [ledgerView, setLedgerView] = useState<'thu' | 'chi'>('thu');
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [deletingTx, setDeletingTx] = useState<{ type: 'thu' | 'chi'; id: string; label: string } | null>(null);
  const [deletingObligation, setDeletingObligation] = useState<FundObligationDef | null>(null);
  const [editingObligation, setEditingObligation] = useState<FundObligationDef | null>(null);

  function showNotice(type: 'success' | 'error' | 'info', text: string) {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 4000);
  }

  async function refresh() {
    const res = await clientApi<VillageFundOverview>('village-head/village-fund');
    onFundChange(res);
  }

  async function approvePayment(familyId: string, obligationId: string) {
    try {
      await clientApi(`village-head/village-fund/payments/${familyId}/${obligationId}/approve`, { method: 'POST' });
      await refresh();
      showNotice('success', 'Đã duyệt khoản đóng góp.');
    } catch (err) {
      showNotice('error', err instanceof ClientApiError ? err.message : 'Không thể duyệt.');
    }
  }

  async function rejectPayment(familyId: string, obligationId: string) {
    try {
      await clientApi(`village-head/village-fund/payments/${familyId}/${obligationId}/reject`, { method: 'POST' });
      await refresh();
      showNotice('info', 'Đã từ chối xác nhận chuyển khoản.');
    } catch (err) {
      showNotice('error', err instanceof ClientApiError ? err.message : 'Không thể từ chối.');
    }
  }

  async function confirmDeleteObligation() {
    if (!deletingObligation) return;
    try {
      await clientApi(`village-head/village-fund/obligations/${deletingObligation.id}`, { method: 'DELETE' });
      setDeletingObligation(null);
      await refresh();
      showNotice('info', 'Đã xóa khoản thu.');
    } catch (err) {
      showNotice('error', err instanceof ClientApiError ? err.message : 'Không thể xóa.');
    }
  }

  async function confirmDeleteTx() {
    if (!deletingTx) return;
    try {
      await clientApi(`village-head/village-fund/transactions/${deletingTx.type}/${deletingTx.id}`, { method: 'DELETE' });
      setDeletingTx(null);
      await refresh();
      showNotice('info', 'Đã xóa giao dịch.');
    } catch (err) {
      showNotice('error', err instanceof ClientApiError ? err.message : 'Không thể xóa.');
    }
  }

  async function saveEditTx(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingTx) return;
    const form = new FormData(e.currentTarget);
    const label = String(form.get('label') || '').trim();
    const amount = Number(form.get('amount'));
    if (!label) return showNotice('error', 'Vui lòng nhập nội dung.');
    if (!amount || amount <= 0) return showNotice('error', 'Số tiền phải lớn hơn 0.');
    try {
      await clientApi(`village-head/village-fund/transactions/${editingTx.type}/${editingTx.id}`, {
        method: 'PATCH',
        body: { label, amount },
      });
      setEditingTx(null);
      await refresh();
      showNotice('success', 'Đã cập nhật giao dịch.');
    } catch (err) {
      showNotice('error', err instanceof ClientApiError ? err.message : 'Không thể cập nhật.');
    }
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
      await clientApi('village-head/village-fund/bank-info', { method: 'PATCH', body: { bankName, accountNumber, accountHolder } });
      await refresh();
      showNotice('success', 'Đã cập nhật thông tin tài khoản ngân hàng của quỹ thôn.');
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
      await clientApi('village-head/village-fund/obligations', { method: 'POST', body: { name, amount, period: `Năm ${period}` } });
      await refresh();
      showNotice('success', `Đã áp dụng khoản thu "${name}" cho toàn bộ hộ gia đình trong thôn.`);
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
      await clientApi(`village-head/village-fund/obligations/${editingObligation.id}`, {
        method: 'PATCH',
        body: { name, amount, period },
      });
      setEditingObligation(null);
      await refresh();
      showNotice('success', `Đã cập nhật khoản thu "${name}".`);
    } catch (err) {
      showNotice('error', err instanceof ClientApiError ? err.message : 'Không thể cập nhật.');
    }
  }

  const [txType, setTxType] = useState<'Thu' | 'Chi'>('Thu');
  const [txPeriod, setTxPeriod] = useState<string>(String(new Date().getFullYear()));
  const [txHousehold, setTxHousehold] = useState('');
  const [txObligationIds, setTxObligationIds] = useState<string[]>([]);
  const [txDesc, setTxDesc] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [editingTx, setEditingTx] = useState<{ type: 'thu' | 'chi'; id: string; label: string; amount: number } | null>(null);

  // Chọn Chu kỳ TRƯỚC để lọc đúng danh sách khoản thu áp dụng cho năm đó,
  // tránh phải dò trong danh sách toàn bộ khoản thu mọi năm.
  const obligationsForPeriod = fund.obligations.filter((o) => o.period === `Năm ${txPeriod}`);
  const txTotal = obligationsForPeriod.filter((o) => txObligationIds.includes(o.id)).reduce((s, o) => s + o.amount, 0);

  function toggleObligation(id: string) {
    setTxObligationIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function submitTransaction(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (txType === 'Thu') {
        await clientApi('village-head/village-fund/transactions', {
          method: 'POST',
          body: { type: 'Thu', household: txHousehold, obligationIds: txObligationIds },
        });
        setTxHousehold('');
        setTxObligationIds([]);
      } else {
        await clientApi('village-head/village-fund/transactions', {
          method: 'POST',
          body: { type: 'Chi', desc: txDesc, amount: Number(txAmount) },
        });
        setTxDesc('');
        setTxAmount('');
      }
      await refresh();
      setLedgerView(txType === 'Thu' ? 'thu' : 'chi');
      showNotice('success', 'Đã cập nhật sổ sách quỹ thôn.');
    } catch (err) {
      showNotice('error', err instanceof ClientApiError ? err.message : 'Không thể ghi nhận giao dịch.');
    }
  }

  const ledgerRows = ledgerView === 'thu' ? fund.thu : fund.chi;

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
        <h4 className="font-serif text-lg font-bold text-stone-900">Quản lý Quỹ Thôn</h4>
        <p className="text-xs text-stone-500">Ghi nhận và công khai thu chi quỹ thôn toàn xã với người dân.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 text-left sm:grid-cols-3">
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
          <span className="block text-[10px] font-bold uppercase tracking-widest text-emerald-600">Tổng thu</span>
          <span className="mt-1 block text-lg font-bold text-stone-900">{fund.thuTotal.toLocaleString('vi-VN')} đ</span>
        </div>
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
          <span className="block text-[10px] font-bold uppercase tracking-widest text-red-600">Tổng chi</span>
          <span className="mt-1 block text-lg font-bold text-stone-900">{fund.chiTotal.toLocaleString('vi-VN')} đ</span>
        </div>
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
          <span className="block text-[10px] font-bold uppercase tracking-widest text-primary-600">Số dư hiện tại</span>
          <span className="mt-1 block text-lg font-bold text-stone-900">{fund.balance.toLocaleString('vi-VN')} đ</span>
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-stone-200 bg-stone-50 p-4 text-left">
        <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">
          Thông tin tài khoản ngân hàng nhận chuyển khoản quỹ thôn
        </span>
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

      <div className="space-y-3 text-left">
        <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">
          Xác nhận chuyển khoản đang chờ duyệt ({fund.pendingPayments.length})
        </span>
        <div className="table-scroll-wrap rounded-xl border border-stone-200 bg-stone-50">
          <div className="table-scroll">
            <table className="w-full min-w-175 text-left text-xs">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-stone-500">
                  <th className="min-w-40 whitespace-nowrap p-3 font-semibold">Hộ</th>
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
                    <tr key={`${p.familyId}-${p.obligationId}`} className="transition-colors hover:bg-stone-50">
                      <td className="whitespace-nowrap p-3">
                        <span className="block font-bold text-stone-900">{p.headName}</span>
                        <span className="font-mono text-[10px] text-stone-400">{p.familyId}</span>
                      </td>
                      <td className="whitespace-nowrap p-3 text-stone-600">{p.name}</td>
                      <td className="whitespace-nowrap p-3 text-right font-mono font-bold text-blue-600">{p.amount.toLocaleString('vi-VN')} đ</td>
                      <td className="whitespace-nowrap p-3 font-mono text-[11px] text-stone-500">{p.date}</td>
                      <td className="space-x-1.5 whitespace-nowrap p-3 text-right">
                        <button
                          onClick={() => approvePayment(p.familyId, p.obligationId)}
                          className="rounded bg-emerald-600 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-emerald-500"
                        >
                          Duyệt
                        </button>
                        <button
                          onClick={() => rejectPayment(p.familyId, p.obligationId)}
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

      <div className="space-y-3 rounded-xl border border-stone-200 bg-stone-50 p-4 text-left">
        <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">Tạo khoản thu quỹ thôn mới (áp dụng cho mọi hộ)</span>
        <form onSubmit={createObligation} className="grid grid-cols-1 items-end gap-2 sm:grid-cols-4">
          <div className="space-y-1 sm:col-span-2">
            <label className="block text-[9px] font-bold uppercase text-stone-400">Tên khoản thu</label>
            <input name="name" placeholder="VD: Quỹ Nông thôn mới 2026" className="w-full rounded bg-white px-2 py-1.5 text-xs text-stone-900 outline-none border border-stone-200" />
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
            <label className="block text-[9px] font-bold uppercase text-stone-400">Số tiền / hộ</label>
            <input name="amount" type="number" placeholder="Số tiền" className="w-full rounded border border-stone-200 bg-white px-2 py-1.5 text-xs text-stone-900 outline-none" />
          </div>
          <button type="submit" className="w-full rounded bg-primary-600 py-1.5 text-xs font-bold uppercase text-white hover:bg-primary-500 sm:col-span-4">
            Tạo khoản thu
          </button>
        </form>
      </div>

      <div className="space-y-3 text-left">
        <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">Danh sách khoản thu quỹ thôn</span>
        <div className="table-scroll-wrap rounded-xl border border-stone-200 bg-stone-50">
          <div className="table-scroll">
            <table className="w-full min-w-125 text-left text-xs">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-stone-500">
                  <th className="min-w-50 whitespace-nowrap p-3 font-semibold">Tên khoản thu</th>
                  <th className="min-w-25 whitespace-nowrap p-3 font-semibold">Chu kỳ</th>
                  <th className="min-w-30 whitespace-nowrap p-3 text-right font-semibold">Số tiền / hộ</th>
                  <th className="min-w-35 whitespace-nowrap p-3 text-right font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200/40 text-stone-600">
                {fund.obligations.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-stone-400">
                      Chưa có khoản thu nào.
                    </td>
                  </tr>
                ) : (
                  fund.obligations.map((o) => (
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

      <div className="space-y-3 rounded-xl border border-stone-200 bg-stone-50 p-4 text-left">
        <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">Ghi nhận khoản thu/chi mới</span>
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
              <div className="space-y-1">
                <label className="block text-[9px] font-bold uppercase text-stone-400">Chu kỳ</label>
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
              </div>
              <input
                type="text"
                list="vh-household-datalist"
                value={txHousehold}
                onChange={(e) => setTxHousehold(e.target.value)}
                placeholder="Gõ để tìm chủ hộ..."
                autoComplete="off"
                className="w-full rounded border border-stone-200 bg-white px-2 py-1.5 text-xs text-stone-900 outline-none"
              />
              <span className="block text-[9px] font-bold uppercase text-stone-400">Chọn khoản thu áp dụng (Năm {txPeriod})</span>
              <div className="max-h-32 space-y-1 overflow-y-auto">
                {obligationsForPeriod.length === 0 ? (
                  <p className="text-[11px] text-stone-400">Không có khoản thu nào áp dụng cho Năm {txPeriod} — hãy tạo ở mục phía trên hoặc chọn chu kỳ khác.</p>
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
            Ghi nhận
          </button>
        </form>
      </div>

      <div className="space-y-3 text-left">
        <div className="flex items-center justify-between">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">Sổ sách giao dịch</span>
          <div className="inline-flex rounded-lg border border-stone-200 bg-white p-1">
            <button
              onClick={() => setLedgerView('thu')}
              className={`rounded px-4 py-1 text-xs font-bold uppercase transition-all ${ledgerView === 'thu' ? 'bg-primary-600 text-white' : 'text-stone-500 hover:text-stone-900'}`}
            >
              Thu
            </button>
            <button
              onClick={() => setLedgerView('chi')}
              className={`rounded px-4 py-1 text-xs font-bold uppercase transition-all ${ledgerView === 'chi' ? 'bg-primary-600 text-white' : 'text-stone-500 hover:text-stone-900'}`}
            >
              Chi
            </button>
          </div>
        </div>
        <div className="table-scroll-wrap rounded-xl border border-stone-200 bg-stone-50">
          <div className="table-scroll">
            <table className="w-full min-w-125 text-left text-xs">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-stone-500">
                  <th className="min-w-50 whitespace-nowrap p-3 font-semibold">{ledgerView === 'thu' ? 'Tên hộ đóng' : 'Nội dung chi'}</th>
                  <th className="min-w-30 whitespace-nowrap p-3 text-right font-semibold">Số tiền</th>
                  <th className="min-w-35 whitespace-nowrap p-3 text-right font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200/40 text-stone-600">
                {ledgerRows.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-4 text-center text-stone-400">
                      Chưa có dữ liệu.
                    </td>
                  </tr>
                ) : (
                  ledgerRows.map((t, idx) => {
                    const label = ledgerView === 'thu' ? (t as { household: string }).household : (t as { desc: string }).desc;
                    const key = t.id || `${ledgerView}-${idx}`;
                    return (
                      <tr key={key} className="transition-colors hover:bg-stone-50">
                        <td className="whitespace-nowrap p-3 font-semibold text-stone-900">{label}</td>
                        <td className={`whitespace-nowrap p-3 text-right font-mono font-bold ${ledgerView === 'thu' ? 'text-emerald-600' : 'text-red-600'}`}>
                          {ledgerView === 'thu' ? '+' : '-'}
                          {t.amount.toLocaleString('vi-VN')} đ
                        </td>
                        <td className="space-x-1.5 whitespace-nowrap p-3 text-right">
                          {t.id && (
                            <>
                              <button
                                onClick={() => setEditingTx({ type: ledgerView, id: t.id!, label, amount: t.amount })}
                                className="rounded border border-stone-200 bg-white px-2.5 py-1 text-[10px] text-stone-600 hover:bg-stone-100"
                              >
                                <i className="fa-solid fa-pen-to-square mr-1" /> Sửa
                              </button>
                              <button
                                onClick={() => setDeletingTx({ type: ledgerView, id: t.id!, label })}
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

      <div className="space-y-3 text-left">
        <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">
          Hộ chưa đóng đủ quỹ thôn ({fund.unpaidHouseholds.length})
        </span>
        <div className="table-scroll-wrap rounded-xl border border-stone-200 bg-stone-50">
          <div className="table-scroll">
            <table className="w-full min-w-150 text-left text-xs">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-stone-500">
                  <th className="min-w-25 whitespace-nowrap p-3 font-semibold">Mã hộ</th>
                  <th className="min-w-40 whitespace-nowrap p-3 font-semibold">Chủ hộ</th>
                  <th className="min-w-30 whitespace-nowrap p-3 font-semibold">Ngày sinh</th>
                  <th className="min-w-30 whitespace-nowrap p-3 font-semibold">Địa bàn</th>
                  <th className="min-w-35 whitespace-nowrap p-3 text-right font-semibold">Số tiền chưa đóng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200/40 text-stone-600">
                {fund.unpaidHouseholds.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-stone-400">
                      Không có hộ nào chưa đóng.
                    </td>
                  </tr>
                ) : (
                  fund.unpaidHouseholds.map((h) => (
                    <tr key={h.familyId} className="transition-colors hover:bg-stone-50">
                      <td className="whitespace-nowrap p-3 font-mono text-stone-500">{h.familyId}</td>
                      <td className="whitespace-nowrap p-3 font-semibold text-stone-900">{h.representative}</td>
                      <td className="whitespace-nowrap p-3 font-mono text-stone-500">{h.dob || 'Chưa cập nhật'}</td>
                      <td className="whitespace-nowrap p-3 text-stone-600">{h.group}</td>
                      <td className="whitespace-nowrap p-3 text-right font-mono font-bold text-amber-600">{h.unpaidAmount.toLocaleString('vi-VN')} đ</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <datalist id="vh-household-datalist">
        {fund.unpaidHouseholds.map((h) => (
          <option key={h.familyId} value={h.representative} />
        ))}
      </datalist>

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
                <label className="block text-[9px] font-bold uppercase text-stone-400">Số tiền / hộ</label>
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
              <h5 className="text-xs font-bold uppercase tracking-wider text-stone-900">Sửa giao dịch {editingTx.type === 'thu' ? 'Thu' : 'Chi'}</h5>
              <button onClick={() => setEditingTx(null)} className="text-stone-400 hover:text-stone-900">
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <form onSubmit={saveEditTx} className="space-y-3">
              <div className="space-y-1">
                <label className="block text-[9px] font-bold uppercase text-stone-400">
                  {editingTx.type === 'thu' ? 'Tên hộ đóng' : 'Nội dung chi'}
                </label>
                <input name="label" defaultValue={editingTx.label} className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 outline-none" />
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
          message={`Bạn có chắc muốn xóa giao dịch ${deletingTx.type === 'thu' ? 'Thu' : 'Chi'} "${deletingTx.label}"? Hành động này không thể hoàn tác.`}
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
