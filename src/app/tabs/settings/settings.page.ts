import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonHeader,IonToolbar,IonTitle,IonButtons,IonBackButton,IonContent,IonInput,IonSelect,IonSelectOption,IonButton,IonSpinner } from '@ionic/angular';
import { NegocioService, ConfiguracionNegocio, CambioAjustes } from '../../services/negocio.service';
@Component({selector:'app-settings',standalone:true,templateUrl:'./settings.page.html',imports:[CommonModule,FormsModule,IonHeader,IonToolbar,IonTitle,IonButtons,IonBackButton,IonContent,IonInput,IonSelect,IonSelectOption,IonButton,IonSpinner]})
export class SettingsPage {
  private negocio=inject(NegocioService);
  config:ConfiguracionNegocio|null=null;
  historial=signal<CambioAjustes[]>([]); cargando=signal(false); guardando=signal(false); error=signal(''); exito=signal('');
  async ionViewWillEnter() {
    this.cargando.set(true); this.error.set('');
    try { const r=await this.negocio.configuracion(); this.config=r.configuracion; this.historial.set(r.historial); }
    catch { this.error.set('No se pudieron cargar los ajustes.'); }
    finally { this.cargando.set(false); }
  }
  async guardar() {
    if (!this.config || this.guardando()) return;
    this.error.set('');this.exito.set('');
    const valores=this.config.rangos.slice(0,4).map(r=>Number(r.hasta));
    if (!Number.isFinite(Number(this.config.limite_credito)) || this.config.limite_credito<=0 || valores.some((v,i)=>!Number.isFinite(v)||v<=0||v>=this.config!.limite_credito||(i>0&&v<=valores[i-1]))) {
      this.error.set('Usa cuatro límites ascendentes, mayores a cero y menores al crédito máximo.');return;
    }
    this.guardando.set(true);
    try { await this.negocio.guardar(this.config); await this.ionViewWillEnter(); this.exito.set('Ajustes guardados para tu negocio.'); }
    catch(e:unknown) { this.error.set((e as {error?:{message?:string}})?.error?.message||'No se pudieron guardar los ajustes.'); }
    finally { this.guardando.set(false); }
  }
  describir(json:string):string {
    const c=JSON.parse(json) as ConfiguracionNegocio;
    return `Máximo $${c.limite_credito.toLocaleString('es-MX')}. Tramos: `+c.rangos.map(r=>`${r.hasta===null?'resto':'hasta $'+r.hasta} ${r.color}`).join(' · ');
  }
}
