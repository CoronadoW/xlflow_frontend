export interface PriceList {
  id: number;
  name: string;
  margin: number;
  active: boolean;
}

export interface ImportPriceListConfig {
  name: string;
  margin: number;
}