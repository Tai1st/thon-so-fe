import { NextResponse } from 'next/server';
import { SUPERADMIN_SESSION_COOKIE } from '@/lib/superadmin-api';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SUPERADMIN_SESSION_COOKIE);
  return response;
}
