export type { SessionStatus } from './session-types.ts';
export { DEFAULT_SESSION_STATUS } from './session-types.ts';

const AGE_RANGES = ['under_10', '11_18', '19_30', '31_50', 'over_50'];
const URGENCIES = ['high', 'medium', 'low'];

export interface CreateSessionBody {
  full_name: string;
  phone?: string;
  email?: string;
  age_range: string;
  urgency: string;
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

  if (full_name.length > MAX_NAME) {
    throw new ValidationError(`full_name must be at most ${MAX_NAME} characters`);
  }

  const age_range = normalizeEnum(body.age_range, 'age_range', AGE_RANGES);
  const urgency = normalizeEnum(body.urgency, 'urgency', URGENCIES);

  return { full_name, phone, email, age_range, urgency };
}

function normalizeEnum(value: unknown, field: string, allowed: string[]): string {
  if (typeof value !== 'string' || !allowed.includes(value)) {
    throw new ValidationError(`${field} must be one of: ${allowed.join(', ')}`);
  }
  return value;
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class ActiveGuestSessionError extends Error {
  constructor(
    message = 'Ya existe una solicitud de sesión activa con este teléfono o correo electrónico. Espera a que se complete antes de crear una nueva.',
  ) {
    super(message);
    this.name = 'ActiveGuestSessionError';
  }
}

const PHONE_REGEX = /^\+[1-9]\d{7,14}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NAME = 120;

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

const STUDIES_STATUSES = ['en_curso', 'titulado', 'especializacion', 'maestria', 'doctorado'];
const USER_ROLES = ['volunteer', 'admin'];
const MIN_PASSWORD_LENGTH = 8;
const MAX_TEXT = 2000;
const MAX_URL = 2048;

export interface CreateProfileUserBody {
  full_name: string;
  email?: string;
  password?: string;
  role: 'volunteer' | 'admin';
  phone?: string;
  bio?: string;
  avatar_url?: string;
  professional_name?: string;
  specialty?: string;
  presentation?: string;
  available_schedule?: string;
  photo_url?: string;
  session_orientation?: string;
  studies_status?: string;
  professional_registry_number?: string;
  place?: string;
}

export function parseCreateProfileUserBody(raw: unknown): CreateProfileUserBody {
  if (!raw || typeof raw !== 'object') {
    throw new ValidationError('Invalid JSON body');
  }

  const body = raw as Record<string, unknown>;
  const full_name = normalizeText(body.full_name, 'full_name');
  const email = body.email === undefined || body.email === null || body.email === ''
    ? undefined
    : normalizeEmail(body.email);
  const phone = normalizeOptionalPhone(body.phone);
  const password = normalizeOptionalPassword(body.password);
  const role = normalizeOptionalRole(body.role);

  if (!email && !phone) {
    throw new ValidationError('email or phone is required to create a login account');
  }

  return {
    full_name,
    email,
    password,
    role,
    phone,
    bio: normalizeOptionalText(body.bio, 'bio'),
    avatar_url: normalizeOptionalUrl(body.avatar_url, 'avatar_url'),
    professional_name: normalizeOptionalText(body.professional_name, 'professional_name', MAX_NAME),
    specialty: normalizeOptionalText(body.specialty, 'specialty'),
    presentation: normalizeOptionalText(body.presentation, 'presentation'),
    available_schedule: normalizeOptionalText(body.available_schedule, 'available_schedule'),
    photo_url: normalizeOptionalUrl(body.photo_url, 'photo_url'),
    session_orientation: normalizeOptionalText(body.session_orientation, 'session_orientation'),
    studies_status: normalizeOptionalEnum(body.studies_status, 'studies_status', STUDIES_STATUSES),
    professional_registry_number: normalizeOptionalText(
      body.professional_registry_number,
      'professional_registry_number',
    ),
    place: normalizeOptionalText(body.place, 'place'),
  };
}

function normalizeOptionalText(
  value: unknown,
  field: string,
  max = MAX_TEXT,
): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') throw new ValidationError(`${field} must be a string`);
  return value.trim().slice(0, max);
}

function normalizeOptionalUrl(value: unknown, field: string): string | undefined {
  const text = normalizeOptionalText(value, field, MAX_URL);
  if (!text) return undefined;

  try {
    const url = new URL(text);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new ValidationError(`${field} must be an http or https URL`);
    }
    return url.toString();
  } catch {
    throw new ValidationError(`${field} must be a valid URL`);
  }
}

function normalizeOptionalEnum(
  value: unknown,
  field: string,
  allowed: string[],
): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  return normalizeEnum(value, field, allowed);
}

function normalizeOptionalPassword(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') throw new ValidationError('password must be a string');
  const password = value.trim();
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new ValidationError(`password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }
  return password;
}

function normalizeOptionalRole(value: unknown): 'volunteer' | 'admin' {
  if (value === undefined || value === null || value === '') return 'volunteer';
  if (typeof value !== 'string' || !USER_ROLES.includes(value)) {
    throw new ValidationError(`role must be one of: ${USER_ROLES.join(', ')}`);
  }
  return value as 'volunteer' | 'admin';
}
