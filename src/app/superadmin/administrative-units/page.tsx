import { redirect } from 'next/navigation';
import { superAdminApiFetch } from '@/lib/superadmin-api';
import { ApiError } from '@/lib/api';
import type { SuperAdminAdministrativeUnit } from '@/lib/types';
import { AdministrativeUnitsDashboard } from './administrative-units-dashboard';

export default async function SuperAdminAdministrativeUnitsPage() {
  let units: SuperAdminAdministrativeUnit[];
  try {
    units = await superAdminApiFetch<SuperAdminAdministrativeUnit[]>('/superadmin/administrative-units');
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
      redirect('/superadmin/login');
    }
    throw err;
  }

  return <AdministrativeUnitsDashboard initialUnits={units} />;
}
