import { Component, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProfileService } from '../../services/profile.service';
import { AuthService } from '../../services/auth.service';
import {
  STUDIES_STATUS_LABELS,
  type Profile,
  type StudiesStatus,
} from '../../models/user.model';

function nullIfEmpty(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

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

  readonly studiesOptions = Object.entries(STUDIES_STATUS_LABELS) as [StudiesStatus, string][];

  profile = signal<Profile | null>(null);
  email = signal('');

  fullName = signal('');
  phone = signal('');
  bio = signal('');
  avatarUrl = signal('');
  professionalName = signal('');
  specialty = signal('');
  presentation = signal('');
  availableSchedule = signal('');
  photoUrl = signal('');
  sessionOrientation = signal('');
  studiesStatus = signal<StudiesStatus | ''>('');
  professionalRegistryNumber = signal('');
  place = signal('');

  loading = signal(true);
  saving = signal(false);
  message = signal('');

  constructor() {
    effect(() => {
      const user = this.auth.currentUser();
      if (user) {
        this.email.set(user.email);
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
      this.avatarUrl.set(p?.avatar_url ?? '');
      this.professionalName.set(p?.professional_name ?? '');
      this.specialty.set(p?.specialty ?? '');
      this.presentation.set(p?.presentation ?? '');
      this.availableSchedule.set(p?.available_schedule ?? '');
      this.photoUrl.set(p?.photo_url ?? '');
      this.sessionOrientation.set(p?.session_orientation ?? '');
      this.studiesStatus.set(p?.studies_status ?? '');
      this.professionalRegistryNumber.set(p?.professional_registry_number ?? '');
      this.place.set(p?.place ?? '');
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

    if (!this.fullName().trim()) {
      this.message.set('El nombre completo es obligatorio.');
      return;
    }

    this.saving.set(true);
    this.message.set('');

    try {
      const studies = this.studiesStatus();
      const payload: Partial<Profile> = {
        full_name: this.fullName().trim(),
        phone: nullIfEmpty(this.phone()),
        bio: nullIfEmpty(this.bio()),
        avatar_url: nullIfEmpty(this.avatarUrl()),
        professional_name: nullIfEmpty(this.professionalName()),
        specialty: nullIfEmpty(this.specialty()),
        presentation: nullIfEmpty(this.presentation()),
        available_schedule: nullIfEmpty(this.availableSchedule()),
        photo_url: nullIfEmpty(this.photoUrl()),
        session_orientation: nullIfEmpty(this.sessionOrientation()),
        studies_status: studies ? (studies as StudiesStatus) : null,
        professional_registry_number: nullIfEmpty(this.professionalRegistryNumber()),
        place: nullIfEmpty(this.place()),
      };

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
