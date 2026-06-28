import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ProfileService } from '../../services/profile.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './change-password.html',
  styleUrl: './change-password.css',
})
export class ChangePasswordPage {
  private readonly auth = inject(AuthService);
  private readonly profileService = inject(ProfileService);
  private readonly router = inject(Router);

  password = signal('');
  confirmPassword = signal('');
  error = signal('');
  loading = signal(false);

  async onSubmit() {
    this.error.set('');

    const password = this.password().trim();
    const confirm = this.confirmPassword().trim();

    if (password.length < 8) {
      this.error.set('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (password !== confirm) {
      this.error.set('Las contraseñas no coinciden.');
      return;
    }

    this.loading.set(true);
    try {
      await this.auth.updatePassword(password);

      const user = this.auth.currentUser();
      if (!user) throw new Error('No se pudo actualizar la sesión');

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
