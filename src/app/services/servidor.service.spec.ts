import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import axios, { AxiosHeaders, InternalAxiosRequestConfig } from 'axios';
import { vi } from 'vitest';
import { normalizarServidor, ServidorService, SERVIDOR_KEY } from './servidor.service';
import { AXIOS_CLIENT, ApiClient } from './api-client.service';
import { CacheService, CACHE_KEY } from './cache.service';
import { AuthService } from './auth.service';
import { ClientesService } from './clientes.service';
import { FiadosService } from './fiados.service';
import { MovimientosService } from './movimientos.service';
import { NegocioService } from './negocio.service';
import { ApiService } from './api.service';
import { nuevaClaveOperacion } from './clave-operacion';
import { ConexionService } from './conexion.service';

describe('Servidor dinámico y Axios', () => {
  let solicitudes: InternalAxiosRequestConfig[];
  let servidor: ServidorService;
  beforeEach(() => {
    localStorage.clear(); solicitudes = [];
    const client = axios.create({adapter: async config => {
      solicitudes.push(config);
      return {config, headers: new AxiosHeaders(), status: 200, statusText: 'OK',
        data: config.responseType === 'blob' ? new Blob(['%PDF prueba'], {type:'application/pdf'}) : {success:true}};
    }});
    TestBed.configureTestingModule({providers: [provideRouter([]), {provide: AXIOS_CLIENT, useValue: client}]});
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    servidor = TestBed.inject(ServidorService);
  });
  afterEach(() => { localStorage.clear(); vi.restoreAllMocks(); });
  it('normaliza IP, puerto y carpeta sin duplicarla', () => {
    expect(normalizarServidor('192.168.0.222:80')).toBe('http://192.168.0.222/dermexcel-api');
    expect(normalizarServidor(' 192.168.0.222:8080/dermexcel-api/ ')).toBe('http://192.168.0.222:8080/dermexcel-api');
    expect(normalizarServidor('https://ejemplo.com/api')).toBe('https://ejemplo.com/api');
  });
  it('rechaza MySQL 3306, protocolos y direcciones inválidas', () => {
    expect(() => normalizarServidor('192.168.0.222:3306')).toThrow('3306');
    for (const valor of ['', 'http://', 'ftp://host', 'http://user:pass@host', 'host?x=1', 'host#x', 'host/login.php', 'host:99999']) {
      expect(() => normalizarServidor(valor)).toThrow();
    }
  });
  it('recuerda el servidor después de reconstruir el servicio', () => {
    servidor.guardar('192.168.0.222:8080');
    expect(localStorage.getItem(SERVIDOR_KEY)).toBe('http://192.168.0.222:8080/dermexcel-api');
    const restaurado = new ServidorService(TestBed.inject(CacheService), TestBed.inject(ConexionService));
    expect(restaurado.apiUrl()).toBe(servidor.apiUrl());
  });
  it('al cambiar limpia token y datos y no envía el token viejo', async () => {
    localStorage.setItem('token', 'viejo'); localStorage.setItem('sesion_servidor', servidor.apiUrl());
    localStorage.setItem(CACHE_KEY, '{}');
    servidor.guardar('192.168.0.223:80');
    expect(localStorage.getItem('token')).toBeNull(); expect(localStorage.getItem(CACHE_KEY)).toBeNull();
    await TestBed.inject(ApiClient).get('clientes.php');
    expect(solicitudes[0].headers.get('Authorization')).toBeUndefined();
    expect(solicitudes[0].url).toContain('192.168.0.223/');
  });
  it('todas las operaciones de las pantallas usan el servidor elegido aun con servicios ya creados', async () => {
    const clientes = TestBed.inject(ClientesService), fiados = TestBed.inject(FiadosService);
    const movimientos = TestBed.inject(MovimientosService), negocio = TestBed.inject(NegocioService);
    const auth = TestBed.inject(AuthService), antigua = TestBed.inject(ApiService);
    servidor.guardar('192.168.0.222:8080');
    localStorage.setItem('token', 'nuevo'); localStorage.setItem('sesion_servidor', servidor.apiUrl());
    await auth.login('demo', 'demo');
    await clientes.getClientes('Ana & Luis'); await clientes.getCliente(7);
    await clientes.crearCliente('Prueba'); await clientes.actualizarCliente(7, 'Prueba'); await clientes.desactivarCliente(7);
    await fiados.getHistorial(7); await fiados.registrarFiado(7, 10);
    await movimientos.historial(7); await movimientos.resumen(); await movimientos.pagar(7, 5, 'efectivo', 'clave');
    await negocio.configuracion(); await negocio.guardar({limite_credito:10000, rangos:[], dias_alerta:30});
    await negocio.reportes('2026-09-28'); await negocio.generar('2026-09-28');
    expect(await negocio.pdf(1)).toBeInstanceOf(Blob);
    await antigua.getClientes(); await antigua.login('demo','demo');
    await TestBed.inject(ApiClient).get('estado.php'); await auth.salir();
    expect(solicitudes).toHaveLength(20);
    expect(solicitudes.every(c => c.url?.startsWith('http://192.168.0.222:8080/dermexcel-api/'))).toBe(true);
    expect(solicitudes.find(c => c.url?.includes('buscar='))?.url).toContain('Ana%20%26%20Luis');
    expect(solicitudes.find(c => c.url?.endsWith('pagos.php'))?.headers.get('Authorization')).toBe('Bearer nuevo');
    expect(solicitudes.find(c => c.url?.endsWith('login.php'))?.headers.get('Authorization')).toBeUndefined();
    expect(solicitudes.find(c => c.responseType === 'blob')?.url).toContain('reportes.php?id=1');
  });
  it('conserva preferencia al salir y exige sesión vinculada al servidor', () => {
    servidor.guardar('192.168.0.222');
    localStorage.setItem('token','antiguo');
    const auth = TestBed.inject(AuthService);
    expect(auth.haySesionActiva()).toBe(false);
    localStorage.setItem('sesion_servidor',servidor.apiUrl());
    expect(auth.haySesionActiva()).toBe(true);
    auth.cerrarSesion(); expect(localStorage.getItem(SERVIDOR_KEY)).toBe(servidor.apiUrl());
  });
  it('bloquea rutas externas para no filtrar tokens', async () => {
    await expect(TestBed.inject(ApiClient).get('http://otro-host/clientes.php')).rejects.toThrow('Ruta');
    expect(solicitudes).toHaveLength(0);
  });
  it('genera UUID v4 para abonos aun sin randomUUID', () => {
    vi.spyOn(crypto, 'randomUUID').mockImplementation(() => { throw new Error('No disponible HTTP'); });
    const a = nuevaClaveOperacion(), b = nuevaClaveOperacion();
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(a).not.toBe(b);
  });
});
