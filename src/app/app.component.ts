import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular';
import { ConexionBannerComponent } from './conexion-banner.component';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet, ConexionBannerComponent],
  styles: [`.contenido-app {position: relative; flex: 1; min-height: 0;}`],
})
export class AppComponent {
  constructor() {}
}
