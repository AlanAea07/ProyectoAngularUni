import { Injectable, inject } from '@angular/core';
import { ApiClient } from './api-client.service';

export interface Movimiento {
  id: number; cliente_id: number; cliente_nombre: string; tipo: 'fiado' | 'pago';
  monto: number; detalle: string | null; creado_en: string; registrado_por: string;
  metodo_pago: 'efectivo' | 'transferencia' | null;
}
export interface Resumen {
  fecha: string; zona_horaria: string; fiados_monto: number; abonos_cantidad: number;
  deuda_total: number; clientes_con_deuda: number; fiados_hoy: number; abonos_hoy: number;
}
@Injectable({providedIn: 'root'})
export class MovimientosService {
  private http = inject(ApiClient);
  historial(clienteId?: number) {
    return this.http.get<{success: boolean; movimientos: Movimiento[]}>(
      `historial.php${clienteId ? '?cliente_id=' + clienteId : ''}`);
  }
  resumen() {
    return this.http.get<{success: boolean; resumen: Resumen}>(`dashboard.php`);
  }
  pagar(clienteId: number, monto: number, metodo: string, clave: string) {
    return this.http.post<{success: boolean; message?: string; saldo_actualizado: number}>(
      `pagos.php`, {cliente_id: clienteId, monto, metodo_pago: metodo, clave_operacion: clave});
  }
}
