'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { clientApi, ClientApiError } from '@/lib/client-api';
import type { Me } from './page';

const ROLE_LABELS: Record<string, string> = {
  resident: 'Cư dân',
  'association-officer': 'Cán bộ Hội',
  'village-head': 'Trưởng thôn',
  'security-team': 'Tổ ANTT',
  admin: 'Admin',
};

// Cho phép dán cả 1 đoạn text lẫn URL (vd copy từ chỗ khác kèm chữ thừa)
// — chỉ giữ lại đúng phần link ảnh, bỏ hết phần còn lại.
function extractUrl(text: string): string {
  const match = text.match(/https?:\/\/\S+/);
  return (match ? match[0] : text).trim();
}

export function ProfileClient({ me }: { me: Me }) {
  const router = useRouter();
  const [avatarUrl, setAvatarUrl] = useState(me.avatarUrl || '');
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarNotice, setAvatarNotice] = useState('');
  const [avatarError, setAvatarError] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState('');
  const [passwordError, setPasswordError] = useState('');

  function handleAvatarPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData('text');
    if (!text) return;
    e.preventDefault();
    setAvatarUrl(extractUrl(text));
  }

  async function saveAvatar() {
    setAvatarNotice('');
    setAvatarError('');
    const cleaned = extractUrl(avatarUrl);
    setAvatarSaving(true);
    try {
      await clientApi('auth/me', { method: 'PATCH', body: { avatarUrl: cleaned } });
      setAvatarUrl(cleaned);
      setAvatarNotice('Đã lưu ảnh đại diện.');
      router.refresh();
    } catch (err) {
      setAvatarError(err instanceof ClientApiError ? err.message : 'Không thể lưu ảnh đại diện.');
    } finally {
      setAvatarSaving(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordNotice('');
    setPasswordError('');
    if (!currentPassword) return setPasswordError('Vui lòng nhập mật khẩu hiện tại.');
    if (newPassword.length < 6) return setPasswordError('Mật khẩu mới phải có ít nhất 6 ký tự.');
    if (newPassword !== confirmPassword) return setPasswordError('Mật khẩu mới nhập lại không khớp.');

    setPasswordSaving(true);
    try {
      await clientApi('auth/me/change-password', { method: 'POST', body: { currentPassword, newPassword } });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordNotice('Đã đổi mật khẩu thành công.');
    } catch (err) {
      setPasswordError(err instanceof ClientApiError ? err.message : 'Không thể đổi mật khẩu.');
    } finally {
      setPasswordSaving(false);
    }
  }

  const initials = me.name
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <div className="mx-auto min-h-screen max-w-2xl space-y-6 bg-stone-50 p-4 sm:p-8">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-600 hover:bg-stone-100"
        >
          <i className="fa-solid fa-arrow-left" />
        </button>
        <h1 className="font-serif text-lg font-bold uppercase tracking-wider text-stone-900">Hồ sơ tài khoản</h1>
      </div>

      {/* Avatar */}
      <div className="space-y-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="text-xs font-bold uppercase tracking-wider text-stone-500">Ảnh đại diện</h2>
        <div className="flex items-center gap-4">
          {avatarUrl.trim() ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl.trim()}
              alt={me.name}
              className="h-16 w-16 shrink-0 rounded-2xl object-cover ring-2 ring-primary-100"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary-600 to-amber-500 font-serif text-lg font-black text-white">
              {initials || '?'}
            </div>
          )}
          <div className="flex-1 space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">URL ảnh đại diện</label>
            <input
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              onPaste={handleAvatarPaste}
              onBlur={() => setAvatarUrl((v) => extractUrl(v))}
              placeholder="https://..."
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-800 outline-none focus:border-primary-500"
            />
          </div>
        </div>
        {avatarNotice && <p className="text-[11px] font-semibold text-emerald-600">{avatarNotice}</p>}
        {avatarError && <p className="text-[11px] font-semibold text-red-600">{avatarError}</p>}
        <button
          onClick={saveAvatar}
          disabled={avatarSaving}
          className="rounded-xl bg-primary-600 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg transition-all hover:bg-primary-500 disabled:opacity-50"
        >
          {avatarSaving ? 'Đang lưu...' : 'Lưu ảnh'}
        </button>
      </div>

      {/* Thông tin tài khoản */}
      <div className="space-y-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="text-xs font-bold uppercase tracking-wider text-stone-500">Thông tin tài khoản</h2>
        <dl className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
          <div>
            <dt className="text-stone-400">Họ và tên</dt>
            <dd className="font-semibold text-stone-800">{me.name}</dd>
          </div>
          <div>
            <dt className="text-stone-400">Tên đăng nhập</dt>
            <dd className="font-mono font-semibold text-stone-800">{me.username}</dd>
          </div>
          <div>
            <dt className="text-stone-400">Vai trò (phân quyền)</dt>
            <dd className="font-semibold text-stone-800">
              {ROLE_LABELS[me.role] || me.role}
              {me.role === 'association-officer' && me.assoc ? ` — ${me.assoc}` : ''}
            </dd>
          </div>
          <div>
            <dt className="text-stone-400">Chức vụ</dt>
            <dd className="font-semibold text-stone-800">{me.position || '—'}</dd>
          </div>
          <div>
            <dt className="text-stone-400">Trạng thái</dt>
            <dd className="font-semibold text-stone-800">{me.status === 'active' ? 'Đang mở' : 'Đã khóa'}</dd>
          </div>
          <div>
            <dt className="text-stone-400">Hoạt động cuối</dt>
            <dd className="font-mono font-semibold text-stone-800">{me.lastActive}</dd>
          </div>
        </dl>
        <p className="text-[11px] text-stone-400">
          Vai trò, chức vụ do Admin quản lý — liên hệ Admin nếu cần thay đổi. Bạn chỉ tự sửa được ảnh đại diện và mật khẩu.
        </p>
      </div>

      {/* Đổi mật khẩu */}
      <form onSubmit={changePassword} className="space-y-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="text-xs font-bold uppercase tracking-wider text-stone-500">Đổi mật khẩu</h2>
        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">Mật khẩu hiện tại</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-800 outline-none focus:border-primary-500"
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
        {passwordNotice && <p className="text-[11px] font-semibold text-emerald-600">{passwordNotice}</p>}
        {passwordError && <p className="text-[11px] font-semibold text-red-600">{passwordError}</p>}
        <button
          type="submit"
          disabled={passwordSaving}
          className="rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg transition-all hover:from-primary-500 hover:to-primary-600 disabled:opacity-50"
        >
          {passwordSaving ? 'Đang lưu...' : 'Đổi mật khẩu'}
        </button>
      </form>
    </div>
  );
}
