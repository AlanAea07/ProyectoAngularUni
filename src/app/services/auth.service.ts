import { Injectable } from '@angular/core';
import { ApiClient } from './api-client.service';
import { LoginResponse, RolUsuario, UsuarioLogueado } from '../models/usuario.model';
import { CacheService } from './cache.service';
import { ConexionService } from './conexion.service';
import { limpiarSesionLocal, ServidorService } from './servidor.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {


  constructor(private http: ApiClient, private cache: CacheService, private conexion: ConexionService, private servidor: ServidorService) {}

  async login(usuario: string, password: string): Promise<LoginResponse> {
    return this.http.post<LoginResponse>(`login.php`, {
        usuario,
        password,
      });
  }

  // TODO (tarea del profe): mover esto a Capacitor Preferences en vez de
  // localStorage, para que la sesión sobreviva cerrar/reabrir la app nativa.
  guardarSesion(token: string, usuario: UsuarioLogueado): void {
    this.cache.limpiar(); this.conexion.limpiar();
    localStorage.setItem('token', token);
    localStorage.setItem('sesion_servidor', this.servidor.apiUrl());
    localStorage.setItem('usuario_id', String(usuario.id));
    localStorage.setItem('usuario_nombre', usuario.nombre);
    localStorage.setItem('usuario_rol', usuario.rol);
    localStorage.setItem('negocio_id', String(usuario.negocio_id));
    localStorage.setItem('negocio_nombre', usuario.negocio_nombre);
  }

  async salir(): Promise<void> {
    try {
      await this.http.post(`logout.php`, {});
    } finally {
      this.cerrarSesion();
    }
  }

  cerrarSesion(): void {
    this.cache.limpiar(); this.conexion.limpiar();
    limpiarSesionLocal();
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
    return !!localStorage.getItem('token') && localStorage.getItem('sesion_servidor') === this.servidor.apiUrl();
  }
}
