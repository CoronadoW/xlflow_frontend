// src/app/models/request.model.ts
export interface RequestProductDetail {
  productName: string;
  productPrice: number;
  quantity: number;
  totalByReqProd: number;
}

export interface RequestResponse {
  id: number;
  customerName: string;
  totalBySale: number;
  reqProdsList: RequestProductDetail[];
}

export interface RequestDto {
  customerName: string;
  requestProdDtoList: RequestProduct[];
}

export interface RequestProduct {
  productName: string;
  quantity: number;
}