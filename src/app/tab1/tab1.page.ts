import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent
} from '@ionic/angular';

@Component({
  selector: 'app-tab1',
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent
  ],
  templateUrl: './tab1.page.html',
  styleUrls: ['./tab1.page.scss'],
})
export class Tab1Page implements OnInit {

  usuarioId: number = 0;
  usuarioNombre: string = '';

  constructor(
    private router: Router
  ) {}

  ngOnInit(): void {

    const usuarioIdStr = localStorage.getItem('usuario_id');

    if (!usuarioIdStr) {
      this.router.navigateByUrl('/login');
      return;
    }

    this.usuarioId = Number(usuarioIdStr);
    this.usuarioNombre = localStorage.getItem('usuario_nombre') || '';
  }

  logout(): void {
    localStorage.clear();
    this.router.navigateByUrl('/login');
  }
}