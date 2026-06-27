import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { authGuard } from './auth.guard';
import { guestGuard } from './guest.guard';
import { AuthService } from '../services/auth.service';

function createAuthMock(loading: boolean, authenticated: boolean) {
  return {
    isLoading: signal(loading),
    isAuthenticated: vi.fn().mockReturnValue(authenticated),
  };
}

describe('authGuard', () => {
  it('should allow access when authenticated after loading', async () => {
    const auth = createAuthMock(false, true);

    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: auth }],
    });

    const result = await TestBed.runInInjectionContext(() => authGuard(null!, null!));
    expect(result).toBe(true);
  });

  it('should wait for loading to finish before checking auth', async () => {
    const auth = createAuthMock(true, true);

    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: auth }],
    });

    const guardPromise = TestBed.runInInjectionContext(() => authGuard(null!, null!));
    auth.isLoading.set(false);
    const result = await guardPromise;
    expect(result).toBe(true);
  });

  it('should redirect to login when not authenticated', async () => {
    const auth = createAuthMock(false, false);
    const router = { parseUrl: vi.fn().mockReturnValue('/login') };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router },
      ],
    });

    const result = await TestBed.runInInjectionContext(() => authGuard(null!, null!));
    expect(router.parseUrl).toHaveBeenCalledWith('/login');
    expect(result).toBe('/login');
  });
});

describe('guestGuard', () => {
  it('should redirect to dashboard when authenticated', async () => {
    const auth = createAuthMock(false, true);
    const router = { parseUrl: vi.fn().mockReturnValue('/dashboard') };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router },
      ],
    });

    const result = await TestBed.runInInjectionContext(() => guestGuard(null!, null!));
    expect(router.parseUrl).toHaveBeenCalledWith('/dashboard');
    expect(result).toBe('/dashboard');
  });

  it('should allow access when not authenticated', async () => {
    const auth = createAuthMock(false, false);

    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: auth }],
    });

    const result = await TestBed.runInInjectionContext(() => guestGuard(null!, null!));
    expect(result).toBe(true);
  });
});
