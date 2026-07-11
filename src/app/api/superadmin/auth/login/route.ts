import { NextRequest, NextResponse } from 'next/server';
import { SUPERADMIN_SESSION_COOKIE } from '@/lib/superadmin-api';

const BASE_URL = process.env.BE_API_BASE_URL || 'http://localhost:3000';

// BFF riêng cho superadmin — không gắn x-tenant-slug (khác /api/auth/login
// của cư dân, vốn phụ thuộc subdomain). Cookie httpOnly riêng
// `superadmin_session`, tách biệt hoàn toàn khỏi cookie `session` của tenant.
export async function POST(request: NextRequest) {
  const body = await request.json();
  const beRes = await fetch(`${BASE_URL}/superadmin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await beRes.json();

  if (!beRes.ok) {
    return NextResponse.json(data, { status: beRes.status });
  }

  const response = NextResponse.json({ ok: true, superAdmin: data.superAdmin });
  response.cookies.set(SUPERADMIN_SESSION_COOKIE, data.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 15,
  });
  return response;
}
