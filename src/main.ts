import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withComponentInputBinding, withPreloading, PreloadAllModules } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  homeOutline,
  logOutOutline,
  peopleOutline,
  timeOutline,
  addCircleOutline,
  cashOutline,
  add,
  personCircleOutline,
} from 'ionicons/icons';

addIcons({
  'home-outline': homeOutline,
  'log-out-outline': logOutOutline,
  'people-outline': peopleOutline,
  'time-outline': timeOutline,
  'add-circle-outline': addCircleOutline,
  'cash-outline': cashOutline,
  'add': add,
  'person-circle-outline': personCircleOutline,
});

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { authInterceptor } from './app/services/auth.interceptor';

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideRouter(routes, withPreloading(PreloadAllModules), withComponentInputBinding()),
  ],
});
