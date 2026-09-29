import { Injectable, inject } from '@angular/core';
import { ApiClient } from './api-client.service';
export type ColorDeuda = 'verde' | 'amarillo' | 'naranja' | 'rojo';
export interface RangoDeuda { hasta: number | null; color: ColorDeuda; }
export interface ConfiguracionNegocio { limite_credito: number; rangos: RangoDeuda[]; dias_alerta: number; }
export interface CambioAjustes { id: number; creado_en: string; registrado_por: string; anterior_json: string; nuevo_json: string; }
export interface ReporteDiario { id: number; fecha: string; estado: 'provisional' | 'completo'; corte: string; revision: number; generado_en: string; }
@Injectable({providedIn:'root'})
export class NegocioService {
  private http=inject(ApiClient);
  configuracion() { return this.http.get<{success:boolean;configuracion:ConfiguracionNegocio;historial:CambioAjustes[]}>(`settings.php`); }
  guardar(configuracion:ConfiguracionNegocio) { return this.http.post<{success:boolean;configuracion:ConfiguracionNegocio}>(`settings.php`,configuracion); }
  reportes(fecha='') { return this.http.get<{success:boolean;reportes:ReporteDiario[]}>(`reportes.php?fecha=${encodeURIComponent(fecha)}`); }
  generar(fecha:string) { return this.http.post<{success:boolean;id:number}>(`reportes.php`,{fecha}); }
  pdf(id:number) { return this.http.blob(`reportes.php?id=${id}`); }
}
