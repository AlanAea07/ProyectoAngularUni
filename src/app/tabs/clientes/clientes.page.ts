import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent,
  IonButton,
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
import { mensajeError } from '../../services/resiliencia.interceptor';

@Component({
  selector: 'app-clientes',
  standalone: true,
  templateUrl: './clientes.page.html',
  styleUrls: ['./clientes.page.scss'],
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonButton,
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
  guardando = signal(false);
  private dialogoAbierto = false;
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
    if (!this.guardando()) this.router.navigateByUrl(`/tabs/cliente-detalle/${cliente.id}`);
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
      this.errorMsg.set(mensajeError(error));
    } finally {
      this.cargando.set(false);
    }
  }

  // ---------- Create ----------

  async abrirNuevoCliente() {
    if (this.guardando() || this.dialogoAbierto) return;
    this.dialogoAbierto = true;
    try {
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
      await alert.onDidDismiss();
    } finally { this.dialogoAbierto = false; }
  }

  private async crearCliente(nombre: string, telefono: string) {
    if (this.guardando()) return;
    this.guardando.set(true);
    this.errorMsg.set('');

    try {
      const respuesta = await this.clientesService.crearCliente(nombre, telefono);

      if (respuesta.success) {
        await this.cargarClientes(this.textoBusqueda);
      } else {
        this.errorMsg.set(respuesta.message || 'No se pudo crear el cliente');
      }
    } catch (error) {
      console.error('Error al crear cliente:', error);
      this.errorMsg.set(mensajeError(error));
    } finally {
      this.guardando.set(false);
    }
  }

  // ---------- Update ----------

  async abrirEditar(cliente: Cliente) {
    if (!this.authService.esAdmin() || this.guardando() || this.dialogoAbierto) return;
    this.dialogoAbierto = true;
    try {

      const alert = await this.alertCtrl.create({
        header: 'Editar nombre',
        message: 'Solo puedes cambiar el nombre. La deuda y el historial se conservan.',
        inputs: [
          { name: 'nombre', type: 'text', value: cliente.nombre, placeholder: 'Nombre' },
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
              void this.actualizarCliente(cliente.id, nombre);
              return true;
            },
          },
        ],
      });

      await alert.present();
      await alert.onDidDismiss();
    } finally { this.dialogoAbierto = false; }
  }

  private async actualizarCliente(id: number, nombre: string) {
    if (!this.authService.esAdmin() || this.guardando()) return;
    this.guardando.set(true);
    this.errorMsg.set('');

    try {
      const respuesta = await this.clientesService.actualizarCliente(id, nombre);

      if (respuesta.success) {
        await this.cargarClientes(this.textoBusqueda);
      } else {
        this.errorMsg.set(respuesta.message || 'No se pudo actualizar el cliente');
      }
    } catch (error) {
      console.error('Error al actualizar cliente:', error);
      this.errorMsg.set(mensajeError(error));
    } finally {
      this.guardando.set(false);
    }
  }

  // ---------- "Delete" (solo desactiva, nunca borra) ----------

  async confirmarDesactivar(cliente: Cliente, slidingItem: IonItemSliding) {
    if (!this.authService.esAdmin() || this.guardando() || this.dialogoAbierto) return;
    this.dialogoAbierto = true;
    try {
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
      await alert.onDidDismiss();
    } finally { this.dialogoAbierto = false; }
  }

  private async desactivarCliente(id: number) {
    if (!this.authService.esAdmin() || this.guardando()) return;
    this.guardando.set(true);
    this.errorMsg.set('');

    try {
      const respuesta = await this.clientesService.desactivarCliente(id);

      if (respuesta.success) {
        await this.cargarClientes(this.textoBusqueda);
      } else {
        this.errorMsg.set(respuesta.message || 'No se pudo desactivar el cliente');
      }
    } catch (error) {
      console.error('Error al desactivar cliente:', error);
      this.errorMsg.set(mensajeError(error));
    } finally {
      this.guardando.set(false);
    }
  }
}
