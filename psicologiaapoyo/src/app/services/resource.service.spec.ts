import { TestBed } from '@angular/core/testing';
import { ResourceService } from './resource.service';

describe('ResourceService', () => {
  it('should be created', () => {
    const service = TestBed.inject(ResourceService);
    expect(service).toBeTruthy();
  });

  it('should expose getResources method', () => {
    const service = TestBed.inject(ResourceService);
    expect(service.getResources).toBeDefined();
  });

  it('should expose createResource method', () => {
    const service = TestBed.inject(ResourceService);
    expect(service.createResource).toBeDefined();
  });

  it('should expose updateResource method', () => {
    const service = TestBed.inject(ResourceService);
    expect(service.updateResource).toBeDefined();
  });
});
