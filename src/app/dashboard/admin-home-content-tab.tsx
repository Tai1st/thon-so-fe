'use client';

import { useState } from 'react';
import { clientApi, ClientApiError } from '@/lib/client-api';
import type { GalleryItem, HomeContent, NewsItem, Product, ScheduleItem, Stat } from '@/lib/types';
import { extractImageUrl } from '@/lib/extract-image-url';
import { ConfirmDeleteModal } from './confirm-delete-modal';

const NEWS_CATEGORIES = [
  { slug: 'hanh-chinh', label: 'Hành chính' },
  { slug: 'san-xuat', label: 'Sản xuất' },
  { slug: 'doan-the', label: 'Đoàn thể' },
];

export function AdminHomeContentTab({
  homeContent,
  onHomeContentChange,
}: {
  homeContent: HomeContent;
  onHomeContentChange: (h: HomeContent) => void;
}) {
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  function showNotice(type: 'success' | 'error' | 'info', text: string) {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 4000);
  }

  async function refresh() {
    const res = await clientApi<HomeContent>('admin/home-content');
    onHomeContentChange(res);
  }

  async function saveBranding(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const siteName = String(form.get('siteName') || '').trim();
    if (!siteName) {
      showNotice('error', 'Vui lòng nhập tên thôn hiển thị.');
      return;
    }
    try {
      await clientApi('admin/home-content/branding', {
        method: 'PUT',
        body: {
          siteName,
          logoUrl: extractImageUrl(String(form.get('logoUrl') || '')),
          heroImage: extractImageUrl(String(form.get('heroImage') || '')),
        },
      });
      await refresh();
      showNotice('success', 'Đã cập nhật thương hiệu trang chủ.');
    } catch (err) {
      showNotice('error', err instanceof ClientApiError ? err.message : 'Không thể lưu.');
    }
  }

  async function saveSecurity(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await clientApi('admin/home-content/security', {
        method: 'PUT',
        body: {
          hotline: String(form.get('hotline') || ''),
          hotlineDisplay: String(form.get('hotlineDisplay') || ''),
          slogan: String(form.get('slogan') || ''),
        },
      });
      await refresh();
      showNotice('success', 'Đã cập nhật thông tin đường dây nóng.');
    } catch (err) {
      showNotice('error', err instanceof ClientApiError ? err.message : 'Không thể lưu.');
    }
  }

  return (
    <>
      {notice && (
        <div
          className={`mb-4 rounded-xl border p-4 text-xs ${
            notice.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : notice.type === 'error'
                ? 'border-red-200 bg-red-50 text-red-700'
                : 'border-blue-200 bg-blue-50 text-blue-700'
          }`}
        >
          {notice.text}
        </div>
      )}

      <div className="text-left">
        <h4 className="font-serif text-lg font-bold text-stone-900">Quản lý Trang chủ</h4>
        <p className="text-xs text-stone-500">Nội dung công khai hiển thị trên trang chủ điện tử của thôn.</p>
      </div>

      <div className="space-y-3 rounded-xl border border-stone-200 bg-stone-50 p-4 text-left">
        <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">Thương hiệu trang chủ</span>
        <form onSubmit={saveBranding} className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2">
          <TextInput name="siteName" label="Tên thôn hiển thị" defaultValue={homeContent.siteName} />
          <TextInput name="logoUrl" label="URL Logo (để trống dùng ảnh mặc định)" defaultValue={homeContent.logoUrl} />
          <TextInput name="heroImage" label="URL ảnh nền Hero (để trống dùng ảnh mặc định)" defaultValue={homeContent.heroImage} className="sm:col-span-2" />
          <button type="submit" className="rounded-lg bg-primary-600 py-2 text-xs font-bold uppercase text-white hover:bg-primary-500 sm:col-span-2">
            Lưu thương hiệu
          </button>
        </form>
      </div>

      <div className="space-y-3 rounded-xl border border-stone-200 bg-stone-50 p-4 text-left">
        <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">Đường dây nóng An ninh trật tự</span>
        <form onSubmit={saveSecurity} className="grid grid-cols-1 items-end gap-3 sm:grid-cols-4">
          <TextInput name="hotline" label="Số điện thoại" defaultValue={homeContent.security.hotline} />
          <TextInput name="hotlineDisplay" label="Hiển thị (VD: 0123.456.789)" defaultValue={homeContent.security.hotlineDisplay} />
          <TextInput name="slogan" label="Khẩu hiệu" defaultValue={homeContent.security.slogan} className="sm:col-span-2" />
          <button type="submit" className="rounded-lg bg-primary-600 py-2 text-xs font-bold uppercase text-white hover:bg-primary-500 sm:col-span-4">
            Lưu
          </button>
        </form>
      </div>

      <OldVillagesSection oldVillages={homeContent.oldVillages || []} onChange={refresh} showNotice={showNotice} />
      <NewsSection news={homeContent.news} onChange={refresh} showNotice={showNotice} />
      <ProductsSection products={homeContent.products} onChange={refresh} showNotice={showNotice} />
      <ScheduleSection schedule={homeContent.schedule} onChange={refresh} showNotice={showNotice} />
      <StatsSection stats={homeContent.stats} oldVillages={homeContent.oldVillages || []} onChange={refresh} showNotice={showNotice} />
      <GallerySection gallery={homeContent.gallery} onChange={refresh} showNotice={showNotice} />
    </>
  );
}

