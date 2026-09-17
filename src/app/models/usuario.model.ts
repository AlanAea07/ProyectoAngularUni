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
