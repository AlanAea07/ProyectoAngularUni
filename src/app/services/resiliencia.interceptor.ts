import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, of, tap, throwError, timeout, TimeoutError } from 'rxjs';
import { environment } from '../../environments/environment';
import { CacheService } from './cache.service';
import { ConexionService } from './conexion.service';

export function mensajeError(error: unknown, defecto = 'No se pudo completar la operación.'): string {
  const mensaje = (error as {error?: {message?: unknown}})?.error?.message;
  return typeof mensaje === 'string' ? mensaje : defecto;
}

export const resilienciaInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiUrl + '/')) return next(req);
  const cache = inject(CacheService);
  const conexion = inject(ConexionService);
  const token = localStorage.getItem('token');
  const scope = cache.scope();
  const revision = cache.revision;
  const endpoint = req.url.split('/').pop()!.split('?')[0];
  const consulta = req.method === 'GET';
  const cacheable = consulta && req.responseType === 'json' && !!token && scope !== ':' &&
    ['clientes.php', 'dashboard.php', 'resumen.php', 'historial.php', 'fiados.php'].includes(endpoint);
  const mismaSesion = () => token === localStorage.getItem('token') && scope === cache.scope();
  // navigator.onLine es una pista: localhost puede seguir funcionando sin Wi-Fi.
  return next(req).pipe(
    timeout({each: endpoint === 'reportes.php' ? 60_000 : 10_000}),
    tap(event => {
      if (!(event instanceof HttpResponse) || !mismaSesion()) return;
      conexion.actualizada(req.urlWithParams);
      if ((event.body as {success?: boolean} | null)?.success === true) {
        if (cacheable && revision === cache.revision) cache.guardar(scope, req.urlWithParams, event.body);
        if (!consulta) cache.limpiar();
      }
    }),
    catchError((error: HttpErrorResponse | TimeoutError) => {
      if (!mismaSesion()) return throwError(() => error);
      const espera = error instanceof TimeoutError;
      const status = error instanceof HttpErrorResponse ? error.status : 0;
      const temporal = espera || status === 0 || status >= 500;
      if (temporal) conexion.servidor.set('inaccesible');
      else conexion.servidor.set('disponible');
      if (cacheable && temporal && revision === cache.revision) {
        const copia = cache.obtener(scope, req.urlWithParams);
        if (copia) {
          conexion.copias.update(valores => ({...valores, [req.urlWithParams]: copia.fecha}));
          return of(new HttpResponse({body: copia.body, status: 200, url: req.urlWithParams,
            headers: req.headers.set('X-Fiados-Cache', 'true')}));
        }
      }
      let mensaje = espera ? 'El servidor tardó demasiado en responder.' :
        status === 0 ? 'No se pudo contactar con el servidor. Revisa la conexión y que el servicio esté disponible.' :
        status >= 500 ? 'El servicio de datos no está disponible temporalmente.' :
        status === 401 ? (endpoint === 'login.php' ? 'Usuario o contraseña incorrectos.' : 'La sesión expiró. Inicia sesión nuevamente.') :
        status === 403 ? 'Tu usuario no tiene permiso para realizar esta acción.' :
        mensajeError(error);
      if (temporal) mensaje += consulta ? ' No hay una copia local vigente de esta consulta. Intenta nuevamente al recuperar el servicio.' :
        endpoint === 'login.php' ? ' Necesitas conexión con el servidor para iniciar sesión.' :
        ' No se pudo confirmar el registro. Revisa el historial antes de volver a enviarlo; no hay sincronización automática.';
      conexion.mensaje.set(mensaje);
      return throwError(() => new HttpErrorResponse({status, url: req.urlWithParams,
        statusText: espera ? 'Tiempo de espera agotado' : 'Error', error: {success: false, message: mensaje}}));
    })
  );
};
