import { Component, inject, signal, effect } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProfileService } from '../../services/profile.service';
import { AuthService } from '../../services/auth.service';
import type { Profile } from '../../models/user.model';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './profile.html',
})
export class ProfilePage {
  private readonly auth = inject(AuthService);
  private readonly profileService = inject(ProfileService);

  profile = signal<Profile | null>(null);
  fullName = signal('');
  phone = signal('');
  bio = signal('');
  loading = signal(true);
  saving = signal(false);
  message = signal('');

  constructor() {
    effect(() => {
      const user = this.auth.currentUser();
      if (user) {
        this.loadProfile(user.id);
      }
    });
  }

  private async loadProfile(userId: string) {
    try {
      const p = await this.profileService.getProfile(userId);
      this.profile.set(p);
      this.fullName.set(p?.full_name ?? '');
      this.phone.set(p?.phone ?? '');
      this.bio.set(p?.bio ?? '');
    } catch {
      this.message.set('Error al cargar el perfil');
    } finally {
      this.loading.set(false);
    }
  }

  async save() {
    const user = this.auth.currentUser();
    if (!user) return;

    this.saving.set(true);
    this.message.set('');

    try {
      const updated = await this.profileService.updateProfile(user.id, {
        full_name: this.fullName(),
        phone: this.phone(),
        bio: this.bio(),
      });
      this.profile.set(updated);
      this.message.set('Perfil actualizado');
    } catch (err: unknown) {
      this.message.set(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      this.saving.set(false);
    }
  }
}
