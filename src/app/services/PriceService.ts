// src/app/services/price.service.ts
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PriceService {

  constructor() { }

  /**
   * Redondea un precio al múltiplo de 100 superior
   * @param price - Precio a redondear
   * @returns Precio redondeado
   */
  roundUpTo100(price: number): number {
    return Math.ceil(price / 100) * 100;
  }

  /**
   * Formatea un precio con redondeo y símbolo de moneda
   * @param price - Precio a formatear
   * @returns Precio formateado como string
   */
  formatRoundedPrice(price: number): string {
    const rounded = this.roundUpTo100(price);
    return `$${rounded.toFixed(2)}`;
  }
}