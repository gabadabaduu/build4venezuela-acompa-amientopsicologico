import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ProfileService } from '../services/profile.service';
import type { UserRole } from '../models/user.model';

export function roleGuard(allowedRoles: UserRole[]): CanActivateFn {
  return async () => {
    const auth = inject(AuthService);
    const profileService = inject(ProfileService);
    const router = inject(Router);

    const user = auth.currentUser();
    if (!user) {
      return router.parseUrl('/login');
    }

    const profile = await profileService.getProfile(user.id);
    if (profile && allowedRoles.includes(profile.role)) {
      return true;
    }

    if (profile?.role === 'admin') {
      return router.parseUrl('/admin');
    }

    return router.parseUrl('/profile');
  };
}
