import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { FiadosResponse, RegistrarFiadoResponse } from '../models/fiado.model';

@Injectable({
  providedIn: 'root',
})
export class FiadosService {

  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Historial completo de fiados de un cliente (solo lectura, no editable).
  async getHistorial(clienteId: number): Promise<FiadosResponse> {
    return firstValueFrom(
      this.http.get<FiadosResponse>(`${this.baseUrl}/fiados.php?cliente_id=${clienteId}`)
    );
  }

  // Registra un fiado nuevo. Es un INSERT puro: no hay actualizar ni borrar
  // un fiado ya guardado, ni desde aquí ni desde el API.
  async registrarFiado(clienteId: number, monto: number, detalle?: string): Promise<RegistrarFiadoResponse> {
    return firstValueFrom(
      this.http.post<RegistrarFiadoResponse>(`${this.baseUrl}/fiados.php`, {
        cliente_id: clienteId,
        monto,
        detalle: detalle || '',
      })
    );
  }
}
