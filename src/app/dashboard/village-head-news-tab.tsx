'use client';

import { useState } from 'react';
import { clientApi } from '@/lib/client-api';
import type { HomeContent, NewsItem } from '@/lib/types';
import { NewsSection } from './news-section';

export function VillageHeadNewsTab({ news }: { news: NewsItem[] }) {
  const [newsState, setNewsState] = useState(news);
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  function showNotice(type: 'success' | 'error' | 'info', text: string) {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 4000);
  }

  async function refresh() {
    const res = await clientApi<HomeContent>('home-content');
    setNewsState(res.news);
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
        <h4 className="font-serif text-lg font-bold text-stone-900">Tin tức &amp; Thông báo</h4>
        <p className="text-xs text-stone-500">Đăng tin tức/thông báo hiển thị công khai ở mục &quot;Bảng Tin &amp; Thông Báo&quot; trên trang chủ.</p>
      </div>
      <NewsSection news={newsState} onChange={refresh} showNotice={showNotice} />
    </>
  );
}
