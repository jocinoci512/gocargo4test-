'use client';

import { useState } from 'react';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import { toast } from 'sonner';
import { parseCoordinate } from '@/lib/coord-parser';

interface ShipmentFormProps {
  initialData?: any;
  onSuccess?: () => void;
}

export default function ShipmentForm({ initialData, onSuccess }: ShipmentFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const isEditing = !!initialData;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFieldErrors({});
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const data: Record<string, string> = {};
    formData.forEach((val, key) => { data[key] = String(val); });

    // Parse and validate coordinates
    const errors: Record<string, string> = {};
    const coordPairs = [
      ['originLat', 'originLng', 'Origin'],
      ['destLat', 'destLng', 'Destination'],
      ['currentLat', 'currentLng', 'Current'],
    ] as const;

    for (const [latKey, lngKey, label] of coordPairs) {
      const latResult = parseCoordinate(data[latKey], true);
      const lngResult = parseCoordinate(data[lngKey], false);

      if (latResult.error) errors[latKey] = latResult.error;
      if (lngResult.error) errors[lngKey] = lngResult.error;

      // Normalize values for submission
      if (latResult.value !== null) data[latKey] = String(latResult.value);
      if (lngResult.value !== null) data[lngKey] = String(lngResult.value);

      // Cross-field: both must be provided if either is filled
      const latFilled = latResult.value !== null;
      const lngFilled = lngResult.value !== null;
      if (latFilled && !lngFilled && !errors[lngKey]) errors[lngKey] = `${label} Longitude is required when Latitude is provided`;
      if (!latFilled && lngFilled && !errors[latKey]) errors[latKey] = `${label} Latitude is required when Longitude is provided`;
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setIsLoading(false);
      return;
    }

    try {
      const url = isEditing ? `/api/shipments/${initialData.id}` : '/api/shipments';
      const res = await fetch(url, {
        method: isEditing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        if (errBody.fieldErrors) {
          setFieldErrors(errBody.fieldErrors);
          setIsLoading(false);
          return;
        }
        throw new Error(errBody.error || 'Failed');
      }

      toast.success(isEditing ? 'Shipment updated' : 'Shipment created');
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Shipment Info */}
      <div>
        <h3 className="text-sm font-heading font-bold text-brand-gold uppercase tracking-wider mb-3">Shipment Info</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tracking Number</label>
            {isEditing ? (
              <input
                name="trackingNumber"
                defaultValue={initialData.trackingNumber}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-gold text-sm font-mono"
              />
            ) : (
              <div className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-500 font-mono">
                Auto-generated on save
              </div>
            )}
          </div>
          <Input label="Vehicle / Package Info" name="vehicleInfo" placeholder="2024 BMW X5" defaultValue={initialData?.vehicleInfo} required />
          <Input label="Origin" name="origin" placeholder="Dallas, TX" defaultValue={initialData?.origin} required />
          <Input label="Destination" name="destination" placeholder="Miami, FL" defaultValue={initialData?.destination} required />
        </div>
      </div>

      {/* Origin Coordinates */}
      <div>
        <h3 className="text-sm font-heading font-bold text-green-600 uppercase tracking-wider mb-3">Origin Coordinates</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Input label="Origin Latitude" name="originLat" type="text" placeholder="e.g. 34.0522 or 34.0522° N" defaultValue={initialData?.originLat || ''} error={fieldErrors.originLat} />
          </div>
          <div>
            <Input label="Origin Longitude" name="originLng" type="text" placeholder="e.g. -118.2437 or 118.2437° W" defaultValue={initialData?.originLng || ''} error={fieldErrors.originLng} />
          </div>
        </div>
      </div>

      {/* Destination Coordinates */}
      <div>
        <h3 className="text-sm font-heading font-bold text-red-500 uppercase tracking-wider mb-3">Destination Coordinates</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Input label="Destination Latitude" name="destLat" type="text" placeholder="e.g. 40.7128 or 40.7128° N" defaultValue={initialData?.destLat || ''} error={fieldErrors.destLat} />
          </div>
          <div>
            <Input label="Destination Longitude" name="destLng" type="text" placeholder="e.g. -74.006 or 74.006° W" defaultValue={initialData?.destLng || ''} error={fieldErrors.destLng} />
          </div>
        </div>
      </div>

      {/* Current Shipment Location */}
      <div>
        <h3 className="text-sm font-heading font-bold text-brand-gold uppercase tracking-wider mb-3">Current Shipment Location</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Input label="Current Latitude" name="currentLat" type="text" placeholder="e.g. 39.7392 or 39.7392° N" defaultValue={initialData?.currentLat || ''} error={fieldErrors.currentLat} />
          </div>
          <div>
            <Input label="Current Longitude" name="currentLng" type="text" placeholder="e.g. -104.9903 or 104.9903° W" defaultValue={initialData?.currentLng || ''} error={fieldErrors.currentLng} />
          </div>
        </div>
      </div>

      {/* Details */}
      <div>
        <h3 className="text-sm font-heading font-bold text-gray-500 uppercase tracking-wider mb-3">Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select label="Status" name="status" defaultValue={initialData?.status || 'pending'}
            options={[
              { value: 'pending', label: 'Pending' },
              { value: 'processing', label: 'Processing' },
              { value: 'picked_up', label: 'Picked Up' },
              { value: 'in_transit', label: 'In Transit' },
              { value: 'at_terminal', label: 'At Terminal' },
              { value: 'on_hold', label: 'On Hold' },
              { value: 'out_for_delivery', label: 'Out for Delivery' },
              { value: 'delivered', label: 'Delivered' },
              { value: 'cancelled', label: 'Cancelled' },
            ]}
          />
          <Input label="ETA" name="eta" type="date" defaultValue={initialData?.eta} />
          <Input label="Customer Name" name="customerName" defaultValue={initialData?.customerName} />
          <Input label="Customer Email" name="customerEmail" type="email" defaultValue={initialData?.customerEmail} />
          <Input label="Customer Phone" name="customerPhone" defaultValue={initialData?.customerPhone} />
        </div>
      </div>

      {/* Driver Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Driver Notes</label>
        <textarea name="driverNotes" rows={3} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-gold" defaultValue={initialData?.driverNotes} />
      </div>

      <Button type="submit" isLoading={isLoading}>{isEditing ? 'Update Shipment' : 'Create Shipment'}</Button>
    </form>
  );
}
