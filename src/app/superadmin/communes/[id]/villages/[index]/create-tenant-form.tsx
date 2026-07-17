'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { CommuneVillage } from '@/lib/types';

// Trang "sửa thông tin thôn rồi tạo tenant" — thay cho modal nhanh trước
// đây: cho phép chỉnh lại tên/slug của thôn (lấy từ KMZ, có thể sai chính
// tả hoặc trùng slug với tenant khác) trước khi tạo tài khoản admin đầu
// tiên, thay vì phải sửa lại sau khi đã tạo.
export function CreateTenantFromVillageForm({
  communeId,
  communeName,
  villageIndex,
  village,
}: {
  communeId: string;
  communeName: string;
  villageIndex: number;
  village: CommuneVillage;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    slug: village.slugSuggestion,
    name: village.name,
    adminUsername: '',
    adminPassword: '',
    adminName: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (village.claimed) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-stone-950 p-6 text-stone-100">
        <div className="max-w-md space-y-4 text-center">
          <p className="text-sm text-stone-400">Thôn &quot;{village.name}&quot; đã được gán cho 1 tenant rồi.</p>
          <Link href={`/superadmin/communes/${communeId}`} className="text-emerald-400 hover:underline">
            Quay lại bản đồ xã
          </Link>
        </div>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!/^[a-z0-9-]+$/.test(form.slug)) {
      setError('Slug chỉ được chứa chữ thường, số và dấu gạch nối.');
      return;
    }
    if (!form.name || !form.adminUsername || !form.adminPassword || !form.adminName) {
      setError('Vui lòng nhập đầy đủ thông tin.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/superadmin-backend/superadmin/communes/${communeId}/villages/${villageIndex}/create-tenant`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Không thể tạo tenant.');
        return;
      }
      router.push(`/superadmin/communes/${communeId}`);
      router.refresh();
    } catch {
      setError('Không thể tạo tenant.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-dvh bg-stone-950 text-stone-100">
      <div className="flex items-center justify-between border-b border-stone-800 bg-stone-900 p-6">
        <div>
          <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-emerald-500">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> {communeName}
          </p>
          <h1 className="font-serif text-lg font-bold uppercase tracking-wide text-white">Sửa thông tin thôn &amp; tạo tenant</h1>
        </div>
        <Link
          href={`/superadmin/communes/${communeId}`}
          className="rounded-xl border border-stone-700 px-3.5 py-1.5 text-xs font-semibold text-stone-300 hover:border-stone-500"
        >
          <i className="fa-solid fa-arrow-left mr-1" /> Quay lại bản đồ
        </Link>
      </div>

      <div className="mx-auto max-w-md p-6">
        <form onSubmit={submit} className="space-y-4 rounded-3xl border border-stone-800 bg-stone-900 p-6">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">Tên thôn *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-xl border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-emerald-500"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">Slug (subdomain) *</label>
            <input
              type="text"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })}
              className="w-full rounded-xl border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-emerald-500"
            />
            <p className="text-[10px] text-stone-500">Gợi ý tự sinh từ tên thôn trong KMZ — sửa lại nếu trùng với tenant khác.</p>
          </div>

          <div className="border-t border-stone-800 pt-4">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-stone-500">Tài khoản Admin đầu tiên</p>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">Tên đăng nhập *</label>
                <input
                  type="text"
                  value={form.adminUsername}
                  onChange={(e) => setForm({ ...form, adminUsername: e.target.value })}
                  className="w-full rounded-xl border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-emerald-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">Mật khẩu *</label>
                <input
                  type="password"
                  value={form.adminPassword}
                  onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
                  className="w-full rounded-xl border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-emerald-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">Họ và tên *</label>
                <input
                  type="text"
                  value={form.adminName}
                  onChange={(e) => setForm({ ...form, adminName: e.target.value })}
                  className="w-full rounded-xl border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {error && <p className="text-xs font-semibold text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-emerald-600 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-lg transition-all hover:bg-emerald-500 disabled:opacity-50"
          >
            {submitting ? 'Đang tạo...' : 'Tạo tenant'}
          </button>
        </form>
      </div>
    </div>
  );
}
