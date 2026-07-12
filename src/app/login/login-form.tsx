'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const DEMO_PASSWORD = 'doanket';

// Danh sách tài khoản kiểm thử nhanh — khớp đúng defaultAccounts của bản
// mẫu (E:\Dev\cong-thong-tin-thon\js\data.js), chỉ dùng cho môi trường dev.
const PRESETS = [
  { username: '066080004452', label: 'Cư dân', meta: 'Mã hộ: FAM-082', icon: 'fa-user', color: 'text-primary-600' },
  { username: '066073009900', label: 'Cán bộ Hội', meta: 'Hội Nông dân', icon: 'fa-users', color: 'text-amber-600' },
  { username: '066070001234', label: 'Trưởng thôn', meta: 'Quản lý chung', icon: 'fa-landmark', color: 'text-emerald-600' },
  { username: 'admin', label: 'Admin', meta: 'Kiểm duyệt tối cao', icon: 'fa-user-gear', color: 'text-red-600' },
  { username: '066088004321', label: 'Tổ ANTT', meta: 'An ninh trật tự', icon: 'fa-shield-halved', color: 'text-amber-600' },
];

export function LoginForm({ siteName, logoUrl }: { siteName: string; logoUrl: string }) {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState(DEMO_PASSWORD);
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
    <div className="min-h-screen bg-stone-50">
      <div className="fixed left-0 top-0 z-50 w-full p-4 sm:p-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-600 shadow-sm transition-all hover:border-primary-300 hover:text-primary-700"
        >
          <i className="fa-solid fa-arrow-left"></i> Quay về Trang chủ
        </Link>
      </div>

      <section className="flex min-h-screen items-center justify-center px-4 py-28">
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

          <div className="space-y-2 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">
              Chọn nhanh tài khoản kiểm thử:
            </span>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((p, i) => (
                <button
                  key={p.username}
                  type="button"
                  onClick={() => {
                    setUsername(p.username);
                    setPassword(DEMO_PASSWORD);
                  }}
                  className="flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 p-2.5 text-left text-xs text-stone-600 transition-all hover:border-primary-400 hover:bg-primary-50/50"
                >
                  <i className={`fa-solid ${p.icon} ${p.color}`}></i>
                  <div>
                    <span className="block text-[11px] font-bold text-stone-900">
                      {i + 1}. {p.label}
                    </span>
                    <span className="block text-[9px] leading-tight text-stone-400">{p.meta}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
