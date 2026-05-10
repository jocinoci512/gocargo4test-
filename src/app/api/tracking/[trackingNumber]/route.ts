import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { rateLimit } from '@/lib/rate-limit';

function buildRouteFromCoords(s: { originLat: number; originLng: number; currentLat: number; currentLng: number; destLat: number; destLng: number }): [number, number][] {
  // Build route in GeoJSON order [lng, lat] from the explicit coordinate fields
  const points: [number, number][] = [];
  if (s.originLat !== 0 || s.originLng !== 0) points.push([s.originLng, s.originLat]);
  if (s.currentLat !== 0 || s.currentLng !== 0) points.push([s.currentLng, s.currentLat]);
  if (s.destLat !== 0 || s.destLng !== 0) points.push([s.destLng, s.destLat]);
  return points.length >= 2 ? points : [];
}

export async function GET(req: NextRequest, { params }: { params: { trackingNumber: string } }) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  if (!rateLimit(`track:${ip}`, 30, 60000)) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  const shipment = await prisma.shipment.findUnique({ where: { trackingNumber: params.trackingNumber }, include: { events: { orderBy: { createdAt: 'asc' } } } });
  if (!shipment) return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });

  // Priority: if explicit coordinate fields are populated, always use them (most reliable)
  // This ensures edits from the admin dashboard are immediately reflected correctly
  const hasExplicitCoords = (shipment.originLat !== 0 || shipment.originLng !== 0) && (shipment.destLat !== 0 || shipment.destLng !== 0);

  let routeCoords: [number, number][] = [];
  if (hasExplicitCoords) {
    // Always rebuild from the authoritative coordinate fields
    routeCoords = buildRouteFromCoords(shipment);
  } else {
    // Fallback: use stored routeCoords (legacy/seed data that has detailed multi-point routes)
    try { routeCoords = JSON.parse(shipment.routeCoords); } catch { routeCoords = []; }
    if (!routeCoords || routeCoords.length < 2) {
      routeCoords = buildRouteFromCoords(shipment);
    }
  }

  return NextResponse.json({
    shipment: { ...shipment, routeCoords },
    events: shipment.events,
  });
}
