import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { LoginResponse, UsuarioLogueado } from '../models/usuario.model';

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

  guardarSesion(token: string, usuario: UsuarioLogueado): void {
    localStorage.setItem('token', token);
    localStorage.setItem('usuario_id', String(usuario.id));
    localStorage.setItem('usuario_nombre', usuario.nombre);
  }

  cerrarSesion(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario_id');
    localStorage.removeItem('usuario_nombre');
  }

  obtenerUsuarioActual(): { id: number; nombre: string } | null {
    const id = localStorage.getItem('usuario_id');
    const nombre = localStorage.getItem('usuario_nombre');

    if (!id || !nombre) {
      return null;
    }

    return { id: Number(id), nombre };
  }

  haySesionActiva(): boolean {
    return !!localStorage.getItem('token');
  }
}
