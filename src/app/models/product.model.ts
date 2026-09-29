// src/app/models/product.model.ts
export interface Product {
  id?: number;
  name: string;
  normalizedName: string;
  category: string;
  pricePurchase: number;
  priceSale: number;
  available: boolean;
}