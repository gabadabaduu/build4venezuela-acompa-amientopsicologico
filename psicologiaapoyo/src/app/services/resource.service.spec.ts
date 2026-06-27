import { TestBed } from '@angular/core/testing';
import { ResourceService } from './resource.service';
import { SupabaseService } from './supabase.service';
import { createQueryBuilder, createSupabaseMock } from '../testing/supabase.mock';

describe('ResourceService', () => {
  function setup(resolved: { data?: unknown; error?: unknown } = { data: [], error: null }) {
    const queryBuilder = createQueryBuilder(resolved);
    const { client } = createSupabaseMock({ queryBuilder });

    TestBed.configureTestingModule({
      providers: [
        ResourceService,
        { provide: SupabaseService, useValue: { client } },
      ],
    });

    return { service: TestBed.inject(ResourceService), queryBuilder };
  }

  it('should be created', () => {
    const { service } = setup();
    expect(service).toBeTruthy();
  });

  it('should fetch published resources ordered by created_at', async () => {
    const resources = [{ id: 'r1', title: 'Guía', published: true }];
    const { service, queryBuilder } = setup({ data: resources, error: null });

    const result = await service.getResources();

    expect(queryBuilder.select).toHaveBeenCalledWith('*');
    expect(queryBuilder.eq).toHaveBeenCalledWith('published', true);
    expect(queryBuilder.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(result).toEqual(resources);
  });

  it('should throw on getResources error', async () => {
    const { service } = setup({ data: null, error: { message: 'network error' } });

    await expect(service.getResources()).rejects.toEqual({ message: 'network error' });
  });

  it('should create a resource', async () => {
    const resource = {
      id: 'r1',
      title: 'Nuevo',
      content: 'Body',
      type: 'article',
      author_id: 'user-1',
    };
    const { service, queryBuilder } = setup({ data: resource, error: null });

    const result = await service.createResource({
      title: 'Nuevo',
      description: 'Desc',
      content: 'Body',
      type: 'article',
      author_id: 'user-1',
    });

    expect(queryBuilder.insert).toHaveBeenCalled();
    expect(result).toEqual(resource);
  });

  it('should update a resource', async () => {
    const resource = { id: 'r1', title: 'Updated', published: true };
    const { service, queryBuilder } = setup({ data: resource, error: null });

    const result = await service.updateResource('r1', { published: true });

    expect(queryBuilder.update).toHaveBeenCalledWith({ published: true });
    expect(queryBuilder.eq).toHaveBeenCalledWith('id', 'r1');
    expect(result).toEqual(resource);
  });
});
