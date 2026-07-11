'use client';

import { useEffect, useRef } from 'react';
import type { Map as LeafletMap } from 'leaflet';
import type { PublicCommuneVillage } from '@/lib/types';

// Bản đồ công khai (không cần đăng nhập) ở domain gốc — hiện toàn bộ thôn
// của xã, thôn đã có cổng thông tin (tenant) thì tô xanh + bấm vào chuyển
// sang đúng subdomain, thôn chưa có thì tô xám, không bấm được.
export function DirectoryLeaflet({
  villages,
  highlightName,
  onNavigate,
}: {
  villages: PublicCommuneVillage[];
  highlightName: string | null;
  onNavigate: (slug: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const L = await import('leaflet');
      if (cancelled || !containerRef.current) return;

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      const first = villages[0];
      const map = L.map(containerRef.current).setView(first ? [first.lat, first.lng] : [16.0, 108.0], 13);
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      const allBounds: [number, number][] = [];
      villages.forEach((village) => {
        const latlngs = village.boundary.coordinates[0].map(([lng, lat]) => {
          allBounds.push([lat, lng]);
          return [lat, lng] as [number, number];
        });
        const isHighlighted = highlightName === village.name;
        const color = village.tenantSlug ? (isHighlighted ? '#e11d48' : '#16a34a') : '#94a3b8';
        const poly = L.polygon(latlngs, {
          color,
          weight: isHighlighted ? 3 : 2,
          fillColor: color,
          fillOpacity: village.tenantSlug ? (isHighlighted ? 0.45 : 0.25) : 0.12,
        }).addTo(map);

        if (village.tenantSlug) {
          poly.bindTooltip(village.tenantName || village.name, { sticky: true });
          poly.on('click', () => onNavigate(village.tenantSlug as string));
        } else {
          poly.bindTooltip(`${village.name} (chưa có cổng thông tin)`, { sticky: true });
        }
      });

      if (allBounds.length) {
        map.fitBounds(allBounds, { padding: [20, 20] });
      }
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [villages, highlightName]);

  return <div ref={containerRef} className="h-[60vh] w-full overflow-hidden rounded-2xl border border-stone-200 sm:h-[70vh]" />;
}
