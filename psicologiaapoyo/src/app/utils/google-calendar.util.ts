export const SESSION_TIMEZONE = 'America/Caracas';
export const SESSION_DURATION_MS = 60 * 60 * 1000;

/** Parse `<input type="datetime-local">` value as America/Caracas wall time. */
export function caracasLocalInputToDate(localValue: string): Date {
  if (!localValue.trim()) {
    throw new Error('Indica fecha y hora.');
  }

  return new Date(`${localValue}:00-04:00`);
}

export function dateToCaracasLocalInput(date: Date): string {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: SESSION_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });

  const parts = Object.fromEntries(
    formatter.formatToParts(date).filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]),
  );

  return `${parts['year']}-${parts['month']}-${parts['day']}T${parts['hour']}:${parts['minute']}`;
}

export function defaultScheduleLocalInput(): string {
  const nextHour = new Date(Date.now() + 60 * 60 * 1000);
  nextHour.setMinutes(0, 0, 0);
  return dateToCaracasLocalInput(nextHour);
}

export function formatCaracasDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-VE', {
    timeZone: SESSION_TIMEZONE,
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function formatGoogleUtc(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');

  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

export interface CalendarEventInput {
  title: string;
  start: Date;
  durationMs?: number;
  details?: string;
  location?: string;
}

export function buildGoogleCalendarUrl(event: CalendarEventInput): string {
  const durationMs = event.durationMs ?? SESSION_DURATION_MS;
  const end = new Date(event.start.getTime() + durationMs);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${formatGoogleUtc(event.start)}/${formatGoogleUtc(end)}`,
    details: event.details ?? '',
    location: event.location ?? '',
    ctz: SESSION_TIMEZONE,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
