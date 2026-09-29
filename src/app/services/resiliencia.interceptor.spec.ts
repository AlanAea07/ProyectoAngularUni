import { TestBed } from '@angular/core/testing';
import axios, { AxiosError, AxiosHeaders, InternalAxiosRequestConfig } from 'axios';
import { ApiClient, AXIOS_CLIENT } from './api-client.service';
import { ServidorService } from './servidor.service';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { environment } from '../../environments/environment';
import { CACHE_KEY, CACHE_TTL, CacheService } from './cache.service';
import { ConexionService } from './conexion.service';
import { AuthService } from './auth.service';


function transportePrueba() {
  type Pendiente = {config: InternalAxiosRequestConfig; resolve: (r: any) => void; reject: (e: unknown) => void};
  const pendientes: Pendiente[] = [];
  const client = axios.create({adapter: config => new Promise((resolve, reject) => pendientes.push({config, resolve, reject}))});
  return {
    client,
    expectOne(url: string) {
      const index = pendientes.findIndex(p => p.config.url === url);
      expect(index).toBeGreaterThanOrEqual(0);
      const p = pendientes.splice(index, 1)[0];
      return {
        get cancelled() { return !!p.config.signal?.aborted; },
        flush(data: unknown, options = {status: 200, statusText: 'OK'}) {
          const response = {data, ...options, config: p.config, headers: new AxiosHeaders()};
          if (options.status >= 400) p.reject(new AxiosError('HTTP error', 'ERR_BAD_RESPONSE', p.config, undefined, response));
          else p.resolve(response);
        },
        error(_event: ProgressEvent) { p.reject(new AxiosError('Network error', 'ERR_NETWORK', p.config)); }
      };
    },
    expectNone(url: string) { expect(pendientes.filter(p => p.config.url === url)).toHaveLength(0); },
    verify() { expect(pendientes).toHaveLength(0); }
  };
}

