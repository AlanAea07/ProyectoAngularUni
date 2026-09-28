import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { vi } from 'vitest';
import { environment } from '../../environments/environment';
import { CACHE_KEY, CACHE_TTL, CacheService } from './cache.service';
import { ConexionService } from './conexion.service';
import { resilienciaInterceptor } from './resiliencia.interceptor';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

describe('Consulta local y manejo de fallos', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let cache: CacheService;
  let conexion: ConexionService;
  const url = environment.apiUrl + '/clientes.php';
  const body = {success: true, clientes: [{id: 1, nombre: 'Cliente de prueba', saldo: 100}]};
  beforeEach(() => {
    TestBed.configureTestingModule({providers: [provideRouter([]),
      provideHttpClient(withInterceptors([authInterceptor, resilienciaInterceptor])), provideHttpClientTesting()]});
    localStorage.clear();
    localStorage.setItem('token', 'sesion-prueba');
    localStorage.setItem('negocio_id', '1'); localStorage.setItem('usuario_id', '10');
    http = TestBed.inject(HttpClient); backend = TestBed.inject(HttpTestingController);
    cache = TestBed.inject(CacheService); conexion = TestBed.inject(ConexionService);
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  });
  afterEach(() => { backend.verify(); localStorage.clear(); vi.useRealTimers(); vi.restoreAllMocks(); });
  async function cargar() {
    const respuesta = firstValueFrom(http.get(url)); backend.expectOne(url).flush(body); await respuesta;
  }
  it('guarda JSON en localStorage y lo recupera ante pérdida real de transporte simulada', async () => {
    await cargar();
    expect(JSON.parse(localStorage.getItem(CACHE_KEY)!).length).toBeUndefined();
    const respuesta = firstValueFrom(http.get(url));
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
    const respuesta = firstValueFrom(http.get(url)).catch(e => e);
    backend.expectOne(url).error(new ProgressEvent('error'));
    expect((await respuesta).error.message).toContain('No hay una copia local vigente');
  });
  it('rechaza copias vencidas después de 24 horas', async () => {
    await cargar();
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + CACHE_TTL + 1);
    const respuesta = firstValueFrom(http.get(url)).catch(e => e);
    backend.expectOne(url).error(new ProgressEvent('error'));
    expect((await respuesta).status).toBe(0);
  });
  it('no comparte la copia con otro negocio o usuario', async () => {
    await cargar(); localStorage.setItem('negocio_id', '2');
    expect(cache.obtener(cache.scope(), url)).toBeNull();
    localStorage.setItem('negocio_id', '1'); localStorage.setItem('usuario_id', '11');
    expect(cache.obtener(cache.scope(), url)).toBeNull();
  });
  it('no guarda en caché una respuesta de una sesión anterior', async () => {
    const respuesta = firstValueFrom(http.get(url));
    localStorage.setItem('token', 'otra-sesion');
    backend.expectOne(url).flush(body); await respuesta;
    expect(localStorage.getItem(CACHE_KEY)).toBeNull();
  });
  it('401 borra sesión y caché en vez de usar información vieja', async () => {
    await cargar();
    const respuesta = firstValueFrom(http.get(url)).catch(e => e);
    backend.expectOne(url).flush({}, {status: 401, statusText: 'Unauthorized'});
    expect((await respuesta).status).toBe(401);
    expect(localStorage.getItem(CACHE_KEY)).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
  });
  it('403 no se oculta con caché', async () => {
    await cargar();
    const respuesta = firstValueFrom(http.get(url)).catch(e => e);
    backend.expectOne(url).flush({}, {status: 403, statusText: 'Forbidden'});
    expect((await respuesta).status).toBe(403);
  });
  it('500 usa una copia y al recuperarse la API la reemplaza y quita el aviso de copia', async () => {
    await cargar();
    const fallo = firstValueFrom(http.get(url));
    backend.expectOne(url).flush({}, {status: 500, statusText: 'Server error'});
    expect(await fallo).toEqual(body);
    const recuperada = firstValueFrom(http.get(url));
    const nuevo = {success: true, clientes: []};
    backend.expectOne(url).flush(nuevo); await recuperada;
    expect(cache.obtener(cache.scope(), url)?.body).toEqual(nuevo);
    expect(conexion.copias()[url]).toBeUndefined();
  });
  it('corta una consulta que no responde a los diez segundos', async () => {
    vi.useFakeTimers(); await cargar();
    const respuesta = firstValueFrom(http.get(url));
    const pendiente = backend.expectOne(url);
    await vi.advanceTimersByTimeAsync(10_001);
    expect(await respuesta).toEqual(body);
    expect(pendiente.cancelled).toBe(true);
  });
  it('un POST fallido no aparenta éxito, no se encola y no se reenvía', async () => {
    const pago = environment.apiUrl + '/pagos.php';
    const respuesta = firstValueFrom(http.post(pago, {monto: 10})).catch(e => e);
    backend.expectOne(pago).error(new ProgressEvent('error'));
    expect((await respuesta).error.message).toContain('No se pudo confirmar el registro');
    backend.expectNone(pago);
    expect(localStorage.getItem(CACHE_KEY)).toBeNull();
  });
  it('guardar un cambio invalida copias y evita que una consulta anterior las repueble', async () => {
    await cargar();
    const antigua = firstValueFrom(http.get(url)); const get = backend.expectOne(url);
    const cambio = firstValueFrom(http.post(url, {nombre: 'Otro'}));
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
