// src/app/features/orders/orders.component.ts
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators, AbstractControl } from '@angular/forms';
import { RequestService } from '../../services/request.service';
import { SaleService } from '../../services/sale.service';
import { ProductService } from '../../services/product.service';
import { PriceListService } from '../../services/priceListService';
import { PriceList } from '../../models/priceList.model';
import { Product } from '../../models/product.model';
import { CustomerDetail } from '../../models/sale.model';
import { RequestResponse } from '../../models/request.model'; // 🔥 FALTA ESTA IMPORTACIÓN
import { RoundPricePipe, RoundPriceRawPipe } from '../../shared/RoundPricePipe';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RoundPricePipe],
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.scss']
})
export class OrdersComponent implements OnInit, OnDestroy {
  // Formulario principal
  orderForm: FormGroup;

  // Lista de productos disponibles
  products: Product[] = [];

  // Mapa de sugerencias por índice de producto
  filteredProductsMap: { [key: number]: Product[] } = {};

  // Fechas
  deliveryDate: string = '';
  selectedDate: string = '';

  // Control de vistas
  showSummary: boolean = false;
  showCustomerDetails: boolean = false;
  loading: boolean = false;

  // Datos de resumen
  supplierSummary: { [key: string]: number } = {};
  customerSummary: { [key: string]: number } = {};
  customerDetails: CustomerDetail[] = [];
  profit: number = 0;

  // Control de sugerencias
  showSuggestions: { [key: number]: boolean } = {};
  expandedCustomers: { [key: string]: boolean } = {};

  // 🔥 NUEVO: Total a pagar al proveedor
  supplierPayment: number = 0;

  // Timeout para el blur
  private blurTimeout: any = null;
  private subscriptions: Subscription[] = [];

  //  Para edición de pedidos
  showEditModal: boolean = false;
  editingCustomer: CustomerDetail | null = null;
  editForm: FormGroup;
  editFilteredProductsMap: { [key: number]: Product[] } = {};
  editShowSuggestions: { [key: number]: boolean } = {};
  editSubscriptions: Subscription[] = [];

  //  NUEVO: Listas de precios
  priceLists: PriceList[] = [];

  constructor(
    private fb: FormBuilder,
    private requestService: RequestService,
    private saleService: SaleService,
    private productService: ProductService,
    private priceListService: PriceListService,
    private cdr: ChangeDetectorRef
  ) {
    this.orderForm = this.fb.group({
      customerName: ['', Validators.required],
      priceListId: [null, Validators.required],
      products: this.fb.array([]),
      deliveryDate: ['', Validators.required]
    });

    //  NUEVO: Formulario de edición
    this.editForm = this.fb.group({
      customerName: ['', Validators.required],
      priceListId: [null, Validators.required],
      products: this.fb.array([])
    });
  }

  ngOnInit() {
    this.loadProducts();
    this.loadPriceLists();
    this.setDefaultDate();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    if (this.blurTimeout) {
      clearTimeout(this.blurTimeout);
    }
  }

  // ==================== GETTERS ====================

  get productsFormArray(): FormArray {
    return this.orderForm.get('products') as FormArray;
  }

  getProductGroup(index: number): FormGroup {
    return this.productsFormArray.at(index) as FormGroup;
  }

  // ==================== CARGA DE DATOS ====================

  loadProducts() {
    this.productService.getAvailableProducts().subscribe({
      next: (data) => {
        this.products = data;
        console.log('📦 Productos cargados:', this.products.length);
      },
      error: (error) => console.error('Error loading products:', error)
    });
  }

  //  NUEVO: Cargar listas de precios automaticamente con el listado seleccionado
  loadPriceLists() {
    this.priceListService.getActive().subscribe({
      next: (data) => {
        this.priceLists = data;
        console.log('📋 Listas de precios cargadas:', this.priceLists);

        // 🔥 Auto-seleccionar la primera lista (o la predeterminada)
        if (this.priceLists.length > 0 && !this.orderForm.get('priceListId')?.value) {
          const defaultList = this.priceLists[0]; // O podés elegir por nombre
          this.orderForm.patchValue({ priceListId: defaultList.id });
          this.onPriceListChange();
        }
      },
      error: (error) => console.error('Error loading price lists:', error)
    });
  }

  setDefaultDate() {
    const today = new Date();
    const daysUntilFriday = (5 - today.getDay() + 7) % 7;
    const nextFriday = new Date(today);
    nextFriday.setDate(today.getDate() + daysUntilFriday);
    this.deliveryDate = nextFriday.toISOString().split('T')[0];
    this.orderForm.patchValue({ deliveryDate: this.deliveryDate });
  }

