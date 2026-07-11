import { cookies } from 'next/headers';
import { ApiError } from './api';

const BASE_URL = process.env.BE_API_BASE_URL || 'http://localhost:3000';
export const SUPERADMIN_SESSION_COOKIE = 'superadmin_session';

// Tương tự apiFetch() nhưng KHÔNG gắn x-tenant-slug — superadmin không
// thuộc tenant nào (mục 5 tài liệu thiết kế), chỉ dùng cookie riêng
// `superadmin_session`. Chỉ gọi được từ Server Component/Route Handler.
export async function superAdminApiFetch<T>(
  path: string,
  options: { method?: string; body?: unknown; auth?: boolean } = {},
): Promise<T> {
  const headersInit: Record<string, string> = { 'Content-Type': 'application/json' };

  if (options.auth !== false) {
    const store = await cookies();
    const token = store.get(SUPERADMIN_SESSION_COOKIE)?.value;
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
