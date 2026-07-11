import { redirect } from 'next/navigation';
import { superAdminApiFetch } from '@/lib/superadmin-api';
import { ApiError } from '@/lib/api';
import type { CommuneListItem } from '@/lib/types';
import { SuperAdminDashboard } from './superadmin-dashboard';

export interface TenantRow {
  _id: string;
  slug: string;
  name: string;
  archivedAt: string | null;
  createdAt: string;
  accountCount: number;
  residentCount: number;
  communeId: string | null;
  communeVillageIndex: number | null;
}

export default async function SuperAdminPage() {
  let tenants: TenantRow[];
  let communes: CommuneListItem[];
  try {
    [tenants, communes] = await Promise.all([
      superAdminApiFetch<TenantRow[]>('/superadmin/tenants'),
      superAdminApiFetch<CommuneListItem[]>('/superadmin/communes'),
    ]);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
      redirect('/superadmin/login');
    }
    throw err;
  }

  return <SuperAdminDashboard initialTenants={tenants} communes={communes} />;
}
