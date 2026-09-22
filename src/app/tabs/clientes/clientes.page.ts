import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  IonFab,
  IonFabButton,
  IonIcon,
  AlertController,
} from '@ionic/angular';
import { ClientesService } from '../../services/clientes.service';
import { AuthService } from '../../services/auth.service';
import { Cliente } from '../../models/cliente.model';

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
    IonItemSliding,
    IonItemOptions,
    IonItemOption,
    IonFab,
    IonFabButton,
    IonIcon,
  ],
})
export class ClientesPage implements OnInit {

  // Signals: en este proyecto zoneless (sin zone.js), son necesarios para que
  // la vista se repinte sola cuando cambian después de un await.
  clientes = signal<Cliente[]>([]);
  cargando = signal(false);
  errorMsg = signal('');

  textoBusqueda = '';

  // Solo el admin puede editar/desactivar clientes ("cambios importantes");
  // el vendedor solo puede crear clientes y registrar fiados.
  esAdmin = false;

  private temporizadorBusqueda?: ReturnType<typeof setTimeout>;

  constructor(
    private clientesService: ClientesService,
    private authService: AuthService,
    private router: Router,
    private alertCtrl: AlertController
  ) {}

  ngOnInit() {
    this.esAdmin = this.authService.esAdmin();

  }

  ionViewWillEnter() {
    this.esAdmin = this.authService.esAdmin();
    this.cargarClientes(this.textoBusqueda);
  }

  abrirDetalle(cliente: Cliente) {
    this.router.navigateByUrl(`/tabs/cliente-detalle/${cliente.id}`);
  }

  // ---------- Read ----------

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
      const respuesta = await this.clientesService.getClientes(buscar);

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

  // ---------- Create ----------

  async abrirNuevoCliente() {
    const alert = await this.alertCtrl.create({
      header: 'Nuevo cliente',
      inputs: [
        { name: 'nombre', type: 'text', placeholder: 'Nombre (obligatorio)' },
        { name: 'telefono', type: 'tel', placeholder: 'Teléfono (opcional)' },
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Crear',
          handler: (data) => {
            const nombre = (data.nombre || '').trim();
            if (!nombre) {
              return false; // no cierra el alert si falta el nombre
            }
            this.crearCliente(nombre, (data.telefono || '').trim());
            return true;
          },
        },
      ],
    });

    await alert.present();
  }

  private async crearCliente(nombre: string, telefono: string) {
    this.errorMsg.set('');

    try {
      const respuesta = await this.clientesService.crearCliente(nombre, telefono);

      if (respuesta.success) {
        this.cargarClientes(this.textoBusqueda);
      } else {
        this.errorMsg.set(respuesta.message || 'No se pudo crear el cliente');
      }
    } catch (error) {
      console.error('Error al crear cliente:', error);
      this.errorMsg.set('Error al conectar con el servidor.');
    }
  }

  // ---------- Update ----------

  async abrirEditar(cliente: Cliente, slidingItem: IonItemSliding) {
    await slidingItem.close();

    const alert = await this.alertCtrl.create({
      header: 'Editar cliente',
      inputs: [
        { name: 'nombre', type: 'text', value: cliente.nombre, placeholder: 'Nombre' },
        { name: 'telefono', type: 'tel', value: cliente.telefono || '', placeholder: 'Teléfono' },
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Guardar',
          handler: (data) => {
            const nombre = (data.nombre || '').trim();
            if (!nombre) {
              return false;
            }
            this.actualizarCliente(cliente.id, nombre, (data.telefono || '').trim());
            return true;
          },
        },
      ],
    });

    await alert.present();
  }

  private async actualizarCliente(id: number, nombre: string, telefono: string) {
    this.errorMsg.set('');

    try {
      const respuesta = await this.clientesService.actualizarCliente(id, nombre, telefono);

      if (respuesta.success) {
        this.cargarClientes(this.textoBusqueda);
      } else {
        this.errorMsg.set(respuesta.message || 'No se pudo actualizar el cliente');
      }
    } catch (error) {
      console.error('Error al actualizar cliente:', error);
      this.errorMsg.set('Error al conectar con el servidor.');
    }
  }

  // ---------- "Delete" (solo desactiva, nunca borra) ----------

  async confirmarDesactivar(cliente: Cliente, slidingItem: IonItemSliding) {
    await slidingItem.close();

    const alert = await this.alertCtrl.create({
      header: 'Desactivar cliente',
      message: `¿Seguro que quieres desactivar a ${cliente.nombre}? Ya no aparecerá en la lista, pero su historial se conserva.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Desactivar',
          role: 'destructive',
          handler: () => {
            this.desactivarCliente(cliente.id);
          },
        },
      ],
    });

    await alert.present();
  }

  private async desactivarCliente(id: number) {
    this.errorMsg.set('');

    try {
      const respuesta = await this.clientesService.desactivarCliente(id);

      if (respuesta.success) {
        this.cargarClientes(this.textoBusqueda);
      } else {
        this.errorMsg.set(respuesta.message || 'No se pudo desactivar el cliente');
      }
    } catch (error) {
      console.error('Error al desactivar cliente:', error);
      this.errorMsg.set('Error al conectar con el servidor.');
    }
  }
}
