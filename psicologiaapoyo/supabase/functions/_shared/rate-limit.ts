import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

function envInt(name: string, fallback: number): number {
  const value = Deno.env.get(name);
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const LIMITS = {
  ipPerHour: envInt('RATE_LIMIT_IP_HOUR', 20),
  phonePerDay: envInt('RATE_LIMIT_PHONE_DAY', 3),
  emailPerDay: envInt('RATE_LIMIT_EMAIL_DAY', 3),
  whatsappPhonePerDay: envInt('RATE_LIMIT_WHATSAPP_PHONE_DAY', 5),
};

export class RateLimitError extends Error {
  constructor(message = 'Too many requests') {
    super(message);
    this.name = 'RateLimitError';
  }
}

async function checkBucket(
  supabase: SupabaseClient,
  bucketKey: string,
  windowSeconds: number,
  maxRequests: number,
): Promise<boolean> {
  const { data, error } = await supabase.rpc('check_rate_limit', {
    p_bucket_key: bucketKey,
    p_window_seconds: windowSeconds,
    p_max_requests: maxRequests,
  });

  if (error) throw error;
  return Boolean(data);
}

export async function enforceWebRateLimits(
  supabase: SupabaseClient,
  ip: string,
  phone?: string,
  email?: string,
): Promise<void> {
  const checks: Promise<boolean>[] = [
    checkBucket(supabase, `ip:${ip}`, 3600, LIMITS.ipPerHour),
  ];

  if (phone) {
    checks.push(checkBucket(supabase, `phone:${phone}`, 86400, LIMITS.phonePerDay));
  }

  if (email) {
    checks.push(checkBucket(supabase, `email:${email.toLowerCase()}`, 86400, LIMITS.emailPerDay));
  }

  const results = await Promise.all(checks);
  if (results.some((allowed) => !allowed)) {
    throw new RateLimitError();
  }
}

export async function enforceWhatsAppRateLimits(
  supabase: SupabaseClient,
  phone: string,
): Promise<void> {
  const allowed = await checkBucket(
    supabase,
    `whatsapp:${phone}`,
    86400,
    LIMITS.whatsappPhonePerDay,
  );

  if (!allowed) throw new RateLimitError();
}

export function clientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('cf-connecting-ip') ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}
