import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../environments/environment';
import { CacheService } from './services/cache.service';
import { ConexionService } from './services/conexion.service';

@Component({
  selector: 'app-conexion-banner', standalone: true, imports: [DatePipe],
  template: `
    <aside aria-label="Estado de conexión" aria-live="polite" class="conexion" [class.aviso]="!conexion.redDisponible() || conexion.servidor() === 'inaccesible' || cantidad()">
      <span>{{ estado() }}</span>
      @if (cantidad()) {
        <span>Consulta local · {{cantidad()}} consulta(s) con copia desde {{fecha() | date:'dd/MM/yyyy HH:mm'}}. Los saldos pueden estar desactualizados. Vuelve a abrir la pantalla para actualizarlos.</span>
      }
      @if (cache.advertencia()) { <span>{{cache.advertencia()}}</span> }
      @if (conexion.mensaje()) { <span role="alert">{{conexion.mensaje()}}</span> }
      <button type="button" (click)="comprobar()" [disabled]="comprobando()">{{comprobando() ? 'Comprobando…' : 'Comprobar conexión'}}</button>
      @if (conexion.mensaje()) { <button type="button" (click)="conexion.mensaje.set('')">Cerrar aviso</button> }
    </aside>`,
  styles: [`:host{display:block;flex:none;z-index:20}.conexion{background:#f3f6f3;color:#284935;padding:8px 16px;display:flex;gap:8px 16px;align-items:center;flex-wrap:wrap;font-size:13px;border-bottom:1px solid #ddd}.aviso{background:#fff3df;color:#654719}.conexion span{overflow-wrap:anywhere}.conexion button{background:white;color:#843b3e;border:1px solid #cdb9b9;border-radius:8px;padding:6px 10px;cursor:pointer}.conexion button:disabled{opacity:.6}`]
})
export class ConexionBannerComponent {
  conexion = inject(ConexionService);
  cache = inject(CacheService);
  private http = inject(HttpClient);
  comprobando = signal(false);
  cantidad = computed(() => Object.keys(this.conexion.copias()).length);
  fecha = computed(() => Math.min(...Object.values(this.conexion.copias())));
  estado = computed(() => this.conexion.servidor() === 'inaccesible' ? 'Servidor no disponible' :
    !this.conexion.redDisponible() ? 'Sin conexión de red detectada · el servidor local puede seguir disponible' :
    this.conexion.servidor() === 'disponible' ? 'Servidor disponible' : 'Red detectada · servidor sin comprobar');
  async comprobar() {
    if (this.comprobando()) return;
    this.comprobando.set(true); this.conexion.mensaje.set('');
    try { await firstValueFrom(this.http.get(`${environment.apiUrl}/estado.php`)); }
    catch { /* El interceptor muestra el motivo. */ }
    finally { this.comprobando.set(false); }
  }
}
