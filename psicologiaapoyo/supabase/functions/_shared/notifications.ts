import type { GuestSessionRow } from './session-types.ts';
import { statusLabel } from './session-types.ts';

function formatSessionSummary(session: GuestSessionRow): string {
  const when = session.scheduled_at
    ? new Date(session.scheduled_at).toLocaleString('es-VE', { timeZone: 'America/Caracas' })
    : 'pendiente de coordinar';

  return [
    'Tu solicitud de sesión fue registrada.',
    `Referencia: ${session.id.slice(0, 8)}`,
    `Estado: ${statusLabel(session.status)}`,
    `Fecha solicitada: ${when}`,
  ].join('\n');
}

export async function notifySessionCreated(session: GuestSessionRow): Promise<void> {
  const tasks: Promise<void>[] = [];

  if (session.phone) {
    tasks.push(sendWhatsAppNotification(session.phone, formatSessionSummary(session)));
  }
  if (session.email) {
    tasks.push(sendEmailNotification(session.email, session));
  }

  await Promise.allSettled(tasks);
}

async function sendWhatsAppNotification(toPhone: string, text: string): Promise<void> {
  const token = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
  const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
  if (!token || !phoneNumberId) return;

  const to = toPhone.replace(/\D/g, '');
  const response = await fetch(
    `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: text },
      }),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    console.error('WhatsApp notification failed', response.status, body);
  }
}

async function sendEmailNotification(to: string, session: GuestSessionRow): Promise<void> {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('RESEND_FROM_EMAIL') ?? 'PsicologiaApoyo <onboarding@resend.dev>';
  if (!apiKey) return;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: 'Solicitud de sesión recibida',
      text: [
        `Hola ${session.full_name},`,
        '',
        'Recibimos tu solicitud de acompañamiento psicológico.',
        `Referencia: ${session.id}`,
        session.scheduled_at
          ? `Fecha solicitada: ${new Date(session.scheduled_at).toISOString()}`
          : 'Coordinaremos la fecha contigo pronto.',
        '',
        'Gracias por confiar en nosotros.',
      ].join('\n'),
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error('Email notification failed', response.status, body);
  }
}

export async function sendWhatsAppReply(toWaId: string, text: string): Promise<void> {
  await sendWhatsAppNotification(normalizeWaToE164(toWaId), text);
}

function normalizeWaToE164(waId: string): string {
  const digits = waId.replace(/\D/g, '');
  return `+${digits}`;
}
