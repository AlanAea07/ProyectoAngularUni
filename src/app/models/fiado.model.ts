export interface Fiado {
  id: number;
  detalle: string | null;
  monto: number;
  creado_en: string;
  registrado_por: string;
}

export interface FiadosResponse {
  success: boolean;
  message?: string;
  fiados?: Fiado[];
}

export interface RegistrarFiadoResponse {
  success: boolean;
  message?: string;
  fiado?: {
    id: number;
    cliente_id: number;
    detalle: string | null;
    monto: number;
    registrado_por: string;
  };
  saldo_actualizado?: number;
}
