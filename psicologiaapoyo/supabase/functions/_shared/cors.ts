export const corsHeaders = (origin: string | null): Record<string, string> => {
  const allowed = (
    Deno.env.get('ALLOWED_ORIGINS') ??
    'http://localhost:4200,https://build4venezuela-acompa-amientopsicologico.onrender.com'
  )
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  const isAllowed = !!origin && allowed.includes(origin);

  return {
    ...(isAllowed ? { 'Access-Control-Allow-Origin': origin } : {}),
    'Access-Control-Allow-Headers':
      'authorization, x-api-key, x-client-info, apikey, content-type, idempotency-key',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
};

export function jsonResponse(
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
  });
}

export function errorResponse(
  message: string,
  status: number,
  extraHeaders: Record<string, string> = {},
): Response {
  return jsonResponse({ error: message }, status, extraHeaders);
}

export function handleOptions(req: Request): Response | null {
  if (req.method !== 'OPTIONS') return null;

  const origin = req.headers.get('Origin');
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}
