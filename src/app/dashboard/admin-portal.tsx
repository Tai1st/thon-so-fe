'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type {
  AdminAccountsResponse,
  AdminAssociationItem,
  AdminPendingRequests,
  AuditLogItem,
  HomeContent,
  PermissionMatrix,
} from '@/lib/types';
import { AdminRequestsTab } from './admin-requests-tab';
import { AdminAccountsTab } from './admin-accounts-tab';
import { AdminGroupsTab } from './admin-groups-tab';
import { AdminPermissionsTab } from './admin-permissions-tab';
import { AdminHomeContentTab } from './admin-home-content-tab';
import { AdminLogsTab } from './admin-logs-tab';

interface Me {
  id: string;
  name: string;
  role: string;
  position: string;
  avatarUrl?: string;
}

const TABS = [
  { id: 'duyet-xoa', label: 'Duyệt Yêu Cầu', icon: 'fa-trash-can-arrow-up' },
  { id: 'quan-ly-hoi', label: 'Quản lý Hội nhóm', icon: 'fa-folder-tree' },
  { id: 'quan-ly-tai-khoan', label: 'Quản lý Tài khoản', icon: 'fa-users-cog' },
  { id: 'phan-quyen', label: 'Cấu hình Phân quyền', icon: 'fa-user-lock' },
  { id: 'quan-ly-trang-chu', label: 'Quản lý Trang chủ', icon: 'fa-house-laptop' },
  { id: 'nhat-ky', label: 'Nhật ký Hệ thống', icon: 'fa-list-check' },
] as const;

