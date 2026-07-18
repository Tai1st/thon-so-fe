import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getTenantSlug } from '@/lib/tenant';
import { SESSION_COOKIE } from '@/lib/api';

const BASE_URL = process.env.BE_API_BASE_URL || 'http://localhost:8000/api';

// Proxy dùng chung cho MỌI thao tác ghi (POST/PATCH) mà Client Component
// cần gọi sau khi đã đăng nhập — Client Component không có headers()/
// cookies() để tự đính x-tenant-slug/Authorization như apiFetch() (chỉ
// chạy được ở Server Component/Route Handler), nên phải đi qua route
// handler này để tự đọc cookie httpOnly phía server rồi forward sang BE.
async function forward(request: NextRequest, path: string[]) {
  const slug = await getTenantSlug();
  if (!slug) {
    return NextResponse.json({ message: 'Không xác định được thôn.' }, { status: 404 });
  }
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ message: 'Chưa đăng nhập.' }, { status: 401 });
  }

  // multipart/form-data (upload file) phải forward NGUYÊN body dạng stream
  // + giữ đúng Content-Type gốc (có boundary) — request.text() sẽ làm hỏng
  // dữ liệu nhị phân của file, còn ép cứng "application/json" sẽ khiến BE
  // không parse được multipart nữa.
  const contentType = request.headers.get('content-type') || '';
  const isMultipart = contentType.startsWith('multipart/form-data');

  const beRes = await fetch(`${BASE_URL}/${path.join('/')}`, {
    method: request.method,
    headers: {
      'Content-Type': isMultipart ? contentType : 'application/json',
      'x-tenant-slug': slug,
      Authorization: `Bearer ${token}`,
    },
    body: request.method === 'GET' ? undefined : isMultipart ? request.body : await request.text(),
    // Bắt buộc khi body là ReadableStream (undici yêu cầu duplex: 'half').
    ...(isMultipart && request.method !== 'GET' ? { duplex: 'half' } : {}),
  } as RequestInit);
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
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return forward(request, (await params).path);
}
export async function PUT(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return forward(request, (await params).path);
}
