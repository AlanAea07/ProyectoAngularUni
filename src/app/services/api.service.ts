import { Injectable } from '@angular/core';
import { ApiClient } from './api-client.service';

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

export interface Cliente {
  id: number;
  nombre: string;
  telefono: string | null;
  saldo: number;
}

export interface ClientesResponse {
  success: boolean;
  message?: string;
  clientes?: Cliente[];
}

@Injectable({
  providedIn: 'root',
})
export class ApiService {


  constructor(private http: ApiClient) {}

  async login(usuario: string, password: string): Promise<LoginResponse> {
    return this.http.post<LoginResponse>(`login.php`, {
        usuario,
        password,
      });
  }

  async getClientes(buscar?: string): Promise<ClientesResponse> {
    const url = buscar
      ? `clientes.php?buscar=${encodeURIComponent(buscar)}`
      : `clientes.php`;

    return this.http.get<ClientesResponse>(url);
  }
}
