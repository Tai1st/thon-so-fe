import { redirect } from 'next/navigation';
import { superAdminApiFetch } from '@/lib/superadmin-api';
import { ApiError } from '@/lib/api';
import type { CommuneDetail } from '@/lib/types';
import { CommuneMapClient } from './commune-map-client';

export default async function SuperAdminCommuneDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let commune: CommuneDetail;
  try {
    commune = await superAdminApiFetch<CommuneDetail>(`/superadmin/communes/${id}`);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
      redirect('/superadmin/login');
    }
    throw err;
  }

  return <CommuneMapClient initialCommune={commune} />;
}
