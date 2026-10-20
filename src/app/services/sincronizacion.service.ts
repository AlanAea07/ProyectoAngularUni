import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { ApiClient } from './api-client.service';
import { CacheService } from './cache.service';
import { ColaService, OperacionPendiente } from './cola.service';
import { ConexionService } from './conexion.service';
import { ServidorService } from './servidor.service';
import { mensajeError } from './resiliencia.interceptor';

@Injectable({providedIn: 'root'})
export class SincronizacionService {
  private api = inject(ApiClient);
  private cache = inject(CacheService);
  private servidor = inject(ServidorService);
  private conexion = inject(ConexionService);
  cola = inject(ColaService);
  ocupada = signal(false);
  resultado = signal('');
  ultima = signal<{contexto: string; fecha: number} | null>(null);
  actualizada = new Subject<void>();
  private trabajo?: Promise<void>;
  private iniciada = false;
  private destroy = inject(DestroyRef);

  pendientes(): OperacionPendiente[] {
    if (!this.api.sesionValida()) return [];
    try { return this.cola.listar(this.api.contexto()); } catch { return []; }
  }
  ultimaFecha(): number | null {
    return this.api.sesionValida() && this.ultima()?.contexto === this.api.contexto() ? this.ultima()!.fecha : null;
  }
  iniciar(): void {
    if (this.iniciada) return;
    this.iniciada = true;
    const recuperar = () => { if (this.api.sesionValida()) void this.sincronizar(); };
    const visible = () => { if (document.visibilityState === 'visible') recuperar(); };
    window.addEventListener('online', recuperar);
    document.addEventListener('visibilitychange', visible);
    const timer = setInterval(() => {
      if (document.visibilityState !== 'hidden' && (this.pendientes().some(p => p.estado === 'pendiente') ||
          this.conexion.servidor() !== 'disponible' || Object.keys(this.conexion.copias()).length ||
          this.ultima()?.contexto !== this.api.contexto())) recuperar();
    }, 30_000);
    this.destroy.onDestroy(() => {
      clearInterval(timer);
      window.removeEventListener('online', recuperar);
      document.removeEventListener('visibilitychange', visible);
      this.actualizada.complete();
    });
    recuperar();
  }
  descartarRechazada(id: string): void {
    if (this.ocupada() || !this.pendientes().some(p => p.id === id && p.estado === 'rechazada')) return;
    this.cola.quitar(this.api.contexto(), id);
    void this.sincronizar();
  }
  sincronizar(): Promise<void> {
    if (this.trabajo) return this.trabajo;
    this.ocupada.set(true);
    this.trabajo = this.ejecutar().finally(() => { this.ocupada.set(false); this.trabajo = undefined; });
    return this.trabajo;
  }
  private async ejecutar(): Promise<void> {
    const contexto = this.api.contexto(), token = localStorage.getItem('token');
    const vigente = () => contexto === this.api.contexto() && token === localStorage.getItem('token');
    const rutas = new Set(['clientes.php', 'dashboard.php', 'historial.php',
      ...this.cache.rutas(this.cache.scope(), this.servidor.apiUrl())]);
    this.resultado.set('');
    try {
      await this.api.getRemoto('estado.php');
      if (!vigente() || !this.api.sesionValida()) return;
      await this.api.enviarPendientes();
      if (!vigente() || !this.api.sesionValida()) return;
      // Un fallo temporal del envío conserva la cola y se reintenta más tarde.
      if (this.conexion.servidor() === 'inaccesible') {
        this.resultado.set('Envío pendiente. Se reintentará automáticamente.'); return;
      }
      const revision = this.cache.revision;
      for (const ruta of rutas) {
        if (!vigente() || revision !== this.cache.revision) return;
        try {
          const respuesta = await this.api.getRemoto<{success: boolean}>(ruta);
          if (!respuesta.success) throw new Error('El servidor no pudo actualizar las consultas.');
        } catch (error) {
          // Un detalle eliminado/desactivado no debe bloquear las demás consultas.
          if ((error as {status?: number}).status !== 404) throw error;
        }
      }
      if (!vigente() || revision !== this.cache.revision) return;
      this.ultima.set({contexto, fecha: Date.now()});
      if (!this.pendientes().length) this.conexion.mensaje.set('');
      this.resultado.set(this.pendientes().length ? 'Consultas actualizadas. Revisa las operaciones pendientes.' :
        'Información sincronizada con el servidor.');
      this.actualizada.next();
    } catch (error) {
      if (vigente()) this.resultado.set(mensajeError(error));
    }
  }
}
