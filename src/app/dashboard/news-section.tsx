'use client';

import { useState } from 'react';
import { clientApi, ClientApiError } from '@/lib/client-api';
import type { NewsItem } from '@/lib/types';
import { ConfirmDeleteModal } from './confirm-delete-modal';

const NEWS_CATEGORIES = [
  { slug: 'hanh-chinh', label: 'Hành chính' },
  { slug: 'san-xuat', label: 'Sản xuất' },
  { slug: 'doan-the', label: 'Đoàn thể' },
];

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

export function NewsSection({ news, onChange, showNotice }: { news: NewsItem[]; onChange: () => void; showNotice: Notice }) {
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
