import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonItem, IonLabel, IonInput, IonButton } from '@ionic/angular';
import { AuthService } from '../services/auth.service';

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

  // Signals: en este proyecto zoneless (sin zone.js), son necesarios para que
  // la vista se repinte sola cuando cambian después de un await.
  cargando = signal(false);
  errorMsg = signal('');

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  async onLogin(): Promise<void> {

    this.errorMsg.set('');

    if (!this.usuario || !this.password) {
      this.errorMsg.set('Ingresa usuario y contraseña');
      return;
    }

    this.cargando.set(true);

    try {
      const response = await this.authService.login(this.usuario, this.password);

      if (response.success && response.usuario) {

        this.authService.guardarSesion(response.token || '', response.usuario);

        this.router.navigateByUrl('/tabs/inicio');

      } else {
        this.errorMsg.set(response.message || 'No se pudo iniciar sesión');
      }

    } catch (error: any) {
      console.error('Error de login:', error);
      this.errorMsg.set('Error al conectar con el servidor. Revisa que XAMPP esté prendido.');
    } finally {
      this.cargando.set(false);
    }
  }
}
