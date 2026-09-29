// src/app/services/request.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RequestDto, RequestResponse } from '../models/request.model';
import { CustomerDetail } from '../models/sale.model';

@Injectable({
  providedIn: 'root'
})
export class RequestService {
  private apiUrl = 'http://localhost:8080/api/requests';

  constructor(private http: HttpClient) { }

  createRequest(request: RequestDto): Observable<RequestResponse> {
    return this.http.post<RequestResponse>(this.apiUrl, request);
  }

  assignRequestToSale(requestId: number, saleId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${requestId}/assign/${saleId}`, {}, {
      responseType: 'text'
    });
  }

  getRequestsByDeliveryDate(date: string): Observable<RequestResponse[]> {
    return this.http.get<RequestResponse[]>(`${this.apiUrl}/delivery/${date}`);
  }

  getSupplierSummary(date: string): Observable<{ [key: string]: number }> {
    return this.http.get<{ [key: string]: number }>(`${this.apiUrl}/delivery/${date}/supplier`);
  }

  getCustomerSummary(date: string): Observable<{ [key: string]: number }> {
    return this.http.get<{ [key: string]: number }>(`${this.apiUrl}/delivery/${date}/customers`);
  }

  getProfit(date: string): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/delivery/${date}/profit`);
  }

  // NUEVO: Obtener detalle completo de clientes
  getCustomerDetails(date: string): Observable<CustomerDetail[]> {
    return this.http.get<CustomerDetail[]>(`${this.apiUrl}/delivery/${date}/customer-details`);
  }

  // NUEVO: Exportar pedido al proveedor
  exportSupplierOrder(date: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/delivery/${date}/export-supplier`, {
      responseType: 'blob'
    });
  }

  // 🔥 NUEVO: Obtener el total a pagar al proveedor
  getSupplierPayment(date: string): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/delivery/${date}/supplier-payment`);
  }

  // 🔥 NUEVO: Obtener pedido por ID
getRequestById(id: number): Observable<RequestResponse> {
  return this.http.get<RequestResponse>(`${this.apiUrl}/${id}`);
}

// 🔥 NUEVO: Actualizar pedido
updateRequest(id: number, request: RequestDto): Observable<RequestResponse> {
  return this.http.put<RequestResponse>(`${this.apiUrl}/${id}`, request);
}

// 🔥 NUEVO: Eliminar pedido
deleteRequest(id: number): Observable<string> {
  return this.http.delete(`${this.apiUrl}/${id}`, {
    responseType: 'text'
  });
}


}