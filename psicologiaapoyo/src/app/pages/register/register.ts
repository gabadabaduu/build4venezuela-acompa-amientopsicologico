import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './register.html',
})
export class RegisterPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  email = signal('');
  password = signal('');
  fullName = signal('');
  role = signal<'volunteer' | 'admin'>('volunteer');
  error = signal('');
  loading = signal(false);

  async onSubmit() {
    this.loading.set(true);
    this.error.set('');

    try {
      const selectedRole = this.role();
      await this.auth.signUp(this.email(), this.password(), this.fullName(), selectedRole);
      this.router.navigate([selectedRole === 'admin' ? '/admin' : '/profile']);
    } catch (err: unknown) {
      this.error.set(err instanceof Error ? err.message : 'Error al registrarse');
    } finally {
      this.loading.set(false);
    }
  }
}
