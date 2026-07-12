import { NextRequest, NextResponse } from 'next/server';
import { getTenantSlug } from '@/lib/tenant';
import { SESSION_COOKIE } from '@/lib/api';

const BASE_URL = process.env.BE_API_BASE_URL || 'http://localhost:8000/api';

// FE đóng vai BFF cho riêng bước login (mục 5 tài liệu thiết kế): browser
// không nhận JWT trực tiếp, chỉ nhận cookie httpOnly do chính FE set.
export async function POST(request: NextRequest) {
  const slug = await getTenantSlug();
  if (!slug) {
    return NextResponse.json({ message: 'Không xác định được thôn.' }, { status: 404 });
  }

  const body = await request.json();
  const beRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-tenant-slug': slug },
    body: JSON.stringify(body),
  });
  const data = await beRes.json();

  if (!beRes.ok) {
    return NextResponse.json(data, { status: beRes.status });
  }

  const response = NextResponse.json({ ok: true, account: data.account });
  response.cookies.set(SESSION_COOKIE, data.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 15,
  });
  return response;
}
