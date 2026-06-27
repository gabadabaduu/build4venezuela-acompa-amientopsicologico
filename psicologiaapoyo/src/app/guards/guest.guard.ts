import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router } from '@angular/router';
import { filter, firstValueFrom, take } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const guestGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const ready$ = toObservable(auth.isLoading).pipe(filter((v) => !v), take(1));
  await firstValueFrom(ready$);

  if (auth.isAuthenticated()) {
    return router.parseUrl('/dashboard');
  }

  return true;
};
