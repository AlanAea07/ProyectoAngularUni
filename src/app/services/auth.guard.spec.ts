import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';
import { authGuard } from './auth.guard';

describe('Protección de rutas privadas', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({providers: [provideRouter([]), provideHttpClient()]});
    TestBed.inject(AuthService).cerrarSesion();
  });
  afterEach(() => TestBed.inject(AuthService).cerrarSesion());
  const comprobar = () => TestBed.runInInjectionContext(() => authGuard(
    {} as ActivatedRouteSnapshot, {url: '/tabs/inicio'} as RouterStateSnapshot));
  it('redirige las URL directas a login sin sesión', () => {
    expect(String(comprobar())).toBe('/login');
  });
  it('permite sesión y bloquea al cerrar, incluso si quedan URL en el historial', () => {
    localStorage.setItem('token', 'test-session');
    expect(comprobar()).toBe(true);
    TestBed.inject(AuthService).cerrarSesion();
    expect(String(comprobar())).toBe('/login');
  });
});
