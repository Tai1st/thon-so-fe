'use client';

import { useEffect, useRef } from 'react';
import type { Map as LeafletMap, Polygon } from 'leaflet';
import { ADMINISTRATIVE_UNIT_CATEGORIES } from '@/lib/types';
import type { AdministrativeUnitCategory, AdministrativeUnitItem, PublicCommuneVillage } from '@/lib/types';

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  ADMINISTRATIVE_UNIT_CATEGORIES.map((c) => [c.slug, c.label]),
);
const CATEGORY_COLOR: Record<string, string> = Object.fromEntries(
  ADMINISTRATIVE_UNIT_CATEGORIES.map((c) => [c.slug, c.color]),
);
const CATEGORY_ICON: Record<string, string> = Object.fromEntries(
  ADMINISTRATIVE_UNIT_CATEGORIES.map((c) => [c.slug, c.icon]),
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

// Marker địa danh (trụ sở cơ quan, trường học, y tế, quán ăn...) — chấm
// tròn màu riêng theo TỪNG LOẠI (CATEGORY_COLOR) với icon/ảnh logo trắng
// bên trong, viền trắng nổi trên nền polygon. Không có logoUrl thì hiện
// icon Font Awesome đúng category (ADMINISTRATIVE_UNIT_CATEGORIES).
function placeIcon(L: typeof import('leaflet'), category: AdministrativeUnitCategory, icon: string, logoUrl: string | null) {
  const color = CATEGORY_COLOR[category] || '#1d4ed8';
  const inner = logoUrl
    ? `<img src="${logoUrl}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:9999px" />`
    : `<i class="fa-solid ${icon}" style="color:#fff;font-size:12px"></i>`;
  const html =
    `<div style="width:26px;height:26px;border-radius:9999px;background:${color};border:2px solid #fff;` +
    `box-shadow:0 1px 4px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;overflow:hidden">` +
    inner +
    `</div>`;
  return L.divIcon({ className: 'place-dot-marker', html, iconSize: [26, 26], iconAnchor: [13, 13], popupAnchor: [0, -13] });
}

export function DirectoryLeaflet({
  villages,
  administrativeUnits,
  selectedName,
  onSelect,
  showHouseholds,
  showBoundaries,
  hiddenCategories,
}: {
  villages: PublicCommuneVillage[];
  administrativeUnits: AdministrativeUnitItem[];
  selectedName: string | null;
  onSelect: (name: string) => void;
  showHouseholds: boolean;
  showBoundaries: boolean;
  hiddenCategories: Set<AdministrativeUnitCategory>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const polysRef = useRef<Map<string, Polygon>>(new Map());
  const householdsLayerRef = useRef<import('leaflet').LayerGroup | null>(null);
  const categoryLayersRef = useRef<Map<string, import('leaflet').LayerGroup>>(new Map());

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
      categoryLayersRef.current.clear();

      const first = villages[0];
      const map = L.map(containerRef.current, { scrollWheelZoom: true }).setView(
        first ? [first.lat, first.lng] : [16.0, 108.0],
        13,
      );
      mapRef.current = map;

      // 2 tile layer (đường phố / vệ tinh) — đổi qua thumbnail "Ảnh vệ
      // tinh" góc trái dưới thay vì dropdown layer switcher.
      const streets = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      });
      const satellite = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 19, attribution: 'Tiles &copy; Esri' },
      );
      streets.addTo(map);

      // "Cư dân" (marker GPS hộ gia đình) là 1 layer riêng; địa danh chia
      // thành 1 layer group RIÊNG CHO TỪNG category để lọc theo pill (Tất
      // cả/UBND/Trường học/...) mà không phải build lại bản đồ mỗi lần đổi.
      const householdsLayer = L.layerGroup();
      householdsLayerRef.current = householdsLayer;

      administrativeUnits.forEach((unit) => {
        let layer = categoryLayersRef.current.get(unit.category);
        if (!layer) {
          layer = L.layerGroup();
          categoryLayersRef.current.set(unit.category, layer);
        }
        L.marker([unit.lat, unit.lng], { icon: placeIcon(L, unit.category, CATEGORY_ICON[unit.category] || 'fa-map-pin', unit.logoUrl) })
          .addTo(layer)
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
        if (!showBoundaries) poly.closeTooltip();
        if (village.tenantSlug) poly.on('click', () => onSelect(village.name));
        polysRef.current.set(village.name, poly);

        village.households.forEach((h) => {
          L.marker([h.lat, h.lng], { icon: householdPinIcon(L) })
            .addTo(householdsLayer)
            .bindTooltip(h.name, { direction: 'top', offset: [0, -22] });
        });
      });

      if (showHouseholds) householdsLayer.addTo(map);
      categoryLayersRef.current.forEach((layer, category) => {
        if (!hiddenCategories.has(category as AdministrativeUnitCategory)) layer.addTo(map);
      });

      // Cụm nút icon góc trái trên (dưới zoom mặc định của Leaflet): định vị
      // vị trí của tôi (Geolocation API thật) + cuộn tới khung "Danh sách"
      // bên panel phải. Không thêm nút vẽ/đo vì chưa có tính năng thật đứng
      // sau nó — tránh nút bấm vào không làm gì.
      const ToolsControl = L.Control.extend({
        onAdd() {
          const wrap = L.DomUtil.create('div', 'leaflet-bar directory-tools');
          L.DomEvent.disableClickPropagation(wrap);

          const locateBtn = L.DomUtil.create('button', 'directory-tool-btn', wrap);
          locateBtn.type = 'button';
          locateBtn.title = 'Vị trí của tôi';
          locateBtn.innerHTML = '<i class="fa-solid fa-location-crosshairs"></i>';
          L.DomEvent.on(locateBtn, 'click', () => {
            if (!navigator.geolocation) return;
            navigator.geolocation.getCurrentPosition((pos) => {
              const { latitude, longitude } = pos.coords;
              map.flyTo([latitude, longitude], 16);
              L.circleMarker([latitude, longitude], { radius: 8, color: '#2563eb', fillColor: '#60a5fa', fillOpacity: 0.9 }).addTo(map);
            });
          });

          const listBtn = L.DomUtil.create('button', 'directory-tool-btn', wrap);
          listBtn.type = 'button';
          listBtn.title = 'Xem danh sách thôn, buôn';
          listBtn.innerHTML = '<i class="fa-solid fa-list"></i>';
          L.DomEvent.on(listBtn, 'click', () => {
            document.getElementById('directory-village-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          });

          return wrap;
        },
      });
      new ToolsControl({ position: 'topleft' }).addTo(map);

      // Thumbnail "Ảnh vệ tinh" góc trái dưới — bấm để đổi tile layer,
      // giống bản mẫu (thay cho dropdown layer switcher).
      let satelliteOn = false;
      const SatelliteToggle = L.Control.extend({
        onAdd() {
          const btn = L.DomUtil.create('button', 'directory-satellite-toggle');
          btn.type = 'button';
          btn.innerHTML = '<i class="fa-solid fa-satellite"></i><span>Ảnh vệ tinh</span>';
          L.DomEvent.disableClickPropagation(btn);
          L.DomEvent.on(btn, 'click', () => {
            satelliteOn = !satelliteOn;
            if (satelliteOn) {
              map.removeLayer(streets);
              satellite.addTo(map);
            } else {
              map.removeLayer(satellite);
              streets.addTo(map);
            }
            btn.classList.toggle('active', satelliteOn);
          });
          return btn;
        },
      });
      new SatelliteToggle({ position: 'bottomleft' }).addTo(map);

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

  // Bật/tắt lớp cư dân mà không phải build lại toàn bộ bản đồ (giữ nguyên
  // vị trí/zoom hiện tại của người xem).
  useEffect(() => {
    const map = mapRef.current;
    const layer = householdsLayerRef.current;
    if (!map || !layer) return;
    if (showHouseholds) map.addLayer(layer);
    else map.removeLayer(layer);
  }, [showHouseholds]);

  // Lọc địa danh theo category bị ẩn — mỗi category là 1 layer riêng, chỉ
  // add/remove đúng layer cần thiết thay vì build lại toàn bộ marker.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    categoryLayersRef.current.forEach((layer, category) => {
      const shouldShow = !hiddenCategories.has(category as AdministrativeUnitCategory);
      if (shouldShow) map.addLayer(layer);
      else map.removeLayer(layer);
    });
  }, [hiddenCategories]);

  // Bật/tắt nhãn tên thôn/buôn cố định trên bản đồ (không ẩn polygon —
  // ranh giới vẫn cần để click chọn/xem chi tiết).
  useEffect(() => {
    polysRef.current.forEach((poly) => {
      if (showBoundaries) poly.openTooltip();
      else poly.closeTooltip();
    });
  }, [showBoundaries]);

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
