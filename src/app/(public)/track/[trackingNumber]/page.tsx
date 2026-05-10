import { Metadata } from 'next';
import prisma from '@/lib/prisma';
import TrackingResultClient from '@/components/tracking/TrackingResultClient';
import PageTransition from '@/components/ui/PageTransition';

export const metadata: Metadata = { title: 'Live Shipment Tracking | Go Cargo Logistics' };
export const dynamic = 'force-dynamic';

function buildRouteFromCoords(s: { originLat: number; originLng: number; currentLat: number; currentLng: number; destLat: number; destLng: number }): [number, number][] {
  const points: [number, number][] = [];
  if (s.originLat !== 0 || s.originLng !== 0) points.push([s.originLng, s.originLat]);
  if (s.currentLat !== 0 || s.currentLng !== 0) points.push([s.currentLng, s.currentLat]);
  if (s.destLat !== 0 || s.destLng !== 0) points.push([s.destLng, s.destLat]);
  return points.length >= 2 ? points : [];
}

export default async function TrackingResultPage({ params }: { params: { trackingNumber: string } }) {
  const shipment = await prisma.shipment.findUnique({
    where: { trackingNumber: params.trackingNumber },
    include: { events: { orderBy: { createdAt: 'asc' } } },
  });

  if (!shipment) {
    return (
      <PageTransition>
        <section className="pt-32 pb-20 text-center">
          <div className="max-w-xl mx-auto px-4">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
            <h1 className="text-3xl font-heading font-bold mb-4">Shipment Not Found</h1>
            <p className="text-brand-gray mb-6">
              No shipment found for tracking number: <strong className="font-mono">{params.trackingNumber}</strong>
            </p>
            <a href="/track" className="text-brand-gold hover:underline font-semibold">
              Try another tracking number &rarr;
            </a>
          </div>
        </section>
      </PageTransition>
    );
  }

  // Priority: if explicit coordinate fields are set, always use them (most reliable)
  const hasExplicitCoords = (shipment.originLat !== 0 || shipment.originLng !== 0) && (shipment.destLat !== 0 || shipment.destLng !== 0);

  let routeCoords: [number, number][] = [];
  if (hasExplicitCoords) {
    routeCoords = buildRouteFromCoords(shipment);
  } else {
    try { routeCoords = JSON.parse(shipment.routeCoords); } catch { routeCoords = []; }
    if (!routeCoords || routeCoords.length < 2) {
      routeCoords = buildRouteFromCoords(shipment);
    }
  }

  const initialShipment = {
    id: shipment.id,
    trackingNumber: shipment.trackingNumber,
    vehicleInfo: shipment.vehicleInfo,
    origin: shipment.origin,
    destination: shipment.destination,
    currentLat: shipment.currentLat,
    currentLng: shipment.currentLng,
    originLat: shipment.originLat,
    originLng: shipment.originLng,
    destLat: shipment.destLat,
    destLng: shipment.destLng,
    routeCoords,
    status: shipment.status as any,
    eta: shipment.eta,
    driverNotes: shipment.driverNotes,
    customerName: shipment.customerName,
  };

  const initialEvents = shipment.events.map((e) => ({
    id: e.id,
    status: e.status,
    note: e.note,
    lat: e.lat,
    lng: e.lng,
    createdAt: e.createdAt.toISOString(),
  }));

  return (
    <PageTransition>
      <section className="pt-28 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <a href="/track" className="text-sm text-brand-gray hover:text-brand-gold transition-colors">
                Track Shipment
              </a>
              <span className="text-gray-300">&rsaquo;</span>
              <span className="text-sm font-mono font-semibold text-brand-gold">
                {shipment.trackingNumber}
              </span>
            </div>
            <h1 className="text-2xl font-heading font-bold">
              Tracking: <span className="text-brand-gold">{shipment.trackingNumber}</span>
            </h1>
            <p className="text-brand-gray mt-1">
              {shipment.vehicleInfo} &mdash; {shipment.origin} &rarr; {shipment.destination}
            </p>
          </div>

          <TrackingResultClient
            initialShipment={initialShipment}
            initialEvents={initialEvents}
          />
        </div>
      </section>
    </PageTransition>
  );
}
