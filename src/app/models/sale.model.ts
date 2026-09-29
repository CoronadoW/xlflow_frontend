// src/app/models/sale.model.ts
import { RequestResponse } from './request.model';

export interface Sale {
  id: number;
  deliveryDate: string;
  total: number;
  requests?: RequestResponse[];
}

export interface SaleDto {
  deliveryDate: string;
}

export interface DeliverySummary {
  deliveryDate: string;
  totalSales: number;
  totalRequests: number;
  totalCustomers: number;
  customers: { [key: string]: number };
  customerDetails: CustomerDetail[]; // 🔥 NUEVO
  sales: Sale[];
}

export interface CustomerDetail {
  customerName: string;
  total: number;
  products: ProductDetail[];
}

export interface ProductDetail {
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}