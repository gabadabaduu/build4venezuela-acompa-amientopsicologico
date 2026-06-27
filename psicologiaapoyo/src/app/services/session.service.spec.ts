import { TestBed } from '@angular/core/testing';
import { SessionService } from './session.service';

describe('SessionService', () => {
  it('should be created', () => {
    const service = TestBed.inject(SessionService);
    expect(service).toBeTruthy();
  });

  it('should expose getMySessions method', () => {
    const service = TestBed.inject(SessionService);
    expect(service.getMySessions).toBeDefined();
  });

  it('should expose createSession method', () => {
    const service = TestBed.inject(SessionService);
    expect(service.createSession).toBeDefined();
  });

  it('should expose updateSessionStatus method', () => {
    const service = TestBed.inject(SessionService);
    expect(service.updateSessionStatus).toBeDefined();
  });
});
