'use client';

import { useEffect, useState } from 'react';
import { useTrackingLive } from '@/hooks/useTrackingLive';
import TrackingMap from '@/components/tracking/TrackingMap';
import ShipmentInfoPanel from '@/components/tracking/ShipmentInfoPanel';
import TrackingTimeline from '@/components/tracking/TrackingTimeline';
import type { TrackingData } from '@/types';

interface TrackingResultClientProps {
  initialShipment: TrackingData['shipment'];
  initialEvents: TrackingData['events'];
}

export default function TrackingResultClient({
  initialShipment,
  initialEvents,
}: TrackingResultClientProps) {
  const { shipment, events, lastUpdated, isLive } = useTrackingLive({
    trackingNumber: initialShipment.trackingNumber,
    initialShipment,
    initialEvents,
  });

  const [updatedLabel, setUpdatedLabel] = useState('just now');
  useEffect(() => {
    const tick = () => {
      const diffSec = Math.round((Date.now() - lastUpdated.getTime()) / 1000);
      if (diffSec < 5) setUpdatedLabel('just now');
      else if (diffSec < 60) setUpdatedLabel(`${diffSec}s ago`);
      else setUpdatedLabel(`${Math.round(diffSec / 60)}m ago`);
    };
    tick();
    const t = setInterval(tick, 2000);
    return () => clearInterval(t);
  }, [lastUpdated]);

  const routeCoords = shipment.routeCoords as [number, number][];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${isLive ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>
          <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
          {isLive ? 'Live Tracking Active' : 'Connection Paused'}
        </div>
        <span className="text-xs text-gray-400">Updated {updatedLabel}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <TrackingMap
            currentLat={shipment.currentLat}
            currentLng={shipment.currentLng}
            originLat={shipment.originLat}
            originLng={shipment.originLng}
            destLat={shipment.destLat}
            destLng={shipment.destLng}
            routeCoords={routeCoords}
            origin={shipment.origin}
            destination={shipment.destination}
          />
        </div>
        <div>
          <ShipmentInfoPanel
            vehicleInfo={shipment.vehicleInfo}
            origin={shipment.origin}
            destination={shipment.destination}
            status={shipment.status}
            eta={shipment.eta}
            driverNotes={shipment.driverNotes}
            customerName={shipment.customerName}
            trackingNumber={shipment.trackingNumber}
          />
        </div>
      </div>

      <div className="mt-10 max-w-md">
        <h2 className="text-xl font-heading font-bold mb-6">Shipment Timeline</h2>
        <TrackingTimeline
          events={events.map((e) => ({
            id: e.id,
            status: e.status,
            note: e.note,
            createdAt: e.createdAt,
          }))}
          currentStatus={shipment.status}
        />
      </div>
    </div>
  );
}
