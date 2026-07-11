'use client';

import { useEffect, useRef } from 'react';
import type { Map as LeafletMap, Polygon } from 'leaflet';
import type { PublicCommuneVillage } from '@/lib/types';

// Bản đồ công khai ở domain gốc — theo đúng phong cách tra-cuu.html gốc:
// MỖI thôn 1 màu riêng (kể cả thôn chưa có cổng thông tin), lấy đúng bảng
// 12 màu mà bản mẫu dùng (rút ra từ REGIONS[].color trong tra-cuu.html —
// gán tuần tự theo thứ tự thôn, lặp lại sau mỗi 12 thôn) thay vì băm màu
// ngẫu nhiên, để đúng "tông" màu như bản gốc.
const VILLAGE_PALETTE = [
  '#7c3aed', '#0891b2', '#16a34a', '#ea580c', '#dc2626', '#2563eb',
  '#c026d3', '#65a30d', '#0d9488', '#9333ea', '#f59e0b', '#e11d48',
];

function colorForVillage(index: number): string {
  return VILLAGE_PALETTE[index % VILLAGE_PALETTE.length];
}

// Marker vị trí hộ gia đình đã định vị GPS — cùng thiết kế với housePinIcon()
// trong dashboard cư dân (family-gps-map.tsx), thu nhỏ hơn cho phù hợp khi
// hiện nhiều điểm cùng lúc trên bản đồ tổng (đúng hành vi tra-cuu.html gốc).
function householdPinIcon(L: typeof import('leaflet')) {
  const color = '#9c3000';
  const html =
    `<svg width="20" height="26" viewBox="0 0 30 38" xmlns="http://www.w3.org/2000/svg">` +
    `<path d="M15 0C6.716 0 0 6.716 0 15c0 10.5 15 23 15 23s15-12.5 15-23C30 6.716 23.284 0 15 0z" fill="${color}"></path>` +
    `<circle cx="15" cy="14.5" r="10" fill="#fff"></circle>` +
    `<g transform="translate(7.5,7) scale(0.625)" fill="none" stroke="${color}" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">` +
    `<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline>` +
    `</g></svg>`;
  return L.divIcon({ className: 'household-pin', html, iconSize: [20, 26], iconAnchor: [10, 26], popupAnchor: [0, -22] });
}

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

      // Cho phép chọn loại bản đồ (đường phố / vệ tinh / địa hình) — dùng
      // các tile server công khai, không cần API key.
      const streets = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      });
      const satellite = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 19, attribution: 'Tiles &copy; Esri' },
      );
      const terrain = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        maxZoom: 17,
        attribution: '&copy; OpenStreetMap contributors, SRTM | &copy; OpenTopoMap',
      });

      streets.addTo(map);
      L.control
        .layers(
          { 'Bản đồ': streets, 'Vệ tinh': satellite, 'Địa hình': terrain },
          undefined,
          { position: 'topright' },
        )
        .addTo(map);

      const allBounds: [number, number][] = [];
      villages.forEach((village, index) => {
        const latlngs = village.boundary.coordinates[0].map(([lng, lat]) => {
          allBounds.push([lat, lng]);
          return [lat, lng] as [number, number];
        });
        const color = colorForVillage(index);
        const poly = L.polygon(latlngs, {
          color,
          weight: village.tenantSlug ? 2.2 : 1.6,
          opacity: 0.95,
          fillColor: color,
          fillOpacity: village.tenantSlug ? 0.6 : 0.5,
        }).addTo(map);

        poly.bindTooltip(village.name, { permanent: true, direction: 'center', className: 'directory-area-label' });
        if (village.tenantSlug) poly.on('click', () => onSelect(village.name));
        polysRef.current.set(village.name, poly);

        village.households.forEach((h) => {
          L.marker([h.lat, h.lng], { icon: householdPinIcon(L) })
            .addTo(map)
            .bindTooltip(h.name, { direction: 'top', offset: [0, -22] });
        });
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
        const index = villages.findIndex((v) => v.name === name);
        const village = villages[index];
        const isSelected = name === selectedName;
        const color = colorForVillage(index);
        // Thôn được chọn: giữ nguyên màu nền của chính nó, chỉ đổi VIỀN
        // thành nét đứt chạy hiệu ứng (CSS .directory-village-selected
        // trong globals.css) — đúng hành vi .area-border-selected của
        // tra-cuu.html, không phải đổi hẳn sang 1 màu highlight khác.
        poly.setStyle({
          color,
          weight: isSelected ? 3 : village?.tenantSlug ? 2.2 : 1.6,
          fillColor: color,
          fillOpacity: village?.tenantSlug ? 0.6 : 0.5,
        });
        // Leaflet chỉ áp dụng option `className` lúc TẠO layer (_initPath),
        // gọi lại qua setStyle() sau đó không có tác dụng — phải tự thêm/bỏ
        // class thẳng trên phần tử SVG <path> qua getElement().
        const el = poly.getElement();
        el?.classList.toggle('directory-village-selected', isSelected);
        if (isSelected && mapRef.current) {
          mapRef.current.flyToBounds((poly as InstanceType<typeof L.Polygon>).getBounds(), { padding: [40, 40], duration: 0.6 });
        }
      });
    })();
  }, [selectedName, villages]);

  return <div ref={containerRef} className="directory-map h-[420px] w-full min-h-[420px] bg-[#eef2f7] sm:h-[560px]" />;
}
