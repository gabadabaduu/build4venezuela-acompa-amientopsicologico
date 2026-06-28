import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { AuthError, verifyMetaSignature, verifyWhatsAppChallenge } from '../_shared/auth.ts';
import { errorResponse, jsonResponse } from '../_shared/cors.ts';
import { notifySessionCreated, sendWhatsAppReply } from '../_shared/notifications.ts';
import { enforceWhatsAppRateLimits, RateLimitError } from '../_shared/rate-limit.ts';
import {
  assertNoActiveGuestSessionByContact,
  createGuestSession,
  createServiceClient,
} from '../_shared/supabase-client.ts';
import {
  ActiveGuestSessionError,
  extractGuestNameFromMessage,
  normalizeWhatsAppPhone,
  ValidationError,
} from '../_shared/validation.ts';

interface WhatsAppTextMessage {
  from: string;
  id: string;
  type: string;
  text?: { body?: string };
}

Deno.serve(async (req) => {
  const challenge = verifyWhatsAppChallenge(req);
  if (challenge) return challenge;

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  const rawBody = await req.text();

  try {
    await verifyMetaSignature(req, rawBody);

    const payload = JSON.parse(rawBody);
    const messages = extractIncomingTextMessages(payload);

    if (messages.length === 0) {
      return jsonResponse({ ok: true, handled: 0 });
    }

    const supabase = createServiceClient();
    let handled = 0;

    for (const message of messages) {
      try {
        handled += await handleWhatsAppMessage(supabase, message);
      } catch (error) {
        console.error('whatsapp message handling failed', message.id, error);
        if (error instanceof RateLimitError) {
          await sendWhatsAppReply(
            message.from,
            'Has alcanzado el límite diario de solicitudes. Intenta mañana.',
          );
        }
        if (error instanceof ActiveGuestSessionError) {
          await sendWhatsAppReply(message.from, error.message);
        }
      }
    }

    return jsonResponse({ ok: true, handled });
  } catch (error) {
    if (error instanceof AuthError) return errorResponse(error.message, 401);
    console.error('whatsapp-webhook failed', error);
    return errorResponse('Internal server error', 500);
  }
});

function extractIncomingTextMessages(payload: unknown): WhatsAppTextMessage[] {
  if (!payload || typeof payload !== 'object') return [];

  const entries = (payload as { entry?: unknown[] }).entry ?? [];
  const messages: WhatsAppTextMessage[] = [];

  for (const entry of entries) {
    const changes = (entry as { changes?: unknown[] }).changes ?? [];
    for (const change of changes) {
      const value = (change as { value?: { messages?: WhatsAppTextMessage[] } }).value;
      for (const message of value?.messages ?? []) {
        if (message.type === 'text' && message.text?.body) {
          messages.push(message);
        }
      }
    }
  }

  return messages;
}

async function handleWhatsAppMessage(
  supabase: ReturnType<typeof createServiceClient>,
  message: WhatsAppTextMessage,
): Promise<number> {
  const phone = normalizeWhatsAppPhone(message.from);
  await enforceWhatsAppRateLimits(supabase, phone);

  const body = message.text?.body?.trim() ?? '';
  if (!body) return 0;

  const lower = body.toLowerCase();
  if (lower === 'hola' || lower === 'menu' || lower === 'menú') {
    await sendWhatsAppReply(
      message.from,
      [
        'Hola. Para solicitar una sesión responde con:',
        'nombre: Tu Nombre',
      ].join('\n'),
    );
    return 0;
  }

  const full_name = extractGuestNameFromMessage(body) ?? 'Usuario WhatsApp';

  await assertNoActiveGuestSessionByContact(supabase, { phone });

  const session = await createGuestSession(supabase, {
    full_name,
    phone,
    source: 'whatsapp',
    external_id: `wa:${message.id}`,
  });

  await notifySessionCreated(session);
  await sendWhatsAppReply(
    message.from,
    [
      'Solicitud registrada.',
      `Referencia: ${session.id.slice(0, 8)}`,
      'Coordinaremos la fecha contigo pronto.',
    ].join('\n'),
  );

  return 1;
}
