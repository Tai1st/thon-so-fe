import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SUPERADMIN_SESSION_COOKIE } from '@/lib/superadmin-api';

const BASE_URL = process.env.BE_API_BASE_URL || 'http://localhost:3000';

// Proxy dùng chung cho thao tác ghi (POST/PATCH) từ Client Component ở khu
// vực superadmin — cùng lý do với /api/backend/[...path] (Client Component
// không tự đọc cookie httpOnly được), nhưng dùng cookie `superadmin_session`
// riêng, không đụng tới x-tenant-slug.
async function forward(request: NextRequest, path: string[]) {
  const store = await cookies();
  const token = store.get(SUPERADMIN_SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ message: 'Chưa đăng nhập superadmin.' }, { status: 401 });
  }

  const body = request.method === 'GET' ? undefined : await request.text();
  const beRes = await fetch(`${BASE_URL}/${path.join('/')}`, {
    method: request.method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body,
  });
  const data = await beRes.json().catch(() => ({}));
  return NextResponse.json(data, { status: beRes.status });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return forward(request, (await params).path);
}
export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return forward(request, (await params).path);
}
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return forward(request, (await params).path);
}
