import { Component, effect, inject, signal } from '@angular/core';
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
  styleUrls: ['./profile.css'],
})
export class ProfilePage {
  private readonly auth = inject(AuthService);
  private readonly profileService = inject(ProfileService);

  profile = signal<Profile | null>(null);

  fullName = signal('');
  phone = signal('');
  bio = signal('');

  // Campos profesionales
  professionalName = signal('');
  specialty = signal('');
  presentation = signal('');
  availableSchedule = signal('');
  photoUrl = signal('');
  sessionOrientation = signal('');

  loading = signal(true);
  saving = signal(false);
  message = signal('');

  constructor() {
    effect(() => {
      const user = this.auth.currentUser();
      if (user) {
        this.loadProfile(user.id);
      } else {
        this.loading.set(false);
      }
    });
  }

  private async loadProfile(userId: string) {
    this.loading.set(true);
    try {
      const p = await this.profileService.getProfile(userId);
      this.profile.set(p);

      this.fullName.set(p?.full_name ?? '');
      this.phone.set(p?.phone ?? '');
      this.bio.set(p?.bio ?? '');

      // Cargar campos profesionales si existen
      this.professionalName.set(p?.professional_name ?? p?.full_name ?? '');
      this.specialty.set(p?.specialty ?? '');
      this.presentation.set(p?.presentation ?? '');
      this.availableSchedule.set(p?.available_schedule ?? '');
      this.photoUrl.set(p?.photo_url ?? '');
      this.sessionOrientation.set(p?.session_orientation ?? '');
    } catch (err: unknown) {
      this.message.set(err instanceof Error ? err.message : 'Error al cargar el perfil');
    } finally {
      this.loading.set(false);
    }
  }

  async save() {
    const user = this.auth.currentUser();
    const current = this.profile();

    if (!user || !current) return;

    this.saving.set(true);
    this.message.set('');

    try {
      const payload: Partial<Profile> = {
        full_name: this.fullName(),
        phone: this.phone(),
        bio: this.bio(),
      };

      // Solo guardar campos profesionales si el rol es psychologist
      if (current.role === 'psychologist') {
        payload.professional_name = this.professionalName();
        payload.specialty = this.specialty();
        payload.presentation = this.presentation();
        payload.available_schedule = this.availableSchedule();
        payload.photo_url = this.photoUrl();
        payload.session_orientation = this.sessionOrientation();
      }

      const updated = await this.profileService.updateProfile(user.id, payload);
      this.profile.set(updated);
      this.message.set('Perfil actualizado');
    } catch (err: unknown) {
      this.message.set(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      this.saving.set(false);
    }
  }
}
