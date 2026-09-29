import { Injectable, InjectionToken, inject } from '@angular/core';
import { Router } from '@angular/router';
import axios, { AxiosError, AxiosInstance } from 'axios';
import { CacheService } from './cache.service';
import { ConexionService } from './conexion.service';
import { limpiarSesionLocal, ServidorService } from './servidor.service';

export const AXIOS_CLIENT = new InjectionToken<AxiosInstance>('AXIOS_CLIENT', {providedIn: 'root', factory: () => axios.create()});

/** Único transporte de la aplicación: Axios, con servidor leído en cada petición. */
@Injectable({providedIn: 'root'})
export class ApiClient {
  private axios = inject(AXIOS_CLIENT);
  private servidor = inject(ServidorService);
  private cache = inject(CacheService);
  private conexion = inject(ConexionService);
  private router = inject(Router);
  get<T>(ruta: string): Promise<T> { return this.request<T>('GET', ruta); }
  post<T>(ruta: string, data: unknown): Promise<T> { return this.request<T>('POST', ruta, data); }
  blob(ruta: string): Promise<Blob> { return this.request<Blob>('GET', ruta, undefined, true); }

  private async request<T>(method: 'GET' | 'POST', ruta: string, data?: unknown, blob = false): Promise<T> {
    if (!/^[a-z_]+\.php(?:\?[^#]*)?$/.test(ruta)) throw new Error('Ruta de API no válida.');
    const base = this.servidor.apiUrl();
    const url = `${base}/${ruta}`;
    const endpoint = ruta.split('?')[0];
    const token = localStorage.getItem('token');
    const autorizado = localStorage.getItem('sesion_servidor') === base;
    const scope = this.cache.scope();
    const revision = this.cache.revision;
    const consulta = method === 'GET';
    const cacheable = consulta && !blob && !!token && autorizado && scope !== ':' &&
      ['clientes.php', 'dashboard.php', 'resumen.php', 'historial.php', 'fiados.php'].includes(endpoint);
    const mismaSesion = () => base === this.servidor.apiUrl() && token === localStorage.getItem('token') && scope === this.cache.scope();
    const controller = new AbortController();
    const timeout = endpoint === 'reportes.php' ? 60_000 : 10_000;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const response = await Promise.race([
        this.axios.request<T>({url, method, data, timeout, signal: controller.signal,
          responseType: blob ? 'blob' : 'json',
          headers: token && autorizado && !['login.php', 'estado.php'].includes(endpoint) ? {Authorization: `Bearer ${token}`} : {}}),
        new Promise<never>((_, reject) => { timer = setTimeout(() => {
          reject(new AxiosError('Tiempo de espera agotado', 'ECONNABORTED')); controller.abort();
        }, timeout); })
      ]);
      if (!mismaSesion()) throw {status: 0, error: {message: 'La sesión o el servidor cambió. Vuelve a abrir la pantalla.'}};
      if (!blob && (typeof response.data !== 'object' || response.data === null ||
          typeof (response.data as {success?: unknown}).success !== 'boolean')) {
        throw {status: 502, error: {message: 'La dirección respondió, pero no corresponde a la API de FiadOS. Revisa la IP y la carpeta.'}};
      }
      this.conexion.actualizada(url);
      if ((response.data as {success?: boolean})?.success === true) {
        if (cacheable && revision === this.cache.revision) this.cache.guardar(scope, url, response.data);
        if (!consulta) this.cache.limpiar();
      }
      return response.data;
    } catch (error: unknown) {
      if (!mismaSesion()) throw error;
      const fallo = error as AxiosError<{message?: string}>;
      const status = fallo.response?.status ?? (error as {status?: number}).status ?? 0;
      const espera = fallo.code === 'ECONNABORTED' || fallo.code === 'ETIMEDOUT';
      const temporal = espera || status === 0 || status >= 500;
      this.conexion.servidor.set(temporal ? 'inaccesible' : 'disponible');
      if (cacheable && temporal && revision === this.cache.revision) {
        const copia = this.cache.obtener(scope, url);
        if (copia) { this.conexion.copias.update(valores => ({...valores, [url]: copia.fecha})); return copia.body as T; }
      }
      let detalle = fallo.response?.data;
      if (detalle instanceof Blob) { try { detalle = JSON.parse(await detalle.text()); } catch { detalle = undefined; } }
      let mensaje = (error as {error?: {message?: string}}).error?.message || (espera ? 'El servidor tardó demasiado en responder.' :
        status === 0 ? `No se pudo contactar con ${base}. Revisa la IP, el Wi-Fi y Apache en la laptop.` :
        status >= 500 ? 'El servicio de datos no está disponible temporalmente.' :
        status === 401 ? (endpoint === 'login.php' ? 'Usuario o contraseña incorrectos.' : 'La sesión expiró. Inicia sesión nuevamente.') :
        status === 403 ? 'Tu usuario no tiene permiso para realizar esta acción.' :
        status === 404 ? 'No se encontró la API. Revisa la dirección y la carpeta dermexcel-api.' :
        detalle?.message || 'No se pudo completar la operación.');
      if (temporal) mensaje += consulta ? ' No hay una copia local vigente de esta consulta. Intenta nuevamente al recuperar el servicio.' :
        endpoint === 'login.php' ? ' Necesitas conexión con el servidor para iniciar sesión.' :
        ' No se pudo confirmar el registro. Revisa el historial antes de volver a enviarlo; no hay sincronización automática.';
      if (status === 401 && !['login.php', 'estado.php'].includes(endpoint)) {
        limpiarSesionLocal(); this.cache.limpiar(); this.conexion.limpiar();
        void this.router.navigateByUrl('/login', {replaceUrl: true});
      }
      this.conexion.mensaje.set(mensaje);
      throw {status, error: {success: false, message: mensaje}};
    } finally { clearTimeout(timer); }
  }
}
