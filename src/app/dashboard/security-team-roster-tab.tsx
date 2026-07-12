'use client';

import type { SecurityRosterMember } from '@/lib/types';

const TITLE_BADGE: Record<string, string> = {
  'Tổ Trưởng': 'bg-primary-600 text-white',
  'Tổ Phó': 'bg-primary-50 text-primary-700',
};

export function SecurityTeamRosterTab({ roster }: { roster: SecurityRosterMember[] }) {
  return (
    <>
      <div className="text-left">
        <h4 className="font-serif text-lg font-bold text-stone-900">Thành Viên Tổ An Ninh Trật Tự</h4>
        <p className="text-xs text-stone-500">Danh sách đầy đủ toàn bộ thành viên Tổ ANTT, kèm chức danh, Căn Cước, ngày sinh và số điện thoại liên hệ.</p>
      </div>
      <p className="-mt-2 text-[11px] text-stone-400">Thêm/sửa/xóa thành viên và chức danh (Tổ Trưởng/Tổ Phó/Tổ Viên) do Admin quản lý ở tab &quot;Quản lý Tài khoản&quot;.</p>

      <div className="table-scroll-wrap rounded-xl border border-stone-200 bg-stone-50 text-left">
        <div className="table-scroll">
          <table className="w-full min-w-175 text-left text-xs">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-stone-500">
                <th className="min-w-35 whitespace-nowrap p-3 font-semibold">Họ và Tên</th>
                <th className="min-w-25 whitespace-nowrap p-3 font-semibold">Chức danh</th>
                <th className="min-w-35 whitespace-nowrap p-3 font-semibold">Số Căn Cước</th>
                <th className="min-w-30 whitespace-nowrap p-3 font-semibold">Ngày sinh</th>
                <th className="min-w-35 whitespace-nowrap p-3 font-semibold">Số điện thoại</th>
                <th className="min-w-30 whitespace-nowrap p-3 font-semibold">Địa bàn</th>
                <th className="min-w-25 whitespace-nowrap p-3 text-right font-semibold">Vị trí</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200/40 text-stone-600">
              {roster.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-4 text-center text-stone-400">
                    Chưa có thành viên Tổ ANTT nào.
                  </td>
                </tr>
              ) : (
                roster.map((m) => (
                  <tr key={m.name} className="transition-colors hover:bg-stone-50">
                    <td className="whitespace-nowrap p-3">
                      <span className="block font-bold text-stone-900">{m.name}</span>
                      <span className="font-mono text-[10px] text-stone-400">{m.familyId || '-'}</span>
                    </td>
                    <td className="whitespace-nowrap p-3">
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${TITLE_BADGE[m.title] || 'bg-stone-100 text-stone-500'}`}>{m.title}</span>
                    </td>
                    <td className="whitespace-nowrap p-3 font-mono text-stone-600">{m.cccd || 'Chưa cấp'}</td>
                    <td className="whitespace-nowrap p-3 font-mono text-stone-600">{m.dob || '-'}</td>
                    <td className="whitespace-nowrap p-3 font-mono text-stone-500">{m.phoneDisplay || 'Chưa có SĐT'}</td>
                    <td className="whitespace-nowrap p-3 text-stone-600">{m.group || '-'}</td>
                    <td className="whitespace-nowrap p-3 text-right text-stone-400">—</td>
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
