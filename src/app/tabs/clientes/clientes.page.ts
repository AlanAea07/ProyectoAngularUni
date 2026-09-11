import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonSearchbar,
  IonList,
  IonItem,
  IonLabel,
  IonNote,
  IonSpinner,
} from '@ionic/angular';
import { ApiService, Cliente } from '../../services/api.service';

@Component({
  selector: 'app-clientes',
  standalone: true,
  templateUrl: './clientes.page.html',
  styleUrls: ['./clientes.page.scss'],
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonSearchbar,
    IonList,
    IonItem,
    IonLabel,
    IonNote,
    IonSpinner,
  ],
})
export class ClientesPage implements OnInit {

  // Signals en vez de propiedades sueltas: en un proyecto zoneless (sin zone.js,
  // como este) son necesarios para que la vista se vuelva a pintar sola cuando
  // el valor cambia después de un await. Con "this.clientes = ..." normal,
  // el dato llega pero la pantalla nunca se entera de que debe actualizarse.
  clientes = signal<Cliente[]>([]);
  cargando = signal(false);
  errorMsg = signal('');

  textoBusqueda = '';

  private temporizadorBusqueda?: ReturnType<typeof setTimeout>;

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    this.cargarClientes();
  }

  // Se llama cada vez que el usuario escribe en el buscador
  buscar() {
    // Pequeño debounce para no disparar una petición por cada letra
    clearTimeout(this.temporizadorBusqueda);
    this.temporizadorBusqueda = setTimeout(() => {
      this.cargarClientes(this.textoBusqueda);
    }, 300);
  }

  async cargarClientes(buscar?: string) {
    this.cargando.set(true);
    this.errorMsg.set('');

    try {
      const respuesta = await this.apiService.getClientes(buscar);

      if (respuesta.success) {
        this.clientes.set(respuesta.clientes || []);
      } else {
        this.errorMsg.set(respuesta.message || 'No se pudieron cargar los clientes');
      }
    } catch (error) {
      console.error('Error al cargar clientes:', error);
      this.errorMsg.set('Error al conectar con el servidor. Revisa que XAMPP esté prendido.');
    } finally {
      this.cargando.set(false);
    }
  }
}
