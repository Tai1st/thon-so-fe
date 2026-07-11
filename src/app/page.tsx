import { getTenantSlug } from '@/lib/tenant';
import { apiFetch } from '@/lib/api';
import type { AdministrativeUnitItem, HomeContent, PublicCommune, PublicRoster } from '@/lib/types';
import { VillageHomePage } from './home-page';
import { DirectoryClient } from './directory/directory-client';

export default async function HomePage() {
  const slug = await getTenantSlug();

  if (!slug) {
    // Domain gốc — trang danh mục tra cứu thôn/buôn (mục 4.1 tài liệu
    // thiết kế), dựng từ dữ liệu Commune (nhập KMZ qua superadmin).
    const [communes, administrativeUnits] = await Promise.all([
      apiFetch<PublicCommune[]>('/communes/public', { auth: false }),
      apiFetch<AdministrativeUnitItem[]>('/administrative-units', { auth: false }),
    ]);
    return <DirectoryClient communes={communes} administrativeUnits={administrativeUnits} />;
  }

  const [content, roster] = await Promise.all([
    apiFetch<HomeContent>('/home-content', { auth: false }),
    apiFetch<PublicRoster>('/home-content/public-roster', { auth: false }),
  ]);
  return <VillageHomePage slug={slug} content={content} roster={roster} />;
}
