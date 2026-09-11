import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardContent,
  IonGrid,
  IonRow,
  IonCol,
  IonButton,
  IonIcon,
} from '@ionic/angular';

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

  // TODO: reemplazar con datos reales del endpoint del dashboard cuando exista
  nombreUsuario = 'Demo';
  deudaTotal = 8450.0;
  clientesConDeuda = 23;
  fiadosHoy = 4;
  abonosHoy = 620.0;

  constructor(private router: Router) {}

  ngOnInit() {
    // Aquí luego cargas los datos reales, ej: this.cargarResumen();
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
}
