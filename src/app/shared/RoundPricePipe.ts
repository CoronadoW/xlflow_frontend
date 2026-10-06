// src/app/shared/pipes/round-price.pipe.ts
import { Pipe, PipeTransform } from '@angular/core';


//Pipe para redondear con simbolo de moneda
@Pipe({
  name: 'roundPrice',
  standalone: true
})
export class RoundPricePipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    if (value === null || value === undefined) return '$0';

    // 🔥 Solo formatear, NO redondear
    // El backend ya devuelve el precio correcto (redondeado o no)
    return `$${value.toLocaleString('es-AR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })}`;
  }
}


// Pipe para redondear sin símbolo de moneda (para inputs)
@Pipe({
  name: 'roundPriceRaw',
  standalone: true
})
export class RoundPriceRawPipe implements PipeTransform {

  transform(value: number | null | undefined): number {
    if (value == null) return 0;
    return Math.ceil(value / 100) * 100;
  }
}