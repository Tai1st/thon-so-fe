import { redirect, notFound } from 'next/navigation';
import { superAdminApiFetch } from '@/lib/superadmin-api';
import { ApiError } from '@/lib/api';
import type { CommuneDetail } from '@/lib/types';
import { CreateTenantFromVillageForm } from './create-tenant-form';

export default async function VillageEditPage({
  params,
}: {
  params: Promise<{ id: string; index: string }>;
}) {
  const { id, index } = await params;
  const villageIndex = Number(index);

  let commune: CommuneDetail;
  try {
    commune = await superAdminApiFetch<CommuneDetail>(`/superadmin/communes/${id}`);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
      redirect('/superadmin/login');
    }
    throw err;
  }

  const village = commune.villages[villageIndex];
  if (!village) notFound();

  return (
    <CreateTenantFromVillageForm
      communeId={commune._id}
      communeName={commune.name}
      villageIndex={villageIndex}
      village={village}
    />
  );
}