export function AdminPortal({
  me,
  pendingRequests,
  accountsRes,
  associations,
  permissions,
  homeContent,
  logs,
}: {
  me: Me;
  pendingRequests: AdminPendingRequests;
  accountsRes: AdminAccountsResponse;
  associations: AdminAssociationItem[];
  permissions: PermissionMatrix;
  homeContent: HomeContent;
  logs: AuditLogItem[];
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>('duyet-xoa');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [requestsState, setRequestsState] = useState(pendingRequests);
  const [accountsState, setAccountsState] = useState(accountsRes);
  const [associationsState, setAssociationsState] = useState(associations);
  const [permissionsState, setPermissionsState] = useState(permissions);
  const [homeContentState, setHomeContentState] = useState(homeContent);
  const [logsState, setLogsState] = useState(logs);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  const initials = me.name
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  const totalPending =
    requestsState.deleteRequests.length + requestsState.memberEditRequests.length + requestsState.newMemberRequests.length;

  const siteName = homeContentState.siteName || 'Thôn Đoàn Kết';
  const logoUrl = homeContentState.logoUrl || '/logo.png';

  return (
    <div className="flex min-h-screen flex-col bg-stone-50 pb-16 md:pb-0">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-stone-200 bg-white p-4 sm:p-6">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-600 md:hidden"
          >
            <i className="fa-solid fa-bars" />
          </button>
          <img src={logoUrl} alt={`Logo ${siteName}`} className="hidden h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-primary-100 sm:block" />
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-primary-600">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> Cổng Thông Tin Điện Tử
            </p>
            <h3 className="truncate text-sm font-bold uppercase leading-tight tracking-wider text-red-600 sm:text-base md:text-lg">
              CỔNG QUẢN TRỊ HỆ THỐNG
            </h3>
            <span className="hidden text-[10px] text-stone-500 sm:block">{siteName}, Xã Dliê Ya</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <button
            onClick={() => router.push('/dashboard/profile')}
            className="flex items-center gap-2.5 rounded-xl p-1 transition-colors hover:bg-stone-50"
          >
            {me.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={me.avatarUrl} alt={me.name} className="h-9 w-9 rounded-xl object-cover ring-2 ring-primary-100" />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary-600 to-amber-500 font-serif text-xs font-black text-white">
                {initials || 'AD'}
              </div>
            )}
            <div className="hidden text-left sm:block">
              <h4 className="text-xs font-bold leading-tight text-stone-900">{me.name}</h4>
              <span className="block text-[9px] text-stone-500">{me.position || 'Admin'}</span>
            </div>
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-xl bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-600 transition-all hover:bg-red-600 hover:text-white sm:px-3.5"
          >
            <i className="fa-solid fa-right-from-bracket" />
            <span className="hidden sm:inline">Đăng xuất</span>
          </button>
        </div>
      </div>

      <div className="grid flex-grow grid-cols-1 divide-y divide-stone-200 bg-stone-50 md:grid-cols-12 md:divide-x md:divide-y-0">
        {mobileSidebarOpen && (
          <div onClick={() => setMobileSidebarOpen(false)} className="fixed inset-0 z-30 bg-black/60 md:hidden" />
        )}
        <div
          className={`fixed inset-y-0 left-0 z-40 flex w-1/2 max-w-xs -translate-x-full flex-col space-y-5 overflow-y-auto border-r border-stone-200 bg-white p-5 shadow-xl transition-transform duration-300 ease-out md:sticky md:top-0 md:z-auto md:col-span-2 md:max-h-screen md:w-auto md:max-w-none md:translate-x-0 md:self-start md:border-r-0 md:bg-stone-50 md:shadow-none md:transition-none ${mobileSidebarOpen ? 'translate-x-0' : ''}`}
        >
          <div className="mb-2 flex items-center justify-between border-b border-stone-100 pb-4 md:hidden">
            <div className="flex items-center gap-2">
              <img src={logoUrl} alt={`Logo ${siteName}`} className="h-9 w-9 rounded-full object-cover ring-2 ring-primary-100" />
              <span className="text-[11px] font-black tracking-wide text-stone-900">{siteName}</span>
            </div>
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-100 text-stone-500 hover:bg-stone-200"
            >
              <i className="fa-solid fa-xmark" />
            </button>
          </div>

          <div className="space-y-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setMobileSidebarOpen(false);
                }}
                className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-xs transition-all ${
                  activeTab === tab.id
                    ? 'bg-primary-50 font-bold text-primary-700'
                    : 'font-semibold text-stone-500 hover:bg-stone-50 hover:text-stone-900'
                }`}
              >
                <i className={`fa-solid ${tab.icon} w-4 text-center`} />
                <span>{tab.label}</span>
                {tab.id === 'duyet-xoa' && totalPending > 0 && (
                  <span className="ml-auto flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold text-white">
                    {totalPending}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="pt-4">
            <div className="space-y-2.5 rounded-2xl border border-primary-100 bg-primary-50 p-4 text-xs">
              <span className="block text-[10px] font-bold uppercase tracking-widest text-primary-700">Tổng Quan Hệ Thống</span>
              <div className="flex justify-between gap-2">
                <span className="text-stone-500">Tổng tài khoản:</span>
                <span className="text-right font-semibold text-stone-800">{accountsState.accounts.length}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-stone-500">Chưa có tài khoản:</span>
                <span className="text-right font-semibold text-stone-800">{accountsState.unaccountedCount}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-stone-500">Yêu cầu chờ duyệt:</span>
                <span className="text-right font-semibold text-stone-800">{totalPending}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6 p-6 md:col-span-10">
          {activeTab === 'duyet-xoa' && <AdminRequestsTab requests={requestsState} onRequestsChange={setRequestsState} />}
          {activeTab === 'quan-ly-hoi' && (
            <AdminGroupsTab associations={associationsState} onAssociationsChange={setAssociationsState} />
          )}
          {activeTab === 'quan-ly-tai-khoan' && (
            <AdminAccountsTab accountsRes={accountsState} oldVillages={homeContentState.oldVillages} onAccountsChange={setAccountsState} />
          )}
          {activeTab === 'phan-quyen' && (
            <AdminPermissionsTab permissions={permissionsState} onPermissionsChange={setPermissionsState} />
          )}
          {activeTab === 'quan-ly-trang-chu' && (
            <AdminHomeContentTab homeContent={homeContentState} onHomeContentChange={setHomeContentState} />
          )}
          {activeTab === 'nhat-ky' && <AdminLogsTab logs={logsState} onLogsChange={setLogsState} />}
        </div>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 grid grid-cols-5 border-t border-stone-200 bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.06)] md:hidden">
        <button
          onClick={() => setActiveTab('duyet-xoa')}
          className={`relative flex flex-col items-center justify-center gap-1 py-2 ${activeTab === 'duyet-xoa' ? 'text-primary-600' : 'text-stone-500'}`}
        >
          <i className="fa-solid fa-trash-can-arrow-up text-lg" />
          <span className="text-[10px] font-semibold">Duyệt xóa</span>
          {totalPending > 0 && (
            <span className="absolute right-3 top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold text-white">
              {totalPending}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('quan-ly-hoi')}
          className={`flex flex-col items-center justify-center gap-1 py-2 ${activeTab === 'quan-ly-hoi' ? 'text-primary-600' : 'text-stone-500'}`}
        >
          <i className="fa-solid fa-folder-tree text-lg" />
          <span className="text-[10px] font-semibold">Hội nhóm</span>
        </button>
        <button onClick={() => setActiveTab('quan-ly-tai-khoan')} className="-mt-5 flex flex-col items-center justify-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-600 text-white shadow-lg">
            <i className="fa-solid fa-users-cog text-lg" />
          </span>
          <span className="mt-0.5 text-[9px] font-semibold text-primary-700">Tài khoản</span>
        </button>
        <button
          onClick={() => setActiveTab('quan-ly-trang-chu')}
          className={`flex flex-col items-center justify-center gap-1 py-2 ${activeTab === 'quan-ly-trang-chu' ? 'text-primary-600' : 'text-stone-500'}`}
        >
          <i className="fa-solid fa-globe text-lg" />
          <span className="text-[10px] font-semibold">Trang chủ web</span>
        </button>
        <button onClick={handleLogout} className="flex flex-col items-center justify-center gap-1 py-2 text-stone-500">
          <i className="fa-solid fa-right-from-bracket text-lg" />
          <span className="text-[10px] font-semibold">Đăng xuất</span>
        </button>
      </nav>
    </div>
  );
}
