import { Injectable } from '@angular/core';
import { ApiClient } from './api-client.service';
import { ClienteResponse, ClientesResponse } from '../models/cliente.model';

export interface DesactivarResponse {
  success: boolean;
  message?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ClientesService {


  constructor(private http: ApiClient) {}

  // ---- Read ----
  async getClientes(buscar?: string): Promise<ClientesResponse> {
    const url = buscar
      ? `clientes.php?buscar=${encodeURIComponent(buscar)}`
      : `clientes.php`;

    return this.http.get<ClientesResponse>(url);
  }

  // ---- Read (uno solo, para cliente-detalle) ----
  async getCliente(id: number): Promise<ClienteResponse> {
    return this.http.get<ClienteResponse>(`clientes.php?id=${id}`);
  }

  // ---- Create ----
  async crearCliente(nombre: string, telefono?: string): Promise<ClienteResponse> {
    return this.http.post<ClienteResponse>(`clientes.php`, {
        nombre,
        telefono: telefono || '',
      });
  }

  // ---- Update ----
  async actualizarCliente(id: number, nombre: string, telefono?: string): Promise<ClienteResponse> {
    return this.http.post<ClienteResponse>(`clientes_actualizar.php`, {
        id,
        nombre,
        telefono: telefono || '',
      });
  }

  // ---- "Delete" (soft delete: solo desactiva, nunca borra) ----
  async desactivarCliente(id: number): Promise<DesactivarResponse> {
    return this.http.post<DesactivarResponse>(`clientes_desactivar.php`, {
        id,
      });
  }
}
