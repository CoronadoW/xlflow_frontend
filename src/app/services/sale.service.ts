// src/app/services/sale.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Sale, SaleDto, DeliverySummary } from '../models/sale.model';

@Injectable({
  providedIn: 'root'
})
export class SaleService {
  private apiUrl = 'http://localhost:8080/api/sales';

  constructor(private http: HttpClient) {}

  createSale(sale: SaleDto): Observable<Sale> {
    return this.http.post<Sale>(this.apiUrl, sale);
  }

  getSalesByDeliveryDate(date: string): Observable<Sale[]> {
    return this.http.get<Sale[]>(`${this.apiUrl}/delivery/${date}`);
  }

  getDeliverySummary(date: string): Observable<DeliverySummary> {
    return this.http.get<DeliverySummary>(`${this.apiUrl}/delivery/${date}/summary`);
  }
}