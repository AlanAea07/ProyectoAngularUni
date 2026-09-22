import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Movimiento {
  id: number; cliente_id: number; cliente_nombre: string; tipo: 'fiado' | 'pago';
  monto: number; detalle: string | null; creado_en: string; registrado_por: string;
  metodo_pago: 'efectivo' | 'transferencia' | null;
}
export interface Resumen {
  deuda_total: number; clientes_con_deuda: number; fiados_hoy: number; abonos_hoy: number;
}
@Injectable({providedIn: 'root'})
export class MovimientosService {
  private http = inject(HttpClient);
  historial(clienteId?: number) {
    return firstValueFrom(this.http.get<{success: boolean; movimientos: Movimiento[]}>(
      `${environment.apiUrl}/historial.php${clienteId ? '?cliente_id=' + clienteId : ''}`));
  }
  resumen() {
    return firstValueFrom(this.http.get<{success: boolean; resumen: Resumen}>(`${environment.apiUrl}/resumen.php`));
  }
  pagar(clienteId: number, monto: number, metodo: string, clave: string) {
    return firstValueFrom(this.http.post<{success: boolean; message?: string; saldo_actualizado: number}>(
      `${environment.apiUrl}/pagos.php`, {cliente_id: clienteId, monto, metodo_pago: metodo, clave_operacion: clave}));
  }
}
