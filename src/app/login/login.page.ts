import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonItem, IonLabel, IonInput, IonButton } from '@ionic/angular';
import { ApiService } from '../services/api.service';

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

  cargando: boolean = false;
  errorMsg: string = '';

  constructor(
    private apiService: ApiService,
    private router: Router
  ) {}

  async onLogin(): Promise<void> {

    this.errorMsg = '';

    if (!this.usuario || !this.password) {
      this.errorMsg = 'Ingresa usuario y contraseña';
      return;
    }

    this.cargando = true;

    try {
      const response = await this.apiService.login(this.usuario, this.password);

      if (response.success && response.usuario) {

        localStorage.setItem('token', response.token || '');
        localStorage.setItem('usuario_id', String(response.usuario.id));
        localStorage.setItem('usuario_nombre', response.usuario.nombre);

        this.router.navigateByUrl('/tab1');

      } else {
        this.errorMsg = response.message || 'No se pudo iniciar sesión';
      }

    } catch (error: any) {
      console.error('Error de login:', error);
      this.errorMsg = 'Error al conectar con el servidor. Revisa que XAMPP esté prendido.';
    } finally {
      this.cargando = false;
    }
  }
}