import { Component } from '@angular/core';
import { IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, IonRouterOutlet } from '@ionic/angular';

@Component({
  selector: 'app-tabs',
  standalone: true,
  templateUrl: 'tabs.page.html',
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, IonRouterOutlet],
})
export class TabsPage {}
