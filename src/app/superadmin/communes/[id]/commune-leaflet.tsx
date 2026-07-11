'use client';

import { useEffect, useRef } from 'react';
import type { Map as LeafletMap } from 'leaflet';
import type { CommuneVillage } from '@/lib/types';

// Bản đồ Leaflet hiện toàn bộ thôn của 1 xã (từ KMZ) — thôn đã có tenant tô
// xanh (chỉ xem), thôn chưa có tô cam (bấm vào để tạo tenant). Tương tự
// FamilyGpsMap (dashboard cư dân) nhưng nhiều polygon + có tương tác click.
export function CommuneLeaflet({
  villages,
  onVillageClick,
}: {
  villages: CommuneVillage[];
  onVillageClick: (index: number) => void;
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

      const firstVillage = villages[0];
      const map = L.map(containerRef.current).setView(
        firstVillage ? [firstVillage.lat, firstVillage.lng] : [16.0, 108.0],
        13,
      );
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      const allBounds: [number, number][] = [];
      villages.forEach((village, index) => {
        const latlngs = village.boundary.coordinates[0].map(([lng, lat]) => {
          allBounds.push([lat, lng]);
          return [lat, lng] as [number, number];
        });
        const color = village.claimed ? '#16a34a' : '#f59e0b';
        const poly = L.polygon(latlngs, {
          color,
          weight: 2,
          fillColor: color,
          fillOpacity: village.claimed ? 0.25 : 0.35,
        }).addTo(map);

        poly.bindTooltip(village.name, { sticky: true });

        if (village.claimed) {
          poly.bindPopup(`<b>${village.name}</b><br/>Đã tạo tenant.`);
        } else {
          poly.on('click', () => onVillageClick(index));
          poly.bindPopup(`<b>${village.name}</b><br/>Chưa có tenant — bấm vào polygon để tạo.`);
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
  }, [villages]);

  return <div ref={containerRef} className="h-[70vh] w-full overflow-hidden rounded-2xl border border-stone-800" />;
}
