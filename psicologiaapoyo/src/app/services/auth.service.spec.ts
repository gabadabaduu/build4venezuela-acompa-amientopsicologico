import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';

describe('AuthService', () => {
  it('should be created', () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([])],
    });
    const service = TestBed.inject(AuthService);
    expect(service).toBeTruthy();
  });

  it('should start as not authenticated', () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([])],
    });
    const service = TestBed.inject(AuthService);
    expect(service.isAuthenticated()).toBe(false);
    expect(service.currentUser()).toBeNull();
  });

  it('should have loading state', () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([])],
    });
    const service = TestBed.inject(AuthService);
    expect(service.isLoading()).toBe(true);
  });
});
