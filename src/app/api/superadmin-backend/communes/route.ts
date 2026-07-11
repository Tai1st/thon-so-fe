import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SUPERADMIN_SESSION_COOKIE } from '@/lib/superadmin-api';

const BASE_URL = process.env.BE_API_BASE_URL || 'http://localhost:3000';

// Route riêng (không dùng catch-all [...path]) vì import Xã gửi
// multipart/form-data (file KMZ) — phải forward nguyên stream + đúng
// Content-Type (kèm boundary) sang BE, không thể đọc thành text/JSON như
// proxy chung. Next.js ưu tiên route tĩnh này hơn catch-all cho đúng path
// "/api/superadmin-backend/communes".
async function auth() {
  const store = await cookies();
  return store.get(SUPERADMIN_SESSION_COOKIE)?.value;
}

export async function GET() {
  const token = await auth();
  if (!token) return NextResponse.json({ message: 'Chưa đăng nhập superadmin.' }, { status: 401 });

  const beRes = await fetch(`${BASE_URL}/superadmin/communes`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await beRes.json().catch(() => ({}));
  return NextResponse.json(data, { status: beRes.status });
}

export async function POST(request: NextRequest) {
  const token = await auth();
  if (!token) return NextResponse.json({ message: 'Chưa đăng nhập superadmin.' }, { status: 401 });

  const contentType = request.headers.get('content-type') || '';
  const beRes = await fetch(`${BASE_URL}/superadmin/communes`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': contentType },
    body: request.body,
    duplex: 'half',
  } as RequestInit & { duplex: 'half' });
  const data = await beRes.json().catch(() => ({}));
  return NextResponse.json(data, { status: beRes.status });
}
