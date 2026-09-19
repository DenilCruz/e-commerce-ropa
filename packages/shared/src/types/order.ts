import { OrderStatus } from '../constants/order-status';

export interface OrderItem {
  id: string;
  variantId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Order {
  id: string;
  userId: string;
  status: OrderStatus;
  totalAmount: number;
  shippingAddress: string;
  items: OrderItem[];
  trackingNumber?: string;
  createdAt: Date;
  updatedAt: Date;
}
