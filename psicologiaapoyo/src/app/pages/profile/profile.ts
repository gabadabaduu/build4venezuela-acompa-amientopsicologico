import { ChangeDetectionStrategy, Component, effect, inject, resource, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProfileService } from '../../services/profile.service';
import { AuthService } from '../../services/auth.service';
import type { Profile } from '../../models/user.model';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './profile.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePage {
  private readonly auth = inject(AuthService);
  private readonly profileService = inject(ProfileService);
  private readonly fb = inject(FormBuilder);

  saving = signal(false);
  message = signal('');

  profileResource = resource({
    loader: async () => {
      const userId = this.auth.currentUser()?.id;
      if (!userId) return null;
      return this.profileService.getProfile(userId);
    },
  });

  editForm = this.fb.nonNullable.group({
    fullName: ['', Validators.required],
    phone: [''],
    bio: [''],
  });

  constructor() {
    effect(() => {
      const profile = this.profileResource.value();
      if (profile) {
        this.editForm.patchValue({
          fullName: profile.full_name,
          phone: profile.phone ?? '',
          bio: profile.bio ?? '',
        });
      }
    });
  }

  async save() {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    const user = this.auth.currentUser();
    if (!user) return;

    this.saving.set(true);
    this.message.set('');

    try {
      const { fullName, phone, bio } = this.editForm.getRawValue();
      await this.profileService.updateProfile(user.id, {
        full_name: fullName,
        phone: phone || undefined,
        bio: bio || undefined,
      });
      this.message.set('Perfil actualizado');
      this.profileResource.reload();
    } catch (err: unknown) {
      this.message.set(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      this.saving.set(false);
    }
  }
}
