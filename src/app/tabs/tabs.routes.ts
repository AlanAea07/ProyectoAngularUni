import { Routes } from '@angular/router';
import { TabsPage } from './tabs.page';

export const tabsRoutes: Routes = [
  {
    path: '',
    component: TabsPage,
    children: [
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
        path: '',
        redirectTo: 'inicio',
        pathMatch: 'full',
      },
    ],
  },
];
