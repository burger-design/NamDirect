import { NamibiaRegion, ServiceType } from './constants';

export interface Location {
  lat: number;
  lng: number;
  address: string;
}

export interface Farmer {
  uid: string;
  businessName: string;
  farmName?: string;
  name?: string;
  region: NamibiaRegion;
  whatsappNumber: string;
  serviceType: ServiceType;
  location?: Location;
  createdAt: string;
}

export interface ShippingOption {
  id: string;
  name: string;
  cost: number;
  estimatedDays: string;
}

export interface Product {
  id: string;
  farmerId: string;
  name: string;
  description: string;
  price: number;
  unit: string;
  stockStatus: boolean;
  category: string;
  imageUrl: string;
  images?: string[];
  region: NamibiaRegion;
  createdAt: string;
  lastUpdatedAt?: string;
  shippingOptions?: ShippingOption[];
  rating?: number;
  ratingCount?: number;
}

export interface Banner {
  id: string;
  farmerId: string;
  imageUrl: string;
  title: string;
  linkUrl?: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
}

export interface Order {
  id: string;
  customerId: string;
  farmerId: string;
  productId: string;
  quantity: number;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'delivered' | 'cancelled';
  deliveryStatus?: 'pending' | 'shipped' | 'out_for_delivery' | 'delivered';
  trackingNumber?: string;
  deliveryLocation?: Location;
  cancelReason?: string;
  cancelComments?: string;
  notes?: string;
  createdAt: string;
}
