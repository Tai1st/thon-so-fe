'use client';

import { useEffect, useRef } from 'react';
import type { Map as LeafletMap } from 'leaflet';
import type { GpsCoord, PublicTenant } from '@/lib/types';

const DOAN_KET_CENTER: [number, number] = [13.125944, 108.324778];

function housePinIcon(L: typeof import('leaflet')) {
  const color = '#9c3000';
  const html =
    `<svg width="30" height="38" viewBox="0 0 30 38" xmlns="http://www.w3.org/2000/svg">` +
    `<path d="M15 0C6.716 0 0 6.716 0 15c0 10.5 15 23 15 23s15-12.5 15-23C30 6.716 23.284 0 15 0z" fill="${color}"></path>` +
    `<circle cx="15" cy="14.5" r="10" fill="#fff"></circle>` +
    `<g transform="translate(7.5,7) scale(0.625)" fill="none" stroke="${color}" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">` +
    `<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline>` +
    `</g></svg>`;
  return L.divIcon({ className: 'family-house-pin', html, iconSize: [30, 38], iconAnchor: [15, 38], popupAnchor: [0, -34] });
}

// Bản đồ thật (Leaflet + OpenStreetMap) cho GPS hộ gia đình — vẽ ranh giới
// thật của Thôn Đoàn Kết (Tenant.boundary, cùng nguồn GeoJSON dùng khi
// migrate-seed) và 1 marker duy nhất tại vị trí hộ (nếu đã định vị). Ranh
// giới các thôn/buôn lân cận (bản mẫu vẽ thêm để làm bối cảnh xung quanh)
// được lược bớt ở vòng này để không phải mang theo dữ liệu 24 thôn — có
// thể bổ sung sau bằng cách gọi lại đúng GeoJSON API như migrate-seed.ts.
export function FamilyGpsMap({
  familyId,
  gpsCoord,
  tenant,
}: {
  familyId: string;
  gpsCoord: GpsCoord | null;
  tenant: PublicTenant | undefined;
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

      // Phải setView() trước khi addTo() — L.tileLayer(...).addTo(map) ném
      // lỗi "Set map center and zoom first" nếu map chưa có view (xem ghi
      // chú tương tự trong prototype js/resident-dashboard.js).
      const map = L.map(containerRef.current, { scrollWheelZoom: false }).setView(DOAN_KET_CENTER, 15);
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      if (tenant?.boundary) {
        const latlngs = tenant.boundary.coordinates[0].map(([lng, lat]) => [lat, lng] as [number, number]);
        const poly = L.polygon(latlngs, {
          color: '#e11d48',
          weight: 2,
          fillColor: '#e11d48',
          fillOpacity: 0.15,
          interactive: false,
        }).addTo(map);
        map.fitBounds(poly.getBounds(), { padding: [20, 20] });
      } else {
        map.setView(gpsCoord ? [gpsCoord.lat, gpsCoord.lng] : DOAN_KET_CENTER, 15);
      }

      if (gpsCoord) {
        L.marker([gpsCoord.lat, gpsCoord.lng], { icon: housePinIcon(L) })
          .addTo(map)
          .bindPopup(`Hộ gia đình ${familyId}`)
          .openPopup();
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
  }, [familyId, gpsCoord?.lat, gpsCoord?.lng, tenant]);

  return <div ref={containerRef} className="h-48 w-full overflow-hidden rounded-2xl border border-stone-200 sm:h-64" />;
}
