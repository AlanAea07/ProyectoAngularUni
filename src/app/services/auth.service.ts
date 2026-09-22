import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { LoginResponse, RolUsuario, UsuarioLogueado } from '../models/usuario.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {

  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  async login(usuario: string, password: string): Promise<LoginResponse> {
    return firstValueFrom(
      this.http.post<LoginResponse>(`${this.baseUrl}/login.php`, {
        usuario,
        password,
      })
    );
  }

  // TODO (tarea del profe): mover esto a Capacitor Preferences en vez de
  // localStorage, para que la sesión sobreviva cerrar/reabrir la app nativa.
  guardarSesion(token: string, usuario: UsuarioLogueado): void {
    localStorage.setItem('token', token);
    localStorage.setItem('usuario_id', String(usuario.id));
    localStorage.setItem('usuario_nombre', usuario.nombre);
    localStorage.setItem('usuario_rol', usuario.rol);
    localStorage.setItem('negocio_id', String(usuario.negocio_id));
    localStorage.setItem('negocio_nombre', usuario.negocio_nombre);
  }

  async salir(): Promise<void> {
    try {
      await firstValueFrom(this.http.post(`${this.baseUrl}/logout.php`, {}));
    } finally {
      this.cerrarSesion();
    }
  }

  cerrarSesion(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario_id');
    localStorage.removeItem('usuario_nombre');
    localStorage.removeItem('usuario_rol');
    localStorage.removeItem('negocio_id');
    localStorage.removeItem('negocio_nombre');
  }

  // Usado por el interceptor para pegarlo en cada request al API.
  obtenerToken(): string | null {
    return localStorage.getItem('token');
  }

  obtenerUsuarioActual(): { id: number; nombre: string; rol: RolUsuario; negocioNombre: string } | null {
    const id = localStorage.getItem('usuario_id');
    const nombre = localStorage.getItem('usuario_nombre');
    const rol = localStorage.getItem('usuario_rol') as RolUsuario | null;
    const negocioNombre = localStorage.getItem('negocio_nombre');

    if (!id || !nombre || !rol) {
      return null;
    }

    return { id: Number(id), nombre, rol, negocioNombre: negocioNombre || '' };
  }

  esAdmin(): boolean {
    return localStorage.getItem('usuario_rol') === 'admin';
  }

  haySesionActiva(): boolean {
    return !!localStorage.getItem('token');
  }
}