type Notice = (type: 'success' | 'error' | 'info', text: string) => void;

function TextInput({
  name,
  label,
  defaultValue,
  className,
  type = 'text',
}: {
  name: string;
  label: string;
  defaultValue?: string;
  className?: string;
  type?: string;
}) {
  return (
    <div className={`space-y-1 ${className || ''}`}>
      <label className="block text-[9px] font-bold uppercase text-stone-400">{label}</label>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 outline-none focus:border-primary-500"
      />
    </div>
  );
}

function OldVillagesSection({
  oldVillages,
  onChange,
  showNotice,
}: {
  oldVillages: string[];
  onChange: () => void;
  showNotice: Notice;
}) {
  const [names, setNames] = useState(oldVillages);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  async function save(next: string[]) {
    setSaving(true);
    try {
      await clientApi('admin/home-content/old-villages', { method: 'PUT', body: { oldVillages: next } });
      setNames(next);
      onChange();
      showNotice('success', 'Đã cập nhật danh sách thôn cũ.');
    } catch (err) {
      showNotice('error', err instanceof ClientApiError ? err.message : 'Không thể lưu.');
    } finally {
      setSaving(false);
    }
  }

  function addVillage() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    if (names.includes(trimmed)) {
      showNotice('error', 'Tên thôn cũ này đã có trong danh sách.');
      return;
    }
    setNewName('');
    save([...names, trimmed]);
  }

  function removeVillage(name: string) {
    save(names.filter((n) => n !== name));
  }

  return (
    <div className="space-y-3 rounded-xl border border-stone-200 bg-stone-50 p-4 text-left">
      <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">
        Danh sách Thôn cũ (trước sáp nhập)
      </span>
      <p className="-mt-1 text-[11px] text-stone-400">
        Dùng làm lựa chọn Nhóm cư trú khi thêm/sửa nhân khẩu, và nhãn chi tiết cho các chỉ số thống kê bên dưới.
      </p>
      <div className="flex flex-wrap gap-2">
        {names.length === 0 && <p className="text-xs text-stone-400">Chưa có thôn cũ nào.</p>}
        {names.map((n) => (
          <span key={n} className="flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-700">
            {n}
            <button disabled={saving} onClick={() => removeVillage(n)} className="text-stone-400 hover:text-red-600 disabled:opacity-50">
              <i className="fa-solid fa-xmark" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addVillage();
            }
          }}
          placeholder="VD: Đoàn Kết cũ"
          className="flex-1 rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 outline-none focus:border-primary-500"
        />
        <button
          type="button"
          disabled={saving}
          onClick={addVillage}
          className="rounded-lg bg-primary-600 px-4 py-2 text-xs font-bold uppercase text-white hover:bg-primary-500 disabled:opacity-50"
        >
          Thêm
        </button>
      </div>
    </div>
  );
}

