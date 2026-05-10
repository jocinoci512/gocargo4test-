import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create a demo shipment: Porsche 911, LA → NYC, currently near Denver
  const shipment = await prisma.shipment.upsert({
    where: { trackingNumber: 'GCL-2026-0001' },
    update: {
      currentLat: 39.7392,
      currentLng: -104.9903,
      status: 'in_transit',
    },
    create: {
      trackingNumber: 'GCL-2026-0001',
      vehicleInfo: '2025 Porsche 911 Turbo S',
      origin: 'Los Angeles, CA',
      destination: 'New York, NY',
      // Origin coordinates (Los Angeles)
      originLat: 34.0522,
      originLng: -118.2437,
      // Destination coordinates (New York)
      destLat: 40.7128,
      destLng: -74.0060,
      // Current location (Denver, CO — halfway through)
      currentLat: 39.7392,
      currentLng: -104.9903,
      // Full route: LA → Las Vegas → Salt Lake → Denver → Kansas City → St Louis → Indianapolis → Columbus → Pittsburgh → NYC
      routeCoords: JSON.stringify([
        [-118.2437, 34.0522],  // Los Angeles, CA
        [-115.1398, 36.1699],  // Las Vegas, NV
        [-111.8911, 40.7608],  // Salt Lake City, UT
        [-104.9903, 39.7392],  // Denver, CO (current)
        [-94.5786,  39.0997],  // Kansas City, MO
        [-90.1994,  38.6270],  // St. Louis, MO
        [-86.1581,  39.7684],  // Indianapolis, IN
        [-82.9988,  39.9612],  // Columbus, OH
        [-79.9959,  40.4406],  // Pittsburgh, PA
        [-74.0060,  40.7128],  // New York, NY
      ]),
      status: 'in_transit',
      eta: '2026-05-05',
      driverNotes: 'Enclosed premium transport. Vehicle wrapped and secured. Passed inspection at Denver checkpoint — zero issues. Next stop: Kansas City terminal.',
      customerName: 'Michael Rivera',
      customerEmail: 'michael.rivera@example.com',
      customerPhone: '+1 (310) 555-8900',
    },
  });

  console.log(`Shipment created: ${shipment.trackingNumber}`);

  // Delete existing events for this shipment to avoid duplicates on re-run
  await prisma.trackingEvent.deleteMany({ where: { shipmentId: shipment.id } });

  // Add tracking events showing the journey so far
  await prisma.trackingEvent.createMany({
    data: [
      {
        shipmentId: shipment.id,
        status: 'picked_up',
        note: 'Vehicle picked up from dealership in Los Angeles. Full condition inspection completed — no damage. Loaded onto enclosed carrier.',
        lat: 34.0522,
        lng: -118.2437,
      },
      {
        shipmentId: shipment.id,
        status: 'in_transit',
        note: 'Departed Los Angeles terminal via I-15 North. Passed through Las Vegas and Salt Lake City. Currently at Denver, CO checkpoint.',
        lat: 39.7392,
        lng: -104.9903,
      },
    ],
  });

  console.log('Tracking events added.');
  console.log('');
  console.log('=== DEMO SHIPMENT READY ===');
  console.log(`Track it at: /track/GCL-2026-0001`);
  console.log(`Origin: Los Angeles, CA (34.0522, -118.2437)`);
  console.log(`Current: Denver, CO (39.7392, -104.9903)`);
  console.log(`Destination: New York, NY (40.7128, -74.0060)`);
  console.log(`Route: 10 points across the US`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
