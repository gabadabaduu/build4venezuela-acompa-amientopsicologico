import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ProfileService } from '../../services/profile.service';

type LoginMode = 'login' | 'change-password';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly profileService = inject(ProfileService);
  private readonly router = inject(Router);

  mode = signal<LoginMode>('login');
  email = signal('');
  password = signal('');
  newPassword = signal('');
  confirmPassword = signal('');
  error = signal('');
  loading = signal(false);

  setMode(next: LoginMode) {
    this.mode.set(next);
    this.error.set('');
  }

  async onSubmit() {
    this.loading.set(true);
    this.error.set('');

    try {
      const { user } = await this.auth.signIn(this.email(), this.password());
      if (!user) throw new Error('No se pudo iniciar sesión');

      const destination = await this.auth.getPostLoginPath(user.id);
      this.router.navigate([destination]);
    } catch (err: unknown) {
      this.error.set(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      this.loading.set(false);
    }
  }

  async onChangePasswordSubmit() {
    this.error.set('');

    const email = this.email().trim();
    const currentPassword = this.password();
    const newPassword = this.newPassword().trim();
    const confirm = this.confirmPassword().trim();

    if (!email) {
      this.error.set('Indica tu correo electrónico.');
      return;
    }

    if (!currentPassword) {
      this.error.set('Indica tu contraseña actual.');
      return;
    }

    if (newPassword.length < 8) {
      this.error.set('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (newPassword !== confirm) {
      this.error.set('Las contraseñas nuevas no coinciden.');
      return;
    }

    if (newPassword === currentPassword) {
      this.error.set('La nueva contraseña debe ser distinta a la actual.');
      return;
    }

    this.loading.set(true);
    try {
      const { user } = await this.auth.signIn(email, currentPassword);
      if (!user) throw new Error('No se pudo verificar la contraseña actual');

      await this.auth.updatePassword(newPassword);

      const profile = await this.profileService.getProfile(user.id);
      const destination = profile?.role === 'admin' ? '/admin' : '/profile';
      this.router.navigate([destination]);
    } catch (err: unknown) {
      this.error.set(err instanceof Error ? err.message : 'No se pudo cambiar la contraseña');
    } finally {
      this.loading.set(false);
    }
  }
}
