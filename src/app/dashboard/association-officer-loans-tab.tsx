'use client';

import { useState } from 'react';
import { clientApi, ClientApiError } from '@/lib/client-api';
import type { AssocLoan, AssociationMember } from '@/lib/types';
import { ConfirmDeleteModal } from './confirm-delete-modal';

export function AssociationOfficerLoansTab({
  association,
  loans,
  members,
  onLoansChange,
}: {
  association: string;
  loans: AssocLoan[];
  members: AssociationMember[];
  onLoansChange: (l: AssocLoan[]) => void;
}) {
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [deletingLoan, setDeletingLoan] = useState<AssocLoan | null>(null);

  function showNotice(type: 'success' | 'error' | 'info', text: string) {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 4000);
  }

  async function refresh() {
    const res = await clientApi<AssocLoan[]>('association-officer/loans');
    onLoansChange(res);
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const member = String(form.get('member') || '').trim();
    const amount = Number(form.get('amount'));
    const interestRate = Number(form.get('interestRate'));
    const termMonths = Number(form.get('termMonths'));
    if (!member || !amount || !termMonths) {
      showNotice('error', 'Vui lòng nhập đầy đủ thông tin khoản vay.');
      return;
    }
    try {
      await clientApi('association-officer/loans', { method: 'POST', body: { member, amount, interestRate, termMonths } });
      await refresh();
      showNotice('success', 'Đã ghi nhận khoản vay và tính vào Chi của quỹ hội.');
      e.currentTarget.reset();
    } catch (err) {
      showNotice('error', err instanceof ClientApiError ? err.message : 'Không thể lập khoản vay.');
    }
  }

  async function complete(id: string) {
    try {
      await clientApi(`association-officer/loans/${id}/complete`, { method: 'POST' });
      await refresh();
      showNotice('success', 'Đã đóng lãi, tự động tính gốc + lãi vào khoản thu.');
    } catch (err) {
      showNotice('error', err instanceof ClientApiError ? err.message : 'Không thể hoàn thành khoản vay.');
    }
  }

  async function confirmDeleteLoan() {
    if (!deletingLoan) return;
    try {
      await clientApi(`association-officer/loans/${deletingLoan.id}`, { method: 'DELETE' });
      setDeletingLoan(null);
      await refresh();
      showNotice('info', 'Đã xóa khoản vay và hoàn tác các giao dịch liên quan.');
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
        <h4 className="font-serif text-lg font-bold text-stone-900">Vay Vốn Hội Viên — {association}</h4>
        <p className="text-xs text-stone-500">Hội viên vay vốn từ quỹ hội; khoản vay tính vào Chi, khi hoàn thành gốc + lãi tự động tính vào Thu.</p>
      </div>

      <div className="space-y-3 rounded-xl border border-stone-200 bg-stone-50 p-4 text-left">
        <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">Lập khoản vay mới</span>
        <form onSubmit={submit} className="grid grid-cols-1 items-end gap-2 sm:grid-cols-4">
          <div className="space-y-1">
            <label className="block text-[9px] font-bold uppercase text-stone-400">Thành viên</label>
            <input name="member" list="assoc-loan-member-datalist" placeholder="Gõ để tìm hội viên..." autoComplete="off" className="w-full rounded border border-stone-200 bg-white px-2 py-1.5 text-xs text-stone-900 outline-none" />
            <datalist id="assoc-loan-member-datalist">
              {members.map((m) => (
                <option key={m._id} value={m.name} />
              ))}
            </datalist>
          </div>
          <div className="space-y-1">
            <label className="block text-[9px] font-bold uppercase text-stone-400">Số tiền vay</label>
            <input name="amount" type="number" required placeholder="Số tiền" className="w-full rounded border border-stone-200 bg-white px-2 py-1.5 text-xs text-stone-900 outline-none" />
          </div>
          <div className="space-y-1">
            <label className="block text-[9px] font-bold uppercase text-stone-400">Lãi suất (%)</label>
            <input name="interestRate" type="number" step="0.1" required placeholder="VD: 5" className="w-full rounded border border-stone-200 bg-white px-2 py-1.5 text-xs text-stone-900 outline-none" />
          </div>
          <div className="space-y-1">
            <label className="block text-[9px] font-bold uppercase text-stone-400">Thời hạn (tháng)</label>
            <input name="termMonths" type="number" required placeholder="VD: 6" className="w-full rounded border border-stone-200 bg-white px-2 py-1.5 text-xs text-stone-900 outline-none" />
          </div>
          <button type="submit" className="w-full rounded bg-primary-600 py-1.5 text-xs font-bold uppercase text-white hover:bg-primary-500 sm:col-span-4">
            Lập khoản vay (tính vào Chi)
          </button>
        </form>
      </div>

      <div className="space-y-3 text-left">
        <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">Danh sách khoản vay</span>
        <div className="table-scroll-wrap rounded-xl border border-stone-200 bg-stone-50">
          <div className="table-scroll">
            <table className="w-full min-w-225 text-left text-xs">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-stone-500">
                  <th className="min-w-35 whitespace-nowrap p-3 font-semibold">Thành viên</th>
                  <th className="min-w-30 whitespace-nowrap p-3 text-right font-semibold">Số tiền vay</th>
                  <th className="min-w-25 whitespace-nowrap p-3 text-center font-semibold">Lãi suất</th>
                  <th className="min-w-25 whitespace-nowrap p-3 text-center font-semibold">Thời hạn</th>
                  <th className="min-w-35 whitespace-nowrap p-3 text-right font-semibold">Gốc + lãi phải trả</th>
                  <th className="min-w-30 whitespace-nowrap p-3 text-center font-semibold">Trạng thái</th>
                  <th className="min-w-45 whitespace-nowrap p-3 text-right font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200/40 text-stone-600">
                {loans.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-4 text-center text-stone-400">
                      Chưa có khoản vay nào.
                    </td>
                  </tr>
                ) : (
                  loans.map((loan) => {
                    const interest = Math.round((loan.amount * loan.interestRate) / 100);
                    const total = loan.amount + interest;
                    const isDone = loan.status === 'Đã hoàn thành';
                    return (
                      <tr key={loan.id} className="transition-colors hover:bg-stone-50">
                        <td className="whitespace-nowrap p-3 font-bold text-stone-900">{loan.memberName}</td>
                        <td className="whitespace-nowrap p-3 text-right font-mono text-stone-600">{loan.amount.toLocaleString('vi-VN')} đ</td>
                        <td className="whitespace-nowrap p-3 text-center text-stone-600">{loan.interestRate}%</td>
                        <td className="whitespace-nowrap p-3 text-center text-stone-600">{loan.termMonths} tháng</td>
                        <td className="whitespace-nowrap p-3 text-right font-mono text-stone-500">{total.toLocaleString('vi-VN')} đ</td>
                        <td className="whitespace-nowrap p-3 text-center">
                          <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${isDone ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>{loan.status}</span>
                        </td>
                        <td className="space-x-2 whitespace-nowrap p-3 text-right">
                          {isDone ? (
                            <span className="font-mono text-[10px] text-stone-400">{loan.completedDate}</span>
                          ) : (
                            <button
                              onClick={() => complete(loan.id)}
                              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-bold uppercase text-white shadow-md transition-all hover:bg-emerald-500"
                            >
                              Xác nhận đã đóng lãi + gốc
                            </button>
                          )}
                          <button
                            onClick={() => setDeletingLoan(loan)}
                            className="rounded-lg bg-red-50 px-2.5 py-1.5 text-[11px] font-semibold text-red-600 hover:bg-red-600 hover:text-white"
                          >
                            <i className="fa-solid fa-trash" /> Xóa
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

      {deletingLoan && (
        <ConfirmDeleteModal
          message={`Bạn có chắc muốn xóa khoản vay của "${deletingLoan.memberName}"? Các giao dịch liên quan sẽ được hoàn tác. Hành động này không thể hoàn tác.`}
          onCancel={() => setDeletingLoan(null)}
          onConfirm={confirmDeleteLoan}
        />
      )}
    </>
  );
}
