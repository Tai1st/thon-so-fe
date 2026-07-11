'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { CommuneDetail } from '@/lib/types';

const CommuneLeaflet = dynamic(() => import('./commune-leaflet').then((m) => m.CommuneLeaflet), { ssr: false });

export function CommuneMapClient({ initialCommune }: { initialCommune: CommuneDetail }) {
  const router = useRouter();
  const [commune] = useState(initialCommune);

  async function handleLogout() {
    await fetch('/api/superadmin/auth/logout', { method: 'POST' });
    router.push('/superadmin/login');
    router.refresh();
  }

  const claimedCount = commune.villages.filter((v) => v.claimed).length;

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <div className="flex items-center justify-between border-b border-stone-800 bg-stone-900 p-6">
        <div>
          <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-emerald-500">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> Bản đồ Xã
          </p>
          <h1 className="font-serif text-lg font-bold uppercase tracking-wide text-white">{commune.name}</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/superadmin/communes" className="rounded-xl border border-stone-700 px-3.5 py-1.5 text-xs font-semibold text-stone-300 hover:border-stone-500">
            <i className="fa-solid fa-arrow-left mr-1" /> Danh sách Xã
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-xl bg-red-950/50 px-3.5 py-1.5 text-xs font-bold text-red-400 transition-all hover:bg-red-600 hover:text-white"
          >
            <i className="fa-solid fa-right-from-bracket" /> Đăng xuất
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-4 p-6">
        <div className="flex items-center gap-4 text-xs text-stone-400">
          <span>
            <span className="font-bold text-white">{commune.villages.length}</span> thôn
          </span>
          <span>
            <span className="font-bold text-emerald-400">{claimedCount}</span> đã tạo tenant
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-600" /> Đã có tenant
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" /> Chưa có — bấm để sửa &amp; tạo tenant
          </span>
        </div>

        <CommuneLeaflet
          villages={commune.villages}
          onVillageClick={(index) => router.push(`/superadmin/communes/${commune._id}/villages/${index}`)}
        />
      </div>
    </div>
  );
}
