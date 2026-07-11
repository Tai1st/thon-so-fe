'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SuperAdminLoginPage() {
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
      const res = await fetch('/api/superadmin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Đăng nhập thất bại.');
        return;
      }
      router.push('/superadmin');
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-stone-950">
      <div className="fixed left-0 top-0 z-50 w-full p-4 sm:p-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl border border-stone-800 bg-stone-900 px-4 py-2 text-xs font-semibold text-stone-300 shadow-sm transition-all hover:border-stone-600 hover:text-white"
        >
          <i className="fa-solid fa-arrow-left"></i> Quay về Trang chủ
        </Link>
      </div>

      <section className="flex min-h-screen items-center justify-center px-4 py-28">
        <div className="w-full max-w-md space-y-4">
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-stone-900 text-2xl text-emerald-500 ring-2 ring-stone-800">
              <i className="fa-solid fa-user-shield" />
            </span>
            <div>
              <h2 className="font-serif text-xl font-black uppercase tracking-wide text-white">Quản trị hệ thống</h2>
              <p className="text-xs font-semibold text-stone-400">Superadmin — quản lý toàn bộ tenant</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-stone-800 bg-stone-900 shadow-lg">
            <div className="space-y-6 p-6">
              {error && (
                <div className="flex items-center gap-2 rounded-xl bg-red-950/50 p-3 text-xs text-red-400">
                  <i className="fa-solid fa-triangle-exclamation"></i>
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">Tên đăng nhập</label>
                  <input
                    type="text"
                    required
                    className="w-full rounded-xl border border-stone-700 bg-stone-800 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-emerald-500"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">Mật khẩu</label>
                  <input
                    type="password"
                    required
                    className="w-full rounded-xl border border-stone-700 bg-stone-800 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-emerald-500"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-emerald-600 py-3.5 text-xs font-bold uppercase tracking-wider text-white shadow-md transition-all hover:bg-emerald-500 disabled:opacity-50"
                >
                  {loading ? 'Đang xác thực...' : 'Đăng nhập'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
