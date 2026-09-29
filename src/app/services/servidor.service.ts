import { Injectable, signal } from '@angular/core';
import { environment } from '../../environments/environment';
import { CacheService } from './cache.service';
import { ConexionService } from './conexion.service';

export const SERVIDOR_KEY = 'fiados.servidor-api.v1';
export function limpiarSesionLocal(): void {
  for (const key of ['token', 'usuario_id', 'usuario_nombre', 'usuario_rol', 'negocio_id', 'negocio_nombre', 'sesion_servidor']) localStorage.removeItem(key);
}
export function normalizarServidor(valor: string): string {
  const entrada = valor.trim();
  if (!entrada || /[\s\\]/.test(entrada)) throw new Error('Escribe una IP o dirección válida, por ejemplo 192.168.0.222:80.');
  let url: URL;
  try { url = new URL(/^[a-z]+:\/\//i.test(entrada) ? entrada : `http://${entrada}`); }
  catch { throw new Error('La dirección del servidor no es válida. Ejemplo: 192.168.0.222:80.'); }
  if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password || url.search || url.hash || url.port === '0') {
    throw new Error('Usa una dirección HTTP o HTTPS sin usuario, contraseña, parámetros ni fragmentos.');
  }
  if (url.port === '3306') throw new Error('3306 es el puerto de MySQL. Usa el puerto de Apache, normalmente 80; PHP se conectará a MySQL en 3306.');
  const ruta = url.pathname.replace(/\/+$/, '');
  if (/\.php$/i.test(ruta) || /%/.test(ruta)) throw new Error('Indica la carpeta de la API, no un archivo PHP. Ejemplo: 192.168.0.222:80/dermexcel-api.');
  return url.origin + (ruta || '/dermexcel-api');
}

@Injectable({providedIn: 'root'})
export class ServidorService {
  readonly apiUrl = signal(this.inicial());
  constructor(private cache: CacheService, private conexion: ConexionService) {}
  private inicial(): string {
    const guardado = localStorage.getItem(SERVIDOR_KEY);
    if (guardado) { try { return normalizarServidor(guardado); } catch { /* Preferencia antigua inválida. */ } }
    const host = window.location.hostname;
    return host && !['localhost', '127.0.0.1', '[::1]'].includes(host) && /^https?:$/.test(window.location.protocol)
      ? normalizarServidor(`${window.location.protocol}//${host}`) : normalizarServidor(environment.apiUrl);
  }
  guardar(valor: string): void {
    const url = normalizarServidor(valor);
    localStorage.setItem(SERVIDOR_KEY, url);
    if (url !== this.apiUrl()) {
      limpiarSesionLocal(); this.cache.limpiar(); this.conexion.limpiar();
      this.conexion.servidor.set('pendiente'); this.apiUrl.set(url);
    }
  }
}
