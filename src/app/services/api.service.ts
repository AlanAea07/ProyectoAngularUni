import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface UsuarioLogueado {
  id: number;
  usuario: string;
  nombre: string;
}

export interface LoginResponse {
  success: boolean;
  message?: string;
  token?: string;
  usuario?: UsuarioLogueado;
}

@Injectable({
  providedIn: 'root',
})
export class ApiService {

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
}
