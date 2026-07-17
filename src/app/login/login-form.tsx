'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export function LoginForm({ siteName, logoUrl }: { siteName: string; logoUrl: string }) {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Đăng nhập thất bại.');
        return;
      }
      router.push('/dashboard');
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh bg-stone-50">
      <div className="fixed left-0 top-0 z-50 w-full p-4 sm:p-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-600 shadow-sm transition-all hover:border-primary-300 hover:text-primary-700"
        >
          <i className="fa-solid fa-arrow-left"></i> Quay về Trang chủ
        </Link>
      </div>

      <section className="flex min-h-dvh items-center justify-center px-4 py-28">
        <div className="w-full max-w-lg space-y-4">
          <div className="flex flex-col items-center gap-3 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoUrl}
              alt={`Logo ${siteName}`}
              className="h-20 w-20 rounded-full object-cover shadow-sm ring-2 ring-primary-100"
            />
            <div>
              <h2 className="font-serif text-xl font-black uppercase tracking-wide text-red-600">
                {siteName}
              </h2>
              <p className="text-xs font-semibold text-primary-600">Cổng thông tin về dân cư</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-lg">
            <div className="flex items-center gap-3 border-b border-stone-100 p-6">
              <i className="fa-solid fa-fingerprint text-lg text-primary-600"></i>
              <h1 className="font-serif text-lg font-bold uppercase tracking-wider text-stone-900">
                Xác Thực Cư Dân &amp; Cán Bộ
              </h1>
            </div>
            <div className="space-y-6 p-6">
              {error && (
                <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-600">
                  <i className="fa-solid fa-triangle-exclamation"></i>
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">
                    Số định danh cá nhân
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nhập số định danh cá nhân"
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-800 outline-none transition-colors focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-100"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">
                    Mật khẩu
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-800 outline-none transition-colors focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-100"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 py-3.5 text-xs font-bold uppercase tracking-wider text-white shadow-md transition-all hover:from-primary-500 hover:to-primary-600 disabled:opacity-50"
                >
                  {loading ? 'Đang xác thực...' : 'Xác thực truy cập hệ thống'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
