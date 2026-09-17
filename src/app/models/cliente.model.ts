export interface Cliente {
  id: number;
  nombre: string;
  telefono: string | null;
  saldo: number;
  activo: boolean;
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
