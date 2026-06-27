import { TestBed } from '@angular/core/testing';
import { ProfileService } from './profile.service';

describe('ProfileService', () => {
  it('should be created', () => {
    const service = TestBed.inject(ProfileService);
    expect(service).toBeTruthy();
  });

  it('should expose getProfile method', () => {
    const service = TestBed.inject(ProfileService);
    expect(service.getProfile).toBeDefined();
  });

  it('should expose updateProfile method', () => {
    const service = TestBed.inject(ProfileService);
    expect(service.updateProfile).toBeDefined();
  });
});
