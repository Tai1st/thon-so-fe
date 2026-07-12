'use client';

import { useState } from 'react';
import { clientApi } from '@/lib/client-api';
import type { AuditLogItem } from '@/lib/types';

export function AdminLogsTab({ logs, onLogsChange }: { logs: AuditLogItem[]; onLogsChange: (l: AuditLogItem[]) => void }) {
  const [refreshing, setRefreshing] = useState(false);

  async function refresh() {
    setRefreshing(true);
    try {
      const res = await clientApi<AuditLogItem[]>('admin/logs');
      onLogsChange(res);
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <>
      <div className="flex flex-col gap-4 text-left sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="font-serif text-lg font-bold text-stone-900">Nhật ký Hệ thống</h4>
          <p className="text-xs text-stone-500">Ghi lại mọi thao tác quản trị quan trọng để truy vết khi cần thiết.</p>
        </div>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="shrink-0 rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-bold uppercase tracking-wider text-stone-600 hover:bg-stone-50 disabled:opacity-50"
        >
          <i className="fa-solid fa-arrows-rotate mr-1" /> Làm mới
        </button>
      </div>

      <div className="table-scroll-wrap rounded-xl border border-stone-200 bg-stone-50 text-left">
        <div className="table-scroll">
          <table className="w-full min-w-150 text-left text-xs">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-stone-500">
                <th className="min-w-35 whitespace-nowrap p-3 font-semibold">Thời gian</th>
                <th className="min-w-35 whitespace-nowrap p-3 font-semibold">Hành động</th>
                <th className="min-w-60 whitespace-nowrap p-3 font-semibold">Chi tiết</th>
                <th className="min-w-30 whitespace-nowrap p-3 font-semibold">Người thực hiện</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200/40 text-stone-600">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-stone-400">
                    Chưa có nhật ký nào.
                  </td>
                </tr>
              ) : (
                logs.map((l) => (
                  <tr key={l._id} className="transition-colors hover:bg-stone-50">
                    <td className="whitespace-nowrap p-3 font-mono text-[11px] text-stone-500">{l.time}</td>
                    <td className="whitespace-nowrap p-3 font-bold text-stone-900">{l.action}</td>
                    <td className="p-3 text-stone-600">{l.detail}</td>
                    <td className="whitespace-nowrap p-3 font-medium text-stone-600">{l.actor}</td>
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
