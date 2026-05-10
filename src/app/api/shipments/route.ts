import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { generateTrackingNumber } from '@/lib/tracking-number';
import { Prisma } from '@prisma/client';
import { parseCoordinate } from '@/lib/coord-parser';

function buildRouteCoords(oLat: number, oLng: number, cLat: number, cLng: number, dLat: number, dLng: number): string {
  const points: [number, number][] = [];
  if (oLat !== 0 || oLng !== 0) points.push([oLng, oLat]);
  if (cLat !== 0 || cLng !== 0) points.push([cLng, cLat]);
  if (dLat !== 0 || dLng !== 0) points.push([dLng, dLat]);
  return points.length >= 2 ? JSON.stringify(points) : '[]';
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const shipments = await prisma.shipment.findMany({ orderBy: { createdAt: 'desc' }, include: { events: { orderBy: { createdAt: 'desc' }, take: 1 } } });
  return NextResponse.json(shipments);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();

  // Validate and parse coordinates using shared parser
  const fieldErrors: Record<string, string> = {};
  const coordFields = [
    ['originLat', true], ['originLng', false],
    ['destLat', true], ['destLng', false],
    ['currentLat', true], ['currentLng', false],
  ] as const;
  for (const [field, isLat] of coordFields) {
    const result = parseCoordinate(String(body[field] ?? ''), isLat);
    if (result.error) {
      fieldErrors[field] = result.error;
    } else {
      body[field] = result.value ?? 0; // null (empty input) defaults to 0
    }
  }
  if (Object.keys(fieldErrors).length > 0) {
    return NextResponse.json({ error: 'Validation failed', fieldErrors }, { status: 400 });
  }

  const originLat: number = body.originLat;
  const originLng: number = body.originLng;
  const destLat: number = body.destLat;
  const destLng: number = body.destLng;
  const currentLat: number = body.currentLat;
  const currentLng: number = body.currentLng;

  const routeCoords = body.routeCoords || buildRouteCoords(originLat, originLng, currentLat, currentLng, destLat, destLng);
  const trackingNumber = body.trackingNumber || await generateTrackingNumber();

  // Retry loop to handle concurrent inserts (P2002 unique constraint)
  const MAX_RETRIES = 3;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const tn = attempt === 0 ? trackingNumber : await generateTrackingNumber();
      const shipment = await prisma.shipment.create({
        data: {
          trackingNumber: tn,
          vehicleInfo: body.vehicleInfo,
          origin: body.origin,
          destination: body.destination,
          currentLat,
          currentLng,
          originLat,
          originLng,
          destLat,
          destLng,
          routeCoords,
          status: body.status || 'pending',
          eta: body.eta || null,
          driverNotes: body.driverNotes || '',
          customerName: body.customerName || '',
          customerEmail: body.customerEmail || '',
          customerPhone: body.customerPhone || '',
        },
      });
      await prisma.activityLog.create({ data: { adminEmail: session.user.email!, action: `Created shipment ${shipment.trackingNumber}` } });
      return NextResponse.json(shipment, { status: 201 });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002' && attempt < MAX_RETRIES - 1) {
        continue; // retry with a fresh tracking number
      }
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        return NextResponse.json({ error: 'Validation failed', fieldErrors: { trackingNumber: 'This tracking number already exists' } }, { status: 400 });
      }
      throw err;
    }
  }
  return NextResponse.json({ error: 'Failed to create shipment' }, { status: 500 });
}
