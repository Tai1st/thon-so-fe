'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { CommuneListItem } from '@/lib/types';

export function CommunesDashboard({ initialCommunes }: { initialCommunes: CommuneListItem[] }) {
  const router = useRouter();
  const [communes, setCommunes] = useState(initialCommunes);
  const [showImport, setShowImport] = useState(false);
  const [deletingCommune, setDeletingCommune] = useState<CommuneListItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  function showNotice(type: 'success' | 'error', text: string) {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 4000);
  }

  async function refresh() {
    const res = await fetch('/api/superadmin-backend/communes');
    const data = await res.json();
    if (res.ok) setCommunes(data);
  }

  async function handleLogout() {
    await fetch('/api/superadmin/auth/logout', { method: 'POST' });
    router.push('/superadmin/login');
    router.refresh();
  }

  async function confirmDeleteCommune() {
    if (!deletingCommune) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/superadmin-backend/superadmin/communes/${deletingCommune._id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Không thể xóa xã này.');
      setDeletingCommune(null);
      await refresh();
      showNotice('success', `Đã xóa xã "${deletingCommune.name}" cùng mọi tenant thuộc xã đó.`);
    } catch (err) {
      showNotice('error', err instanceof Error ? err.message : 'Không thể xóa xã này.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <div className="flex items-center justify-between border-b border-stone-800 bg-stone-900 p-6">
        <div>
          <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-emerald-500">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> Quản trị hệ thống
          </p>
          <h1 className="font-serif text-lg font-bold uppercase tracking-wide text-white">Quản lý Xã (bản đồ KMZ)</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/superadmin" className="rounded-xl border border-stone-700 px-3.5 py-1.5 text-xs font-semibold text-stone-300 hover:border-stone-500">
            <i className="fa-solid fa-arrow-left mr-1" /> Danh sách Tenant
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-xl bg-red-950/50 px-3.5 py-1.5 text-xs font-bold text-red-400 transition-all hover:bg-red-600 hover:text-white"
          >
            <i className="fa-solid fa-right-from-bracket" /> Đăng xuất
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-6 p-6">
        {notice && (
          <div
            className={`rounded-xl border p-4 text-xs ${
              notice.type === 'success'
                ? 'border-emerald-800 bg-emerald-950/50 text-emerald-400'
                : 'border-red-800 bg-red-950/50 text-red-400'
            }`}
          >
            {notice.text}
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-xs text-stone-400">{communes.length} xã</span>
          <button
            onClick={() => setShowImport(true)}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold uppercase text-white hover:bg-emerald-500"
          >
            <i className="fa-solid fa-file-import mr-1" /> Nhập KMZ xã mới
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-stone-800 bg-stone-900">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone-800 text-stone-400">
                <th className="p-4 font-semibold">Tên xã</th>
                <th className="p-4 font-semibold text-center">Tổng số thôn</th>
                <th className="p-4 font-semibold text-center">Đã tạo tenant</th>
                <th className="p-4 text-right font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800">
              {communes.map((c) => (
                <tr key={c._id} className="hover:bg-stone-800/50">
                  <td className="p-4 font-bold text-white">{c.name}</td>
                  <td className="p-4 text-center text-stone-300">{c.totalVillages}</td>
                  <td className="p-4 text-center text-stone-300">
                    {c.claimedVillages} / {c.totalVillages}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/superadmin/communes/${c._id}/places`}
                        className="rounded bg-stone-800 px-2.5 py-1 text-[11px] font-semibold text-stone-300 hover:bg-stone-700"
                      >
                        <i className="fa-solid fa-map-pin mr-1" /> Thêm địa danh
                      </Link>
                      <Link
                        href={`/superadmin/communes/${c._id}`}
                        className="rounded bg-emerald-950/50 px-2.5 py-1 text-[11px] font-semibold text-emerald-400 hover:bg-emerald-600 hover:text-white"
                      >
                        <i className="fa-solid fa-map mr-1" /> Xem bản đồ
                      </Link>
                      <button
                        onClick={() => setDeletingCommune(c)}
                        className="rounded bg-red-950/50 px-2.5 py-1 text-[11px] font-semibold text-red-400 transition-all hover:bg-red-600 hover:text-white"
                      >
                        <i className="fa-solid fa-trash mr-1" /> Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {communes.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-stone-500">
                    Chưa có xã nào — bấm &quot;Nhập KMZ xã mới&quot; để bắt đầu.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showImport && (
        <ImportCommuneModal
          onClose={() => setShowImport(false)}
          onSuccess={async () => {
            setShowImport(false);
            await refresh();
            showNotice('success', 'Đã nhập xã mới thành công.');
          }}
        />
      )}

      {deletingCommune && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm space-y-4 rounded-3xl border border-stone-800 bg-stone-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-base font-bold uppercase tracking-wider text-white">Xác nhận xóa xã</h3>
              <button
                onClick={() => setDeletingCommune(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-700 bg-stone-800 text-stone-400 hover:border-red-500 hover:text-red-400"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <p className="text-xs text-stone-400">
              Bạn có chắc muốn xóa xã &quot;{deletingCommune.name}&quot;?{' '}
              {deletingCommune.claimedVillages > 0 ? (
                <>
                  <strong className="text-red-400">
                    {deletingCommune.claimedVillages} tenant đã tạo từ xã này sẽ bị xóa vĩnh viễn
                  </strong>{' '}
                  cùng toàn bộ tài khoản, nhân khẩu và dữ liệu liên quan.
                </>
              ) : (
                'Xã này chưa có tenant nào.'
              )}{' '}
              Hành động này không thể hoàn tác.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeletingCommune(null)}
                disabled={deleting}
                className="w-full rounded-xl border border-stone-700 bg-stone-800 py-2.5 text-xs font-bold uppercase text-stone-300 hover:bg-stone-700 disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                onClick={confirmDeleteCommune}
                disabled={deleting}
                className="w-full rounded-xl bg-red-600 py-2.5 text-xs font-bold uppercase text-white hover:bg-red-500 disabled:opacity-50"
              >
                {deleting ? 'Đang xóa...' : 'Xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ImportCommuneModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('Vui lòng nhập tên xã.');
      return;
    }
    if (!file) {
      setError('Vui lòng chọn file KMZ (hoặc KML).');
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('file', file);
      const res = await fetch('/api/superadmin-backend/communes', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Không thể nhập file KMZ.');
        return;
      }
      onSuccess();
    } catch {
      setError('Không thể nhập file KMZ.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/70 p-4">
      <div className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-stone-800 bg-stone-900 shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-stone-800 p-6">
          <h3 className="font-serif text-base font-bold uppercase tracking-wider text-white">Nhập KMZ xã mới</h3>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-700 bg-stone-800 text-stone-400 hover:border-red-500 hover:text-red-400">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <form onSubmit={submit} className="flex-1 space-y-3 overflow-y-auto p-6">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">Tên xã *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Xã Dliê Ya"
              className="w-full rounded-xl border border-stone-700 bg-stone-800 px-3 py-2 text-xs text-white outline-none transition-colors focus:border-emerald-500"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">File KMZ/KML *</label>
            <input
              type="file"
              accept=".kmz,.kml"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full rounded-xl border border-stone-700 bg-stone-800 px-3 py-2 text-xs text-white outline-none file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:px-3 file:py-1.5 file:text-[11px] file:font-bold file:text-white"
            />
            <p className="text-[10px] text-stone-500">
              Mỗi Placemark (polygon) trong file sẽ trở thành 1 thôn. Điểm mốc/nhãn đơn lẻ sẽ tự động bị bỏ qua.
            </p>
          </div>
          {error && <p className="text-[11px] font-semibold text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-emerald-600 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-lg transition-all hover:bg-emerald-500 disabled:opacity-50"
          >
            {submitting ? 'Đang xử lý...' : 'Nhập xã'}
          </button>
        </form>
      </div>
    </div>
  );
}
