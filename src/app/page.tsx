import { getTenantSlug } from '@/lib/tenant';
import { apiFetch } from '@/lib/api';
import type { AdministrativeUnitItem, HomeContent, PublicCommune, PublicRoster } from '@/lib/types';
import { VillageHomePage } from './home-page';
import { DirectoryClient } from './directory/directory-client';

export default async function HomePage() {
  const slug = await getTenantSlug();

  if (!slug) {
    // Domain gốc — trang danh mục tra cứu thôn/buôn (mục 4.1 tài liệu
    // thiết kế), dựng từ dữ liệu Commune (nhập KMZ qua superadmin). Trang
    // này chỉ hiện đúng 1 xã (communes[0], xem ghi chú trong
    // DirectoryClient) nên địa danh cũng chỉ lấy đúng của xã đó.
    const communes = await apiFetch<PublicCommune[]>('/communes/public', { auth: false });
    const administrativeUnits = communes[0]
      ? await apiFetch<AdministrativeUnitItem[]>(`/administrative-units?communeId=${communes[0]._id}`, { auth: false })
      : [];
    return <DirectoryClient communes={communes} administrativeUnits={administrativeUnits} />;
  }

  const [content, roster] = await Promise.all([
    apiFetch<HomeContent>('/home-content', { auth: false }),
    apiFetch<PublicRoster>('/home-content/public-roster', { auth: false }),
  ]);
  return <VillageHomePage slug={slug} content={content} roster={roster} />;
}
