import { Injectable, signal } from '@angular/core';

interface Entrada { fecha: number; body: unknown; }
export const CACHE_KEY = 'fiados.consultas.v1';
export const CACHE_TTL = 24 * 60 * 60 * 1000;

/** Copia de consultas, nunca una cola de pagos ni la fuente oficial del saldo. */
@Injectable({providedIn: 'root'})
export class CacheService {
  advertencia = signal('');
  revision = 0;
  scope(): string {
    return `${localStorage.getItem('negocio_id') || ''}:${localStorage.getItem('usuario_id') || ''}`;
  }
  private leer(): Record<string, Entrada> {
    try {
      const valor = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
      return valor && typeof valor === 'object' && !Array.isArray(valor) ? valor : {};
    } catch { return {}; }
  }
  obtener(scope: string, url: string): Entrada | null {
    const entrada = this.leer()[`${scope}|${url}`];
    if (!entrada || typeof entrada.fecha !== 'number' || entrada.fecha > Date.now() ||
        Date.now() - entrada.fecha > CACHE_TTL || !entrada.body) return null;
    return entrada;
  }
  guardar(scope: string, url: string, body: unknown): void {
    const entradas = this.leer();
    entradas[`${scope}|${url}`] = {fecha: Date.now(), body};
    const recientes = Object.entries(entradas)
      .filter(([, e]) => e && Date.now() - e.fecha <= CACHE_TTL)
      .sort((a, b) => b[1].fecha - a[1].fecha).slice(0, 30);
    // Máximo aproximado de 1 MB de texto UTF-16; descartar primero lo más antiguo.
    while (recientes.length && JSON.stringify(Object.fromEntries(recientes)).length > 500_000) recientes.pop();
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(recientes)));
      this.advertencia.set(recientes.some(([key]) => key === `${scope}|${url}`) ? '' :
        'Esta consulta es demasiado grande para guardarse sin conexión.');
    } catch {
      this.advertencia.set('El navegador no pudo guardar la copia local. Esta consulta requiere conexión.');
    }
  }
  limpiar(): void {
    this.revision++;
    try { localStorage.removeItem(CACHE_KEY); } catch { /* Almacenamiento no disponible. */ }
    this.advertencia.set('');
  }
}
