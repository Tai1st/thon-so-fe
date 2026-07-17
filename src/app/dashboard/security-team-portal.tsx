'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type {
  HomeContent,
  HouseholdData,
  IncidentMinutesItem,
  IncidentReportItem,
  IncidentReportWithHead,
  MyAssociationOverview,
  PublicRoster,
  PublicTenant,
  RequestsMine,
  ResidenceRegistrationItem,
  SecurityRosterMember,
  SecurityTeamResident,
  VillageFund,
} from '@/lib/types';
import { SecurityTeamReportsTab } from './security-team-reports-tab';
import { SecurityTeamResidenceTab } from './security-team-residence-tab';
import { SecurityTeamMinutesTab } from './security-team-minutes-tab';
import { SecurityTeamResidentsTab } from './security-team-residents-tab';
import { SecurityTeamRosterTab } from './security-team-roster-tab';
import { OverviewTab } from './overview-tab';
import { FamilyTab } from './family-tab';
import { ContributionsTab } from './contributions-tab';
import { IncidentTab } from './incident-tab';
import { ResidenceTab } from './residence-tab';
import { MyAssociationTab } from './my-association-tab';

interface Me {
  id: string;
  name: string;
  role: string;
  position: string;
  avatarUrl?: string;
  residentId?: string | null;
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
  tenantSlug: string | null;
  myAssociation: MyAssociationOverview | null;
}

const TABS = [
  { id: 'tin-bao', label: 'Tin Báo Từ Cư Dân', icon: 'fa-bell' },
  { id: 'luu-tru', label: 'Duyệt Đăng Ký Lưu Trú', icon: 'fa-house-user' },
  { id: 'bien-ban', label: 'Biên Bản Sự Việc', icon: 'fa-file-signature' },
  { id: 'dan-cu', label: 'Quản Lý Dân Cư', icon: 'fa-users-viewfinder' },
  { id: 'to-doi', label: 'Thành Viên Tổ ANTT', icon: 'fa-users-gear' },
] as const;

// Tổ viên ANTT cũng là 1 cư dân có hộ gia đình thật trong thôn — nhóm tab
// này chỉ hiện khi tài khoản của họ có gắn hộ (Account.residentId), y hệt
// mục "Hộ gia đình của tôi" ở cổng Trưởng thôn.
const HOUSEHOLD_TABS = [
  { id: 'ho-tong-quan', label: 'Tổng quan Hộ gia đình', icon: 'fa-table-columns' },
  { id: 'ho-thanh-vien', label: 'Thành viên & Vị trí GPS', icon: 'fa-people-roof' },
  { id: 'ho-quy-thon', label: 'Quỹ Thôn (hộ của tôi)', icon: 'fa-hand-holding-dollar' },
  { id: 'ho-bao-antt', label: 'Báo An Ninh Trật Tự', icon: 'fa-triangle-exclamation' },
  { id: 'ho-luu-tru', label: 'Đăng Ký Lưu Trú', icon: 'fa-house-user' },
] as const;

