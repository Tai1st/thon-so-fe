import { headers } from 'next/headers';

// Đọc header x-tenant-slug do middleware.ts set — dùng trong Server
// Component/Route Handler (Node runtime), không phải trong middleware.
export async function getTenantSlug(): Promise<string | null> {
  const h = await headers();
  return h.get('x-tenant-slug');
}
