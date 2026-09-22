import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { ClienteResponse, ClientesResponse } from '../models/cliente.model';

export interface DesactivarResponse {
  success: boolean;
  message?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ClientesService {

  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ---- Read ----
  async getClientes(buscar?: string): Promise<ClientesResponse> {
    const url = buscar
      ? `${this.baseUrl}/clientes.php?buscar=${encodeURIComponent(buscar)}`
      : `${this.baseUrl}/clientes.php`;

    return firstValueFrom(this.http.get<ClientesResponse>(url));
  }

  // ---- Read (uno solo, para cliente-detalle) ----
  async getCliente(id: number): Promise<ClienteResponse> {
    return firstValueFrom(
      this.http.get<ClienteResponse>(`${this.baseUrl}/clientes.php?id=${id}`)
    );
  }

  // ---- Create ----
  async crearCliente(nombre: string, telefono?: string): Promise<ClienteResponse> {
    return firstValueFrom(
      this.http.post<ClienteResponse>(`${this.baseUrl}/clientes.php`, {
        nombre,
        telefono: telefono || '',
      })
    );
  }

  // ---- Update ----
  async actualizarCliente(id: number, nombre: string, telefono?: string): Promise<ClienteResponse> {
    return firstValueFrom(
      this.http.post<ClienteResponse>(`${this.baseUrl}/clientes_actualizar.php`, {
        id,
        nombre,
        telefono: telefono || '',
      })
    );
  }

  // ---- "Delete" (soft delete: solo desactiva, nunca borra) ----
  async desactivarCliente(id: number): Promise<DesactivarResponse> {
    return firstValueFrom(
      this.http.post<DesactivarResponse>(`${this.baseUrl}/clientes_desactivar.php`, {
        id,
      })
    );
  }
}
