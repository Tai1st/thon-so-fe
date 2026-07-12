import { redirect } from 'next/navigation';
import { apiFetch, ApiError } from '@/lib/api';
import { LogoutButton } from './logout-button';
import { ResidentPortal } from './resident-portal';
import { VillageHeadPortal } from './village-head-portal';
import { AdminPortal } from './admin-portal';
import { SecurityTeamPortal } from './security-team-portal';
import { AssociationOfficerPortal } from './association-officer-portal';
import type {
  AdminAccountsResponse,
  AdminPendingRequests,
  AssocFundOverview,
  AssocLoan,
  AssociationMembersResponse,
  AuditLogItem,
  HomeContent,
  HouseholdData,
  IncidentMinutesItem,
  IncidentReportItem,
  IncidentReportWithHead,
  PermissionMatrix,
  PublicRoster,
  PublicTenant,
  RequestsMine,
  ResidenceRegistrationItem,
  SecurityRosterMember,
  SecurityTeamResident,
  VillageFund,
  VillageFundOverview,
  VillageHeadResident,
} from '@/lib/types';

interface Me {
  id: string;
  name: string;
  role: string;
  position: string;
  assoc?: string;
}

// Dữ liệu "hộ gia đình của chính người đăng nhập" — dùng cho Cư dân, và
// cho các vai trò khác (vd Trưởng thôn) khi tài khoản của họ cũng gắn với
// 1 hộ gia đình thật trong thôn (Account.residentId). Nếu tài khoản chưa
// gắn hộ nào (vd tài khoản hệ thống thuần túy), trả về null thay vì lỗi —
// FE ẩn hẳn nhóm tab "Hộ gia đình của tôi" trong trường hợp đó.
async function fetchOwnHouseholdData() {
  try {
    const [household, requests, homeContent, tenants, roster, villageFund, incidentReports, residenceRegistrations] =
      await Promise.all([
        apiFetch<HouseholdData>('/households/me'),
        apiFetch<RequestsMine>('/requests/mine'),
        apiFetch<HomeContent>('/home-content', { auth: false }),
        apiFetch<PublicTenant[]>('/tenants/public', { auth: false }),
        apiFetch<PublicRoster>('/home-content/public-roster', { auth: false }),
        apiFetch<VillageFund>('/households/village-fund'),
        apiFetch<IncidentReportItem[]>('/incident-reports/mine'),
        apiFetch<ResidenceRegistrationItem[]>('/residence-registrations/mine'),
      ]);
    return { household, requests, homeContent, tenants, roster, villageFund, incidentReports, residenceRegistrations };
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

async function fetchBrand() {
  const content = await apiFetch<HomeContent>('/home-content', { auth: false });
  return {
    siteName: content.siteName || 'Thôn Đoàn Kết',
    logoUrl: content.logoUrl || '/logo.png',
    oldVillages: content.oldVillages,
  };
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

  if (me.role === 'village-head') {
    const [residentsRes, fundOverview, ownHousehold, brand] = await Promise.all([
      apiFetch<{ total: number; residents: VillageHeadResident[] }>('/village-head/residents'),
      apiFetch<VillageFundOverview>('/village-head/village-fund'),
      fetchOwnHouseholdData(),
      fetchBrand(),
    ]);
    return (
      <VillageHeadPortal
        me={me}
        residents={residentsRes.residents}
        fundOverview={fundOverview}
        ownHousehold={ownHousehold}
        siteName={brand.siteName}
        logoUrl={brand.logoUrl}
        oldVillages={brand.oldVillages}
      />
    );
  }

  if (me.role === 'admin') {
    const [pendingRequests, accountsRes, permissions, homeContent, logs] = await Promise.all([
      apiFetch<AdminPendingRequests>('/admin/requests/pending'),
      apiFetch<AdminAccountsResponse>('/admin/accounts'),
      apiFetch<PermissionMatrix>('/admin/permissions'),
      apiFetch<HomeContent>('/admin/home-content'),
      apiFetch<AuditLogItem[]>('/admin/logs'),
    ]);
    return (
      <AdminPortal
        me={me}
        pendingRequests={pendingRequests}
        accountsRes={accountsRes}
        permissions={permissions}
        homeContent={homeContent}
        logs={logs}
      />
    );
  }

  if (me.role === 'security-team') {
    const [reports, registrations, minutes, residentsRes, roster, ownHousehold, brand] = await Promise.all([
      apiFetch<IncidentReportWithHead[]>('/security-team/incident-reports'),
      apiFetch<ResidenceRegistrationItem[]>('/security-team/residence-registrations'),
      apiFetch<IncidentMinutesItem[]>('/security-team/incident-minutes'),
      apiFetch<{ total: number; residents: SecurityTeamResident[] }>('/security-team/residents'),
      apiFetch<SecurityRosterMember[]>('/security-team/roster'),
      fetchOwnHouseholdData(),
      fetchBrand(),
    ]);
    return (
      <SecurityTeamPortal
        me={me}
        reports={reports}
        registrations={registrations}
        minutes={minutes}
        residents={residentsRes.residents}
        roster={roster}
        ownHousehold={ownHousehold}
        siteName={brand.siteName}
        logoUrl={brand.logoUrl}
      />
    );
  }

  if (me.role === 'association-officer') {
    const [membersData, fundOverview, loans, ownHousehold, brand] = await Promise.all([
      apiFetch<AssociationMembersResponse>('/association-officer/members'),
      apiFetch<AssocFundOverview>('/association-officer/fund'),
      apiFetch<AssocLoan[]>('/association-officer/loans'),
      fetchOwnHouseholdData(),
      fetchBrand(),
    ]);
    return (
      <AssociationOfficerPortal
        me={me}
        membersData={membersData}
        fundOverview={fundOverview}
        loans={loans}
        ownHousehold={ownHousehold}
        siteName={brand.siteName}
        logoUrl={brand.logoUrl}
      />
    );
  }

  // Dashboard đầy đủ đã dựng cho mọi vai trò (resident/village-head/admin
  // /security-team/association-officer).
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

  const ownHousehold = await fetchOwnHouseholdData();
  if (!ownHousehold) {
    throw new Error('Tài khoản cư dân này chưa gắn với hộ gia đình nào.');
  }

  return (
    <ResidentPortal
      me={me}
      household={ownHousehold.household}
      requests={ownHousehold.requests}
      homeContent={ownHousehold.homeContent}
      tenants={ownHousehold.tenants}
      roster={ownHousehold.roster}
      villageFund={ownHousehold.villageFund}
      incidentReports={ownHousehold.incidentReports}
      residenceRegistrations={ownHousehold.residenceRegistrations}
    />
  );
}
