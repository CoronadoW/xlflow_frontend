// src/app/models/summary.model.ts
export interface CustomerSummary {
  customerName: string;
  totalAmount: number;
}

export interface ProductQuantity {
  productName: string;
  quantity: number;
}

export interface WeeklySummary {
  deliveryDate: string;
  totalSales: number;
  totalProfit: number;
  totalCustomers: number;
  totalRequests: number;
}