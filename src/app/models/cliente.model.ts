export interface Cliente {
  id: number;
  nombre: string;
  telefono: string | null;
  saldo: number;
  activo: boolean;
  color_deuda?: 'verde' | 'amarillo' | 'naranja' | 'rojo';
  limite_credito?: number;
  credito_disponible?: number;
  dias_sin_abono?: number;
  alerta_antiguedad?: boolean;
  ultimo_abono?: string | null;
  referencia_desde?: string;
  seguimiento?: {fecha:string; dias_sin_abono:number; saldo:number; referencia_desde:string}[];
}

export interface ClientesResponse {
  success: boolean;
  message?: string;
  clientes?: Cliente[];
}

export interface ClienteResponse {
  success: boolean;
  message?: string;
  cliente?: Cliente;
}
