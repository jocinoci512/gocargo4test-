import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { Prisma } from '@prisma/client';
import { parseCoordinate } from '@/lib/coord-parser';

function buildRouteCoords(oLat: number, oLng: number, cLat: number, cLng: number, dLat: number, dLng: number): string {
  const points: [number, number][] = [];
  if (oLat !== 0 || oLng !== 0) points.push([oLng, oLat]);
  if (cLat !== 0 || cLng !== 0) points.push([cLng, cLat]);
  if (dLat !== 0 || dLng !== 0) points.push([dLng, dLat]);
  return points.length >= 2 ? JSON.stringify(points) : '[]';
}

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const shipment = await prisma.shipment.findUnique({ where: { id: params.id }, include: { events: { orderBy: { createdAt: 'asc' } } } });
  if (!shipment) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(shipment);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();

  // Validate and parse coordinates if provided
  const fieldErrors: Record<string, string> = {};
  const coordKeys = ['originLat', 'originLng', 'destLat', 'destLng', 'currentLat', 'currentLng'];
  let coordsUpdated = false;
  for (const key of coordKeys) {
    if (body[key] !== undefined && body[key] !== '') {
      const isLat = key.endsWith('Lat');
      const result = parseCoordinate(String(body[key]), isLat);
      if (result.error) {
        fieldErrors[key] = result.error;
      } else if (result.value !== null) {
        body[key] = result.value;
        coordsUpdated = true;
      } else {
        // Whitespace-only input parsed as empty → reset to 0
        body[key] = 0;
        coordsUpdated = true;
      }
    } else if (body[key] === '') {
      body[key] = 0;
      coordsUpdated = true;
    }
  }
  if (Object.keys(fieldErrors).length > 0) {
    return NextResponse.json({ error: 'Validation failed', fieldErrors }, { status: 400 });
  }

  // Regenerate routeCoords when coordinates are updated
  if (coordsUpdated && !body.routeCoords) {
    const existing = await prisma.shipment.findUnique({ where: { id: params.id }, select: { originLat: true, originLng: true, currentLat: true, currentLng: true, destLat: true, destLng: true } });
    if (existing) {
      const oLat = body.originLat ?? existing.originLat;
      const oLng = body.originLng ?? existing.originLng;
      const cLat = body.currentLat ?? existing.currentLat;
      const cLng = body.currentLng ?? existing.currentLng;
      const dLat = body.destLat ?? existing.destLat;
      const dLng = body.destLng ?? existing.destLng;
      body.routeCoords = buildRouteCoords(oLat, oLng, cLat, cLng, dLat, dLng);
    }
  }

  try {
    const shipment = await prisma.shipment.update({ where: { id: params.id }, data: body });
    await prisma.activityLog.create({ data: { adminEmail: session.user.email!, action: `Updated shipment ${shipment.trackingNumber}` } });
    return NextResponse.json(shipment);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return NextResponse.json({ error: 'Validation failed', fieldErrors: { trackingNumber: 'This tracking number already exists' } }, { status: 400 });
    }
    throw err;
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await prisma.shipment.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
