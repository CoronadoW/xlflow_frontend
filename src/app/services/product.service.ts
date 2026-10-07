// src/app/services/product.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Product } from '../models/product.model';
import { ImportPriceListConfig } from '../models/priceList.model';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  //private apiUrl = 'http://localhost:8080/api/products';
  private apiUrl = '/api/products';
  
  constructor(private http: HttpClient) { }

  getAvailableProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.apiUrl}/available`)
      .pipe(catchError(this.handleError));
  }

  getAllProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(this.apiUrl)
      .pipe(catchError(this.handleError));
  }

  searchProducts(query: string): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/search?query=${query}`)
      .pipe(catchError(this.handleError));
  }

  getProductPrice(productName: string): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/price?productName=${productName}`)
      .pipe(catchError(this.handleError));
  }

  importExcel(file: File, priceLists: ImportPriceListConfig[]): Observable<{ message: string; status: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('priceLists', JSON.stringify(priceLists));

    return this.http.post<{ message: string; status: string }>(
      `${this.apiUrl}/import`,
      formData
    );
  }

  // 🔥 MODIFICAR: exportExcel recibe priceListId
  exportExcel(priceListId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/export/excel/${priceListId}`, {
      responseType: 'blob'
    });
  }

  // 🔥 Manejo de errores mejorado
  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Ha ocurrido un error';

    if (error.error instanceof ErrorEvent) {
      // Error del lado del cliente
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Error del lado del servidor
      if (error.status === 200 && error.error && error.error.message) {
        // Si el servidor devolvió un mensaje de error en formato JSON
        errorMessage = error.error.message;
      } else if (error.status === 200) {
        // Si el servidor devolvió texto plano pero lo intentamos parsear como JSON
        errorMessage = 'El servidor respondió correctamente pero en formato inesperado';
      } else {
        errorMessage = `Código: ${error.status}, Mensaje: ${error.message}`;
      }
    }

    console.error('❌ Error en ProductService:', errorMessage);
    return throwError(() => new Error(errorMessage));
  }

  //  NUEVO: Obtener productos con el precio de una lista específica
  getProductsByPriceList(priceListId: number): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.apiUrl}/by-price-list/${priceListId}`);
  }
}