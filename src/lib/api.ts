import { cookies } from 'next/headers';
import { getTenantSlug } from './tenant';

const BASE_URL = process.env.BE_API_BASE_URL || 'http://localhost:8000/api';
export const SESSION_COOKIE = 'session';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

// Gọi BE từ Server Component/Route Handler — luôn gắn x-tenant-slug (đọc từ
// middleware) và Authorization Bearer (đọc từ cookie httpOnly do BFF tự
// set sau khi login — mục 5 tài liệu thiết kế). Không dùng trực tiếp
// trong Client Component vì cookies()/headers() chỉ chạy được ở server.
export async function apiFetch<T>(
  path: string,
  options: { method?: string; body?: unknown; auth?: boolean } = {},
): Promise<T> {
  const slug = await getTenantSlug();
  const headersInit: Record<string, string> = { 'Content-Type': 'application/json' };
  if (slug) headersInit['x-tenant-slug'] = slug;

  if (options.auth !== false) {
    const store = await cookies();
    const token = store.get(SESSION_COOKIE)?.value;
    if (token) headersInit['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method: options.method || 'GET',
    headers: headersInit,
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: 'no-store',
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({ message: res.statusText }));
    throw new ApiError(res.status, errBody.message || 'Lỗi gọi API.');
  }
  return res.json() as Promise<T>;
}
