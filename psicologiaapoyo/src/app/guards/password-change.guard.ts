import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ProfileService } from '../services/profile.service';

/** Block app routes until the user sets a new password. */
export const mustChangePasswordGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!(await auth.mustChangePassword())) {
    return true;
  }

  return router.parseUrl('/change-password');
};

/** Keep users on change-password until the flag is cleared. */
export const changePasswordPageGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const profileService = inject(ProfileService);
  const router = inject(Router);

  if (await auth.mustChangePassword()) {
    return true;
  }

  const user = auth.currentUser();
  if (!user) {
    return router.parseUrl('/login');
  }

  const profile = await profileService.getProfile(user.id);
  const destination = profile?.role === 'admin' ? '/admin' : '/profile';
  return router.parseUrl(destination);
};
