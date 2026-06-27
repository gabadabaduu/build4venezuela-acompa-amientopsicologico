import { TestBed } from '@angular/core/testing';
import { SupabaseService } from './supabase.service';
import { environment } from '../../environments/environment';

describe('SupabaseService', () => {
  it('should be created', () => {
    const service = TestBed.inject(SupabaseService);
    expect(service).toBeTruthy();
  });

  it('should create a Supabase client', () => {
    const service = TestBed.inject(SupabaseService);
    expect(service.client).toBeDefined();
  });
});
