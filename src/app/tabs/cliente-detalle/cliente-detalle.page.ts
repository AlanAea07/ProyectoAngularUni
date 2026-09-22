import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonContent,
  IonCard,
  IonCardContent,
  IonButton,
  IonIcon,
  IonList,
  IonItem,
  IonLabel,
  IonNote,
  IonSpinner,
} from '@ionic/angular';
import { ClientesService } from '../../services/clientes.service';
import { MovimientosService, Movimiento } from '../../services/movimientos.service';
import { Cliente } from '../../models/cliente.model';


@Component({
  selector: 'app-cliente-detalle',
  standalone: true,
  templateUrl: './cliente-detalle.page.html',
  styleUrls: ['./cliente-detalle.page.scss'],
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonContent,
    IonCard,
    IonCardContent,
    IonButton,
    IonIcon,
    IonList,
    IonItem,
    IonLabel,
    IonNote,
    IonSpinner,
  ],
})
export class ClienteDetallePage implements OnInit {

  clienteId = 0;

  cliente = signal<Cliente | null>(null);
  fiados = signal<Movimiento[]>([]);
  cargando = signal(true);
  errorMsg = signal('');

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private clientesService: ClientesService,
    private movimientos: MovimientosService
  ) {}

  ngOnInit() {
    this.clienteId = Number(this.route.snapshot.paramMap.get('id'));
  }

  // Se vuelve a llamar cada vez que regresamos de registrar un fiado, así
  // el saldo y el historial siempre reflejan el último movimiento.
  ionViewWillEnter() {
    if (this.clienteId) {
      this.cargarTodo();
    }
  }

  private async cargarTodo() {
    this.cargando.set(true);
    this.errorMsg.set('');

    try {
      const [respCliente, respFiados] = await Promise.all([
        this.clientesService.getCliente(this.clienteId),
        this.movimientos.historial(this.clienteId),
      ]);

      if (respCliente.success) {
        this.cliente.set(respCliente.cliente || null);
      } else {
        this.errorMsg.set(respCliente.message || 'No se pudo cargar el cliente');
      }

      if (respFiados.success) {
        this.fiados.set(respFiados.movimientos || []);
      }
    } catch (error) {
      console.error('Error al cargar detalle de cliente:', error);
      this.errorMsg.set('Error al conectar con el servidor.');
    } finally {
      this.cargando.set(false);
    }
  }

  irAPago(liquidar = false) {
    void this.router.navigate(['/tabs/registrar-pago', this.clienteId], {queryParams: {liquidar: liquidar ? '1' : '0'}});
  }

  irARegistrarFiado() {
    this.router.navigateByUrl(`/tabs/registrar-fiado/${this.clienteId}`);
  }
}
