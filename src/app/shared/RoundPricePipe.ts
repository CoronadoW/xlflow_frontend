// src/app/shared/pipes/round-price.pipe.ts
import { Pipe, PipeTransform } from '@angular/core';


//Pipe para redondear con simbolo de moneda
@Pipe({
  name: 'roundPrice',
  standalone: true
})
export class RoundPricePipe implements PipeTransform {
  
  transform(value: number | null | undefined): string {
    if (value == null) return '$0.00';
    
    // Redondear al múltiplo de 100 superior
    const rounded = Math.ceil(value / 100) * 100;
    return `$${rounded.toFixed(2)}`;
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