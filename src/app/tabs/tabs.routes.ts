import { Routes } from '@angular/router';
import { TabsPage } from './tabs.page';

export const tabsRoutes: Routes = [
  {
    path: '',
    component: TabsPage,
    children: [
      { path: 'registrar-pago', loadComponent: () => import('./registrar-pago/registrar-pago.page').then(m => m.RegistrarPagoPage) },
      { path: 'registrar-pago/:id', loadComponent: () => import('./registrar-pago/registrar-pago.page').then(m => m.RegistrarPagoPage) },
      {
        path: 'inicio',
        loadComponent: () => import('./inicio/inicio.page').then((m) => m.InicioPage),
      },
      {
        path: 'clientes',
        loadComponent: () => import('./clientes/clientes.page').then((m) => m.ClientesPage),
      },
      {
        path: 'historial',
        loadComponent: () => import('./historial/historial.page').then((m) => m.HistorialPage),
      },
      {
        path: 'cliente-detalle/:id',
        loadComponent: () =>
          import('./cliente-detalle/cliente-detalle.page').then((m) => m.ClienteDetallePage),
      },
      {
        path: 'registrar-fiado/:id',
        loadComponent: () =>
          import('./registrar-fiado/registrar-fiado.page').then((m) => m.RegistrarFiadoPage),
      },
      {
        path: '',
        redirectTo: 'inicio',
        pathMatch: 'full',
      },
    ],
  },
];
