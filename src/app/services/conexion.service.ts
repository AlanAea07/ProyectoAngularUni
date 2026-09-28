import { DestroyRef, Injectable, inject, signal } from '@angular/core';

@Injectable({providedIn: 'root'})
export class ConexionService {
  redDisponible = signal(navigator.onLine);
  servidor = signal<'pendiente' | 'disponible' | 'inaccesible'>('pendiente');
  copias = signal<Record<string, number>>({});
  mensaje = signal('');
  constructor() {
    const actualizar = () => this.redDisponible.set(navigator.onLine);
    window.addEventListener('online', actualizar);
    window.addEventListener('offline', actualizar);
    inject(DestroyRef).onDestroy(() => {
      window.removeEventListener('online', actualizar);
      window.removeEventListener('offline', actualizar);
    });
  }
  actualizada(url: string): void {
    this.servidor.set('disponible');
    this.copias.update(valores => { const copia = {...valores}; delete copia[url]; return copia; });
  }
  limpiar(): void { this.copias.set({}); this.mensaje.set(''); }
}
