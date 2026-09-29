import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonItem, IonLabel, IonInput, IonButton } from '@ionic/angular';
import { AuthService } from '../services/auth.service';
import { ServidorService } from '../services/servidor.service';
import { ApiClient } from '../services/api-client.service';
import { mensajeError } from '../services/resiliencia.interceptor';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonItem,
    IonLabel,
    IonInput,
    IonButton
  ],
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage {

  usuario: string = '';
  password: string = '';
  origen = '';
  comprobando = signal(false);
  conexionMsg = signal('');

  // Signals: en este proyecto zoneless (sin zone.js), son necesarios para que
  // la vista se repinte sola cuando cambian después de un await.
  cargando = signal(false);
  errorMsg = signal('');

  constructor(
    private authService: AuthService,
    private router: Router,
    private servidor: ServidorService,
    private api: ApiClient
  ) { this.origen = servidor.apiUrl(); }

  async comprobarServidor() {
    if (this.cargando() || this.comprobando()) return;
    this.comprobando.set(true); this.errorMsg.set(''); this.conexionMsg.set('');
    try {
      this.servidor.guardar(this.origen);
      await this.api.get('estado.php');
      this.conexionMsg.set('Conexión correcta con la API y la base de datos.');
    } catch (error) { this.errorMsg.set(mensajeError(error)); }
    finally { this.comprobando.set(false); }
  }

  async onLogin(): Promise<void> {
    if (this.cargando() || this.comprobando()) return;

    this.errorMsg.set('');

    if (!this.usuario || !this.password) {
      this.errorMsg.set('Ingresa usuario y contraseña');
      return;
    }

    this.cargando.set(true);

    try {
      this.servidor.guardar(this.origen);
      const response = await this.authService.login(this.usuario, this.password);

      if (response.success && response.usuario && response.token) {

        this.authService.guardarSesion(response.token || '', response.usuario);

        this.password = '';
        this.router.navigateByUrl('/tabs/inicio', { replaceUrl: true });

      } else {
        this.errorMsg.set(response.message || 'No se pudo iniciar sesión');
      }

    } catch (error: unknown) {
      console.error('Error de login:', error);
      this.errorMsg.set(mensajeError(error, 'No se pudo conectar con el servidor.'));
    } finally {
      this.cargando.set(false);
    }
  }
}
