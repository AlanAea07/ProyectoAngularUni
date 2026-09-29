import { Injectable } from '@angular/core';
import { ApiClient } from './api-client.service';
import { FiadosResponse, RegistrarFiadoResponse } from '../models/fiado.model';

@Injectable({
  providedIn: 'root',
})
export class FiadosService {


  constructor(private http: ApiClient) {}

  // Historial completo de fiados de un cliente (solo lectura, no editable).
  async getHistorial(clienteId: number): Promise<FiadosResponse> {
    return this.http.get<FiadosResponse>(`fiados.php?cliente_id=${clienteId}`);
  }

  // Registra un fiado nuevo. Es un INSERT puro: no hay actualizar ni borrar
  // un fiado ya guardado, ni desde aquí ni desde el API.
  async registrarFiado(clienteId: number, monto: number, detalle?: string): Promise<RegistrarFiadoResponse> {
    return this.http.post<RegistrarFiadoResponse>(`fiados.php`, {
        cliente_id: clienteId,
        monto,
        detalle: detalle || '',
      });
  }
}
