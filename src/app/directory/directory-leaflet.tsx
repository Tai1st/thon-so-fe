'use client';

import { useEffect, useRef } from 'react';
import type { Map as LeafletMap, Polygon } from 'leaflet';
import { ADMINISTRATIVE_UNIT_CATEGORIES } from '@/lib/types';
import type { AdministrativeUnitItem, PublicCommuneVillage } from '@/lib/types';

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  ADMINISTRATIVE_UNIT_CATEGORIES.map((c) => [c.slug, c.label]),
);

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

// Marker trụ sở cơ quan nhà nước cấp xã — pin màu xanh dương với đúng
// ảnh/logo riêng của từng cơ quan (Đảng ủy, UBND, MTTQ, Công an...) gắn
// tròn bên trong, giống .pin-marker-logo trong tra-cuu.html gốc. Nếu đơn
// vị không có logoUrl thì lùi về icon tòa nhà chung.
function administrativeUnitIcon(L: typeof import('leaflet'), logoUrl: string | null) {
  const color = '#1d4ed8';
  const badge = logoUrl
    ? `<defs><clipPath id="logoClip"><circle cx="15" cy="14.5" r="9.5"></circle></clipPath></defs>` +
      `<image href="${logoUrl}" x="5.5" y="5" width="19" height="19" preserveAspectRatio="xMidYMid slice" clip-path="url(#logoClip)"></image>`
    : `<g transform="translate(7,7) scale(0.67)" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">` +
      `<path d="M3 21h18"></path><path d="M5 21V9l7-5 7 5v12"></path><path d="M9 21v-6h6v6"></path>` +
      `</g>`;
  const html =
    `<svg width="24" height="30" viewBox="0 0 30 38" xmlns="http://www.w3.org/2000/svg">` +
    `<path d="M15 0C6.716 0 0 6.716 0 15c0 10.5 15 23 15 23s15-12.5 15-23C30 6.716 23.284 0 15 0z" fill="${color}"></path>` +
    `<circle cx="15" cy="14.5" r="10" fill="#fff"></circle>` +
    badge +
    `</svg>`;
  return L.divIcon({ className: 'admin-unit-pin', html, iconSize: [24, 30], iconAnchor: [12, 30], popupAnchor: [0, -26] });
}

export function DirectoryLeaflet({
  villages,
  administrativeUnits,
  selectedName,
  onSelect,
  showHouseholds,
  showAdminUnits,
}: {
  villages: PublicCommuneVillage[];
  administrativeUnits: AdministrativeUnitItem[];
  selectedName: string | null;
  onSelect: (name: string) => void;
  showHouseholds: boolean;
  showAdminUnits: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const polysRef = useRef<Map<string, Polygon>>(new Map());
  const householdsLayerRef = useRef<import('leaflet').LayerGroup | null>(null);
  const adminUnitsLayerRef = useRef<import('leaflet').LayerGroup | null>(null);

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

      // Nhóm layer bật/tắt riêng — "Cư dân" (marker GPS hộ gia đình) và
      // "Cơ quan nhà nước" (trụ sở xã), điều khiển qua nút bấm ở
      // CommuneSection (showHouseholds/showAdminUnits) thay vì chỉ qua ô
      // checkbox ẩn trong control góc bản đồ, để dễ thấy/dễ bấm hơn.
      const householdsLayer = L.layerGroup();
      const adminUnitsLayer = L.layerGroup();
      householdsLayerRef.current = householdsLayer;
      adminUnitsLayerRef.current = adminUnitsLayer;

      administrativeUnits.forEach((unit) => {
        L.marker([unit.lat, unit.lng], { icon: administrativeUnitIcon(L, unit.logoUrl) })
          .addTo(adminUnitsLayer)
          .bindPopup(
            `<b>${unit.name}</b>` +
              `<br/><span style="color:#64748b">${CATEGORY_LABEL[unit.category] || 'Khác'}</span>` +
              (unit.mapsUrl
                ? `<br/><a href="${unit.mapsUrl}" target="_blank" rel="noopener noreferrer">Xem trên Google Maps</a>`
                : ''),
          );
      });

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
            .addTo(householdsLayer)
            .bindTooltip(h.name, { direction: 'top', offset: [0, -22] });
        });
      });

      if (showHouseholds) householdsLayer.addTo(map);
      if (showAdminUnits) adminUnitsLayer.addTo(map);

      L.control
        .layers({ 'Bản đồ': streets, 'Vệ tinh': satellite, 'Địa hình': terrain }, undefined, { position: 'topright' })
        .addTo(map);

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
  }, [villages, administrativeUnits]);

  // Bật/tắt 2 lớp mà không phải build lại toàn bộ bản đồ (giữ nguyên vị
  // trí/zoom hiện tại của người xem).
  useEffect(() => {
    const map = mapRef.current;
    const layer = householdsLayerRef.current;
    if (!map || !layer) return;
    if (showHouseholds) map.addLayer(layer);
    else map.removeLayer(layer);
  }, [showHouseholds]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = adminUnitsLayerRef.current;
    if (!map || !layer) return;
    if (showAdminUnits) map.addLayer(layer);
    else map.removeLayer(layer);
  }, [showAdminUnits]);

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
