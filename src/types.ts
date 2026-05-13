import { NamibiaRegion, ServiceType } from './constants';

export interface Location {
  lat: number;
  lng: number;
  address: string;
}

export interface Farmer {
  uid: string;
  businessName: string;
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
  region: NamibiaRegion;
  createdAt: string;
  shippingOptions?: ShippingOption[];
}

export interface Order {
  id: string;
  customerId: string;
  farmerId: string;
  productId: string;
  quantity: number;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'delivered' | 'cancelled';
  deliveryLocation?: Location;
  createdAt: string;
}