function NewsSection({ news, onChange, showNotice }: { news: NewsItem[]; onChange: () => void; showNotice: Notice }) {
  const [editing, setEditing] = useState<NewsItem | 'new' | null>(null);
  const [deleting, setDeleting] = useState<NewsItem | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const categorySlug = String(form.get('categorySlug') || 'hanh-chinh');
    const category = NEWS_CATEGORIES.find((c) => c.slug === categorySlug)?.label || categorySlug;
    const body = {
      categorySlug,
      category,
      date: String(form.get('date') || ''),
      title: String(form.get('title') || ''),
      summary: String(form.get('summary') || ''),
      content: String(form.get('content') || ''),
    };
    try {
      if (editing === 'new') {
        await clientApi('admin/home-content/news', { method: 'POST', body });
        showNotice('success', `Đã đăng tin tức "${body.title}".`);
      } else if (editing) {
        await clientApi(`admin/home-content/news/${editing.id}`, { method: 'PATCH', body });
        showNotice('success', `Đã cập nhật tin tức "${body.title}".`);
      }
      setEditing(null);
      onChange();
    } catch (err) {
      showNotice('error', err instanceof ClientApiError ? err.message : 'Không thể lưu tin tức.');
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    await clientApi(`admin/home-content/news/${deleting.id}`, { method: 'DELETE' });
    setDeleting(null);
    onChange();
    showNotice('info', 'Đã xóa tin tức.');
  }

  return (
    <div className="space-y-3 text-left">
      <div className="flex items-center justify-between">
        <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">Tin tức &amp; Thông báo ({news.length})</span>
        <button onClick={() => setEditing('new')} className="rounded-lg bg-primary-600 px-3 py-1.5 text-[11px] font-bold uppercase text-white hover:bg-primary-500">
          <i className="fa-solid fa-plus mr-1" /> Đăng tin mới
        </button>
      </div>
      <div className="divide-y divide-stone-200 overflow-hidden rounded-xl border border-stone-200 bg-stone-50">
        {news.length === 0 && <p className="p-4 text-center text-xs text-stone-400">Chưa có tin tức nào.</p>}
        {news.map((n) => (
          <div key={n.id} className="flex items-center justify-between gap-3 p-3 text-xs">
            <div className="min-w-0">
              <span className="block truncate font-bold text-stone-900">{n.title}</span>
              <span className="text-[10px] text-stone-400">
                {n.category} · {n.date} · {n.createdBy}
              </span>
            </div>
            <div className="flex shrink-0 gap-2">
              <button onClick={() => setEditing(n)} className="rounded border border-stone-200 bg-white px-2 py-1 text-[10px] text-stone-600 hover:bg-stone-100">
                Sửa
              </button>
              <button
                onClick={() => setDeleting(n)}
                className="rounded bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-600 hover:bg-red-600 hover:text-white"
              >
                Xóa
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-stone-950/80 p-4">
          <div className="w-full max-w-lg space-y-3 rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-bold uppercase tracking-wider text-stone-900">{editing === 'new' ? 'Đăng tin mới' : 'Sửa tin tức'}</h5>
              <button onClick={() => setEditing(null)} className="text-stone-400 hover:text-stone-900">
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <form onSubmit={submit} className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="block text-[9px] font-bold uppercase text-stone-400">Danh mục</label>
                  <select
                    name="categorySlug"
                    defaultValue={editing !== 'new' ? editing.categorySlug : 'hanh-chinh'}
                    className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 outline-none"
                  >
                    {NEWS_CATEGORIES.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <TextInput name="date" label="Ngày đăng" type="date" defaultValue={editing !== 'new' ? editing.date : ''} />
              </div>
              <TextInput name="title" label="Tiêu đề" defaultValue={editing !== 'new' ? editing.title : ''} />
              <TextInput name="summary" label="Tóm tắt" defaultValue={editing !== 'new' ? editing.summary : ''} />
              <div className="space-y-1">
                <label className="block text-[9px] font-bold uppercase text-stone-400">Nội dung</label>
                <textarea
                  name="content"
                  rows={4}
                  defaultValue={editing !== 'new' ? editing.content : ''}
                  className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 outline-none"
                />
              </div>
              <button type="submit" className="w-full rounded-xl bg-primary-600 py-2.5 text-xs font-bold uppercase text-white hover:bg-primary-500">
                Lưu
              </button>
            </form>
          </div>
        </div>
      )}

      {deleting && (
        <ConfirmDeleteModal
          message={`Bạn có chắc muốn xóa tin tức "${deleting.title}"? Hành động này không thể hoàn tác.`}
          onCancel={() => setDeleting(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}

function ProductsSection({ products, onChange, showNotice }: { products: Product[]; onChange: () => void; showNotice: Notice }) {
  const [editing, setEditing] = useState<Product | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const body = {
      name: String(form.get('name') || ''),
      badge: String(form.get('badge') || ''),
      image: extractImageUrl(String(form.get('image') || '')),
      desc: String(form.get('desc') || ''),
      footerLabel: String(form.get('footerLabel') || ''),
      footerValue: String(form.get('footerValue') || ''),
    };
    try {
      if (editing === 'new') {
        await clientApi('admin/home-content/products', { method: 'POST', body });
        showNotice('success', `Đã thêm sản phẩm "${body.name}".`);
      } else if (editing) {
        await clientApi(`admin/home-content/products/${editing.id}`, { method: 'PATCH', body });
        showNotice('success', `Đã cập nhật sản phẩm "${body.name}".`);
      }
      setEditing(null);
      onChange();
    } catch (err) {
      showNotice('error', err instanceof ClientApiError ? err.message : 'Không thể lưu sản phẩm.');
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    await clientApi(`admin/home-content/products/${deleting.id}`, { method: 'DELETE' });
    setDeleting(null);
    onChange();
    showNotice('info', 'Đã xóa sản phẩm.');
  }

  return (
    <div className="space-y-3 text-left">
      <div className="flex items-center justify-between">
        <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">Sản phẩm nông sản tiêu biểu ({products.length})</span>
        <button onClick={() => setEditing('new')} className="rounded-lg bg-primary-600 px-3 py-1.5 text-[11px] font-bold uppercase text-white hover:bg-primary-500">
          <i className="fa-solid fa-plus mr-1" /> Thêm sản phẩm
        </button>
      </div>
      <div className="divide-y divide-stone-200 overflow-hidden rounded-xl border border-stone-200 bg-stone-50">
        {products.length === 0 && <p className="p-4 text-center text-xs text-stone-400">Chưa có sản phẩm nào.</p>}
        {products.map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-3 p-3 text-xs">
            <div className="min-w-0">
              <span className="block truncate font-bold text-stone-900">{p.name}</span>
              <span className="text-[10px] text-stone-400">{p.desc}</span>
            </div>
            <div className="flex shrink-0 gap-2">
              <button onClick={() => setEditing(p)} className="rounded border border-stone-200 bg-white px-2 py-1 text-[10px] text-stone-600 hover:bg-stone-100">
                Sửa
              </button>
              <button
                onClick={() => setDeleting(p)}
                className="rounded bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-600 hover:bg-red-600 hover:text-white"
              >
                Xóa
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-stone-950/80 p-4">
          <div className="w-full max-w-lg space-y-3 rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-bold uppercase tracking-wider text-stone-900">{editing === 'new' ? 'Thêm sản phẩm' : 'Sửa sản phẩm'}</h5>
              <button onClick={() => setEditing(null)} className="text-stone-400 hover:text-stone-900">
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <form onSubmit={submit} className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <TextInput name="name" label="Tên sản phẩm" defaultValue={editing !== 'new' ? editing.name : ''} />
                <TextInput name="badge" label="Nhãn (VD: Đặc sản)" defaultValue={editing !== 'new' ? editing.badge : ''} />
              </div>
              <TextInput name="image" label="URL ảnh" defaultValue={editing !== 'new' ? editing.image : ''} />
              <TextInput name="desc" label="Mô tả" defaultValue={editing !== 'new' ? editing.desc : ''} />
              <div className="grid grid-cols-2 gap-2">
                <TextInput name="footerLabel" label="Nhãn footer (VD: Giá)" defaultValue={editing !== 'new' ? editing.footerLabel : ''} />
                <TextInput name="footerValue" label="Giá trị footer" defaultValue={editing !== 'new' ? editing.footerValue : ''} />
              </div>
              <button type="submit" className="w-full rounded-xl bg-primary-600 py-2.5 text-xs font-bold uppercase text-white hover:bg-primary-500">
                Lưu
              </button>
            </form>
          </div>
        </div>
      )}

      {deleting && (
        <ConfirmDeleteModal
          message={`Bạn có chắc muốn xóa sản phẩm "${deleting.name}"? Hành động này không thể hoàn tác.`}
          onCancel={() => setDeleting(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}

function ScheduleSection({ schedule, onChange, showNotice }: { schedule: ScheduleItem[]; onChange: () => void; showNotice: Notice }) {
  const [editing, setEditing] = useState<ScheduleItem | 'new' | null>(null);
  const [deleting, setDeleting] = useState<ScheduleItem | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const body = {
      day: String(form.get('day') || ''),
      month: String(form.get('month') || ''),
      title: String(form.get('title') || ''),
      location: String(form.get('location') || ''),
      time: String(form.get('time') || ''),
    };
    try {
      if (editing === 'new') {
        await clientApi('admin/home-content/schedule', { method: 'POST', body });
        showNotice('success', `Đã thêm lịch sự kiện "${body.title}".`);
      } else if (editing) {
        await clientApi(`admin/home-content/schedule/${editing.id}`, { method: 'PATCH', body });
        showNotice('success', `Đã cập nhật lịch sự kiện "${body.title}".`);
      }
      setEditing(null);
      onChange();
    } catch (err) {
      showNotice('error', err instanceof ClientApiError ? err.message : 'Không thể lưu.');
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    await clientApi(`admin/home-content/schedule/${deleting.id}`, { method: 'DELETE' });
    setDeleting(null);
    onChange();
    showNotice('info', 'Đã xóa lịch sự kiện.');
  }

  return (
    <div className="space-y-3 text-left">
      <div className="flex items-center justify-between">
        <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">Lịch sự kiện ({schedule.length})</span>
        <button onClick={() => setEditing('new')} className="rounded-lg bg-primary-600 px-3 py-1.5 text-[11px] font-bold uppercase text-white hover:bg-primary-500">
          <i className="fa-solid fa-plus mr-1" /> Thêm lịch
        </button>
      </div>
      <div className="divide-y divide-stone-200 overflow-hidden rounded-xl border border-stone-200 bg-stone-50">
        {schedule.length === 0 && <p className="p-4 text-center text-xs text-stone-400">Chưa có lịch sự kiện nào.</p>}
        {schedule.map((s) => (
          <div key={s.id} className="flex items-center justify-between gap-3 p-3 text-xs">
            <div className="min-w-0">
              <span className="block truncate font-bold text-stone-900">
                {s.day}/{s.month} — {s.title}
              </span>
              <span className="text-[10px] text-stone-400">
                {s.location} · {s.time}
              </span>
            </div>
            <div className="flex shrink-0 gap-2">
              <button onClick={() => setEditing(s)} className="rounded border border-stone-200 bg-white px-2 py-1 text-[10px] text-stone-600 hover:bg-stone-100">
                Sửa
              </button>
              <button
                onClick={() => setDeleting(s)}
                className="rounded bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-600 hover:bg-red-600 hover:text-white"
              >
                Xóa
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-stone-950/80 p-4">
          <div className="w-full max-w-lg space-y-3 rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-bold uppercase tracking-wider text-stone-900">{editing === 'new' ? 'Thêm lịch sự kiện' : 'Sửa lịch sự kiện'}</h5>
              <button onClick={() => setEditing(null)} className="text-stone-400 hover:text-stone-900">
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <form onSubmit={submit} className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <TextInput name="day" label="Ngày (DD)" defaultValue={editing !== 'new' ? editing.day : ''} />
                <TextInput name="month" label="Tháng (Thg MM)" defaultValue={editing !== 'new' ? editing.month : ''} />
              </div>
              <TextInput name="title" label="Tên sự kiện" defaultValue={editing !== 'new' ? editing.title : ''} />
              <TextInput name="location" label="Địa điểm" defaultValue={editing !== 'new' ? editing.location : ''} />
              <TextInput name="time" label="Thời gian" defaultValue={editing !== 'new' ? editing.time : ''} />
              <button type="submit" className="w-full rounded-xl bg-primary-600 py-2.5 text-xs font-bold uppercase text-white hover:bg-primary-500">
                Lưu
              </button>
            </form>
          </div>
        </div>
      )}

      {deleting && (
        <ConfirmDeleteModal
          message={`Bạn có chắc muốn xóa lịch sự kiện "${deleting.title}"? Hành động này không thể hoàn tác.`}
          onCancel={() => setDeleting(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}

function StatsSection({
  stats,
  oldVillages,
  onChange,
  showNotice,
}: {
  stats: Stat[];
  oldVillages: string[];
  onChange: () => void;
  showNotice: Notice;
}) {
  const [editing, setEditing] = useState<Stat | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Stat | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const breakdown = oldVillages
      .map((village) => ({ label: `Thôn ${village}:`, value: String(form.get(`breakdown_${village}`) || '').trim() }))
      .filter((b) => b.value);
    const body = {
      icon: String(form.get('icon') || ''),
      label: String(form.get('label') || ''),
      value: String(form.get('value') || ''),
      unit: String(form.get('unit') || ''),
      breakdown,
    };
    try {
      if (editing === 'new') {
        await clientApi('admin/home-content/stats', { method: 'POST', body });
        showNotice('success', `Đã thêm chỉ số thống kê "${body.label}".`);
      } else if (editing) {
        await clientApi(`admin/home-content/stats/${editing.id}`, { method: 'PATCH', body });
        showNotice('success', `Đã cập nhật chỉ số thống kê "${body.label}".`);
      }
      setEditing(null);
      onChange();
    } catch (err) {
      showNotice('error', err instanceof ClientApiError ? err.message : 'Không thể lưu.');
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    await clientApi(`admin/home-content/stats/${deleting.id}`, { method: 'DELETE' });
    setDeleting(null);
    onChange();
    showNotice('info', 'Đã xóa chỉ số thống kê.');
  }

  return (
    <div className="space-y-3 text-left">
      <div className="flex items-center justify-between">
        <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">Chỉ số thống kê trang chủ ({stats.length})</span>
        <button onClick={() => setEditing('new')} className="rounded-lg bg-primary-600 px-3 py-1.5 text-[11px] font-bold uppercase text-white hover:bg-primary-500">
          <i className="fa-solid fa-plus mr-1" /> Thêm chỉ số
        </button>
      </div>
      <div className="divide-y divide-stone-200 overflow-hidden rounded-xl border border-stone-200 bg-stone-50">
        {stats.length === 0 && <p className="p-4 text-center text-xs text-stone-400">Chưa có chỉ số nào.</p>}
        {stats.map((s) => (
          <div key={s.id} className="flex items-center justify-between gap-3 p-3 text-xs">
            <div className="min-w-0">
              <span className="block truncate font-bold text-stone-900">{s.label}</span>
              <span className="text-[10px] text-stone-400">
                {s.value} {s.unit}
              </span>
            </div>
            <div className="flex shrink-0 gap-2">
              <button onClick={() => setEditing(s)} className="rounded border border-stone-200 bg-white px-2 py-1 text-[10px] text-stone-600 hover:bg-stone-100">
                Sửa
              </button>
              <button
                onClick={() => setDeleting(s)}
                className="rounded bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-600 hover:bg-red-600 hover:text-white"
              >
                Xóa
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-stone-950/80 p-4">
          <div className="w-full max-w-md space-y-3 rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-bold uppercase tracking-wider text-stone-900">{editing === 'new' ? 'Thêm chỉ số' : 'Sửa chỉ số'}</h5>
              <button onClick={() => setEditing(null)} className="text-stone-400 hover:text-stone-900">
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <form onSubmit={submit} className="space-y-2">
              <TextInput name="icon" label="Icon (Font Awesome class)" defaultValue={editing !== 'new' ? editing.icon : ''} />
              <TextInput name="label" label="Nhãn" defaultValue={editing !== 'new' ? editing.label : ''} />
              <div className="grid grid-cols-2 gap-2">
                <TextInput name="value" label="Giá trị" defaultValue={editing !== 'new' ? editing.value : ''} />
                <TextInput name="unit" label="Đơn vị" defaultValue={editing !== 'new' ? editing.unit : ''} />
              </div>
              {oldVillages.length > 0 && (
                <div className="space-y-2 border-t border-stone-100 pt-2">
                  <span className="block text-[9px] font-bold uppercase text-stone-400">Chi tiết theo thôn cũ (để trống nếu không áp dụng)</span>
                  {oldVillages.map((village) => {
                    const existing =
                      editing !== 'new' ? editing.breakdown?.find((b) => b.label === `Thôn ${village}:`)?.value : '';
                    return <TextInput key={village} name={`breakdown_${village}`} label={`Thôn ${village}`} defaultValue={existing} />;
                  })}
                </div>
              )}
              <button type="submit" className="w-full rounded-xl bg-primary-600 py-2.5 text-xs font-bold uppercase text-white hover:bg-primary-500">
                Lưu
              </button>
            </form>
          </div>
        </div>
      )}

      {deleting && (
        <ConfirmDeleteModal
          message={`Bạn có chắc muốn xóa chỉ số "${deleting.label}"? Hành động này không thể hoàn tác.`}
          onCancel={() => setDeleting(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}

function GallerySection({ gallery, onChange, showNotice }: { gallery: GalleryItem[]; onChange: () => void; showNotice: Notice }) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<GalleryItem | null>(null);
  const [deleting, setDeleting] = useState<GalleryItem | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const body = { image: extractImageUrl(String(form.get('image') || '')), caption: String(form.get('caption') || '') };
    try {
      await clientApi('admin/home-content/gallery', { method: 'POST', body });
      setAdding(false);
      onChange();
      showNotice('success', 'Đã thêm ảnh vào thư viện.');
    } catch (err) {
      showNotice('error', err instanceof ClientApiError ? err.message : 'Không thể thêm ảnh.');
    }
  }

  async function submitEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    const form = new FormData(e.currentTarget);
    const body = { image: extractImageUrl(String(form.get('image') || '')), caption: String(form.get('caption') || '') };
    try {
      await clientApi(`admin/home-content/gallery/${editing.id}`, { method: 'PATCH', body });
      setEditing(null);
      onChange();
      showNotice('success', 'Đã cập nhật ảnh.');
    } catch (err) {
      showNotice('error', err instanceof ClientApiError ? err.message : 'Không thể cập nhật.');
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    await clientApi(`admin/home-content/gallery/${deleting.id}`, { method: 'DELETE' });
    setDeleting(null);
    onChange();
    showNotice('info', 'Đã xóa ảnh.');
  }

  return (
    <div className="space-y-3 text-left">
      <div className="flex items-center justify-between">
        <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">Thư viện ảnh ({gallery.length})</span>
        <button onClick={() => setAdding(true)} className="rounded-lg bg-primary-600 px-3 py-1.5 text-[11px] font-bold uppercase text-white hover:bg-primary-500">
          <i className="fa-solid fa-plus mr-1" /> Thêm ảnh
        </button>
      </div>
      {adding && (
        <form onSubmit={submit} className="grid grid-cols-1 gap-2 rounded-xl border border-stone-200 bg-stone-50 p-4 sm:grid-cols-3">
          <TextInput name="image" label="URL ảnh" className="sm:col-span-2" />
          <TextInput name="caption" label="Chú thích" />
          <div className="flex gap-2 sm:col-span-3">
            <button type="submit" className="rounded-lg bg-primary-600 px-4 py-2 text-xs font-bold uppercase text-white hover:bg-primary-500">
              Lưu
            </button>
            <button type="button" onClick={() => setAdding(false)} className="rounded-lg border border-stone-200 bg-white px-4 py-2 text-xs text-stone-600 hover:bg-stone-100">
              Hủy
            </button>
          </div>
        </form>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {gallery.length === 0 && <p className="col-span-full p-4 text-center text-xs text-stone-400">Chưa có ảnh nào.</p>}
        {gallery.map((g) => (
          <div key={g.id} className="space-y-1.5 rounded-xl border border-stone-200 bg-stone-50 p-2">
            <img src={g.image} alt={g.caption} className="h-24 w-full rounded-lg object-cover" />
            <span className="block truncate text-[10px] text-stone-500">{g.caption}</span>
            <div className="flex gap-1.5">
              <button
                onClick={() => setEditing(g)}
                className="w-full rounded border border-stone-200 bg-white px-2 py-1 text-[10px] text-stone-600 hover:bg-stone-100"
              >
                Sửa
              </button>
              <button
                onClick={() => setDeleting(g)}
                className="w-full rounded bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-600 hover:bg-red-600 hover:text-white"
              >
                Xóa
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-stone-950/80 p-4">
          <div className="w-full max-w-md space-y-3 rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-bold uppercase tracking-wider text-stone-900">Sửa ảnh</h5>
              <button onClick={() => setEditing(null)} className="text-stone-400 hover:text-stone-900">
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <form onSubmit={submitEdit} className="space-y-2">
              <TextInput name="image" label="URL ảnh" defaultValue={editing.image} />
              <TextInput name="caption" label="Chú thích" defaultValue={editing.caption} />
              <button type="submit" className="w-full rounded-xl bg-primary-600 py-2.5 text-xs font-bold uppercase text-white hover:bg-primary-500">
                Lưu
              </button>
            </form>
          </div>
        </div>
      )}

      {deleting && (
        <ConfirmDeleteModal
          message="Bạn có chắc muốn xóa ảnh này khỏi thư viện? Hành động này không thể hoàn tác."
          onCancel={() => setDeleting(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}
