import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PriceList } from '../models/priceList.model';

@Injectable({
  providedIn: 'root'
})
export class PriceListService {
  private apiUrl = 'http://localhost:8080/api/priceList';

  constructor(private http: HttpClient) {}

  getAll(): Observable<PriceList[]> {
    return this.http.get<PriceList[]>(this.apiUrl);
  }

  getActive(): Observable<PriceList[]> {
    return this.http.get<PriceList[]>(`${this.apiUrl}/active`);
  }

  getById(id: number): Observable<PriceList> {
    return this.http.get<PriceList>(`${this.apiUrl}/${id}`);
  }
}