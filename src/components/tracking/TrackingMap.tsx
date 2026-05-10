'use client';

import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';

interface TrackingMapProps {
  currentLat: number;
  currentLng: number;
  originLat?: number;
  originLng?: number;
  destLat?: number;
  destLng?: number;
  routeCoords: [number, number][];
  origin: string;
  destination: string;
}

function hasValidCoords(lat: number, lng: number): boolean {
  return (lat !== 0 || lng !== 0) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

export default function TrackingMap({
  currentLat,
  currentLng,
  originLat = 0,
  originLng = 0,
  destLat = 0,
  destLng = 0,
  routeCoords,
  origin,
  destination,
}: TrackingMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const currentMarkerRef = useRef<any>(null);

  const hasOrigin = hasValidCoords(originLat, originLng);
  const hasDest = hasValidCoords(destLat, destLng);
  const hasCurrent = hasValidCoords(currentLat, currentLng);
  const hasRoute = routeCoords && routeCoords.length >= 2;
  const hasAnyCoords = hasOrigin || hasDest || hasCurrent || hasRoute;

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    if (!hasAnyCoords) return;

    import('leaflet').then((L) => {
      if (!mapContainer.current || mapRef.current) return;

      // Build latlngs for polyline
      let latlngs: [number, number][];
      if (hasRoute) {
        // routeCoords stored as [lng, lat] — flip for Leaflet
        latlngs = routeCoords.map(([lng, lat]) => [lat, lng]);
      } else {
        // Auto-generate from separate coords (already lat, lng — no flip needed)
        latlngs = [];
        if (hasOrigin) latlngs.push([originLat, originLng]);
        if (hasCurrent) latlngs.push([currentLat, currentLng]);
        if (hasDest) latlngs.push([destLat, destLng]);
      }

      const map = L.map(mapContainer.current, {
        zoomControl: true,
        scrollWheelZoom: true,
        attributionControl: true,
      });
      mapRef.current = map;

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map);

      // Route polylines
      if (latlngs.length > 1) {
        L.polyline(latlngs, { color: '#D4AF37', weight: 10, opacity: 0.18 }).addTo(map);
        L.polyline(latlngs, { color: '#D4AF37', weight: 3, opacity: 0.9, dashArray: '10 6' }).addTo(map);
        const bounds = L.latLngBounds(latlngs);
        map.fitBounds(bounds, { padding: [50, 50] });
      } else if (latlngs.length === 1) {
        map.setView(latlngs[0], 8);
      } else if (hasCurrent) {
        map.setView([currentLat, currentLng], 8);
      } else {
        map.setView([39.8, -98.5], 4); // center of US
      }

      // Origin marker (green)
      const originPos: [number, number] | null = hasRoute && latlngs.length > 0
        ? latlngs[0]
        : hasOrigin ? [originLat, originLng] : null;
      if (originPos) {
        const originIcon = L.divIcon({
          className: '',
          html: '<div style="width:18px;height:18px;border-radius:50%;background:#22C55E;border:3px solid #fff;box-shadow:0 0 0 2px #22C55E,0 2px 8px rgba(0,0,0,0.4);"></div>',
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        });
        L.marker(originPos, { icon: originIcon })
          .addTo(map)
          .bindTooltip(`<strong>Pickup</strong><br/>${origin}`, {
            permanent: true, direction: 'top', offset: [0, -12], className: 'gcl-tooltip',
          });
      }

      // Destination marker (red)
      const destPos: [number, number] | null = hasRoute && latlngs.length > 1
        ? latlngs[latlngs.length - 1]
        : hasDest ? [destLat, destLng] : null;
      if (destPos) {
        const destIcon = L.divIcon({
          className: '',
          html: '<div style="width:18px;height:18px;border-radius:50%;background:#EF4444;border:3px solid #fff;box-shadow:0 0 0 2px #EF4444,0 2px 8px rgba(0,0,0,0.4);"></div>',
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        });
        L.marker(destPos, { icon: destIcon })
          .addTo(map)
          .bindTooltip(`<strong>Delivery</strong><br/>${destination}`, {
            permanent: true, direction: 'top', offset: [0, -12], className: 'gcl-tooltip',
          });
      }

      // Current position marker (gold pulsing)
      if (hasCurrent) {
        const currentIcon = L.divIcon({
          className: '',
          html: '<div class="gcl-pulse-wrapper"><div class="gcl-pulse-ring"></div><div class="gcl-pulse-dot"></div></div>',
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        });
        const currentMarker = L.marker([currentLat, currentLng], { icon: currentIcon })
          .addTo(map)
          .bindPopup(
            `<strong style="color:#D4AF37">Current Location</strong><br/>${currentLat.toFixed(4)}\u00b0 N, ${Math.abs(currentLng).toFixed(4)}\u00b0 ${currentLng < 0 ? 'W' : 'E'}`,
            { className: 'gcl-popup' }
          )
          .openPopup();
        currentMarkerRef.current = currentMarker;
      }
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      currentMarkerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Real-time marker position update
  useEffect(() => {
    if (!mapRef.current || !currentMarkerRef.current) return;
    currentMarkerRef.current.setLatLng([currentLat, currentLng]);
    currentMarkerRef.current
      .getPopup()
      ?.setContent(
        `<strong style="color:#D4AF37">Current Location</strong><br/>${currentLat.toFixed(4)}\u00b0 N, ${Math.abs(currentLng).toFixed(4)}\u00b0 ${currentLng < 0 ? 'W' : 'E'}`
      );
    mapRef.current.panTo([currentLat, currentLng], { animate: true, duration: 1 });
  }, [currentLat, currentLng]);

  // Fallback: no coordinates available at all
  if (!hasAnyCoords) {
    return (
      <div className="relative w-full h-[400px] md:h-[500px] rounded-xl overflow-hidden border border-gray-800 shadow-lg flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="text-center px-6">
          <div className="w-14 h-14 bg-brand-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
          <p className="text-gray-400 font-heading font-semibold text-sm">Location coordinates are not fully available yet.</p>
          <p className="text-gray-500 text-xs mt-2">The admin will update the shipment location shortly.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[400px] md:h-[500px] rounded-xl overflow-hidden border border-gray-800 shadow-lg">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center z-0">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-brand-gold border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-brand-gold font-heading font-semibold text-sm">Loading Live Map&hellip;</p>
        </div>
      </div>
      <div ref={mapContainer} className="w-full h-full relative z-10" />
    </div>
  );
}
