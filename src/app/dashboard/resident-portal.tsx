'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type {
  HomeContent,
  HouseholdData,
  IncidentReportItem,
  PublicRoster,
  PublicTenant,
  RequestsMine,
  ResidenceRegistrationItem,
  VillageFund,
} from '@/lib/types';
import { OverviewTab } from './overview-tab';
import { FamilyTab } from './family-tab';
import { ContributionsTab } from './contributions-tab';
import { IncidentTab } from './incident-tab';
import { ResidenceTab } from './residence-tab';

interface Me {
  id: string;
  name: string;
  role: string;
  position: string;
  assoc?: string;
  avatarUrl?: string;
}

const TABS = [
  { id: 'dashboard', label: 'Tổng quan Hộ gia đình', icon: 'fa-table-columns' },
  { id: 'family', label: 'Thành viên & Vị trí GPS', icon: 'fa-people-roof' },
  { id: 'contributions', label: 'Quỹ Thôn', icon: 'fa-hand-holding-dollar' },
  { id: 'bao-antt', label: 'Báo An Ninh Trật Tự', icon: 'fa-triangle-exclamation' },
  { id: 'dang-ky-luu-tru', label: 'Đăng Ký Lưu Trú', icon: 'fa-house-user' },
] as const;

export function ResidentPortal({
  me,
  household,
  requests,
  homeContent,
  tenants,
  roster,
  villageFund,
  incidentReports,
  residenceRegistrations,
}: {
  me: Me;
  household: HouseholdData;
  requests: RequestsMine;
  homeContent: HomeContent;
  tenants: PublicTenant[];
  roster: PublicRoster;
  villageFund: VillageFund;
  incidentReports: IncidentReportItem[];
  residenceRegistrations: ResidenceRegistrationItem[];
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [householdState, setHouseholdState] = useState(household);
  const [requestsState, setRequestsState] = useState(requests);
  const [incidentReportsState, setIncidentReportsState] = useState(incidentReports);
  const [residenceRegistrationsState, setResidenceRegistrationsState] = useState(residenceRegistrations);

  const pendingCount = requestsState.memberEditRequests.filter((r) => r.status === 'pending').length +
    requestsState.newMemberRequests.filter((r) => r.status === 'pending').length;

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

  const siteName = homeContent.siteName || 'Thôn Đoàn Kết';
  const logoUrl = homeContent.logoUrl || '/logo.png';

  function renderTabContent() {
    if (activeTab === 'dashboard') {
      return (
        <OverviewTab
          me={me}
          household={householdState}
          requests={requestsState}
          homeContent={homeContent}
          roster={roster}
          onGoToTab={setActiveTab}
        />
      );
    }
    if (activeTab === 'family') {
      return (
        <FamilyTab
          household={householdState}
          requests={requestsState}
          tenants={tenants}
          oldVillages={homeContent.oldVillages}
          onHouseholdChange={setHouseholdState}
          onRequestsChange={setRequestsState}
        />
      );
    }
    if (activeTab === 'contributions') {
      return (
        <ContributionsTab household={householdState} villageFund={villageFund} onHouseholdChange={setHouseholdState} />
      );
    }
    if (activeTab === 'bao-antt') {
      return <IncidentTab reports={incidentReportsState} onReportsChange={setIncidentReportsState} />;
    }
    if (activeTab === 'dang-ky-luu-tru') {
      return (
        <ResidenceTab registrations={residenceRegistrationsState} onRegistrationsChange={setResidenceRegistrationsState} />
      );
    }
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 pb-16 md:pb-0">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-stone-200 bg-white p-4 sm:p-6">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-600 md:hidden"
          >
            <i className="fa-solid fa-bars" />
          </button>
          <img
            src={logoUrl}
            alt={`Logo ${siteName}`}
            className="hidden h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-primary-100 sm:block"
          />
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-primary-600">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> Cổng Thông Tin Điện Tử
            </p>
            <h3 className="truncate text-sm font-bold uppercase leading-tight tracking-wider text-red-600 sm:text-base md:text-lg">
              CỔNG CƯ DÂN {siteName.toUpperCase()}
            </h3>
            <span className="hidden text-[10px] text-stone-500 sm:block">Xã Dliê Ya, Tỉnh Đắk Lắk</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <a
            href={`tel:${homeContent.security.hotline}`}
            className="hidden flex-col items-center justify-center rounded-xl bg-red-50 px-3 py-1.5 text-red-600 shadow-sm sm:flex"
          >
            <span className="text-[8px] font-bold uppercase leading-none tracking-wide">Đường dây nóng 24/7</span>
            <span className="mt-0.5 text-xs font-black leading-tight">
              <i className="fa-solid fa-phone text-[10px]" /> {homeContent.security.hotlineDisplay}
            </span>
          </a>
          <button
            onClick={() => setActiveTab('bao-antt')}
            title="Phản ánh của tôi"
            className="relative hidden h-9 w-9 items-center justify-center rounded-xl bg-stone-100 text-stone-500 transition-colors hover:bg-stone-200 sm:flex"
          >
            <i className="fa-regular fa-bell" />
            {pendingCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold text-white">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => router.push('/dashboard/profile')}
            className="flex items-center gap-2.5 rounded-xl p-1 transition-colors hover:bg-stone-50"
          >
            {me.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={me.avatarUrl} alt={me.name} className="h-9 w-9 rounded-xl object-cover ring-2 ring-primary-100" />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary-600 to-amber-500 font-serif text-xs font-black text-white">
                {initials || 'CD'}
              </div>
            )}
            <div className="hidden text-left sm:block">
              <h4 className="text-xs font-bold leading-tight text-stone-900">{me.name}</h4>
              <span className="block text-[9px] text-stone-500">{me.position || 'Cư dân'}</span>
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

      {/* Content grid */}
      <div className="grid flex-grow grid-cols-1 divide-y divide-stone-200 bg-stone-50 md:grid-cols-12 md:divide-x md:divide-y-0">
        {mobileSidebarOpen && (
          <div
            onClick={() => setMobileSidebarOpen(false)}
            className="fixed inset-0 z-30 bg-black/60 md:hidden"
          />
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
              </button>
            ))}
          </div>

          <div className="pt-4">
            <div className="space-y-2.5 rounded-2xl border border-primary-100 bg-primary-50 p-4 text-xs">
              <span className="block text-[10px] font-bold uppercase tracking-widest text-primary-700">
                Thông Tin Hộ Gia Đình
              </span>
              <div className="flex justify-between gap-2">
                <span className="text-stone-500">Chủ hộ:</span>
                <span className="text-right font-semibold text-stone-800">
                  {householdState.members.find((m) => m.isHouseholder)?.name || 'Chưa xác định'}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-stone-500">Địa chỉ:</span>
                <span className="text-right font-semibold text-stone-800">{siteName}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-stone-500">Số nhân khẩu:</span>
                <span className="text-right font-semibold text-stone-800">{householdState.members.length} người</span>
              </div>
              <button
                onClick={() => setActiveTab('family')}
                className="w-full rounded-lg border border-primary-200 bg-white py-2 text-[11px] font-bold text-primary-700 transition-colors hover:bg-primary-100"
              >
                Xem chi tiết hộ gia đình
              </button>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="space-y-6 p-6 md:col-span-10">{renderTabContent()}</div>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 grid grid-cols-5 border-t border-stone-200 bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.06)] md:hidden">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center justify-center gap-1 py-2 ${activeTab === 'dashboard' ? 'text-primary-600' : 'text-stone-500'}`}
        >
          <i className="fa-solid fa-house text-lg" />
          <span className="text-[10px] font-semibold">Trang chủ</span>
        </button>
        <button
          onClick={() => setActiveTab('family')}
          className={`flex flex-col items-center justify-center gap-1 py-2 ${activeTab === 'family' ? 'text-primary-600' : 'text-stone-500'}`}
        >
          <i className="fa-solid fa-people-roof text-lg" />
          <span className="text-[10px] font-semibold">Hộ gia đình</span>
        </button>
        <button onClick={() => setActiveTab('bao-antt')} className="-mt-5 flex flex-col items-center justify-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-600 text-white shadow-lg">
            <i className="fa-solid fa-shield-halved text-lg" />
          </span>
          <span className="mt-0.5 text-[9px] font-semibold text-primary-700">Phản ánh</span>
        </button>
        <button
          onClick={() => setActiveTab('contributions')}
          className={`flex flex-col items-center justify-center gap-1 py-2 ${activeTab === 'contributions' ? 'text-primary-600' : 'text-stone-500'}`}
        >
          <i className="fa-solid fa-hand-holding-dollar text-lg" />
          <span className="text-[10px] font-semibold">Quỹ thôn</span>
        </button>
        <button onClick={handleLogout} className="flex flex-col items-center justify-center gap-1 py-2 text-stone-500">
          <i className="fa-solid fa-right-from-bracket text-lg" />
          <span className="text-[10px] font-semibold">Đăng xuất</span>
        </button>
      </nav>
    </div>
  );
}
