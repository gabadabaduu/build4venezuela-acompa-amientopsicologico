import type { SupabaseClient } from '@supabase/supabase-js';
import { vi } from 'vitest';

type QueryBuilder = {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  or: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
};

export function createQueryBuilder(
  resolved: { data?: unknown; error?: unknown } = { data: null, error: null },
): QueryBuilder {
  const builder: QueryBuilder = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    eq: vi.fn(),
    or: vi.fn(),
    order: vi.fn(),
    single: vi.fn(),
  };

  builder.select.mockReturnValue(builder);
  builder.insert.mockReturnValue(builder);
  builder.update.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  builder.or.mockReturnValue(builder);
  builder.order.mockResolvedValue(resolved);
  builder.single.mockResolvedValue(resolved);

  return builder;
}

export function createSupabaseMock(
  options: {
    session?: { user: { id: string; email: string } } | null;
    queryBuilder?: QueryBuilder;
  } = {},
) {
  const queryBuilder = options.queryBuilder ?? createQueryBuilder();

  const client = {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: options.session ?? null },
        error: null,
      }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    from: vi.fn().mockReturnValue(queryBuilder),
  } as unknown as SupabaseClient;

  return { client, queryBuilder };
}
