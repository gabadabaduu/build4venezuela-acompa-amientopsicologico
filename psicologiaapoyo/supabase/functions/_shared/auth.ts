export function assertApiKey(req: Request): void {
  const expected = Deno.env.get('PUBLIC_API_KEY');
  if (!expected) {
    throw new Error('PUBLIC_API_KEY is not configured');
  }

  const provided = req.headers.get('x-api-key');
  if (!provided || provided !== expected) {
    throw new AuthError('Invalid or missing API key');
  }
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export async function verifyMetaSignature(req: Request, rawBody: string): Promise<void> {
  const appSecret = Deno.env.get('META_APP_SECRET');
  if (!appSecret) {
    throw new Error('META_APP_SECRET is not configured');
  }

  const signature = req.headers.get('x-hub-signature-256');
  if (!signature) throw new AuthError('Missing Meta signature');

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(appSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const digest = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody));
  const hex = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

  if (signature !== `sha256=${hex}`) {
    throw new AuthError('Invalid Meta signature');
  }
}

export function verifyWhatsAppChallenge(req: Request): Response | null {
  const url = new URL(req.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');
  const verifyToken = Deno.env.get('WHATSAPP_VERIFY_TOKEN');

  if (mode !== 'subscribe' || !verifyToken) return null;
  if (req.method !== 'GET') return null;

  if (token === verifyToken && challenge) {
    return new Response(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
  }

  return new Response('Forbidden', { status: 403 });
}

export async function getAuthenticatedVolunteer(req: Request): Promise<string> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AuthError('Missing authorization');
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY');
  }

  const { createClient } = await import('npm:@supabase/supabase-js@2');
  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user },
    error,
  } = await authClient.auth.getUser();

  if (error || !user) {
    throw new AuthError('Invalid or expired token');
  }

  const { createServiceClient } = await import('./supabase-client.ts');
  const serviceClient = createServiceClient();
  const { data: profile, error: profileError } = await serviceClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || profile?.role !== 'psychologist') {
    throw new AuthError('Only volunteers can assign sessions');
  }

  return user.id;
}
