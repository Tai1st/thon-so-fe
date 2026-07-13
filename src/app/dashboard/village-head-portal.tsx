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
  VillageFundOverview,
  VillageHeadResident,
} from '@/lib/types';
import { VillageHeadResidentsTab } from './village-head-residents-tab';
import { VillageHeadFundTab } from './village-head-fund-tab';
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
}

interface OwnHousehold {
  household: HouseholdData;
  requests: RequestsMine;
  homeContent: HomeContent;
  tenants: PublicTenant[];
  roster: PublicRoster;
  villageFund: VillageFund;
  incidentReports: IncidentReportItem[];
  residenceRegistrations: ResidenceRegistrationItem[];
}

const MANAGEMENT_TABS = [
  { id: 'toan-thon', label: 'Quản lý Toàn Thôn', icon: 'fa-landmark' },
  { id: 'quy-thon', label: 'Quản lý Quỹ Thôn', icon: 'fa-coins' },
] as const;

// Trưởng thôn cũng là 1 cư dân có hộ gia đình thật trong thôn — nhóm tab
// này chỉ hiện khi tài khoản của họ có gắn hộ (Account.residentId), y hệt
// những gì Cư dân thấy ở dashboard của chính mình (mục "Hộ gia đình của tôi").
const HOUSEHOLD_TABS = [
  { id: 'ho-tong-quan', label: 'Tổng quan Hộ gia đình', icon: 'fa-table-columns' },
  { id: 'ho-thanh-vien', label: 'Thành viên & Vị trí GPS', icon: 'fa-people-roof' },
  { id: 'ho-quy-thon', label: 'Quỹ Thôn (hộ của tôi)', icon: 'fa-hand-holding-dollar' },
  { id: 'ho-bao-antt', label: 'Báo An Ninh Trật Tự', icon: 'fa-triangle-exclamation' },
  { id: 'ho-luu-tru', label: 'Đăng Ký Lưu Trú', icon: 'fa-house-user' },
] as const;

export function VillageHeadPortal({
  me,
  residents,
  fundOverview,
  ownHousehold,
  siteName,
  logoUrl,
  oldVillages,
}: {
  me: Me;
  residents: VillageHeadResident[];
  fundOverview: VillageFundOverview;
  ownHousehold: OwnHousehold | null;
  siteName: string;
  logoUrl: string;
  oldVillages: string[] | undefined;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>('toan-thon');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [residentsState, setResidentsState] = useState(residents);
  const [fundState, setFundState] = useState(fundOverview);
  const [householdState, setHouseholdState] = useState(ownHousehold?.household);
  const [requestsState, setRequestsState] = useState(ownHousehold?.requests);
  const [incidentReportsState, setIncidentReportsState] = useState(ownHousehold?.incidentReports);
  const [residenceRegistrationsState, setResidenceRegistrationsState] = useState(ownHousehold?.residenceRegistrations);

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
              CỔNG QUẢN LÝ TRƯỞNG THÔN
            </h3>
            <span className="hidden text-[10px] text-stone-500 sm:block">{siteName}, Xã Dliê Ya</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary-600 to-amber-500 font-serif text-xs font-black text-white">
              {initials || 'TT'}
            </div>
            <div className="hidden text-left sm:block">
              <h4 className="text-xs font-bold leading-tight text-stone-900">{me.name}</h4>
              <span className="block text-[9px] text-stone-500">{me.position || 'Trưởng thôn'}</span>
            </div>
          </div>
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
            <div className="flex items-center gap-2 px-2 pb-1">
              <span className="h-3 w-1 rounded-full bg-primary-300" />
              <span className="text-[9px] font-bold uppercase tracking-widest text-stone-400">Quản lý thôn</span>
            </div>
            {MANAGEMENT_TABS.map((tab) => (
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

          {ownHousehold && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 border-t border-stone-100 px-2 pb-1 pt-4">
                <span className="h-3 w-1 rounded-full bg-primary-300" />
                <span className="text-[9px] font-bold uppercase tracking-widest text-stone-400">Hộ gia đình của tôi</span>
              </div>
              {HOUSEHOLD_TABS.map((tab) => (
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
          )}

          <div className="pt-4">
            <div className="space-y-2.5 rounded-2xl border border-primary-100 bg-primary-50 p-4 text-xs">
              <span className="block text-[10px] font-bold uppercase tracking-widest text-primary-700">Tổng Quan Thôn</span>
              <div className="flex justify-between gap-2">
                <span className="text-stone-500">Tổng nhân khẩu:</span>
                <span className="text-right font-semibold text-stone-800">{residentsState.length} người</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-stone-500">Số dư quỹ thôn:</span>
                <span className="text-right font-semibold text-stone-800">{fundState.balance.toLocaleString('vi-VN')} đ</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-stone-500">Chờ duyệt thanh toán:</span>
                <span className="text-right font-semibold text-stone-800">{fundState.pendingPayments.length}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6 p-6 md:col-span-10">
          {activeTab === 'toan-thon' && (
            <VillageHeadResidentsTab residents={residentsState} oldVillages={oldVillages} onResidentsChange={setResidentsState} />
          )}
          {activeTab === 'quy-thon' && <VillageHeadFundTab fund={fundState} onFundChange={setFundState} />}

          {ownHousehold && householdState && requestsState && (
            <>
              {activeTab === 'ho-tong-quan' && (
                <OverviewTab
                  me={me}
                  household={householdState}
                  requests={requestsState}
                  homeContent={ownHousehold.homeContent}
                  roster={ownHousehold.roster}
                  onGoToTab={setActiveTab}
                />
              )}
              {activeTab === 'ho-thanh-vien' && (
                <FamilyTab
                  household={householdState}
                  requests={requestsState}
                  tenants={ownHousehold.tenants}
                  oldVillages={ownHousehold.homeContent.oldVillages}
                  onHouseholdChange={setHouseholdState}
                  onRequestsChange={setRequestsState}
                />
              )}
              {activeTab === 'ho-quy-thon' && (
                <ContributionsTab
                  household={householdState}
                  villageFund={ownHousehold.villageFund}
                  onHouseholdChange={setHouseholdState}
                />
              )}
              {activeTab === 'ho-bao-antt' && incidentReportsState && (
                <IncidentTab reports={incidentReportsState} onReportsChange={setIncidentReportsState} />
              )}
              {activeTab === 'ho-luu-tru' && residenceRegistrationsState && (
                <ResidenceTab
                  registrations={residenceRegistrationsState}
                  onRegistrationsChange={setResidenceRegistrationsState}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
