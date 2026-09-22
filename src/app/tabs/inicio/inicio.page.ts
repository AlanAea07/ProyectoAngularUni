import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonContent,
  IonCard,
  IonCardContent,
  IonGrid,
  IonRow,
  IonCol,
  IonButton,
  IonIcon,
} from '@ionic/angular';
import { MovimientosService } from '../../services/movimientos.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-inicio',
  templateUrl: 'inicio.page.html',
  styleUrls: ['inicio.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonContent,
    IonCard,
    IonCardContent,
    IonGrid,
    IonRow,
    IonCol,
    IonButton,
    IonIcon,
  ],
})
export class InicioPage implements OnInit {

  nombreUsuario = 'Usuario';
  rolUsuario = '';
  negocioNombre = '';

  deudaTotal = signal(0);
  clientesConDeuda = signal(0);
  fiadosHoy = signal(0);
  abonosHoy = signal(0);
  error = signal('');
  cargando = signal(false);

  async ionViewWillEnter() {
    this.ngOnInit();
    this.cargando.set(true); this.error.set('');
    try {
      const {resumen} = await this.movimientos.resumen();
      this.deudaTotal.set(Number(resumen.deuda_total));
      this.clientesConDeuda.set(Number(resumen.clientes_con_deuda));
      this.fiadosHoy.set(resumen.fiados_hoy);
      this.abonosHoy.set(resumen.abonos_hoy);
    } catch { this.error.set('No se pudo cargar el resumen.'); }
    finally { this.cargando.set(false); }
  }

  constructor(
    private router: Router,
    private movimientos: MovimientosService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    const usuario = this.authService.obtenerUsuarioActual();
    if (usuario) {
      this.nombreUsuario = usuario.nombre;
      this.rolUsuario = usuario.rol;
      this.negocioNombre = usuario.negocioNombre;
    }
  }

  irANuevoFiado() {
    // Un fiado siempre es de un cliente específico: mandamos a elegirlo primero.
    this.router.navigateByUrl('/tabs/clientes');
  }

  irAClientes() {
    this.router.navigateByUrl('/tabs/clientes');
  }

  irAPagos() {
    this.router.navigateByUrl('/tabs/registrar-pago');
  }

  async cerrarSesion() {
    try { await this.authService.salir(); } catch { /* La sesión local se elimina incluso sin red. */ }
    this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}