describe('Consulta local y manejo de fallos', () => {
  let http: ApiClient;
  let backend: ReturnType<typeof transportePrueba>;
  let cache: CacheService;
  let conexion: ConexionService;
  const url = environment.apiUrl + '/clientes.php';
  const body = {success: true, clientes: [{id: 1, nombre: 'Cliente de prueba', saldo: 100}]};
  beforeEach(() => {
    backend = transportePrueba();
    TestBed.configureTestingModule({providers: [provideRouter([]), {provide: AXIOS_CLIENT, useValue: backend.client}]});
    localStorage.clear();
    localStorage.setItem('token', 'sesion-prueba');
    localStorage.setItem('negocio_id', '1'); localStorage.setItem('usuario_id', '10');
    http = TestBed.inject(ApiClient);
    localStorage.setItem('sesion_servidor', TestBed.inject(ServidorService).apiUrl());
    cache = TestBed.inject(CacheService); conexion = TestBed.inject(ConexionService);
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  });
  afterEach(() => { backend.verify(); localStorage.clear(); vi.useRealTimers(); vi.restoreAllMocks(); });
  async function cargar() {
    const respuesta = http.get('clientes.php'); backend.expectOne(url).flush(body); await respuesta;
  }
  it('guarda JSON en localStorage y lo recupera ante pérdida real de transporte simulada', async () => {
    await cargar();
    expect(JSON.parse(localStorage.getItem(CACHE_KEY)!).length).toBeUndefined();
    const respuesta = http.get('clientes.php');
    backend.expectOne(url).error(new ProgressEvent('error'));
    expect(await respuesta).toEqual(body);
    expect(conexion.servidor()).toBe('inaccesible');
    expect(conexion.copias()[url]).toBeGreaterThan(0);
  });
  it('recupera la copia en una nueva instancia del servicio', async () => {
    await cargar();
    expect(new CacheService().obtener('1:10', url)?.body).toEqual(body);
  });
  it('distingue Wi-Fi desconectado de API localhost disponible', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    window.dispatchEvent(new Event('offline'));
    expect(conexion.redDisponible()).toBe(false);
    await cargar();
    expect(conexion.servidor()).toBe('disponible');
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    window.dispatchEvent(new Event('online'));
    expect(conexion.redDisponible()).toBe(true);
  });
  it('sin copia devuelve un mensaje útil y no inventa una lista vacía', async () => {
    const respuesta = http.get('clientes.php').catch(e => e);
    backend.expectOne(url).error(new ProgressEvent('error'));
    expect((await respuesta as {error: {message: string}}).error.message).toContain('No hay una copia local vigente');
  });
  it('rechaza copias vencidas después de 24 horas', async () => {
    await cargar();
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + CACHE_TTL + 1);
    const respuesta = http.get('clientes.php').catch(e => e);
    backend.expectOne(url).error(new ProgressEvent('error'));
    expect((await respuesta as {status: number}).status).toBe(0);
  });
  it('no comparte la copia con otro negocio o usuario', async () => {
    await cargar(); localStorage.setItem('negocio_id', '2');
    expect(cache.obtener(cache.scope(), url)).toBeNull();
    localStorage.setItem('negocio_id', '1'); localStorage.setItem('usuario_id', '11');
    expect(cache.obtener(cache.scope(), url)).toBeNull();
  });
  it('no guarda en caché una respuesta de una sesión anterior', async () => {
    const respuesta = http.get('clientes.php');
    localStorage.setItem('token', 'otra-sesion');
    backend.expectOne(url).flush(body); await respuesta.catch(() => undefined);
    expect(localStorage.getItem(CACHE_KEY)).toBeNull();
  });
  it('401 borra sesión y caché en vez de usar información vieja', async () => {
    await cargar();
    const respuesta = http.get('clientes.php').catch(e => e);
    backend.expectOne(url).flush({}, {status: 401, statusText: 'Unauthorized'});
    expect((await respuesta as {status: number}).status).toBe(401);
    expect(localStorage.getItem(CACHE_KEY)).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
  });
  it('403 no se oculta con caché', async () => {
    await cargar();
    const respuesta = http.get('clientes.php').catch(e => e);
    backend.expectOne(url).flush({}, {status: 403, statusText: 'Forbidden'});
    expect((await respuesta as {status: number}).status).toBe(403);
  });
  it('500 usa una copia y al recuperarse la API la reemplaza y quita el aviso de copia', async () => {
    await cargar();
    const fallo = http.get('clientes.php');
    backend.expectOne(url).flush({}, {status: 500, statusText: 'Server error'});
    expect(await fallo).toEqual(body);
    const recuperada = http.get('clientes.php');
    const nuevo = {success: true, clientes: []};
    backend.expectOne(url).flush(nuevo); await recuperada;
    expect(cache.obtener(cache.scope(), url)?.body).toEqual(nuevo);
    expect(conexion.copias()[url]).toBeUndefined();
  });
  it('corta una consulta que no responde a los diez segundos', async () => {
    vi.useFakeTimers(); await cargar();
    const respuesta = http.get('clientes.php');
    const pendiente = backend.expectOne(url);
    await vi.advanceTimersByTimeAsync(10_001);
    expect(await respuesta).toEqual(body);
    expect(pendiente.cancelled).toBe(true);
  });
  it('un POST fallido no aparenta éxito, no se encola y no se reenvía', async () => {
    const pago = environment.apiUrl + '/pagos.php';
    const respuesta = http.post('pagos.php', {monto: 10}).catch(e => e);
    backend.expectOne(pago).error(new ProgressEvent('error'));
    expect((await respuesta as {error: {message: string}}).error.message).toContain('No se pudo confirmar el registro');
    backend.expectNone(pago);
    expect(localStorage.getItem(CACHE_KEY)).toBeNull();
  });
  it('guardar un cambio invalida copias y evita que una consulta anterior las repueble', async () => {
    await cargar();
    const antigua = http.get('clientes.php'); const get = backend.expectOne(url);
    const cambio = http.post('clientes.php', {nombre: 'Otro'});
    backend.expectOne(url).flush({success: true}); await cambio;
    get.flush(body); await antigua;
    expect(localStorage.getItem(CACHE_KEY)).toBeNull();
  });
  it('cerrar sesión limpia todas las copias', async () => {
    await cargar(); TestBed.inject(AuthService).cerrarSesion();
    expect(localStorage.getItem(CACHE_KEY)).toBeNull();
  });
  it('almacenamiento corrupto o lleno no impide consultar la API', async () => {
    localStorage.setItem(CACHE_KEY, '{roto');
    expect(cache.obtener(cache.scope(), url)).toBeNull();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('QuotaExceededError'); });
    await cargar();
    expect(cache.advertencia()).toContain('no pudo guardar');
  });
});
