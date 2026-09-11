import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';

@Component({
  selector: 'app-historial',
  standalone: true,
  templateUrl: './historial.page.html',
  styleUrls: ['./historial.page.scss'],
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule],
})
export class HistorialPage implements OnInit {

  constructor() {}

  ngOnInit() {}
}
