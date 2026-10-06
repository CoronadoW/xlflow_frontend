// src/app/features/products/products.component.ts
import { Component, OnInit, ChangeDetectorRef} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../services/product.service';
import { Product } from '../../models/product.model';
import { RoundPricePipe } from '../../shared/RoundPricePipe';
import { ImportPriceListConfig } from '../../models/priceList.model';
import { PriceListService } from '../../services/priceListService';
import { PriceList } from '../../models/priceList.model';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule, RoundPricePipe],
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.scss']
})
export class ProductsComponent implements OnInit {
  products: Product[] = [];
  filteredProducts: Product[] = [];
  searchTerm: string = '';
  loading: boolean = false;
  selectedFile: File | null = null;
  margin: number = 0.3;
  errorMessage: string = '';
  successMessage: string = '';

  // 🔥 NUEVO: Listas de precios
  priceLists: PriceList[] = [];
  selectedPriceListId: number | null = null;

  constructor(
    private productService: ProductService,
    private priceListService: PriceListService,  // 🔥 NUEVO
    private cdr: ChangeDetectorRef              // 🔥 NUEVO (si no lo tenés)
  ) { }

  ngOnInit() {
    this.loadPriceLists();  // 🔥 NUEVO
  }

  // 🔥 NUEVO: Cargar listas y auto-seleccionar
  loadPriceLists() {
    this.priceListService.getActive().subscribe({
      next: (data) => {
        this.priceLists = data;
        if (data.length > 0 && !this.selectedPriceListId) {
          this.selectedPriceListId = data[0].id;
          this.loadProducts();
        }
      },
      error: (error) => console.error('Error loading price lists:', error)
    });
  }

  // 🔥 MODIFICAR: loadProducts ahora usa la lista elegida
  loadProducts() {
    if (!this.selectedPriceListId) return;

    this.loading = true;
    this.productService.getProductsByPriceList(this.selectedPriceListId).subscribe({
      next: (data) => {
        this.products = data;
        this.filteredProducts = data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading products:', error);
        this.loading = false;
      }
    });
  }

  // 🔥 NUEVO: Al cambiar de lista, recargar
  onPriceListChange() {
    this.loadProducts();
  }

  searchProducts() {
    if (this.searchTerm) {
      this.filteredProducts = this.products.filter(p =>
        p.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        (p.category && p.category.toLowerCase().includes(this.searchTerm.toLowerCase()))
      );
    } else {
      this.filteredProducts = this.products;
    }
  }

  onFileSelected(event: any) {
    this.selectedFile = event.target.files[0];
    this.errorMessage = '';
    this.successMessage = '';
    if (this.selectedFile) {
      console.log('📁 Archivo seleccionado:', this.selectedFile.name);
    }
  }

  // 🔥 MODIFICADO para el ingreso de multiples margenes
  importExcel() {
    if (!this.selectedFile) {
      alert('Por favor selecciona un archivo');
      return;
    }

    // Validar que todas las listas tengan nombre y margen
    for (const list of this.importPriceLists) {
      if (!list.name || list.name.trim() === '') {
        alert('Todas las listas deben tener un nombre');
        return;
      }
      if (list.margin === null || list.margin === undefined || list.margin < 0 || list.margin > 1) {
        alert('El margen debe estar entre 0 y 1 (ej: 0.35)');
        return;
      }
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    console.log('📤 Importando archivo:', this.selectedFile.name);
    console.log('📊 Listas:', this.importPriceLists);

    this.productService.importExcel(this.selectedFile, this.importPriceLists).subscribe({
      next: (response) => {
        console.log('✅ Respuesta:', response);
        this.successMessage = response.message || 'Productos importados correctamente';
        this.loadProducts();
        this.loading = false;
        this.selectedFile = null;
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      },
      error: (error) => {
        console.error('❌ Error importing:', error);
        this.errorMessage = 'Error al importar: ' + error.message;
        this.loading = false;
      }
    });
  }

  // 🔥 NUEVO: Agregar una lista
  addPriceList() {
    this.importPriceLists.push({ name: '', margin: 0.30 });
  }

  // 🔥 NUEVO: Eliminar una lista
  removePriceList(index: number) {
    if (this.importPriceLists.length <= 1) {
      alert('Debe haber al menos una lista');
      return;
    }
    this.importPriceLists.splice(index, 1);
  }

  // 🔥 NUEVO: Listas de precios para configurar antes de importar
  importPriceLists: ImportPriceListConfig[] = [
    { name: 'Consumidor Final', margin: 0.35 }
  ];

  // 🔥 MODIFICAR: exportExcel ahora usa la lista elegida
  exportExcel() {
    if (!this.selectedPriceListId) {
      alert('Por favor selecciona una lista de precios');
      return;
    }

    this.loading = true;
    this.productService.exportExcel(this.selectedPriceListId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `productos_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.loading = false;
      },
      error: (error) => {
        console.error('Error exporting:', error);
        alert('Error al exportar el archivo');
        this.loading = false;
      }
    });
  }

  clearMessages() {
    this.errorMessage = '';
    this.successMessage = '';
  }
}