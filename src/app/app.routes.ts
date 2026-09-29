// src/app/app.routes.ts
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layouts/main-layout/main-layout.component')
      .then(m => m.MainLayoutComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component')
          .then(m => m.DashboardComponent)
      },
      {
        path: 'orders',
        loadComponent: () => import('./features/orders/orders.component')
          .then(m => m.OrdersComponent)
      },
      {
        path: 'products',
        loadComponent: () => import('./features/products/products.component')
          .then(m => m.ProductsComponent)
      },
      {
        path: 'reports',
        loadComponent: () => import('./features/reports/reports.component')
          .then(m => m.ReportsComponent)
      },
      {
        path: '',
        redirectTo: 'orders',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];