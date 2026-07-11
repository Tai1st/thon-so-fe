import { redirect } from 'next/navigation';
import { apiFetch, ApiError } from '@/lib/api';
import { LogoutButton } from './logout-button';
import { ResidentPortal } from './resident-portal';
import type { HomeContent, HouseholdData, PublicRoster, PublicTenant, RequestsMine } from '@/lib/types';

interface Me {
  id: string;
  name: string;
  role: string;
  position: string;
  assoc?: string;
}

export default async function DashboardPage() {
  let me: Me;
  try {
    me = await apiFetch<Me>('/auth/me');
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 404)) {
      redirect('/login');
    }
    throw err;
  }

  // Dashboard đầy đủ mới dựng cho role "resident" (mục Tổng quan + Hộ gia
  // đình). Các role còn lại (association-officer/village-head/security-team
  // /admin) tạm hiện trang xác nhận đăng nhập đơn giản, chờ dựng ở lượt sau.
  if (me.role !== 'resident') {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-lg font-bold text-stone-900">Xin chào, {me.name}</h1>
        <p className="mt-1 text-sm text-stone-500">
          Vai trò: <span className="font-semibold text-stone-700">{me.role}</span>
          {me.position ? ` — ${me.position}` : ''}
        </p>
        <p className="mt-4 text-xs text-stone-400">
          Dashboard đầy đủ cho vai trò này chưa được dựng ở giai đoạn hiện tại.
        </p>
        <div className="mt-6">
          <LogoutButton />
        </div>
      </main>
    );
  }

  const [household, requests, homeContent, tenants, roster] = await Promise.all([
    apiFetch<HouseholdData>('/households/me'),
    apiFetch<RequestsMine>('/requests/mine'),
    apiFetch<HomeContent>('/home-content', { auth: false }),
    apiFetch<PublicTenant[]>('/tenants/public', { auth: false }),
    apiFetch<PublicRoster>('/home-content/public-roster', { auth: false }),
  ]);

  return (
    <ResidentPortal
      me={me}
      household={household}
      requests={requests}
      homeContent={homeContent}
      tenants={tenants}
      roster={roster}
    />
  );
}
