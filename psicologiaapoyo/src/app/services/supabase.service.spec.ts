import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { SupabaseService } from './supabase.service';
import { createSupabaseMock } from '../testing/supabase.mock';

describe('SupabaseService', () => {
  it('should be created', () => {
    const service = TestBed.inject(SupabaseService);
    expect(service).toBeTruthy();
  });

  it('should create a Supabase client', () => {
    const service = TestBed.inject(SupabaseService);
    expect(service.client).toBeDefined();
  });

  it('should expose auth methods on client', () => {
    const { client } = createSupabaseMock();
    expect(client.auth.getSession).toBeDefined();
    expect(client.auth.signUp).toBeDefined();
    expect(client.auth.signInWithPassword).toBeDefined();
  });
});
