// src/app/features/products/products.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../services/product.service';
import { Product } from '../../models/product.model';
import { RoundPricePipe } from '../../shared/RoundPricePipe';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule,RoundPricePipe ],
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

  constructor(private productService: ProductService) {}

  ngOnInit() {
    this.loadProducts();
  }

  loadProducts() {
    this.loading = true;
    this.errorMessage = '';
    this.productService.getAllProducts().subscribe({
      next: (data) => {
        this.products = data;
        this.filteredProducts = data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading products:', error);
        this.errorMessage = 'Error al cargar productos: ' + error.message;
        this.loading = false;
      }
    });
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

  // 🔥 CORREGIDO: Importar Excel con manejo de respuesta
  importExcel() {
    if (!this.selectedFile) {
      this.errorMessage = 'Por favor selecciona un archivo';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    console.log('📤 Importando archivo:', this.selectedFile.name);
    console.log('📊 Margen:', this.margin);

    this.productService.importExcel(this.selectedFile, this.margin).subscribe({
      next: (response) => {
        console.log('✅ Respuesta del servidor:', response);
        this.successMessage = response.message || 'Productos importados correctamente';
        this.loadProducts();
        this.loading = false;
        this.selectedFile = null;
        // Resetear el input file
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

  exportExcel() {
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.productService.exportExcel().subscribe({
      next: (blob) => {
        console.log('✅ Exportación exitosa, tamaño:', blob.size);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `productos_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.loading = false;
        this.successMessage = 'Exportación exitosa';
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (error) => {
        console.error('❌ Error exporting:', error);
        this.errorMessage = 'Error al exportar: ' + error.message;
        this.loading = false;
      }
    });
  }

  clearMessages() {
    this.errorMessage = '';
    this.successMessage = '';
  }
}