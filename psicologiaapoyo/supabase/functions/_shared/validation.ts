export type { SessionStatus } from './session-types.ts';
export { DEFAULT_SESSION_STATUS } from './session-types.ts';

export interface CreateSessionBody {
  full_name: string;
  phone?: string;
  email?: string;
  notes?: string;
}

export function parseCreateSessionBody(raw: unknown): CreateSessionBody {
  if (!raw || typeof raw !== 'object') {
    throw new ValidationError('Invalid JSON body');
  }

  const body = raw as Record<string, unknown>;

  const full_name = normalizeText(body.full_name, 'full_name');
  const phone = normalizeOptionalPhone(body.phone);
  const email = body.email === undefined || body.email === null || body.email === ''
    ? undefined
    : normalizeEmail(body.email);
  const notes = body.notes === undefined || body.notes === null || body.notes === ''
    ? undefined
    : normalizeText(body.notes, 'notes', MAX_NOTES);

  if (full_name.length > MAX_NAME) {
    throw new ValidationError(`full_name must be at most ${MAX_NAME} characters`);
  }

  return { full_name, phone, email, notes };
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

const PHONE_REGEX = /^\+[1-9]\d{7,14}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NAME = 120;
const MAX_NOTES = 2000;

function normalizeText(value: unknown, field: string, max = MAX_NAME): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ValidationError(`${field} is required`);
  }
  return value.trim().slice(0, max);
}

function normalizeOptionalPhone(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') throw new ValidationError('phone must be a string');

  const phone = value.trim().replace(/[\s()-]/g, '');
  if (!PHONE_REGEX.test(phone)) {
    throw new ValidationError('phone must be E.164 format, e.g. +584121234567');
  }
  return phone;
}

function normalizeEmail(value: unknown): string {
  if (typeof value !== 'string') throw new ValidationError('email must be a string');
  const email = value.trim().toLowerCase();
  if (!EMAIL_REGEX.test(email)) throw new ValidationError('email is invalid');
  return email;
}

export function normalizeWhatsAppPhone(waId: string): string {
  const digits = waId.replace(/\D/g, '');
  if (!digits) throw new ValidationError('Invalid WhatsApp sender');

  return `+${digits}`;
}

export function extractGuestNameFromMessage(message: string): string | undefined {
  const match = message.match(/(?:nombre|name)\s*:\s*(.+)/i);
  return match?.[1]?.trim().slice(0, MAX_NAME);
}
