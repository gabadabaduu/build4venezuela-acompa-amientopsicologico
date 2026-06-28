import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { assertApiKey, AuthError } from '../_shared/auth.ts';
import { corsHeaders, errorResponse, handleOptions, jsonResponse } from '../_shared/cors.ts';
import { notifySessionCreated } from '../_shared/notifications.ts';
import { clientIp, enforceWebRateLimits, RateLimitError } from '../_shared/rate-limit.ts';
import {
  assertNoActiveGuestSessionByContact,
  createGuestSession,
  createServiceClient,
  publicGuestSessionPayload,
} from '../_shared/supabase-client.ts';
import { ActiveGuestSessionError, parseCreateSessionBody, ValidationError } from '../_shared/validation.ts';

const MAX_BODY_BYTES = 8_192;

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin');
  const headers = corsHeaders(origin);

  const options = handleOptions(req);
  if (options) return options;

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405, headers);
  }

  try {
    assertApiKey(req);

    const contentLength = Number(req.headers.get('content-length') ?? '0');
    if (contentLength > MAX_BODY_BYTES) {
      return errorResponse('Payload too large', 413, headers);
    }

    const rawBody = await req.text();
    if (rawBody.length > MAX_BODY_BYTES) {
      return errorResponse('Payload too large', 413, headers);
    }

    const payload = parseCreateSessionBody(parseJsonBody(rawBody));
    const supabase = createServiceClient();

    await enforceWebRateLimits(supabase, clientIp(req), payload.phone, payload.email);

    await assertNoActiveGuestSessionByContact(supabase, {
      phone: payload.phone,
      email: payload.email,
    });

    const idempotencyKey = req.headers.get('idempotency-key')?.trim();
    const external_id = idempotencyKey ? `web:${idempotencyKey}` : undefined;

    const session = await createGuestSession(supabase, {
      ...payload,
      source: 'web',
      external_id,
    });

    await notifySessionCreated(session);

    return jsonResponse(
      {
        ok: true,
        session: publicGuestSessionPayload(session),
      },
      201,
      headers,
    );
  } catch (error) {
    if (error instanceof AuthError) return errorResponse(error.message, 401, headers);
    if (error instanceof ValidationError) return errorResponse(error.message, 400, headers);
    if (error instanceof ActiveGuestSessionError) return errorResponse(error.message, 409, headers);
    if (error instanceof RateLimitError) {
      return errorResponse('Too many requests. Try again later.', 429, headers);
    }

    console.error('create-session failed', error);
    return errorResponse('Internal server error', 500, headers);
  }
});

function parseJsonBody(rawBody: string): unknown {
  try {
    return JSON.parse(rawBody);
  } catch {
    throw new ValidationError('Invalid JSON body');
  }
}