export function SecurityTeamPortal({
  me,
  reports,
  registrations,
  minutes,
  residents,
  roster,
  ownHousehold,
  siteName,
  logoUrl,
}: {
  me: Me;
  reports: IncidentReportWithHead[];
  registrations: ResidenceRegistrationItem[];
  minutes: IncidentMinutesItem[];
  residents: SecurityTeamResident[];
  roster: SecurityRosterMember[];
  ownHousehold: OwnHousehold | null;
  siteName: string;
  logoUrl: string;
}) {
  const router = useRouter();
  // Có hộ gia đình của mình -> vào cổng là thấy "Tổng quan Hộ gia đình"
  // trước tiên (giống Cư dân), không phải trang tin báo/quản lý.
  const [activeTab, setActiveTab] = useState<string>(ownHousehold ? 'ho-tong-quan' : 'tin-bao');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [reportsState, setReportsState] = useState(reports);
  const [registrationsState, setRegistrationsState] = useState(registrations);
  const [minutesState, setMinutesState] = useState(minutes);
  const [householdState, setHouseholdState] = useState(ownHousehold?.household);
  const [requestsState, setRequestsState] = useState(ownHousehold?.requests);
  const [incidentReportsState, setIncidentReportsState] = useState(ownHousehold?.incidentReports);
  const [residenceRegistrationsState, setResidenceRegistrationsState] = useState(ownHousehold?.residenceRegistrations);
  const [myAssociationState, setMyAssociationState] = useState(ownHousehold?.myAssociation ?? null);

  const householdTabs = myAssociationState
    ? [...HOUSEHOLD_TABS, { id: 'hoi-cua-toi', label: myAssociationState.association, icon: 'fa-people-group' }]
    : HOUSEHOLD_TABS;

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

  const pendingCount =
    reportsState.filter((r) => r.status === 'Mới').length + registrationsState.filter((r) => r.status === 'Chờ duyệt').length;

  return (
    <div className="flex min-h-dvh flex-col bg-stone-50 pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
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
              CỔNG TỔ AN NINH TRẬT TỰ
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
                {initials || 'AN'}
              </div>
            )}
            <div className="hidden text-left sm:block">
              <h4 className="text-xs font-bold leading-tight text-stone-900">{me.name}</h4>
              <span className="block text-[9px] text-stone-500">{me.position || 'Tổ ANTT'}</span>
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
          className={`fixed inset-y-0 left-0 z-40 flex w-1/2 max-w-xs -translate-x-full flex-col space-y-5 overflow-y-auto border-r border-stone-200 bg-white p-5 shadow-xl transition-transform duration-300 ease-out md:sticky md:top-0 md:z-auto md:col-span-2 md:max-h-dvh md:w-auto md:max-w-none md:translate-x-0 md:self-start md:border-r-0 md:bg-stone-50 md:shadow-none md:transition-none ${mobileSidebarOpen ? 'translate-x-0' : ''}`}
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

          {ownHousehold && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 px-2 pb-1">
                <span className="h-3 w-1 rounded-full bg-primary-300" />
                <span className="text-[9px] font-bold uppercase tracking-widest text-stone-400">Hộ gia đình của tôi</span>
              </div>
              {householdTabs.map((tab) => (
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

          <div className="space-y-1 border-t border-stone-100 pt-4">
            <div className="flex items-center gap-2 px-2 pb-1">
              <span className="h-3 w-1 rounded-full bg-primary-300" />
              <span className="text-[9px] font-bold uppercase tracking-widest text-stone-400">Tính năng ANTT</span>
            </div>
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
                {(tab.id === 'tin-bao' || tab.id === 'luu-tru') && pendingCount > 0 && (
                  <span className="ml-auto flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold text-white">
                    {tab.id === 'tin-bao'
                      ? reportsState.filter((r) => r.status === 'Mới').length
                      : registrationsState.filter((r) => r.status === 'Chờ duyệt').length}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="pt-4">
            <div className="space-y-2.5 rounded-2xl border border-primary-100 bg-primary-50 p-4 text-xs">
              <span className="block text-[10px] font-bold uppercase tracking-widest text-primary-700">Tổng Quan</span>
              <div className="flex justify-between gap-2">
                <span className="text-stone-500">Tin báo mới:</span>
                <span className="text-right font-semibold text-stone-800">{reportsState.filter((r) => r.status === 'Mới').length}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-stone-500">Lưu trú chờ duyệt:</span>
                <span className="text-right font-semibold text-stone-800">
                  {registrationsState.filter((r) => r.status === 'Chờ duyệt').length}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-stone-500">Thành viên tổ:</span>
                <span className="text-right font-semibold text-stone-800">{roster.length}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6 p-6 md:col-span-10">
          {activeTab === 'tin-bao' && <SecurityTeamReportsTab reports={reportsState} onReportsChange={setReportsState} />}
          {activeTab === 'luu-tru' && (
            <SecurityTeamResidenceTab registrations={registrationsState} onRegistrationsChange={setRegistrationsState} />
          )}
          {activeTab === 'bien-ban' && (
            <SecurityTeamMinutesTab minutes={minutesState} reports={reportsState} onMinutesChange={setMinutesState} />
          )}
          {activeTab === 'dan-cu' && <SecurityTeamResidentsTab residents={residents} siteName={siteName} />}
          {activeTab === 'to-doi' && <SecurityTeamRosterTab roster={roster} />}

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
                  tabIds={{ family: 'ho-thanh-vien', contributions: 'ho-quy-thon', incident: 'ho-bao-antt' }}
                />
              )}
              {activeTab === 'ho-thanh-vien' && (
                <FamilyTab
                  household={householdState}
                  requests={requestsState}
                  tenants={ownHousehold.tenants}
                  tenantSlug={ownHousehold.tenantSlug}
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
              {activeTab === 'hoi-cua-toi' && myAssociationState && (
                <MyAssociationTab data={myAssociationState} onDataChange={setMyAssociationState} />
              )}
            </>
          )}
        </div>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 grid grid-cols-5 border-t border-stone-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_10px_rgba(0,0,0,0.06)] md:hidden">
        {ownHousehold ? (
          <button
            onClick={() => setActiveTab('ho-tong-quan')}
            className={`flex flex-col items-center justify-center gap-1 py-2 ${activeTab === 'ho-tong-quan' ? 'text-primary-600' : 'text-stone-500'}`}
          >
            <i className="fa-solid fa-house text-lg" />
            <span className="text-[10px] font-semibold">Trang chủ</span>
          </button>
        ) : (
          <button
            onClick={() => setActiveTab('luu-tru')}
            className={`relative flex flex-col items-center justify-center gap-1 py-2 ${activeTab === 'luu-tru' ? 'text-primary-600' : 'text-stone-500'}`}
          >
            <i className="fa-solid fa-house-user text-lg" />
            <span className="text-[10px] font-semibold">Lưu trú</span>
            {registrationsState.filter((r) => r.status === 'Chờ duyệt').length > 0 && (
              <span className="absolute right-3 top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold text-white">
                {registrationsState.filter((r) => r.status === 'Chờ duyệt').length}
              </span>
            )}
          </button>
        )}
        <button
          onClick={() => setActiveTab('tin-bao')}
          className={`relative flex flex-col items-center justify-center gap-1 py-2 ${activeTab === 'tin-bao' ? 'text-primary-600' : 'text-stone-500'}`}
        >
          <i className="fa-solid fa-bell text-lg" />
          <span className="text-[10px] font-semibold">Tin báo</span>
          {reportsState.filter((r) => r.status === 'Mới').length > 0 && (
            <span className="absolute right-3 top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold text-white">
              {reportsState.filter((r) => r.status === 'Mới').length}
            </span>
          )}
        </button>
        <button onClick={() => setActiveTab('bien-ban')} className="-mt-5 flex flex-col items-center justify-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-600 text-white shadow-lg">
            <i className="fa-solid fa-file-signature text-lg" />
          </span>
          <span className="mt-0.5 text-[9px] font-semibold text-primary-700">Biên bản</span>
        </button>
        <button
          onClick={() => setActiveTab('dan-cu')}
          className={`flex flex-col items-center justify-center gap-1 py-2 ${activeTab === 'dan-cu' ? 'text-primary-600' : 'text-stone-500'}`}
        >
          <i className="fa-solid fa-users-viewfinder text-lg" />
          <span className="text-[10px] font-semibold">Dân cư</span>
        </button>
        <button onClick={handleLogout} className="flex flex-col items-center justify-center gap-1 py-2 text-stone-500">
          <i className="fa-solid fa-right-from-bracket text-lg" />
          <span className="text-[10px] font-semibold">Đăng xuất</span>
        </button>
      </nav>
    </div>
  );
}