  // 🔥 NUEVO: Al cambiar la lista, recargar productos con el precio de esa lista
  onPriceListChange() {
    const priceListId = this.orderForm.get('priceListId')?.value;

    if (!priceListId) {
      // Si no hay lista seleccionada, cargar todos sin filtro
      this.loadProducts();
      return;
    }

    console.log('🔄 Cambiando a lista:', priceListId);

    // Recargar productos con el precio de la lista
    this.productService.getProductsByPriceList(priceListId).subscribe({
      next: (data) => {
        this.products = data;
        console.log(`📦 Productos recargados con precios de lista ${priceListId}:`, this.products.length);

        // 🔥 Recalcular precios de productos ya cargados en el formulario
        this.recalculateFormProductPrices();
      },
      error: (error) => {
        console.error('❌ Error loading products by price list:', error);
        alert('Error al cargar productos con la lista seleccionada');
      }
    });
  }

  // 🔥 NUEVO: Recalcular precios de productos en el formulario
  private recalculateFormProductPrices() {
    for (let i = 0; i < this.productsFormArray.length; i++) {
      const productForm = this.getProductGroup(i);
      const productName = productForm.get('productName')?.value;

      if (productName) {
        const product = this.products.find(p => p.name === productName);
        if (product) {
          const roundedPrice = this.roundPrice(product.priceSale);
          productForm.patchValue({ price: roundedPrice });
          this.calculateProductTotal(productForm);
        }
      }
    }

    // Lo mismo para el formulario de edición
    for (let i = 0; i < this.editProductsFormArray.length; i++) {
      const productForm = this.getEditProductGroup(i);
      const productName = productForm.get('productName')?.value;

      if (productName) {
        const product = this.products.find(p => p.name === productName);
        if (product) {
          const roundedPrice = this.roundPrice(product.priceSale);
          productForm.patchValue({ price: roundedPrice });
          this.calculateEditProductTotal(productForm);
        }
      }
    }
  }

  // ==================== GESTIÓN DE PRODUCTOS ====================

  addProduct() {
    const index = this.productsFormArray.length;
    console.log('➕ Agregando producto en índice:', index);

    const productForm = this.fb.group({
      productName: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      price: [{ value: 0, disabled: true }],
      total: [{ value: 0, disabled: true }]
    });

    // Inicializar sugerencias
    this.filteredProductsMap[index] = [];
    this.showSuggestions[index] = false;

    // Suscribirse a cambios de producto
    const nameSub = productForm.get('productName')?.valueChanges.subscribe(name => {
      console.log('🔍 Buscando:', name);
      if (name && name.length > 0) {
        this.filterProducts(index, name);
        this.showSuggestions[index] = true;
        this.cdr.detectChanges();
      } else {
        this.filteredProductsMap[index] = [];
        this.showSuggestions[index] = false;
        this.cdr.detectChanges();
      }
    });

    const quantitySub = productForm.get('quantity')?.valueChanges.subscribe(() => {
      this.calculateProductTotal(productForm);
    });

    if (nameSub) this.subscriptions.push(nameSub);
    if (quantitySub) this.subscriptions.push(quantitySub);

    this.productsFormArray.push(productForm);
    this.orderForm.updateValueAndValidity();
    this.cdr.detectChanges();
  }

