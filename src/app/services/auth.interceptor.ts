import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';
import { ConexionService } from './conexion.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const conexion = inject(ConexionService);
  const esApi = req.url.startsWith(environment.apiUrl + '/');
  const token = auth.obtenerToken();
  return next(esApi && token ? req.clone({setHeaders: {Authorization: `Bearer ${token}`}}) : req).pipe(
    catchError(error => {
      if (esApi && error.status === 401 && !req.url.endsWith('/login.php') && token === auth.obtenerToken()) {
        auth.cerrarSesion();
        conexion.mensaje.set('La sesión expiró. Inicia sesión nuevamente.');
        void router.navigateByUrl('/login', {replaceUrl: true});
      }
      return throwError(() => error);
    })
  );
};
