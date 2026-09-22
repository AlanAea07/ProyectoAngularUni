export type RolUsuario = 'admin' | 'vendedor' | 'cliente';

export interface UsuarioLogueado {
  id: number;
  usuario: string;
  nombre: string;
  rol: RolUsuario;
  negocio_id: number;
  negocio_nombre: string;
}

export interface LoginResponse {
  success: boolean;
  message?: string;
  token?: string;
  usuario?: UsuarioLogueado;
}
