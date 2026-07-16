import { redirect } from 'next/navigation';
import { superAdminApiFetch } from '@/lib/superadmin-api';
import { ApiError } from '@/lib/api';
import type { CommuneDetail, SuperAdminAdministrativeUnit } from '@/lib/types';
import { CommunePlacesDashboard } from './commune-places-dashboard';

export default async function SuperAdminCommunePlacesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let commune: CommuneDetail;
  let units: SuperAdminAdministrativeUnit[];
  try {
    [commune, units] = await Promise.all([
      superAdminApiFetch<CommuneDetail>(`/superadmin/communes/${id}`),
      superAdminApiFetch<SuperAdminAdministrativeUnit[]>(`/superadmin/administrative-units?communeId=${id}`),
    ]);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
      redirect('/superadmin/login');
    }
    throw err;
  }

  return <CommunePlacesDashboard commune={commune} initialUnits={units} />;
}
