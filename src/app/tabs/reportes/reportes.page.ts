import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonHeader,IonToolbar,IonTitle,IonButtons,IonBackButton,IonContent,IonInput,IonButton,IonSpinner,IonList,IonItem,IonLabel } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { NegocioService, ReporteDiario } from '../../services/negocio.service';
@Component({selector:'app-reportes',standalone:true,templateUrl:'./reportes.page.html',imports:[CommonModule,FormsModule,IonHeader,IonToolbar,IonTitle,IonButtons,IonBackButton,IonContent,IonInput,IonButton,IonSpinner,IonList,IonItem,IonLabel]})
export class ReportesPage {
  private negocio=inject(NegocioService); auth=inject(AuthService);
  filas=signal<ReporteDiario[]>([]); cargando=signal(false); ocupado=signal(false); error=signal('');
  fecha=''; hoy=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Mexico_City',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  async ionViewWillEnter() { await this.cargar(); }
  async cargar() {
    this.cargando.set(true);this.error.set('');
    try { this.filas.set((await this.negocio.reportes(this.fecha)).reportes); }
    catch { this.error.set('No se pudieron cargar los reportes.'); }
    finally { this.cargando.set(false); }
  }
  async generar() {
    if(this.ocupado())return;this.ocupado.set(true);this.error.set('');
    try { await this.negocio.generar(this.fecha||this.hoy);await this.cargar(); }
    catch(e:unknown) {this.error.set((e as {error?:{message?:string}})?.error?.message||'No se pudo generar el reporte.');}
    finally {this.ocupado.set(false);}
  }
  async descargar(r:ReporteDiario) {
    if(this.ocupado())return;this.ocupado.set(true);this.error.set('');
    try {
      const blob=await this.negocio.pdf(r.id);const url=URL.createObjectURL(blob);
      const a=document.createElement('a');a.href=url;a.download=`FiadOS-${r.fecha}.pdf`;document.body.appendChild(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),60000);
    } catch {this.error.set('No se pudo descargar el PDF. Intenta de nuevo.');}
    finally {this.ocupado.set(false);}
  }
}
