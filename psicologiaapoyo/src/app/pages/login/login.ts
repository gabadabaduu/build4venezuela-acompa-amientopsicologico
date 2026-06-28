import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ProfileService } from '../../services/profile.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly profileService = inject(ProfileService);
  private readonly router = inject(Router);

  email = signal('');
  password = signal('');
  error = signal('');
  loading = signal(false);

  async onSubmit() {
    this.loading.set(true);
    this.error.set('');

    try {
      const { user } = await this.auth.signIn(this.email(), this.password());
      if (!user) throw new Error('No se pudo iniciar sesión');

      const profile = await this.profileService.getProfile(user.id);
      const destination = profile?.role === 'admin' ? '/admin' : '/profile';
      this.router.navigate([destination]);
    } catch (err: unknown) {
      this.error.set(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      this.loading.set(false);
    }
  }
}
