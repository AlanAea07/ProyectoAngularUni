import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonSearchbar, IonList, IonItem, IonLabel, IonNote, IonSpinner, IonButton } from '@ionic/angular';
import { MovimientosService, Movimiento } from '../../services/movimientos.service';
@Component({
  selector: 'app-historial', standalone: true, templateUrl: './historial.page.html',
  imports: [CommonModule, RouterLink, IonContent, IonHeader, IonTitle, IonToolbar, IonSearchbar, IonList, IonItem, IonLabel, IonNote, IonSpinner, IonButton],
})
export class HistorialPage {
  private servicio = inject(MovimientosService);
  movimientos = signal<Movimiento[]>([]);
  busqueda = signal('');
  cargando = signal(false);
  error = signal('');
  filtrados = computed(() => this.movimientos().filter(m =>
    `${m.cliente_nombre} ${m.tipo} ${m.detalle || ''} ${m.metodo_pago || ''}`.toLowerCase().includes(this.busqueda().toLowerCase())));
  async ionViewWillEnter() {
    this.cargando.set(true); this.error.set('');
    try { this.movimientos.set((await this.servicio.historial()).movimientos); }
    catch { this.error.set('No se pudo cargar el historial.'); }
    finally { this.cargando.set(false); }
  }
}
