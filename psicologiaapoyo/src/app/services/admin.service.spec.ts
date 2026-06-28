import { TestBed } from '@angular/core/testing';
import { AdminService } from './admin.service';

describe('AdminService', () => {
  it('should be created', () => {
    TestBed.configureTestingModule({});
    const service = TestBed.inject(AdminService);
    expect(service).toBeTruthy();
  });
});
