import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { AuthError, getAuthenticatedAdmin } from '../_shared/auth.ts';
import { corsHeaders, errorResponse, handleOptions, jsonResponse } from '../_shared/cors.ts';
import { publicProfilePayload } from '../_shared/profile-types.ts';
import { createAuthUserWithProfile, createServiceClient, DuplicateUserError } from '../_shared/supabase-client.ts';
import { parseCreateProfileUserBody, ValidationError } from '../_shared/validation.ts';

const MAX_BODY_BYTES = 16_384;

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin');
  const headers = corsHeaders(origin);

  const options = handleOptions(req);
  if (options) return options;

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405, headers);
  }

  try {
    await getAuthenticatedAdmin(req);

    const contentLength = Number(req.headers.get('content-length') ?? '0');
    if (contentLength > MAX_BODY_BYTES) {
      return errorResponse('Payload too large', 413, headers);
    }

    const rawBody = await req.text();
    if (rawBody.length > MAX_BODY_BYTES) {
      return errorResponse('Payload too large', 413, headers);
    }

    const payload = parseCreateProfileUserBody(parseJsonBody(rawBody));
    const supabase = createServiceClient();
    const result = await createAuthUserWithProfile(supabase, payload);

    return jsonResponse(
      {
        ok: true,
        user_id: result.user_id,
        email: result.email,
        phone: result.phone,
        temporary_password: result.temporary_password,
        must_change_password: result.must_change_password,
        profile: publicProfilePayload(result.profile),
      },
      201,
      headers,
    );
  } catch (error) {
    if (error instanceof AuthError) return errorResponse(error.message, 401, headers);
    if (error instanceof ValidationError) return errorResponse(error.message, 400, headers);
    if (error instanceof DuplicateUserError) return errorResponse(error.message, 409, headers);

    console.error('create-profile-user failed', error);
    return errorResponse('Internal server error', 500, headers);
  }
});

function parseJsonBody(rawBody: string): unknown {
  try {
    return rawBody ? JSON.parse(rawBody) : {};
  } catch {
    throw new ValidationError('Invalid JSON body');
  }
}
