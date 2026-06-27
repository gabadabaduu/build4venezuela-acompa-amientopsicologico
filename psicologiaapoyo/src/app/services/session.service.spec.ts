import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { SessionService } from './session.service';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { createQueryBuilder, createSupabaseMock } from '../testing/supabase.mock';

describe('SessionService', () => {
  function setup(options: {
    userId?: string | null;
    profile?: { role: string } | null;
    profileError?: { message: string } | null;
    sessions?: unknown[];
  } = {}) {
    const profileBuilder = createQueryBuilder({
      data: options.profile ?? null,
      error: options.profileError ?? null,
    });
    const sessionsBuilder = createQueryBuilder({
      data: options.sessions ?? [],
      error: null,
    });

    const { client } = createSupabaseMock();
    client.from = vi.fn().mockImplementation((table: string) => {
      if (table === 'profiles') return profileBuilder;
      return sessionsBuilder;
    });

    const auth = {
      currentUser: vi.fn().mockReturnValue(
        options.userId === null
          ? null
          : { id: options.userId ?? 'user-1', email: 'test@example.com' },
      ),
    };

    TestBed.configureTestingModule({
      providers: [
        SessionService,
        { provide: SupabaseService, useValue: { client } },
        { provide: AuthService, useValue: auth },
      ],
    });

    return { service: TestBed.inject(SessionService), client, sessionsBuilder, profileBuilder };
  }

  it('should be created', () => {
    const { service } = setup();
    expect(service).toBeTruthy();
  });

  it('should throw when not authenticated', async () => {
    const { service } = setup({ userId: null });
    await expect(service.getMySessions()).rejects.toThrow('Not authenticated');
  });

  it('should return empty array when profile fetch fails', async () => {
    const { service } = setup({ profileError: { message: 'not found' } });
    const sessions = await service.getMySessions();
    expect(sessions).toEqual([]);
  });

  it('should query patient sessions by patient_id', async () => {
    const { service, sessionsBuilder } = setup({
      profile: { role: 'patient' },
      sessions: [{ id: 's1', status: 'pending' }],
    });

    const sessions = await service.getMySessions();
    expect(sessions).toHaveLength(1);
    expect(sessionsBuilder.eq).toHaveBeenCalledWith('patient_id', 'user-1');
  });

  it('should query psychologist sessions including pending unassigned', async () => {
    const profileBuilder = createQueryBuilder({
      data: { role: 'psychologist' },
      error: null,
    });
    const sessionsBuilder = createQueryBuilder({
      data: [{ id: 's1', status: 'pending' }],
      error: null,
    });

    const { client } = createSupabaseMock();
    let profilesCall = 0;
    client.from = vi.fn().mockImplementation((table: string) => {
      if (table === 'profiles') {
        profilesCall += 1;
        return profileBuilder;
      }
      return sessionsBuilder;
    });

    const auth = {
      currentUser: vi.fn().mockReturnValue({ id: 'psy-1', email: 'psy@example.com' }),
    };

    TestBed.configureTestingModule({
      providers: [
        SessionService,
        { provide: SupabaseService, useValue: { client } },
        { provide: AuthService, useValue: auth },
      ],
    });

    const service = TestBed.inject(SessionService);
    const sessions = await service.getMySessions();

    expect(sessions).toHaveLength(1);
    expect(sessionsBuilder.or).toHaveBeenCalled();
  });

  it('should assign psychologist_id when accepting session', async () => {
    const updateBuilder = createQueryBuilder({
      data: { id: 's1', status: 'accepted', psychologist_id: 'psy-1' },
      error: null,
    });
    const profileBuilder = createQueryBuilder({
      data: { role: 'psychologist' },
      error: null,
    });

    const { client } = createSupabaseMock();
    client.from = vi.fn().mockImplementation((table: string) => {
      if (table === 'profiles') return profileBuilder;
      return updateBuilder;
    });

    const auth = {
      currentUser: vi.fn().mockReturnValue({ id: 'psy-1', email: 'psy@example.com' }),
    };

    TestBed.configureTestingModule({
      providers: [
        SessionService,
        { provide: SupabaseService, useValue: { client } },
        { provide: AuthService, useValue: auth },
      ],
    });

    const service = TestBed.inject(SessionService);
    const result = await service.updateSessionStatus('s1', 'accepted');

    expect(updateBuilder.update).toHaveBeenCalledWith({
      status: 'accepted',
      psychologist_id: 'psy-1',
    });
    expect(result.status).toBe('accepted');
  });
});
