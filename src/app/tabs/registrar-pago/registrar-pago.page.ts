import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent, IonSearchbar,
  IonList, IonItem, IonLabel, IonButton, IonInput, IonSelect, IonSelectOption, IonSpinner } from '@ionic/angular';
import { ClientesService } from '../../services/clientes.service';
import { MovimientosService } from '../../services/movimientos.service';
import { Cliente } from '../../models/cliente.model';

@Component({
  selector: 'app-registrar-pago', standalone: true, templateUrl: './registrar-pago.page.html',
  imports: [CommonModule, FormsModule, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent,
    IonSearchbar, IonList, IonItem, IonLabel, IonButton, IonInput, IonSelect, IonSelectOption, IonSpinner],
})
export class RegistrarPagoPage {
  private clientesService = inject(ClientesService);
  private movimientos = inject(MovimientosService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  clientes = signal<Cliente[]>([]);
  cliente = signal<Cliente | null>(null);
  busqueda = signal('');
  filtrados = computed(() => this.clientes().filter(c =>
    `${c.nombre} ${c.telefono || ''}`.toLocaleLowerCase().includes(this.busqueda().toLocaleLowerCase())));
  cargando = signal(false);
  guardando = signal(false);
  error = signal('');
  exito = signal('');
  monto: number | null = null;
  metodo = 'efectivo';
  private clave = '';

  async ionViewWillEnter() {
    this.cliente.set(null); this.monto = null; this.error.set(''); this.exito.set('');
    this.clave = crypto.randomUUID();
    this.cargando.set(true);
    try {
      const resp = await this.clientesService.getClientes();
      this.clientes.set(resp.clientes || []);
      const id = Number(this.route.snapshot.paramMap.get('id'));
      if (id) {
        const detalle = await this.clientesService.getCliente(id);
        this.seleccionar(detalle.cliente!);
        if (this.route.snapshot.queryParamMap.get('liquidar') === '1') this.liquidar();
      }
    } catch { this.error.set('No se pudieron cargar los clientes. Intenta de nuevo.'); }
    finally { this.cargando.set(false); }
  }
  seleccionar(cliente: Cliente) {
    this.cliente.set(cliente); this.monto = null; this.error.set(''); this.exito.set('');
    this.clave = crypto.randomUUID();
  }
  liquidar() { this.monto = this.cliente()?.saldo || null; }
  async guardar() {
    if (this.guardando() || this.exito()) return;
    this.error.set('');
    const c = this.cliente();
    const monto = Number(this.monto);
    if (!c || !Number.isFinite(monto) || monto <= 0 || monto > c.saldo ||
        Math.abs(monto * 100 - Math.round(monto * 100)) > 0.00001) {
      this.error.set('Ingresa un monto mayor a cero, con máximo dos decimales, sin superar el saldo.'); return;
    }
    this.guardando.set(true);
    try {
      const resp = await this.movimientos.pagar(c.id, monto, this.metodo, this.clave);
      if (!resp.success) { this.error.set(resp.message || 'No se pudo guardar el pago.'); return; }
      this.cliente.set({...c, saldo: resp.saldo_actualizado});
      this.exito.set('Pago registrado correctamente.');
    } catch (error: unknown) {
      this.error.set((error as {error?: {message?: string}})?.error?.message || 'No se pudo confirmar el pago. Reintenta sin cambiar los datos; no se duplicará.');
    } finally { this.guardando.set(false); }
  }
  verHistorial() { void this.router.navigateByUrl(`/tabs/cliente-detalle/${this.cliente()!.id}`, {replaceUrl: true}); }
}
