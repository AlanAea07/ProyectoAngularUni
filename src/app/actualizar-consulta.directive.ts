import { DestroyRef, Directive, ElementRef, Input, inject } from '@angular/core';
import { SincronizacionService } from './services/sincronizacion.service';

/** Actualiza solo vistas de consulta visibles; nunca reinicia formularios abiertos. */
@Directive({selector: '[appActualizarConsulta]', standalone: true})
export class ActualizarConsultaDirective {
  @Input({required: true}) appActualizarConsulta!: () => unknown;
  constructor() {
    const elemento = inject(ElementRef<HTMLElement>);
    const sub = inject(SincronizacionService).actualizada.subscribe(() => {
      if (!elemento.nativeElement.closest('.ion-page-hidden')) this.appActualizarConsulta();
    });
    inject(DestroyRef).onDestroy(() => sub.unsubscribe());
  }
}
