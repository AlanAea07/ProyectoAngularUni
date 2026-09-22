import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonContent,
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
  IonButton,
  IonSpinner,
  IonNote,
} from '@ionic/angular';
import { ClientesService } from '../../services/clientes.service';
import { FiadosService } from '../../services/fiados.service';
import { Cliente } from '../../models/cliente.model';

@Component({
  selector: 'app-registrar-fiado',
  standalone: true,
  templateUrl: './registrar-fiado.page.html',
  styleUrls: ['./registrar-fiado.page.scss'],
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonContent,
    IonItem,
    IonLabel,
    IonInput,
    IonTextarea,
    IonButton,
    IonSpinner,
    IonNote,
  ],
})
export class RegistrarFiadoPage {

  clienteId = 0;
  cliente = signal<Cliente | null>(null);

  monto: number | null = null;
  detalle = '';

  guardando = signal(false);
  errorMsg = signal('');

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private clientesService: ClientesService,
    private fiadosService: FiadosService
  ) {}

  async ionViewWillEnter() {
    this.monto = null; this.detalle = ''; this.errorMsg.set(''); this.cliente.set(null);
    this.clienteId = Number(this.route.snapshot.paramMap.get('id'));

    try {
      const resp = await this.clientesService.getCliente(this.clienteId);
      if (resp.success) {
        this.cliente.set(resp.cliente || null);
      }
    } catch (error) {
      this.errorMsg.set('No se pudo cargar el cliente. Regresa a Clientes e intenta de nuevo.');
      console.error('Error al cargar cliente:', error);
    }
  }

  async guardar() {
    if (this.guardando()) return;
    this.errorMsg.set('');

    if (!this.cliente()?.activo || !this.monto || !Number.isFinite(this.monto) || this.monto <= 0 || Math.abs(this.monto * 100 - Math.round(this.monto * 100)) > 0.00001) {
      this.errorMsg.set('Ingresa un monto válido, mayor a 0');
      return;
    }

    if (this.monto > (this.cliente()?.credito_disponible ?? 0)) {
      this.errorMsg.set('El monto supera el crédito disponible del cliente.');
      return;
    }
    this.guardando.set(true);

    try {
      const resp = await this.fiadosService.registrarFiado(this.clienteId, this.monto, this.detalle);

      if (resp.success) {
        // El fiado ya quedó guardado en el historial (no se puede editar
        // ni borrar); regresamos al detalle del cliente para verlo reflejado.
        this.router.navigateByUrl(`/tabs/cliente-detalle/${this.clienteId}`, { replaceUrl: true });
      } else {
        this.errorMsg.set(resp.message || 'No se pudo registrar el fiado');
      }
    } catch (error) {
      console.error('Error al registrar fiado:', error);
      this.errorMsg.set((error as {error?:{message?:string}})?.error?.message || 'Error al conectar con el servidor.');
    } finally {
      this.guardando.set(false);
    }
  }
}
