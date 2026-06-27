import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';
import { createSupabaseMock } from '../testing/supabase.mock';

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function setup(session: { user: { id: string; email: string } } | null = null) {
    const { client } = createSupabaseMock({ session });

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: SupabaseService, useValue: { client } },
      ],
    });

    return TestBed.inject(AuthService);
  }

  it('should be created', () => {
    const service = setup();
    expect(service).toBeTruthy();
  });

  it('should start as not authenticated when no session', async () => {
    const service = setup(null);
    await service.waitUntilReady();
    expect(service.isAuthenticated()).toBe(false);
    expect(service.currentUser()).toBeNull();
  });

  it('should finish loading after getSession resolves', async () => {
    const service = setup();
    await service.waitUntilReady();
    expect(service.isLoading()).toBe(false);
  });

  it('should handle getSession failure gracefully', async () => {
    const { client } = createSupabaseMock();
    client.auth.getSession = vi.fn().mockRejectedValue(new Error('network error'));

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: SupabaseService, useValue: { client } },
      ],
    });

    const service = TestBed.inject(AuthService);
    await service.waitUntilReady();

    expect(service.isLoading()).toBe(false);
    expect(service.currentUser()).toBeNull();
  });

  it('should sign up with patient metadata only', async () => {
    const { client } = createSupabaseMock();
    client.auth.signUp = vi.fn().mockResolvedValue({
      data: { user: { id: 'user-1' }, session: null },
      error: null,
    });

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: SupabaseService, useValue: { client } },
      ],
    });

    const service = TestBed.inject(AuthService);
    await service.waitUntilReady();

    await service.signUp('test@example.com', 'password123', 'Test User');

    expect(client.auth.signUp).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
      options: {
        data: { full_name: 'Test User', role: 'patient' },
      },
    });
  });

  it('should throw on signUp error', async () => {
    const { client } = createSupabaseMock();
    client.auth.signUp = vi.fn().mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'RLS denial' },
    });

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: SupabaseService, useValue: { client } },
      ],
    });

    const service = TestBed.inject(AuthService);
    await service.waitUntilReady();

    await expect(
      service.signUp('test@example.com', 'password123', 'Test User'),
    ).rejects.toEqual({ message: 'RLS denial' });
  });

  it('should sign in with password', async () => {
    const { client } = createSupabaseMock();
    client.auth.signInWithPassword = vi.fn().mockResolvedValue({
      data: { session: { user: { id: 'user-1', email: 'test@example.com' } } },
      error: null,
    });

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: SupabaseService, useValue: { client } },
      ],
    });

    const service = TestBed.inject(AuthService);
    await service.waitUntilReady();

    await service.signIn('test@example.com', 'password123');

    expect(client.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
  });

  it('should throw on signIn network error', async () => {
    const { client } = createSupabaseMock();
    client.auth.signInWithPassword = vi.fn().mockResolvedValue({
      data: { session: null },
      error: { message: 'Invalid login credentials' },
    });

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: SupabaseService, useValue: { client } },
      ],
    });

    const service = TestBed.inject(AuthService);
    await service.waitUntilReady();

    await expect(service.signIn('bad@example.com', 'wrong')).rejects.toEqual({
      message: 'Invalid login credentials',
    });
  });

  it('should sign out and navigate to login', async () => {
    const { client } = createSupabaseMock();
    const router = { navigate: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: SupabaseService, useValue: { client } },
        { provide: Router, useValue: router },
      ],
    });

    const service = TestBed.inject(AuthService);
    await service.waitUntilReady();
    await service.signOut();

    expect(client.auth.signOut).toHaveBeenCalled();
    expect(service.currentUser()).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });
});
