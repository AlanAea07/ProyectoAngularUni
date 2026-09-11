import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomepagePage),
  },
  {
    path: 'tab1',
    loadComponent: () => import('./tab1/tab1.page').then((m) => m.Tab1Page),
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },  {
    path: 'tab2',
    loadComponent: () => import('./pages/tab2/tab2.page').then( m => m.Tab2Page)
  },
  {
    path: 'tab2',
    loadComponent: () => import('./tab2/tab2.page').then( m => m.Tab2Page)
  },

];