  filterProducts(index: number, searchTerm: string) {
    if (searchTerm && searchTerm.length > 0) {
      this.filteredProductsMap[index] = this.products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        p.available
      );
      console.log(`📊 Sugerencias para índice ${index}:`, this.filteredProductsMap[index].length);
    } else {
      this.filteredProductsMap[index] = [];
    }
  }

  calculateProductTotal(productForm: FormGroup) {
    const price = productForm.get('price')?.value || 0;
    const quantity = productForm.get('quantity')?.value || 0;
    const total = price * quantity;
    productForm.patchValue({ total: total }, { emitEvent: false });
  }

  removeProduct(index: number) {
    console.log('🗑️ Eliminando producto en índice:', index);
    this.productsFormArray.removeAt(index);

    // Reindexar las sugerencias
    const newMap: { [key: number]: Product[] } = {};
    const newShow: { [key: number]: boolean } = {};

    for (let i = 0; i < this.productsFormArray.length; i++) {
      newMap[i] = this.filteredProductsMap[i + 1] || [];
      newShow[i] = this.showSuggestions[i + 1] || false;
    }

    this.filteredProductsMap = newMap;
    this.showSuggestions = newShow;
    this.orderForm.updateValueAndValidity();
    this.cdr.detectChanges();
  }

  // src/app/features/orders/orders.component.ts

  selectProduct(productName: string, index: number) {
    console.log('✅ Seleccionando producto:', productName, 'en índice:', index);

    const productForm = this.getProductGroup(index);
    const normalizedName = productName.toLowerCase().trim();

    // 🔥 PASO 1: Verificar si ya existe otro producto con el mismo nombre
    const existingIndex = this.findProductIndex(normalizedName, index);

    if (existingIndex !== -1) {
      // 🔥 YA EXISTE → sumar cantidad al producto existente
      const existingGroup = this.productsFormArray.at(existingIndex) as FormGroup;
      const existingQuantity = existingGroup.get('quantity')?.value || 0;
      const currentQuantity = productForm.get('quantity')?.value || 1;
      const newQuantity = existingQuantity + currentQuantity;

      existingGroup.patchValue({ quantity: newQuantity });
      this.calculateProductTotal(existingGroup);

      // 🔥 Eliminar la fila actual (la que se estaba editando)
      this.productsFormArray.removeAt(index);
      this.reindexSuggestions();

      console.log(`🔄 Producto fusionado: ${productName} → cantidad total ${newQuantity}`);
      this.cdr.detectChanges();
      return;
    }

    // 🔥 PASO 2: NO EXISTE → comportamiento normal
    productForm.patchValue({ productName: productName });
    this.filteredProductsMap[index] = [];
    this.showSuggestions[index] = false;

    const product = this.products.find(p => p.name === productName);
    if (product) {
      const roundedPrice = this.roundPrice(product.priceSale);
      productForm.patchValue({ price: roundedPrice });
      this.calculateProductTotal(productForm);
    }

    this.cdr.detectChanges();
  }

  // 🔥 NUEVO: Buscar si un producto ya existe en la lista (creación)
  // Devuelve el índice o -1 si no existe
  // Excluye el índice actual para no comparar consigo mismo
  private findProductIndex(normalizedName: string, excludeIndex: number = -1): number {
    for (let i = 0; i < this.productsFormArray.length; i++) {
      if (i === excludeIndex) continue;

      const group = this.productsFormArray.at(i) as FormGroup;
      const name = group.get('productName')?.value;

      if (name && name.toLowerCase().trim() === normalizedName) {
        return i;
      }
    }
    return -1;
  }

  // 🔥 NUEVO: Reindexar sugerencias (creación) después de eliminar una fila
  private reindexSuggestions(): void {
    const newMap: { [key: number]: Product[] } = {};
    const newShow: { [key: number]: boolean } = {};

    for (let i = 0; i < this.productsFormArray.length; i++) {
      newMap[i] = this.filteredProductsMap[i] || [];
      newShow[i] = this.showSuggestions[i] || false;
    }

    this.filteredProductsMap = newMap;
    this.showSuggestions = newShow;
  }

  // ==================== MANEJO DE SUGERENCIAS ====================

  onFocusProduct(index: number) {
    if (this.blurTimeout) {
      clearTimeout(this.blurTimeout);
      this.blurTimeout = null;
    }
    const productForm = this.getProductGroup(index);
    const productName = productForm.get('productName')?.value;
    if (productName && productName.length > 0) {
      this.filterProducts(index, productName);
      this.showSuggestions[index] = true;
      this.cdr.detectChanges();
    }
  }

  onBlurProduct(index: number) {
    this.blurTimeout = setTimeout(() => {
      this.showSuggestions[index] = false;
      this.blurTimeout = null;
      this.cdr.detectChanges();
    }, 200);
  }

  getSuggestions(index: number): Product[] {
    return this.filteredProductsMap[index] || [];
  }

  shouldShowSuggestions(index: number): boolean {
    return this.showSuggestions[index] || false;
  }

  // ==================== CREACIÓN DE PEDIDO ====================

  onSubmit() {
    if (this.orderForm.invalid) {
      this.orderForm.markAllAsTouched();
      this.productsFormArray.controls.forEach(control => control.markAsTouched());

      const errors: string[] = [];
      if (this.orderForm.get('customerName')?.invalid) {
        errors.push('Nombre del cliente es requerido');
      }
      if (this.orderForm.get('priceListId')?.invalid) {
        errors.push('Lista de precios es requerida');
      }
      if (this.productsFormArray.length === 0) {
        errors.push('Debe agregar al menos un producto');
      }
      this.productsFormArray.controls.forEach((control, i) => {
        if (control.get('productName')?.invalid) {
          errors.push(`Producto ${i + 1}: nombre es requerido`);
        }
        if (control.get('quantity')?.invalid) {
          errors.push(`Producto ${i + 1}: cantidad debe ser mayor a 0`);
        }
      });

      alert('❌ Por favor corrige los siguientes errores:\n' + errors.join('\n'));
      return;
    }

    this.loading = true;
    const formValue = this.orderForm.value;

    const requestDto = {
      customerName: formValue.customerName,
      priceListId: formValue.priceListId,
      deliveryDate: formValue.deliveryDate,
      requestProdDtoList: formValue.products.map((p: any) => ({
        productName: p.productName,
        quantity: p.quantity
      }))
    };

    console.log('📤 Enviando pedido:', requestDto);

    // 🔥 SOLO llamamos a createRequest.
    // El backend se encarga de crear/reutilizar la Sale automáticamente.
    this.requestService.createRequest(requestDto).subscribe({
      next: (request) => {
        console.log('✅ Pedido creado:', request);
        this.loading = false;
        this.resetForm();
        alert('✅ Pedido creado exitosamente!');
      },
      error: (error) => {
        this.loading = false;
        console.error('❌ Error creating request:', error);
        alert('❌ Error al crear el pedido: ' + (error.message || 'Error desconocido'));
      }
    });
  }

  resetForm() {
    this.orderForm.reset();
    this.productsFormArray.clear();
    this.filteredProductsMap = {};
    this.showSuggestions = {};
    this.subscriptions = [];
    this.orderForm.patchValue({ deliveryDate: this.deliveryDate });
    this.cdr.detectChanges();
  }

  // ==================== RESUMEN POR FECHA ====================

  // 🔥 MODIFICAR: loadSummary para incluir el pago al proveedor
  loadSummary() {
    if (!this.selectedDate) {
      alert('Por favor selecciona una fecha');
      return;
    }

    this.loading = true;
    this.showSummary = true;
    this.showCustomerDetails = true;

    // Cargar todos los datos en paralelo
    Promise.all([
      this.loadSupplierSummary(),
      this.loadCustomerDetailsData(),
      this.loadProfitData(),
      this.loadSupplierPaymentData() // 🔥 Agregar esta línea
    ]).then(() => {
      this.loading = false;
    }).catch(() => {
      this.loading = false;
    });
  }

  private loadSupplierSummary(): Promise<void> {
    return new Promise((resolve) => {
      this.requestService.getSupplierSummary(this.selectedDate).subscribe({
        next: (data) => {
          this.supplierSummary = data;
          resolve();
        },
        error: (error) => {
          console.error('❌ Error loading supplier summary:', error);
          resolve();
        }
      });
    });
  }

  private loadCustomerDetailsData(): Promise<void> {
    return new Promise((resolve) => {
      // 🔥 Usar el endpoint existente en lugar del que no existe
      this.requestService.getRequestsByDeliveryDate(this.selectedDate).subscribe({
        next: (requests) => {
          console.log('📦 Pedidos encontrados para la fecha:', requests);

          if (!requests || requests.length === 0) {
            this.customerDetails = [];
            this.customerSummary = {};
            resolve();
            return;
          }

          // Procesar los datos localmente para agrupar por cliente
          const customerMap = new Map<string, { total: number, products: any[] }>();

          requests.forEach(request => {
            const customerName = request.customerName || 'Cliente sin nombre';

            // Obtener los productos del pedido
            const products = (request.reqProdsList || []).map(rp => ({
              productName: rp.productName || 'Producto sin nombre',
              quantity: rp.quantity || 0,
              unitPrice: rp.productPrice || 0,
              subtotal: rp.totalByReqProd || 0
            }));

            if (customerMap.has(customerName)) {
              const existing = customerMap.get(customerName)!;
              existing.total += (request.totalBySale || 0);
              existing.products.push(...products);
            } else {
              customerMap.set(customerName, {
                total: request.totalBySale || 0,
                products: products
              });
            }
          });

          // Convertir a array de CustomerDetail
          this.customerDetails = Array.from(customerMap.entries()).map(([name, data]) => ({
            customerName: name,
            total: data.total,
            products: data.products
          }));

          // Ordenar por nombre de cliente
          this.customerDetails.sort((a, b) => a.customerName.localeCompare(b.customerName));

          // Inicializar todos como expandidos
          this.customerDetails.forEach(c => {
            this.expandedCustomers[c.customerName] = true;
          });

          // Actualizar resumen simple
          const summary: { [key: string]: number } = {};
          this.customerDetails.forEach(c => {
            summary[c.customerName] = c.total;
          });
          this.customerSummary = summary;

          console.log('✅ Detalle de clientes procesado:', this.customerDetails);
          resolve();
        },
        error: (error) => {
          console.error('❌ Error loading customer details:', error);
          this.customerDetails = [];
          this.customerSummary = {};
          resolve();
        }
      });
    });
  }

  private loadProfitData(): Promise<void> {
    return new Promise((resolve) => {
      this.requestService.getProfit(this.selectedDate).subscribe({
        next: (data) => {
          this.profit = data;
          resolve();
        },
        error: (error) => {
          console.error('❌ Error loading profit:', error);
          resolve();
        }
      });
    });
  }

  // ==================== UTILIDADES ====================

  toggleCustomer(customerName: string) {
    this.expandedCustomers[customerName] = !this.expandedCustomers[customerName];
  }

  isCustomerExpanded(customerName: string): boolean {
    return this.expandedCustomers[customerName] || false;
  }

  getObjectKeys(obj: any): string[] {
    return obj ? Object.keys(obj) : [];
  }

  getTotalAmount(): number {
    let total = 0;
    if (this.customerSummary) {
      for (const key in this.customerSummary) {
        total += this.customerSummary[key];
      }
    }
    // 🔥 Redondear al entero más cercano (ya que los valores son múltiplos de 100)
    return Math.round(total);
  }

  getTotalProductsCount(): number {
    let total = 0;
    this.customerDetails.forEach(customer => {
      customer.products.forEach(product => {
        total += product.quantity;
      });
    });
    return total;
  }

  getOrderTotal(products: any[]): number {
    return products.reduce((sum, p) => sum + p.subtotal, 0);
  }

  hasError(control: AbstractControl | null): boolean {
    return control ? control.invalid && control.touched : false;
  }


  // 🔥 NUEVO: Método para redondear precio
  roundPrice(price: number): number {
  // 🔥 El backend ya redondea cuando debe. No tocar acá.
  return price;
}

  // 🔥 NUEVO: Método para formatear precio redondeado
  formatRoundedPrice(price: number): string {
    const rounded = this.roundPrice(price);
    return `$${rounded.toFixed(2)}`;
  }


  // 🔥 NUEVO: Exportar pedido al proveedor
  exportSupplierOrder() {
    if (!this.selectedDate) {
      alert('Por favor selecciona una fecha');
      return;
    }

    this.loading = true;
    this.requestService.exportSupplierOrder(this.selectedDate).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pedido_proveedor_${this.selectedDate}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.loading = false;
        console.log('✅ Pedido proveedor exportado correctamente');
      },
      error: (error) => {
        console.error('❌ Error exporting supplier order:', error);
        this.loading = false;
        alert('Error al exportar el pedido del proveedor');
      }
    });
  }

  // 🔥 NUEVO: Cargar el pago al proveedor
  private loadSupplierPaymentData(): Promise<void> {
    return new Promise((resolve) => {
      this.requestService.getSupplierPayment(this.selectedDate).subscribe({
        next: (data) => {
          this.supplierPayment = data;
          console.log('💰 Pago al proveedor:', this.supplierPayment);
          resolve();
        },
        error: (error) => {
          console.error('❌ Error loading supplier payment:', error);
          this.supplierPayment = 0;
          resolve();
        }
      });
    });
  }

  // ==================== EDICIÓN DE PEDIDOS ====================

  // 🔥 NUEVO: Abrir modal de edición
  openEditModal(customer: CustomerDetail) {
    console.log('✏️ Editando pedido de:', customer.customerName);

    this.editingCustomer = customer;
    this.showEditModal = true;
    this.editFilteredProductsMap = {};
    this.editShowSuggestions = {};

    // Limpiar formulario
    this.editProductsFormArray.clear();

    // Cargar el pedido completo desde el backend
    // Buscar el request por nombre de cliente en la fecha seleccionada
    this.requestService.getRequestsByDeliveryDate(this.selectedDate).subscribe({
      next: (requests) => {
        const request = requests.find(r => r.customerName === customer.customerName);
        if (request) {
          this.loadRequestIntoEditForm(request);
        }
      },
      error: (error) => {
        console.error('❌ Error loading request:', error);
        alert('Error al cargar el pedido');
      }
    });
  }

  loadRequestIntoEditForm(request: RequestResponse) {
    this.editForm.patchValue({
      customerName: request.customerName,
      priceListId: request.priceList?.id || null
    });

    // Limpiar productos
    this.editProductsFormArray.clear();

    // 🔥 Recargar productos con la lista del pedido que se está editando
    const priceListId = request.priceList?.id;
    if (priceListId) {
      this.productService.getProductsByPriceList(priceListId).subscribe({
        next: (data) => {
          this.products = data;
          console.log(`📦 [Edición] Productos cargados con lista ${priceListId}`);
          // Después de cargar, agregar los productos al formulario
          this.addEditProductsFromRequest(request);
        },
        error: (error) => {
          console.error('❌ Error loading products:', error);
          // Fallback: cargar sin recargar productos
          this.addEditProductsFromRequest(request);
        }
      });
    } else {
      // Si el request no tiene lista (pedidos viejos), usar los productos actuales
      this.addEditProductsFromRequest(request);
    }
  }

  // 🔥 NUEVO: Extraer la lógica de agregar productos al formulario
  private addEditProductsFromRequest(request: RequestResponse) {
    request.reqProdsList.forEach((rp, index) => {
      const productForm = this.fb.group({
        productName: [rp.productName, Validators.required],
        quantity: [rp.quantity, [Validators.required, Validators.min(1)]],
        price: [{ value: rp.productPrice, disabled: true }],
        total: [{ value: rp.totalByReqProd, disabled: true }]
      });

      this.editFilteredProductsMap[index] = [];
      this.editShowSuggestions[index] = false;

      const nameSub = productForm.get('productName')?.valueChanges.subscribe(name => {
        if (name && name.length > 0) {
          this.filterEditProducts(index, name);
          this.editShowSuggestions[index] = true;
          this.cdr.detectChanges();
        } else {
          this.editFilteredProductsMap[index] = [];
          this.editShowSuggestions[index] = false;
          this.cdr.detectChanges();
        }
      });

      const quantitySub = productForm.get('quantity')?.valueChanges.subscribe(() => {
        this.calculateEditProductTotal(productForm);
      });

      if (nameSub) this.editSubscriptions.push(nameSub);
      if (quantitySub) this.editSubscriptions.push(quantitySub);

      this.editProductsFormArray.push(productForm);
    });

    (this.editForm as any).requestId = request.id;
    this.cdr.detectChanges();
  }

  // 🔥 NUEVO: Getter para el FormArray de edición
  get editProductsFormArray(): FormArray {
    return this.editForm.get('products') as FormArray;
  }

  // 🔥 NUEVO: Obtener FormGroup de edición
  getEditProductGroup(index: number): FormGroup {
    return this.editProductsFormArray.at(index) as FormGroup;
  }

  // 🔥 NUEVO: Agregar producto en edición
  addEditProduct() {
    const index = this.editProductsFormArray.length;
    const productForm = this.fb.group({
      productName: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      price: [{ value: 0, disabled: true }],
      total: [{ value: 0, disabled: true }]
    });

    this.editFilteredProductsMap[index] = [];
    this.editShowSuggestions[index] = false;

    const nameSub = productForm.get('productName')?.valueChanges.subscribe(name => {
      if (name && name.length > 0) {
        this.filterEditProducts(index, name);
        this.editShowSuggestions[index] = true;
        this.cdr.detectChanges();
      } else {
        this.editFilteredProductsMap[index] = [];
        this.editShowSuggestions[index] = false;
        this.cdr.detectChanges();
      }
    });

    const quantitySub = productForm.get('quantity')?.valueChanges.subscribe(() => {
      this.calculateEditProductTotal(productForm);
    });

    if (nameSub) this.editSubscriptions.push(nameSub);
    if (quantitySub) this.editSubscriptions.push(quantitySub);

    this.editProductsFormArray.push(productForm);
    this.editForm.updateValueAndValidity();
    this.cdr.detectChanges();
  }

  // 🔥 NUEVO: Eliminar producto en edición
  removeEditProduct(index: number) {
    this.editProductsFormArray.removeAt(index);

    // Reindexar
    const newMap: { [key: number]: Product[] } = {};
    const newShow: { [key: number]: boolean } = {};

    for (let i = 0; i < this.editProductsFormArray.length; i++) {
      newMap[i] = this.editFilteredProductsMap[i + 1] || [];
      newShow[i] = this.editShowSuggestions[i + 1] || false;
    }

    this.editFilteredProductsMap = newMap;
    this.editShowSuggestions = newShow;
    this.editForm.updateValueAndValidity();
    this.cdr.detectChanges();
  }

  // 🔥 NUEVO: Filtrar productos en edición
  filterEditProducts(index: number, searchTerm: string) {
    if (searchTerm && searchTerm.length > 0) {
      this.editFilteredProductsMap[index] = this.products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        p.available
      );
    } else {
      this.editFilteredProductsMap[index] = [];
    }
  }

  // 🔥 NUEVO: Calcular total en edición
  calculateEditProductTotal(productForm: FormGroup) {
    const price = productForm.get('price')?.value || 0;
    const quantity = productForm.get('quantity')?.value || 0;
    const total = price * quantity;
    productForm.patchValue({ total: total }, { emitEvent: false });
  }

  // src/app/features/orders/orders.component.ts

  selectEditProduct(productName: string, index: number) {
    console.log('✅ Seleccionando producto en edición:', productName, 'en índice:', index);

    const productForm = this.getEditProductGroup(index);
    const normalizedName = productName.toLowerCase().trim();

    // 🔥 PASO 1: Verificar si ya existe otro producto con el mismo nombre
    const existingIndex = this.findEditProductIndex(normalizedName, index);

    if (existingIndex !== -1) {
      // 🔥 YA EXISTE → sumar cantidad
      const existingGroup = this.editProductsFormArray.at(existingIndex) as FormGroup;
      const existingQuantity = existingGroup.get('quantity')?.value || 0;
      const currentQuantity = productForm.get('quantity')?.value || 1;
      const newQuantity = existingQuantity + currentQuantity;

      existingGroup.patchValue({ quantity: newQuantity });
      this.calculateEditProductTotal(existingGroup);

      // 🔥 Eliminar la fila actual
      this.editProductsFormArray.removeAt(index);
      this.reindexEditSuggestions();

      console.log(`🔄 Producto fusionado en edición: ${productName} → cantidad total ${newQuantity}`);
      this.cdr.detectChanges();
      return;
    }

    // 🔥 PASO 2: NO EXISTE → comportamiento normal
    productForm.patchValue({ productName: productName });
    this.editFilteredProductsMap[index] = [];
    this.editShowSuggestions[index] = false;

    const product = this.products.find(p => p.name === productName);
    if (product) {
      const roundedPrice = this.roundPrice(product.priceSale);
      productForm.patchValue({ price: roundedPrice });
      this.calculateEditProductTotal(productForm);
    }

    this.cdr.detectChanges();
  }

  // 🔥 NUEVO: Buscar si un producto ya existe en la lista (edición)
  private findEditProductIndex(normalizedName: string, excludeIndex: number = -1): number {
    for (let i = 0; i < this.editProductsFormArray.length; i++) {
      if (i === excludeIndex) continue;

      const group = this.editProductsFormArray.at(i) as FormGroup;
      const name = group.get('productName')?.value;

      if (name && name.toLowerCase().trim() === normalizedName) {
        return i;
      }
    }
    return -1;
  }

  // 🔥 NUEVO: Reindexar sugerencias (edición) después de eliminar una fila
  private reindexEditSuggestions(): void {
    const newMap: { [key: number]: Product[] } = {};
    const newShow: { [key: number]: boolean } = {};

    for (let i = 0; i < this.editProductsFormArray.length; i++) {
      newMap[i] = this.editFilteredProductsMap[i] || [];
      newShow[i] = this.editShowSuggestions[i] || false;
    }

    this.editFilteredProductsMap = newMap;
    this.editShowSuggestions = newShow;
  }

  // 🔥 NUEVO: Focus en producto de edición
  onEditFocusProduct(index: number) {
    if (this.blurTimeout) {
      clearTimeout(this.blurTimeout);
      this.blurTimeout = null;
    }
    const productForm = this.getEditProductGroup(index);
    const productName = productForm.get('productName')?.value;
    if (productName && productName.length > 0) {
      this.filterEditProducts(index, productName);
      this.editShowSuggestions[index] = true;
      this.cdr.detectChanges();
    }
  }

  // 🔥 NUEVO: Blur en producto de edición
  onEditBlurProduct(index: number) {
    this.blurTimeout = setTimeout(() => {
      this.editShowSuggestions[index] = false;
      this.blurTimeout = null;
      this.cdr.detectChanges();
    }, 200);
  }

  // 🔥 NUEVO: Obtener sugerencias de edición
  getEditSuggestions(index: number): Product[] {
    return this.editFilteredProductsMap[index] || [];
  }

  //  NUEVO: Mostrar sugerencias de edición
  shouldShowEditSuggestions(index: number): boolean {
    return this.editShowSuggestions[index] || false;
  }

  //  NUEVO: Guardar cambios del pedido
  saveEditRequest() {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      this.editProductsFormArray.controls.forEach(control => control.markAsTouched());
      alert('❌ Por favor corrige los errores del formulario');
      return;
    }

    const requestId = (this.editForm as any).requestId;
    if (!requestId) {
      alert('❌ Error: No se encontró el ID del pedido');
      return;
    }

    this.loading = true;
    const formValue = this.editForm.value;

    const requestDto = {
      customerName: formValue.customerName,
      priceListId: formValue.priceListId,
      deliveryDate: this.selectedDate,
      requestProdDtoList: formValue.products.map((p: any) => ({
        productName: p.productName,
        quantity: p.quantity
      }))
    };

    console.log('📤 Actualizando pedido:', requestId, requestDto);

    this.requestService.updateRequest(requestId, requestDto).subscribe({
      next: (response) => {
        console.log('✅ Pedido actualizado:', response);
        this.loading = false;
        this.closeEditModal();
        this.loadSummary(); // Recargar el resumen
        alert('✅ Pedido actualizado exitosamente!');
      },
      error: (error) => {
        this.loading = false;
        console.error('❌ Error updating request:', error);
        alert('❌ Error al actualizar el pedido: ' + (error.message || 'Error desconocido'));
      }
    });
  }

  // 🔥 NUEVO: Cerrar modal de edición
  closeEditModal() {
    this.showEditModal = false;
    this.editingCustomer = null;
    this.editForm.reset();
    this.editProductsFormArray.clear();
    this.editFilteredProductsMap = {};
    this.editShowSuggestions = {};
    this.editSubscriptions.forEach(sub => sub.unsubscribe());
    this.editSubscriptions = [];
  }

  // 🔥 NUEVO: Eliminar pedido de cliente
  deleteCustomerRequest(customer: CustomerDetail) {
    if (!confirm(`¿Estás seguro de eliminar el pedido de ${customer.customerName}?`)) {
      return;
    }

    this.loading = true;

    // Buscar el request por nombre de cliente
    this.requestService.getRequestsByDeliveryDate(this.selectedDate).subscribe({
      next: (requests) => {
        const request = requests.find(r => r.customerName === customer.customerName);
        if (request) {
          this.requestService.deleteRequest(request.id).subscribe({
            next: () => {
              console.log('✅ Pedido eliminado');
              this.loading = false;
              this.loadSummary();
              alert('✅ Pedido eliminado exitosamente!');
            },
            error: (error) => {
              this.loading = false;
              console.error('❌ Error deleting request:', error);
              alert('❌ Error al eliminar el pedido');
            }
          });
        } else {
          this.loading = false;
          alert('❌ No se encontró el pedido');
        }
      },
      error: (error) => {
        this.loading = false;
        console.error('❌ Error loading requests:', error);
        alert('❌ Error al buscar el pedido');
      }
    });
  }

  //----------Para recargar precios de la nueva lista recargada-------
  // 🔥 NUEVO: Al cambiar la lista en el modal de edición, recargar productos
  onEditPriceListChange() {
    const priceListId = this.editForm.get('priceListId')?.value;

    if (!priceListId) return;

    console.log('🔄 [Edición] Cambiando a lista:', priceListId);

    // Recargar productos con el precio de la lista
    this.productService.getProductsByPriceList(priceListId).subscribe({
      next: (data) => {
        this.products = data;
        console.log(`📦 [Edición] Productos recargados con precios de lista ${priceListId}:`, this.products.length);

        // 🔥 Recalcular precios SOLO del formulario de edición
        this.recalculateEditFormProductPrices();
      },
      error: (error) => {
        console.error('❌ Error loading products by price list:', error);
        alert('Error al cargar productos con la lista seleccionada');
      }
    });
  }

  // 🔥 NUEVO: Recalcular precios solo del formulario de edición
  private recalculateEditFormProductPrices() {
    for (let i = 0; i < this.editProductsFormArray.length; i++) {
      const productForm = this.getEditProductGroup(i);
      const productName = productForm.get('productName')?.value;

      if (productName) {
        const product = this.products.find(p => p.name === productName);
        if (product) {
          const roundedPrice = this.roundPrice(product.priceSale);
          productForm.patchValue({ price: roundedPrice });
          this.calculateEditProductTotal(productForm);
        }
      }
    }
    this.cdr.detectChanges();
  }

  // 🔥 NUEVO: Calcular el total de items de un cliente (sumando cantidades)
  getCustomerTotalItems(customer: CustomerDetail): number {
    let total = 0;
    if (customer.products) {
      customer.products.forEach(p => {
        total += p.quantity || 0;
      });
    }
    return total;
  }

}