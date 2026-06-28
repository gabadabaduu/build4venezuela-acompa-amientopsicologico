import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ProfileService } from '../../services/profile.service';
import { AdminService, type NewVolunteerInput } from '../../services/admin.service';
import {
  STUDIES_STATUS_LABELS,
  type Profile,
  type StudiesStatus,
} from '../../models/user.model';

function undefinedIfEmpty(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './admin.html',
  styleUrls: ['./admin.css'],
})
export class AdminPage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly profileService = inject(ProfileService);
  private readonly admin = inject(AdminService);

  readonly studiesOptions = Object.entries(STUDIES_STATUS_LABELS) as [StudiesStatus, string][];

  // Admin basic info
  adminEmail = signal('');
  adminName = signal('');

  // Form fields
  fullName = signal('');
  email = signal('');
  phone = signal('');
  password = signal('');
  bio = signal('');
  professionalName = signal('');
  specialty = signal('');
  presentation = signal('');
  studiesStatus = signal<StudiesStatus | ''>('');
  availableSchedule = signal('');
  sessionOrientation = signal('');
  professionalRegistryNumber = signal('');
  place = signal('');
  avatarUrl = signal('');
  photoUrl = signal('');

  // State
  volunteers = signal<Profile[]>([]);
  loading = signal(true);
  saving = signal(false);
  error = signal('');
  success = signal('');
  tempPassword = signal('');
  showModal = signal(false);

  ngOnInit() {
    const user = this.auth.currentUser();
    if (user) {
      this.adminEmail.set(user.email);
      this.profileService
        .getProfile(user.id)
        .then((p) => this.adminName.set(p?.full_name ?? ''))
        .catch(() => {});
    }
    this.loadVolunteers();
  }

  private async loadVolunteers() {
    this.loading.set(true);
    try {
      this.volunteers.set(await this.admin.listVolunteers());
    } catch (err: unknown) {
      this.error.set(err instanceof Error ? err.message : 'No se pudieron cargar los psicólogos.');
    } finally {
      this.loading.set(false);
    }
  }

  studiesLabel(status: StudiesStatus | null): string {
    return status ? STUDIES_STATUS_LABELS[status] : '';
  }

  openModal() {
    this.error.set('');
    this.success.set('');
    this.tempPassword.set('');
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.error.set('');
    this.success.set('');
    this.tempPassword.set('');
    this.resetForm();
  }

  async onSubmit() {
    this.error.set('');
    this.success.set('');

    const fullName = this.fullName().trim();
    const email = this.email().trim();
    const phone = this.phone().trim();
    const password = this.password().trim();

    if (!fullName) {
      this.error.set('El nombre completo es obligatorio.');
      return;
    }
    if (!email && !phone) {
      this.error.set('Indica un correo o un teléfono.');
      return;
    }
    if (password && password.length < 8) {
      this.error.set('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    const input: NewVolunteerInput = {
      full_name: fullName,
      email: undefinedIfEmpty(email),
      phone: undefinedIfEmpty(phone),
      password: password || undefined,
      bio: undefinedIfEmpty(this.bio()),
      professional_name: undefinedIfEmpty(this.professionalName()),
      specialty: undefinedIfEmpty(this.specialty()),
      presentation: undefinedIfEmpty(this.presentation()),
      studies_status: undefinedIfEmpty(this.studiesStatus()),
      available_schedule: undefinedIfEmpty(this.availableSchedule()),
      session_orientation: undefinedIfEmpty(this.sessionOrientation()),
      professional_registry_number: undefinedIfEmpty(this.professionalRegistryNumber()),
      place: undefinedIfEmpty(this.place()),
      avatar_url: undefinedIfEmpty(this.avatarUrl()),
      photo_url: undefinedIfEmpty(this.photoUrl()),
    };

    this.saving.set(true);
    this.tempPassword.set('');
    try {
      const result = await this.admin.createVolunteer(input);
      this.resetForm();
      this.success.set('Psicólogo registrado correctamente.');
      this.tempPassword.set(result.temporary_password ?? '');
      await this.loadVolunteers();
    } catch (err: unknown) {
      this.error.set(err instanceof Error ? err.message : 'No se pudo crear el psicólogo.');
    } finally {
      this.saving.set(false);
    }
  }

  private resetForm() {
    this.fullName.set('');
    this.email.set('');
    this.phone.set('');
    this.password.set('');
    this.bio.set('');
    this.professionalName.set('');
    this.specialty.set('');
    this.presentation.set('');
    this.studiesStatus.set('');
    this.availableSchedule.set('');
    this.sessionOrientation.set('');
    this.professionalRegistryNumber.set('');
    this.place.set('');
    this.avatarUrl.set('');
    this.photoUrl.set('');
  }

  async signOut() {
    await this.auth.signOut();
  }
}
