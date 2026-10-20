import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import axios, { AxiosError, AxiosHeaders, InternalAxiosRequestConfig } from 'axios';
import { vi } from 'vitest';
import { ApiClient, AXIOS_CLIENT } from './api-client.service';
import { ColaService, COLA_KEY } from './cola.service';
import { CacheService } from './cache.service';
import { ConexionService } from './conexion.service';
import { ServidorService } from './servidor.service';
import { AuthService } from './auth.service';
import { SincronizacionService } from './sincronizacion.service';

describe('Sincronización local/remota', () => {
  let api: ApiClient, cola: ColaService, sync: SincronizacionService;
  let status: number, version: number, solicitudes: InternalAxiosRequestConfig[];
  let responder: ((config: InternalAxiosRequestConfig) => Promise<unknown>) | undefined;
  beforeEach(async () => {
    localStorage.clear(); status = 0; version = 1; solicitudes = []; responder = undefined;
    const client = axios.create({adapter: async config => {
      solicitudes.push(config);
      if (responder) await responder(config);
      if (!status) throw new AxiosError('Offline', 'ERR_NETWORK', config);
      const response = {config, headers: new AxiosHeaders(), status, statusText: '',
        data: status >= 400 ? {success: false, message: 'El saldo cambió'} : {success: true, sincronizacion: version, clientes: [], movimientos: [], resumen: {}}};
      if (status >= 400) throw new AxiosError('Error', 'ERR_BAD_RESPONSE', config, undefined, response);
      return response;
    }});
    TestBed.configureTestingModule({providers: [provideRouter([]), {provide: AXIOS_CLIENT, useValue: client}]});
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    api = TestBed.inject(ApiClient); cola = TestBed.inject(ColaService); sync = TestBed.inject(SincronizacionService);
    localStorage.setItem('token', 'token'); localStorage.setItem('usuario_id', '10'); localStorage.setItem('negocio_id', '1');
    localStorage.setItem('sesion_servidor', TestBed.inject(ServidorService).apiUrl());
    status = 200; await api.getRemoto('estado.php'); status = 0; solicitudes = [];
  });
  afterEach(() => { TestBed.resetTestingModule(); localStorage.clear(); vi.restoreAllMocks(); vi.useRealTimers(); });

  it('persiste antes del transporte y reenvía la misma clave después de reiniciar el servicio', async () => {
    responder = async () => { expect(cola.listar(api.contexto())).toHaveLength(1); };
    expect(await api.post('clientes.php', {nombre: 'Ana'})).toMatchObject({pendiente: true});
    const op = cola.listar(api.contexto())[0];
    const copia = TestBed.runInInjectionContext(() => new ColaService());
    expect(copia.listar(api.contexto())[0].id).toBe(op.id);
    responder = undefined; status = 200;
    await api.enviarPendientes();
    expect(solicitudes.map(c => c.headers.get('X-Operacion-Id'))).toEqual([op.id, op.id]);
    expect(cola.listar(api.contexto())).toEqual([]);
  });

  it('no envía si no se puede persistir la operación', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Lleno'); });
    await expect(api.post('clientes.php', {nombre: 'Ana'})).rejects.toThrow('NO se guardó ni se envió');
    expect(solicitudes).toHaveLength(0);
  });

  it('una API antigua o sin migración no recibe cambios que pudiera duplicar', async () => {
    status = 200; version = 0;
    await api.getRemoto('estado.php'); solicitudes = [];
    expect(await api.post('clientes.php', {nombre: 'Ana'})).toMatchObject({pendiente: true});
    expect(solicitudes.every(s => s.method === 'get')).toBe(true);
    expect(cola.listar(api.contexto())).toHaveLength(1);
    expect(TestBed.inject(ConexionService).mensaje()).toContain('migración 003');
  });

  it('no sobrescribe una cola corrupta', async () => {
    localStorage.setItem(COLA_KEY + api.contexto(), '{roto');
    await expect(api.post('clientes.php', {nombre: 'Ana'})).rejects.toThrow('No se pueden leer');
    expect(localStorage.getItem(COLA_KEY + api.contexto())).toBe('{roto');
    expect(solicitudes).toHaveLength(0);
  });

  it('dos envíos simultáneos del mismo formulario producen una operación', async () => {
    let resolver!: () => void;
    responder = () => new Promise<void>(resolve => { resolver = resolve; });
    status = 200;
    const uno = api.post('clientes.php', {nombre: 'Ana'});
    const dos = api.post('clientes.php', {nombre: 'Ana'});
    expect(cola.listar(api.contexto())).toHaveLength(1);
    resolver(); await Promise.all([uno, dos]);
    expect(solicitudes).toHaveLength(1);
  });

  it('un rechazo bloquea el orden hasta descartarlo y no se reintenta automáticamente', async () => {
    await api.post('fiados.php', {cliente_id: 1, monto: 50});
    await api.post('pagos.php', {cliente_id: 1, monto: 20, clave_operacion: 'clave'});
    status = 409; solicitudes = [];
    await api.enviarPendientes(); await api.enviarPendientes();
    expect(solicitudes).toHaveLength(1);
    expect(cola.listar(api.contexto()).map(p => p.estado)).toEqual(['rechazada', 'pendiente']);
    cola.quitar(api.contexto(), cola.listar(api.contexto())[0].id);
    status = 200; await api.enviarPendientes();
    expect(cola.listar(api.contexto())).toHaveLength(0);
  });

  it('no mezcla pendientes al cambiar usuario o servidor; cerrar sesión los conserva', async () => {
    await api.post('clientes.php', {nombre: 'Ana'});
    const contexto = api.contexto();
    localStorage.setItem('usuario_id', '11'); status = 200; solicitudes = [];
    await api.enviarPendientes(); expect(solicitudes).toHaveLength(0);
    TestBed.inject(ServidorService).guardar('192.168.1.99');
    await api.enviarPendientes(); expect(solicitudes).toHaveLength(0);
    TestBed.inject(AuthService).cerrarSesion();
    expect(cola.listar(contexto)).toHaveLength(1);
  });

  it('401 conserva el pendiente y exige nueva sesión', async () => {
    status = 401;
    const contexto = api.contexto();
    await expect(api.post('clientes.php', {nombre: 'Ana'})).rejects.toThrow('Inicia sesión');
    expect(cola.listar(contexto)).toHaveLength(1);
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('no consume la cola anterior si la cuenta cambia con una petición en vuelo', async () => {
    let resolver!: () => void;
    responder = () => new Promise<void>(resolve => { resolver = resolve; });
    status = 200;
    const contexto = api.contexto();
    const operacion = api.post('clientes.php', {nombre: 'Ana'});
    const fallo = expect(operacion).rejects.toThrow('cuenta original');
    localStorage.setItem('usuario_id', '11'); resolver(); await fallo;
    expect(cola.listar(contexto)).toHaveLength(1);
  });

  it('al recuperar red sube pendientes, descarga consultas y notifica las vistas', async () => {
    await api.post('clientes.php', {nombre: 'Ana'});
    status = 200; solicitudes = [];
    const actualizar = vi.fn(); sync.actualizada.subscribe(actualizar);
    await sync.sincronizar();
    expect(solicitudes.map(c => c.method)).toEqual(['get', 'post', 'get', 'get', 'get']);
    const cache = TestBed.inject(CacheService);
    expect(cache.obtener(cache.scope(), TestBed.inject(ServidorService).apiUrl() + '/clientes.php')).not.toBeNull();
    expect(sync.pendientes()).toHaveLength(0);
    expect(actualizar).toHaveBeenCalledTimes(1);
    expect(sync.ultima()).not.toBeNull();
  });

  it('una consulta local no se anuncia como sincronización remota exitosa', async () => {
    const cache = TestBed.inject(CacheService), base = TestBed.inject(ServidorService).apiUrl();
    cache.guardar(cache.scope(), base + '/clientes.php', {success: true, sincronizacion: 1, clientes: []});
    await expect(api.getRemoto('clientes.php')).rejects.toMatchObject({status: 0});
    await sync.sincronizar();
    expect(sync.ultima()).toBeNull();
    expect(TestBed.inject(ConexionService).servidor()).toBe('inaccesible');
  });

  it('recupera por evento online y por reintento de 30 segundos sin multiplicar listeners', async () => {
    vi.useFakeTimers();
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    const ejecutar = vi.spyOn(sync, 'sincronizar').mockResolvedValue();
    sync.iniciar(); sync.iniciar();
    expect(ejecutar).toHaveBeenCalledTimes(1);
    window.dispatchEvent(new Event('online'));
    expect(ejecutar).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(ejecutar).toHaveBeenCalledTimes(3);
  });
});
