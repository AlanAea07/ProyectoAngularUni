import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { nuevaClaveOperacion } from './clave-operacion';

export type MetodoCambio = 'POST' | 'PATCH' | 'DELETE';
export interface OperacionPendiente {
  id: string;
  metodo: MetodoCambio;
  ruta: string;
  datos: unknown;
  fecha: number;
  estado: 'pendiente' | 'rechazada';
  error?: string;
}
export const COLA_KEY = 'fiados.pendientes.v1|';
export function admiteCola(metodo: string, ruta: string): boolean {
  return (metodo === 'POST' && ['clientes.php', 'fiados.php', 'pagos.php'].includes(ruta)) ||
    (metodo === 'PATCH' && ruta === 'clientes_actualizar.php') ||
    (metodo === 'DELETE' && ruta === 'clientes_desactivar.php');
}

/** Cola durable por servidor/negocio/usuario. Nunca contiene tokens. */
@Injectable({providedIn: 'root'})
export class ColaService {
  revision = signal(0);
  advertencia = signal('');
  constructor() {
    const actualizar = () => this.revision.update(n => n + 1);
    window.addEventListener('storage', actualizar);
    inject(DestroyRef).onDestroy(() => window.removeEventListener('storage', actualizar));
  }
  listar(contexto: string): OperacionPendiente[] {
    this.revision();
    try {
      const items = JSON.parse(localStorage.getItem(COLA_KEY + contexto) || '[]');
      if (!Array.isArray(items) || items.some(p => !p || typeof p.id !== 'string' ||
          !/^[a-zA-Z0-9-]{16,64}$/.test(p.id) || !admiteCola(p.metodo, p.ruta) ||
          !['pendiente', 'rechazada'].includes(p.estado) || typeof p.fecha !== 'number')) throw new Error();
      return items;
    } catch {
      this.advertencia.set('No se pueden leer los pendientes locales. No se sobrescribirán; revisa el almacenamiento del dispositivo.');
      throw new Error(this.advertencia());
    }
  }
  private guardar(contexto: string, items: OperacionPendiente[]): void {
    try { localStorage.setItem(COLA_KEY + contexto, JSON.stringify(items)); }
    catch { throw new Error('No hay almacenamiento local disponible. La operación NO se guardó ni se envió.'); }
    this.revision.update(n => n + 1);
  }
  agregar(contexto: string, metodo: MetodoCambio, ruta: string, datos: unknown): OperacionPendiente {
    const items = this.listar(contexto);
    // Doble clic o reintento manual: reutilizar la operación aún pendiente.
    const previa = items.find(p => p.metodo === metodo && p.ruta === ruta && JSON.stringify(p.datos) === JSON.stringify(datos));
    if (previa) return previa;
    if (items.length >= 100) throw new Error('Hay 100 operaciones pendientes. Sincroniza antes de registrar más.');
    const operacion: OperacionPendiente = {id: nuevaClaveOperacion(), metodo, ruta,
      datos: JSON.parse(JSON.stringify(datos)), fecha: Date.now(), estado: 'pendiente'};
    this.guardar(contexto, [...items, operacion]);
    return operacion;
  }
  rechazar(contexto: string, id: string, error: string): void {
    this.guardar(contexto, this.listar(contexto).map(p => p.id === id ? {...p, estado: 'rechazada', error} : p));
  }
  quitar(contexto: string, id: string): void {
    this.guardar(contexto, this.listar(contexto).filter(p => p.id !== id));
  }
}
