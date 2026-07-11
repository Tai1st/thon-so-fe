import { redirect } from 'next/navigation';
import { superAdminApiFetch } from '@/lib/superadmin-api';
import { ApiError } from '@/lib/api';
import type { CommuneListItem } from '@/lib/types';
import { CommunesDashboard } from './communes-dashboard';

export default async function SuperAdminCommunesPage() {
  let communes: CommuneListItem[];
  try {
    communes = await superAdminApiFetch<CommuneListItem[]>('/superadmin/communes');
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
      redirect('/superadmin/login');
    }
    throw err;
  }

  return <CommunesDashboard initialCommunes={communes} />;
}
