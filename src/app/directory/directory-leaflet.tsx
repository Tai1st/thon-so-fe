'use client';

import { useEffect, useRef } from 'react';
import type { Map as LeafletMap, Polygon } from 'leaflet';
import type { PublicCommuneVillage } from '@/lib/types';

// Bản đồ công khai ở domain gốc — dựng theo đúng phong cách tra-cuu.html
// gốc: mỗi thôn 1 polygon màu riêng (ở đây phân biệt bằng trạng thái thay
// vì màu ngẫu nhiên như bản mẫu, vì trọng tâm là "đã có cổng thông tin hay
// chưa"), thôn đang chọn có viền nét đứt màu đỏ hồng nổi bật + tự bay tới.
const AVAILABLE_COLOR = '#16a34a';
const UNAVAILABLE_COLOR = '#94a3b8';
const SELECTED_COLOR = '#e11d48';

export function DirectoryLeaflet({
  villages,
  selectedName,
  onSelect,
}: {
  villages: PublicCommuneVillage[];
  selectedName: string | null;
  onSelect: (name: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const polysRef = useRef<Map<string, Polygon>>(new Map());

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const L = await import('leaflet');
      if (cancelled || !containerRef.current) return;

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      polysRef.current.clear();

      const first = villages[0];
      const map = L.map(containerRef.current, { scrollWheelZoom: true }).setView(
        first ? [first.lat, first.lng] : [16.0, 108.0],
        13,
      );
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
        const baseColor = village.tenantSlug ? AVAILABLE_COLOR : UNAVAILABLE_COLOR;
        const poly = L.polygon(latlngs, {
          color: baseColor,
          weight: 1.8,
          opacity: 0.95,
          fillColor: baseColor,
          fillOpacity: village.tenantSlug ? 0.34 : 0.14,
        }).addTo(map);

        poly.bindTooltip(village.name, { permanent: true, direction: 'center', className: 'directory-area-label' });
        if (village.tenantSlug) poly.on('click', () => onSelect(village.name));
        polysRef.current.set(village.name, poly);
      });

      if (allBounds.length) {
        map.fitBounds(allBounds, { padding: [12, 12] });
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

  // Cập nhật viền polygon đang chọn mà không phải build lại toàn bộ bản đồ.
  useEffect(() => {
    (async () => {
      const L = await import('leaflet');
      polysRef.current.forEach((poly, name) => {
        const village = villages.find((v) => v.name === name);
        const isSelected = name === selectedName;
        const baseColor = village?.tenantSlug ? AVAILABLE_COLOR : UNAVAILABLE_COLOR;
        poly.setStyle({
          color: isSelected ? SELECTED_COLOR : baseColor,
          weight: isSelected ? 3 : 1.8,
          fillColor: isSelected ? SELECTED_COLOR : baseColor,
          fillOpacity: isSelected ? 0.45 : village?.tenantSlug ? 0.34 : 0.14,
        });
        if (isSelected && mapRef.current) {
          mapRef.current.flyToBounds((poly as InstanceType<typeof L.Polygon>).getBounds(), { padding: [40, 40], duration: 0.6 });
        }
      });
    })();
  }, [selectedName, villages]);

  return <div ref={containerRef} className="directory-map h-[420px] w-full min-h-[420px] bg-[#eef2f7] sm:h-[560px]" />;
}
