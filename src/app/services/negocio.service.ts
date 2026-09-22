import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
export type ColorDeuda = 'verde' | 'amarillo' | 'naranja' | 'rojo';
export interface RangoDeuda { hasta: number | null; color: ColorDeuda; }
export interface ConfiguracionNegocio { limite_credito: number; rangos: RangoDeuda[]; dias_alerta: number; }
export interface CambioAjustes { id: number; creado_en: string; registrado_por: string; anterior_json: string; nuevo_json: string; }
export interface ReporteDiario { id: number; fecha: string; estado: 'provisional' | 'completo'; corte: string; revision: number; generado_en: string; }
@Injectable({providedIn:'root'})
export class NegocioService {
  private http=inject(HttpClient);
  configuracion() { return firstValueFrom(this.http.get<{success:boolean;configuracion:ConfiguracionNegocio;historial:CambioAjustes[]}>(`${environment.apiUrl}/settings.php`)); }
  guardar(configuracion:ConfiguracionNegocio) { return firstValueFrom(this.http.post<{success:boolean;configuracion:ConfiguracionNegocio}>(`${environment.apiUrl}/settings.php`,configuracion)); }
  reportes(fecha='') { return firstValueFrom(this.http.get<{success:boolean;reportes:ReporteDiario[]}>(`${environment.apiUrl}/reportes.php?fecha=${encodeURIComponent(fecha)}`)); }
  generar(fecha:string) { return firstValueFrom(this.http.post<{success:boolean;id:number}>(`${environment.apiUrl}/reportes.php`,{fecha})); }
  pdf(id:number) { return firstValueFrom(this.http.get(`${environment.apiUrl}/reportes.php?id=${id}`,{responseType:'blob'})); }
}
