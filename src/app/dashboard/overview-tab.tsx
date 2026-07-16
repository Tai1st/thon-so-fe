'use client';

import type { HomeContent, HouseholdData, PublicRoster, RequestsMine } from '@/lib/types';

interface Me {
  id: string;
  name: string;
  role: string;
  position: string;
  assoc?: string;
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Đang chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Từ chối',
};
const STATUS_CLASS: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-600',
  approved: 'bg-emerald-50 text-emerald-600',
  rejected: 'bg-red-50 text-red-600',
};

export function OverviewTab({
  me,
  household,
  requests,
  homeContent,
  roster,
  onGoToTab,
  tabIds = { family: 'family', contributions: 'contributions', incident: 'bao-antt' },
}: {
  me: Me;
  household: HouseholdData;
  requests: RequestsMine;
  homeContent: HomeContent;
  roster: PublicRoster;
  onGoToTab: (tab: string) => void;
  // Trưởng thôn/Cán bộ Hội/Tổ ANTT xem tab này trong nhóm "Hộ gia đình của
  // tôi" của cổng riêng — id các tab đích ở đó có tiền tố "ho-..." khác với
  // Cư dân, nên Thao Tác Nhanh cần map đúng id thay vì hardcode.
  tabIds?: { family: string; contributions: string; incident: string };
}) {
  const funds = household.fundObligations;
  const paidTotal = funds.filter((f) => f.status === 'Đã đóng').reduce((s, f) => s + f.amount, 0);
  const obligatedTotal = funds.reduce((s, f) => s + f.amount, 0);
  const paidPct = obligatedTotal > 0 ? Math.round((paidTotal / obligatedTotal) * 100) : 0;

  const news = (homeContent.news || []).slice(0, 4);
  const schedule = homeContent.schedule || [];
  const products = (homeContent.products || []).slice(0, 5);
  const sec = homeContent.security || { hotline: '', hotlineDisplay: '' };
  const chief = roster.security.find((m) => m.title === 'Tổ Trưởng');

  const myRequests = [
    ...requests.memberEditRequests.map((r) => ({
      key: r._id,
      desc: `Sửa thông tin: ${r.residentName}`,
      time: r.time,
      status: r.status,
    })),
    ...requests.newMemberRequests.map((r) => ({
      key: r._id,
      desc: `Đăng ký thêm thành viên: ${r.name}`,
      time: r.time,
      status: r.status,
    })),
  ]
    .sort((a, b) => b.key.localeCompare(a.key))
    .slice(0, 4);

  return (
    <>
      {/* Welcome banner */}
      <div className="relative flex items-center gap-6 overflow-hidden rounded-3xl bg-gradient-to-r from-primary-700 to-primary-600 p-6 text-white sm:p-8">
        <div className="relative z-10 flex-1 space-y-2">
          <h4 className="font-serif text-xl font-black sm:text-2xl">Chào mừng, {me.name}!</h4>
          <p className="max-w-lg text-xs text-primary-100 sm:text-sm">
            Đây là không gian dành riêng cho cư dân {homeContent.siteName || 'thôn'}. Bạn có thể tra cứu thông tin, gửi yêu cầu và theo
            dõi các hoạt động của thôn một cách dễ dàng.
          </p>
        </div>
        <div className="relative z-10 hidden h-20 w-20 shrink-0 items-center justify-center rounded-full bg-white/15 text-4xl sm:flex">
          <i className="fa-solid fa-people-roof" />
        </div>
        <div className="absolute -bottom-8 -right-8 h-40 w-40 rounded-full bg-white/10" />
      </div>

      {/* Quick actions */}
      <div className="space-y-3">
        <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">Thao Tác Nhanh</span>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <button
            onClick={() => onGoToTab(tabIds.family)}
            className="flex flex-col items-center gap-2 rounded-2xl border border-stone-200 bg-white py-4 shadow-sm transition-colors hover:border-primary-300"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
              <i className="fa-solid fa-user-pen" />
            </span>
            <span className="px-1 text-center text-[11px] font-semibold leading-tight text-stone-600">
              Gửi yêu cầu chỉnh sửa thông tin
            </span>
          </button>
          <button
            onClick={() => onGoToTab(tabIds.family)}
            className="flex flex-col items-center gap-2 rounded-2xl border border-stone-200 bg-white py-4 shadow-sm transition-colors hover:border-blue-300"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <i className="fa-solid fa-people-group" />
            </span>
            <span className="px-1 text-center text-[11px] font-semibold leading-tight text-stone-600">
              Đăng ký, cập nhật thành viên hộ
            </span>
          </button>
          <button
            onClick={() => onGoToTab(tabIds.contributions)}
            className="flex flex-col items-center gap-2 rounded-2xl border border-stone-200 bg-white py-4 shadow-sm transition-colors hover:border-amber-300"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <i className="fa-solid fa-hand-holding-dollar" />
            </span>
            <span className="px-1 text-center text-[11px] font-semibold leading-tight text-stone-600">
              Đóng góp quỹ, hội phí
            </span>
          </button>
          <button
            onClick={() => onGoToTab(tabIds.incident)}
            className="flex flex-col items-center gap-2 rounded-2xl border border-stone-200 bg-white py-4 shadow-sm transition-colors hover:border-purple-300"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <i className="fa-solid fa-bullhorn" />
            </span>
            <span className="px-1 text-center text-[11px] font-semibold leading-tight text-stone-600">
              Gửi phản ánh, kiến nghị
            </span>
          </button>
        </div>
      </div>

      {/* News + schedule */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-3 rounded-2xl border border-stone-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Thông Báo Mới Nhất</span>
          </div>
          <div className="divide-y divide-stone-100">
            {news.length ? (
              news.map((n) => (
                <div key={n.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <i className="fa-solid fa-bullhorn shrink-0 text-xs text-primary-500" />
                    <span className="truncate text-xs font-medium text-stone-700">{n.title}</span>
                  </div>
                  <span className="shrink-0 text-[10px] text-stone-400">{n.date}</span>
                </div>
              ))
            ) : (
              <p className="py-4 text-center text-xs text-stone-400">Chưa có thông báo nào.</p>
            )}
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-stone-200 bg-white p-5">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">
            Lịch Công Tác Sắp Tới
          </span>
          <div className="divide-y divide-stone-100">
            {schedule.length ? (
              schedule.map((s) => (
                <div key={s.id} className="flex items-center gap-3 py-2.5">
                  <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-primary-50 leading-none text-primary-700">
                    <span className="text-sm font-black">{s.day}</span>
                    <span className="text-[8px] font-semibold">{s.month}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-stone-800">{s.title}</p>
                    <p className="text-[10px] text-stone-400">
                      <i className="fa-solid fa-location-dot mr-1" />
                      {s.location} · {s.time}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="py-4 text-center text-xs text-stone-400">Chưa có lịch công tác nào.</p>
            )}
          </div>
        </div>
      </div>

      {/* Dues progress + my requests */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">
            Tình Hình Đóng Góp Năm 2026
          </span>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-stone-500">Đã đóng</span>
              <span className="font-bold text-stone-900">
                {paidTotal.toLocaleString('vi-VN')} đ / {obligatedTotal.toLocaleString('vi-VN')} đ
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-stone-100">
              <div className="h-full rounded-full bg-primary-600" style={{ width: `${paidPct}%` }} />
            </div>
            <p className="text-right text-[10px] text-stone-400">{paidPct}% hoàn thành</p>
          </div>
          <div className="divide-y divide-stone-100">
            {funds.length ? (
              funds.map((f) => (
                <div key={f.id} className="flex items-center justify-between gap-2 py-2">
                  <span className="truncate text-xs text-stone-600">{f.name}</span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase ${
                      f.status === 'Đã đóng' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                    }`}
                  >
                    {f.status}
                  </span>
                </div>
              ))
            ) : (
              <p className="py-4 text-center text-xs text-stone-400">Chưa có khoản thu nào.</p>
            )}
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-stone-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Yêu Cầu Của Tôi</span>
            <button onClick={() => onGoToTab('family')} className="text-[11px] font-semibold text-primary-600 hover:text-primary-700">
              Xem tất cả
            </button>
          </div>
          <div className="divide-y divide-stone-100">
            {myRequests.length ? (
              myRequests.map((r) => (
                <div key={r.key} className="space-y-1 py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-medium text-stone-700">{r.desc}</span>
                    <span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-extrabold uppercase tracking-wider ${STATUS_CLASS[r.status]}`}>
                      {STATUS_LABEL[r.status]}
                    </span>
                  </div>
                  <p className="text-[10px] text-stone-400">Ngày gửi: {r.time}</p>
                </div>
              ))
            ) : (
              <p className="py-4 text-center text-xs text-stone-400">Bạn chưa gửi yêu cầu nào.</p>
            )}
          </div>
        </div>
      </div>

      {/* Sản vật */}
      <div className="space-y-3 rounded-2xl border border-stone-200 bg-white p-5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Sản Vật Đất Lành</span>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {products.length ? (
            products.map((p) => (
              <div key={p.id} className="space-y-1.5 text-center">
                <div className="aspect-square w-full overflow-hidden rounded-xl border border-stone-100">
                  <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
                </div>
                <span className="block text-[11px] font-semibold leading-tight text-stone-600">{p.name}</span>
              </div>
            ))
          ) : (
            <p className="col-span-full py-4 text-center text-xs text-stone-400">Chưa có nông sản nào.</p>
          )}
        </div>
      </div>

      {/* ANTT contact */}
      <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-stone-200 bg-white p-5 sm:flex-row">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <i className="fa-solid fa-shield-halved" />
          </span>
          <div>
            <h5 className="text-xs font-bold uppercase tracking-wide text-stone-900">Tổ An Ninh Trật Tự Cơ Sở</h5>
            <p className="text-[11px] text-stone-500">
              Mọi thông tin về an ninh trật tự, vui lòng liên hệ Tổ ANTT hoặc gọi đường dây nóng 24/7.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-6">
          <a href={`tel:${sec.hotline}`} className="text-left">
            <span className="block text-[9px] font-bold uppercase tracking-wide text-red-500">Trực ban 24/7</span>
            <span className="text-sm font-black text-stone-900">{sec.hotlineDisplay}</span>
          </a>
          {chief && (
            <div className="hidden text-left sm:block">
              <span className="block text-[9px] font-bold uppercase tracking-wide text-emerald-600">Tổ trưởng ANTT</span>
              <span className="text-sm font-black text-stone-900">{chief.name}</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
