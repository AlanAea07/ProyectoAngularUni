import { Component, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { SincronizacionService } from './services/sincronizacion.service';
import { ServidorService } from './services/servidor.service';
import { CacheService } from './services/cache.service';
import { ConexionService } from './services/conexion.service';

@Component({
  selector: 'app-conexion-banner', standalone: true, imports: [DatePipe],
  template: `
    <aside aria-label="Estado de conexión" aria-live="polite" class="conexion" [class.aviso]="!conexion.redDisponible() || conexion.servidor() === 'inaccesible' || cantidad()">
      <span>{{ estado() }}</span>
      <span>Origen: {{servidor.apiUrl()}}</span>
      @if (cantidad()) {
        <span>Consulta local · {{cantidad()}} consulta(s) con copia desde {{fecha() | date:'dd/MM/yyyy HH:mm'}}. Los saldos pueden estar desactualizados. Al reconectar se actualizarán las consultas. Si tienes un formulario abierto, vuelve a abrirlo para consultar el saldo vigente.</span>
      }
      @if (sync.pendientes().length) {
        <details><summary>{{sync.pendientes().length}} operación(es) local(es) pendiente(s)</summary>
          <p>Los saldos mostrados son los últimos confirmados. Los pendientes se validarán al enviarse.</p>
          @for (op of sync.pendientes(); track op.id) {
            <div><strong>{{etiqueta(op.ruta)}}</strong> · {{op.fecha | date:'dd/MM HH:mm'}} · {{op.estado}}
              <span>{{detalle(op.datos)}}</span>
              @if (op.error) { <p role="alert">{{op.error}}</p> }
              @if (op.estado === 'rechazada') {
                <button type="button" [disabled]="sync.ocupada()" (click)="sync.descartarRechazada(op.id)">Descartar rechazo y continuar</button>
              }
            </div>
          }
        </details>
      }
      @if (sync.resultado()) { <span role="status">{{sync.resultado()}}</span> }
      @if (sync.ultimaFecha(); as ultima) { <span>Última sincronización: {{ultima | date:'dd/MM/yyyy HH:mm'}}</span> }
      @if (sync.cola.advertencia()) { <span role="alert">{{sync.cola.advertencia()}}</span> }
      @if (cache.advertencia()) { <span>{{cache.advertencia()}}</span> }
      @if (conexion.mensaje()) { <span role="alert">{{conexion.mensaje()}}</span> }
      <button type="button" (click)="comprobar()" [disabled]="sync.ocupada()">{{sync.ocupada() ? 'Sincronizando…' : 'Sincronizar / comprobar conexión'}}</button>
      @if (conexion.mensaje()) { <button type="button" (click)="conexion.mensaje.set('')">Cerrar aviso</button> }
    </aside>`,
  styles: [`:host{display:block;flex:none;z-index:20}.conexion{background:#f3f6f3;color:#284935;padding:8px 16px;display:flex;gap:8px 16px;align-items:center;flex-wrap:wrap;font-size:13px;border-bottom:1px solid #ddd}.aviso{background:#fff3df;color:#654719}.conexion span{overflow-wrap:anywhere}.conexion button{background:white;color:#843b3e;border:1px solid #cdb9b9;border-radius:8px;padding:6px 10px;cursor:pointer}.conexion button:disabled{opacity:.6}`]
})
export class ConexionBannerComponent {
  conexion = inject(ConexionService);
  cache = inject(CacheService);
  servidor = inject(ServidorService);
  sync = inject(SincronizacionService);
  constructor() { this.sync.iniciar(); }
  cantidad = computed(() => Object.keys(this.conexion.copias()).length);
  fecha = computed(() => Math.min(...Object.values(this.conexion.copias())));
  estado = computed(() => this.conexion.servidor() === 'inaccesible' ? 'Servidor no disponible' :
    !this.conexion.redDisponible() ? 'Sin conexión de red detectada · el servidor local puede seguir disponible' :
    this.conexion.servidor() === 'disponible' ? 'Servidor disponible' : 'Red detectada · servidor sin comprobar');
  comprobar() { return this.sync.sincronizar(); }
  etiqueta(ruta: string): string {
    return ({'clientes.php': 'Nuevo cliente', 'clientes_actualizar.php': 'Editar nombre',
      'clientes_desactivar.php': 'Desactivar cliente', 'fiados.php': 'Fiado', 'pagos.php': 'Pago'} as Record<string, string>)[ruta] || ruta;
  }
  detalle(datos: unknown): string {
    const d = datos as {nombre?: string; id?: number; cliente_id?: number; monto?: number};
    return [d.nombre, d.cliente_id || d.id ? `Cliente #${d.cliente_id || d.id}` : '',
      d.monto != null ? `$${d.monto}` : ''].filter(Boolean).join(' · ');
  }
}
