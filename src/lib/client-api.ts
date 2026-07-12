'use client';

export class ClientApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

// Gọi BE từ Client Component qua proxy /api/backend/* (route.ts đọc cookie
// httpOnly phía server rồi forward) — Client Component không có
// cookies()/headers() nên không thể gọi thẳng BE như apiFetch() (server-only).
export async function clientApi<T>(
  path: string,
  options: { method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'; body?: unknown } = {},
): Promise<T> {
  const res = await fetch(`/api/backend/${path}`, {
    method: options.method || 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ClientApiError(res.status, data.message || 'Lỗi gọi API.');
  }
  return data as T;
}
