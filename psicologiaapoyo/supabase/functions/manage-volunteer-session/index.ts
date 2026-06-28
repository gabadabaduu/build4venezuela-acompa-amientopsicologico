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
type SessionAction = 'release' | 'complete' | 'schedule';

interface ManageVolunteerSessionBody {
  session_id: string;
  session_type: SessionType;
  action: SessionAction;
  scheduled_at?: string;
}

const RPC_BY_ACTION: Record<
  SessionAction,
  Record<SessionType, string>
> = {
  release: {
    guest: 'release_volunteer_from_guest_session',
    registered: 'release_volunteer_from_session',
  },
  complete: {
    guest: 'complete_volunteer_guest_session',
    registered: 'complete_volunteer_session',
  },
  schedule: {
    guest: 'schedule_volunteer_guest_session',
    registered: 'schedule_volunteer_session',
  },
};

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
    const body = parseManageBody(parseJsonBody(await req.text()));
    const supabase = createServiceClient();
    const rpcName = RPC_BY_ACTION[body.action][body.session_type];
    const rpcParams: Record<string, string> = {
      p_session_id: body.session_id,
      p_volunteer_id: volunteerId,
    };

    if (body.action === 'schedule') {
      if (!body.scheduled_at) {
        return errorResponse('scheduled_at is required', 400, headers);
      }
      rpcParams.p_scheduled_at = body.scheduled_at;
    }

    const { data, error } = await supabase.rpc(rpcName, rpcParams);

    if (error) {
      if (error.message.includes('volunteer_not_allowed')) {
        return errorResponse('Only volunteers can manage sessions', 403, headers);
      }
      if (error.message.includes('session_not_assigned_to_volunteer')) {
        return errorResponse('Esta sesión no está asignada a ti', 403, headers);
      }
      if (error.message.includes('session_already_completed')) {
        return errorResponse('Esta sesión ya está completada', 409, headers);
      }
      if (error.message.includes('session_not_found')) {
        return errorResponse('Session not found', 404, headers);
      }
      if (error.message.includes('scheduled_at_required')) {
        return errorResponse('scheduled_at is required', 400, headers);
      }
      if (error.message.includes('schedule_overlap')) {
        return errorResponse(
          'Ya tienes otra sesión agendada en ese horario (duración de 60 minutos).',
          409,
          headers,
        );
      }
      throw error;
    }

    return jsonResponse(
      {
        ok: true,
        action: body.action,
        session_type: body.session_type,
        session: data as GuestSessionRow | RegisteredSessionRow,
      },
      200,
      headers,
    );
  } catch (error) {
    if (error instanceof AuthError) return errorResponse(error.message, 401, headers);
    if (error instanceof ValidationError) return errorResponse(error.message, 400, headers);

    console.error('manage-volunteer-session failed', error);
    return errorResponse('Internal server error', 500, headers);
  }
});

function parseManageBody(raw: unknown): ManageVolunteerSessionBody {
  if (!raw || typeof raw !== 'object') {
    throw new ValidationError('Invalid JSON body');
  }

  const body = raw as Record<string, unknown>;
  const session_id = typeof body.session_id === 'string' ? body.session_id.trim() : '';
  if (!session_id) throw new ValidationError('session_id is required');

  const session_type = body.session_type === 'registered' ? 'registered' : 'guest';
  const actionRaw = body.action;
  const action =
    actionRaw === 'complete'
      ? 'complete'
      : actionRaw === 'release'
        ? 'release'
        : actionRaw === 'schedule'
          ? 'schedule'
          : null;

  if (!action) {
    throw new ValidationError('action must be release, complete, or schedule');
  }

  let scheduled_at: string | undefined;
  if (action === 'schedule') {
    if (typeof body.scheduled_at !== 'string' || !body.scheduled_at.trim()) {
      throw new ValidationError('scheduled_at is required for schedule action');
    }
    const parsed = new Date(body.scheduled_at);
    if (Number.isNaN(parsed.getTime())) {
      throw new ValidationError('scheduled_at must be a valid ISO datetime');
    }
    scheduled_at = parsed.toISOString();
  }

  return { session_id, session_type, action, scheduled_at };
}

function parseJsonBody(rawBody: string): unknown {
  try {
    return rawBody ? JSON.parse(rawBody) : {};
  } catch {
    throw new ValidationError('Invalid JSON body');
  }
}
