'use client';

import { useEffect, useRef } from 'react';
import type { Map as LeafletMap, Polygon } from 'leaflet';
import { ADMINISTRATIVE_UNIT_CATEGORIES } from '@/lib/types';
import type { CommuneVillage, SuperAdminAdministrativeUnit } from '@/lib/types';

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  ADMINISTRATIVE_UNIT_CATEGORIES.map((c) => [c.slug, c.label]),
);

// Marker địa danh (trụ sở cơ quan, quán ăn, tạp hóa...) — cùng thiết kế
// pin-logo với directory-leaflet.tsx (trang danh mục công khai) để 2 bản
// đồ nhất quán 1 phong cách.
function placeIcon(L: typeof import('leaflet'), logoUrl?: string) {
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

// Bản đồ Leaflet hiện toàn bộ thôn của 1 xã (từ KMZ) — cùng phong cách với
// DirectoryLeaflet (trang danh mục công khai): tile switcher, nhãn thôn cố
// định trên bản đồ, marker địa danh. Khác biệt so với bản công khai: thôn
// tô màu theo TRẠNG THÁI (xanh = đã tạo tenant, cam = chưa, bấm vào để
// tạo) thay vì mỗi thôn 1 màu riêng — trạng thái quan trọng hơn ở đây.
export function CommuneLeaflet({
  villages,
  administrativeUnits,
  selectedName,
  onSelect,
  onCreateTenant,
  showPlaces,
}: {
  villages: CommuneVillage[];
  administrativeUnits: SuperAdminAdministrativeUnit[];
  selectedName: string | null;
  onSelect: (name: string) => void;
  onCreateTenant: (index: number) => void;
  showPlaces: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const polysRef = useRef<Map<string, Polygon>>(new Map());
  const placesLayerRef = useRef<import('leaflet').LayerGroup | null>(null);

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

      const firstVillage = villages[0];
      const map = L.map(containerRef.current, { scrollWheelZoom: true }).setView(
        firstVillage ? [firstVillage.lat, firstVillage.lng] : [16.0, 108.0],
        13,
      );
      mapRef.current = map;

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

      const placesLayer = L.layerGroup();
      placesLayerRef.current = placesLayer;

      administrativeUnits.forEach((unit) => {
        L.marker([unit.lat, unit.lng], { icon: placeIcon(L, unit.logoUrl) })
          .addTo(placesLayer)
          .bindPopup(
            `<b>${unit.name}</b>` +
              `<br/><span style="color:#64748b">${CATEGORY_LABEL[unit.category] || 'Khác'}</span>` +
              (unit.mapsUrl
                ? `<br/><a href="${unit.mapsUrl}" target="_blank" rel="noopener noreferrer">Xem trên Google Maps</a>`
                : ''),
          );
      });
      if (showPlaces) placesLayer.addTo(map);

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
          fillOpacity: village.claimed ? 0.5 : 0.35,
        }).addTo(map);

        poly.bindTooltip(village.name, { permanent: true, direction: 'center', className: 'directory-area-label' });
        polysRef.current.set(village.name, poly);

        if (village.claimed) {
          poly.on('click', () => onSelect(village.name));
          poly.bindPopup(`<b>${village.name}</b><br/>Đã tạo tenant: ${village.tenantName || ''}`);
        } else {
          poly.on('click', () => onCreateTenant(index));
          poly.bindPopup(`<b>${village.name}</b><br/>Chưa có tenant — bấm vào polygon để tạo.`);
        }
      });

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

  useEffect(() => {
    const map = mapRef.current;
    const layer = placesLayerRef.current;
    if (!map || !layer) return;
    if (showPlaces) map.addLayer(layer);
    else map.removeLayer(layer);
  }, [showPlaces]);

  // Đổi viền + bay tới thôn đang chọn mà không phải build lại toàn bộ bản đồ.
  useEffect(() => {
    (async () => {
      const L = await import('leaflet');
      polysRef.current.forEach((poly, name) => {
        const village = villages.find((v) => v.name === name);
        const isSelected = name === selectedName;
        const color = village?.claimed ? '#16a34a' : '#f59e0b';
        poly.setStyle({
          color,
          weight: isSelected ? 3.5 : 2,
          fillColor: color,
          fillOpacity: village?.claimed ? 0.5 : 0.35,
        });
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
