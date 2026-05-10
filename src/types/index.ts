export type ShipmentStatus = 'pending' | 'processing' | 'picked_up' | 'in_transit' | 'at_terminal' | 'on_hold' | 'out_for_delivery' | 'delivered' | 'cancelled';

export type QuoteStatus = 'pending' | 'reviewed' | 'accepted' | 'completed' | 'cancelled';

export interface QuoteFormData {
  name: string;
  email: string;
  phone: string;
  pickupAddress: string;
  deliveryAddress: string;
  vehicleYear: string;
  vehicleMake: string;
  vehicleModel: string;
  runningCondition: string;
  transportType: string;
  pickupDate: string;
  notes?: string;
}

export interface ContactFormData {
  name: string;
  email: string;
  phone?: string;
  message: string;
}

export interface TrackingData {
  shipment: {
    id: string;
    trackingNumber: string;
    vehicleInfo: string;
    origin: string;
    destination: string;
    currentLat: number;
    currentLng: number;
    originLat: number;
    originLng: number;
    destLat: number;
    destLng: number;
    routeCoords: [number, number][];
    status: ShipmentStatus;
    eta: string | null;
    driverNotes: string;
    customerName: string;
  };
  events: {
    id: string;
    status: string;
    note: string;
    lat: number;
    lng: number;
    createdAt: string;
  }[];
}

export interface ServiceItem {
  title: string;
  slug: string;
  description: string;
  longDescription: string;
  icon: string;
}

export interface BlogPostPreview {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string;
  published: boolean;
  createdAt: string;
}

export interface PitchSlide {
  slideNumber: number;
  title: string;
  subtitle?: string;
  content: string;
  bullets?: string[];
}

export interface MarketingDay {
  day: number;
  platform: string;
  content: string;
  type: string;
}

export const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  processing: 'Processing',
  picked_up: 'Picked Up',
  in_transit: 'In Transit',
  at_terminal: 'Arrived at Terminal',
  on_hold: 'On Hold',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-800',
  processing: 'bg-indigo-100 text-indigo-800',
  picked_up: 'bg-blue-100 text-blue-800',
  in_transit: 'bg-yellow-100 text-yellow-800',
  at_terminal: 'bg-purple-100 text-purple-800',
  on_hold: 'bg-amber-100 text-amber-800',
  out_for_delivery: 'bg-orange-100 text-orange-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  reviewed: 'bg-blue-100 text-blue-800',
  accepted: 'bg-green-100 text-green-800',
  completed: 'bg-green-100 text-green-800',
};
