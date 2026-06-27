import { TestBed } from '@angular/core/testing';
import { ProfileService } from './profile.service';
import { SupabaseService } from './supabase.service';
import { createQueryBuilder, createSupabaseMock } from '../testing/supabase.mock';

describe('ProfileService', () => {
  function setup(resolved: { data?: unknown; error?: unknown } = { data: null, error: null }) {
    const queryBuilder = createQueryBuilder(resolved);
    const { client } = createSupabaseMock({ queryBuilder });

    TestBed.configureTestingModule({
      providers: [
        ProfileService,
        { provide: SupabaseService, useValue: { client } },
      ],
    });

    return { service: TestBed.inject(ProfileService), queryBuilder };
  }

  it('should be created', () => {
    const { service } = setup();
    expect(service).toBeTruthy();
  });

  it('should fetch profile by user id', async () => {
    const profile = {
      id: 'user-1',
      full_name: 'Test User',
      role: 'patient',
    };
    const { service, queryBuilder } = setup({ data: profile, error: null });

    const result = await service.getProfile('user-1');

    expect(queryBuilder.select).toHaveBeenCalledWith('*');
    expect(queryBuilder.eq).toHaveBeenCalledWith('id', 'user-1');
    expect(result).toEqual(profile);
  });

  it('should throw on getProfile RLS denial', async () => {
    const { service } = setup({ data: null, error: { message: 'RLS denial' } });

    await expect(service.getProfile('user-1')).rejects.toEqual({ message: 'RLS denial' });
  });

  it('should update profile fields', async () => {
    const updated = {
      id: 'user-1',
      full_name: 'Updated Name',
      role: 'patient',
      phone: '123',
    };
    const { service, queryBuilder } = setup({ data: updated, error: null });

    const result = await service.updateProfile('user-1', {
      full_name: 'Updated Name',
      phone: '123',
    });

    expect(queryBuilder.update).toHaveBeenCalledWith({
      full_name: 'Updated Name',
      phone: '123',
    });
    expect(queryBuilder.eq).toHaveBeenCalledWith('id', 'user-1');
    expect(result).toEqual(updated);
  });

  it('should throw on updateProfile network error', async () => {
    const { service } = setup({ data: null, error: { message: 'network error' } });

    await expect(
      service.updateProfile('user-1', { full_name: 'Name' }),
    ).rejects.toEqual({ message: 'network error' });
  });
});
