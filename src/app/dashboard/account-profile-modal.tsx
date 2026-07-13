'use client';

import { useState } from 'react';
import { clientApi, ClientApiError } from '@/lib/client-api';

// Modal tự sửa hồ sơ của chính người đăng nhập (avatar + đổi mật khẩu) —
// dùng chung cho cả 5 giao diện (Admin, Trưởng thôn, Cán bộ Hội, Tổ ANTT,
// Cư dân), mở ra khi bấm vào avatar cạnh nút đăng xuất. Khác nút "Reset
// Pass" của Admin (đưa về mặc định) — ở đây chủ tài khoản tự đổi, phải
// nhập đúng mật khẩu hiện tại.
export function AccountProfileModal({
  name,
  avatarUrl,
  onClose,
  onSuccess,
}: {
  name: string;
  avatarUrl: string;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}) {
  const [avatarInput, setAvatarInput] = useState(avatarUrl);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const wantsPasswordChange = currentPassword || newPassword || confirmPassword;
    if (wantsPasswordChange) {
      if (!currentPassword) return setError('Vui lòng nhập mật khẩu hiện tại.');
      if (newPassword.length < 6) return setError('Mật khẩu mới phải có ít nhất 6 ký tự.');
      if (newPassword !== confirmPassword) return setError('Mật khẩu mới nhập lại không khớp.');
    }

    setSubmitting(true);
    try {
      if (avatarInput.trim() !== avatarUrl) {
        await clientApi('auth/me', { method: 'PATCH', body: { avatarUrl: avatarInput.trim() } });
      }
      if (wantsPasswordChange) {
        await clientApi('auth/me/change-password', {
          method: 'POST',
          body: { currentPassword, newPassword },
        });
      }
      onSuccess('Đã cập nhật hồ sơ tài khoản.');
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : 'Không thể cập nhật hồ sơ.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-stone-950/80 p-4">
      <div className="w-full max-w-sm space-y-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-base font-bold uppercase tracking-wider text-stone-900">Hồ sơ tài khoản</h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 bg-stone-50 text-stone-500 hover:border-red-300 hover:text-red-500"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="flex items-center gap-3">
            {avatarInput.trim() ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarInput.trim()}
                alt={name}
                className="h-12 w-12 shrink-0 rounded-xl object-cover ring-2 ring-primary-100"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-primary-600 to-amber-500 font-serif text-sm font-black text-white">
                {name
                  .split(' ')
                  .filter(Boolean)
                  .slice(-2)
                  .map((w) => w[0])
                  .join('')
                  .toUpperCase()}
              </div>
            )}
            <div className="flex-1 space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">URL ảnh đại diện</label>
              <input
                value={avatarInput}
                onChange={(e) => setAvatarInput(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-800 outline-none focus:border-primary-500"
              />
            </div>
          </div>

          <div className="space-y-3 border-t border-stone-100 pt-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
              Đổi mật khẩu (để trống nếu không đổi)
            </p>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">Mật khẩu hiện tại</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-800 outline-none focus:border-primary-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">Mật khẩu mới</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Ít nhất 6 ký tự"
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-800 outline-none focus:border-primary-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">Nhập lại mật khẩu mới</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-800 outline-none focus:border-primary-500"
              />
            </div>
          </div>

          {error && <p className="text-[11px] font-semibold text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-lg transition-all hover:from-primary-500 hover:to-primary-600 disabled:opacity-50"
          >
            {submitting ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </form>
      </div>
    </div>
  );
}
