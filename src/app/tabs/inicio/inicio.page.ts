import { Component, OnInit } from '@angular/core';
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

  // TODO: deudaTotal/clientesConDeuda/fiadosHoy/abonosHoy siguen fijos -
  // reemplazar con datos reales cuando exista el endpoint del dashboard.
  nombreUsuario = 'Usuario';
  deudaTotal = 8450.0;
  clientesConDeuda = 23;
  fiadosHoy = 4;
  abonosHoy = 620.0;

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit() {
    const usuario = this.authService.obtenerUsuarioActual();
    if (usuario) {
      this.nombreUsuario = usuario.nombre;
    }
  }

  irANuevoFiado() {
    this.router.navigateByUrl('/nuevo-fiado');
  }

  irAClientes() {
    this.router.navigateByUrl('/tabs/clientes');
  }

  irAPagos() {
    this.router.navigateByUrl('/pagos');
  }

  cerrarSesion() {
    this.authService.cerrarSesion();
    this.router.navigateByUrl('/login');
  }
}
