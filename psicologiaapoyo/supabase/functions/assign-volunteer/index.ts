import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { AuthError, getAuthenticatedVolunteer } from '../_shared/auth.ts';
import { corsHeaders, errorResponse, handleOptions, jsonResponse } from '../_shared/cors.ts';
import {
  createServiceClient,
  type GuestSessionRow,
  type RegisteredSessionRow,
} from '../_shared/supabase-client.ts';
import { ValidationError } from '../_shared/validation.ts';

type SessionType = 'guest' | 'registered';

interface AssignVolunteerBody {
  session_id: string;
  session_type?: SessionType;
}

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin');
  const headers = corsHeaders(origin);

  const options = handleOptions(req);
  if (options) return options;

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405, headers);
  }

  try {
    const volunteerId = await getAuthenticatedVolunteer(req);
    const body = parseAssignBody(parseJsonBody(await req.text()));
    const supabase = createServiceClient();

    const rpcName = body.session_type === 'registered'
      ? 'assign_volunteer_to_session'
      : 'assign_volunteer_to_guest_session';

    const { data, error } = await supabase.rpc(rpcName, {
      p_session_id: body.session_id,
      p_volunteer_id: volunteerId,
    });

    if (error) {
      if (error.message.includes('volunteer_not_allowed')) {
        return errorResponse('Only volunteers can assign sessions', 403, headers);
      }
      if (error.message.includes('session_not_available')) {
        return errorResponse('Session is not available for assignment', 409, headers);
      }
      throw error;
    }

    return jsonResponse(
      {
        ok: true,
        session_type: body.session_type,
        session: data as GuestSessionRow | RegisteredSessionRow,
      },
      200,
      headers,
    );
  } catch (error) {
    if (error instanceof AuthError) return errorResponse(error.message, 401, headers);
    if (error instanceof ValidationError) return errorResponse(error.message, 400, headers);

    console.error('assign-volunteer failed', error);
    return errorResponse('Internal server error', 500, headers);
  }
});

function parseAssignBody(raw: unknown): AssignVolunteerBody {
  if (!raw || typeof raw !== 'object') {
    throw new ValidationError('Invalid JSON body');
  }

  const body = raw as Record<string, unknown>;
  const session_id = typeof body.session_id === 'string' ? body.session_id.trim() : '';
  if (!session_id) throw new ValidationError('session_id is required');

  const session_type = body.session_type === 'registered' ? 'registered' : 'guest';

  return { session_id, session_type };
}

function parseJsonBody(rawBody: string): unknown {
  try {
    return rawBody ? JSON.parse(rawBody) : {};
  } catch {
    throw new ValidationError('Invalid JSON body');
  }
}
