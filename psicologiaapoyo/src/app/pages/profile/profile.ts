import { Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ProfileService } from '../../services/profile.service';
import { AuthService } from '../../services/auth.service';
import { GuestSessionService } from '../../services/guest-session.service';
import { SessionService } from '../../services/session.service';
import type { AssignSessionType, GuestSession, GuestUrgency } from '../../models/guest-session.model';
import type { Session, SessionStatus } from '../../models/session.model';
import {
  STUDIES_STATUS_LABELS,
  type Profile,
  type StudiesStatus,
} from '../../models/user.model';
import {
  buildGoogleCalendarUrl,
  caracasLocalInputToDate,
  dateToCaracasLocalInput,
  defaultScheduleLocalInput,
  formatCaracasDateTime,
} from '../../utils/google-calendar.util';

type ProfileTab = 'mine' | 'unassigned' | 'profile';

interface VolunteerSessionView {
  id: string;
  type: AssignSessionType;
  name: string;
  contact: string;
  status: SessionStatus;
  scheduled_at: string | null;
  created_at: string;
  urgency?: GuestUrgency | null;
  detail?: string;
  calendarDetails?: string;
}

function nullIfEmpty(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './profile.html',
  styleUrls: ['./profile.css'],
})
export class ProfilePage {
  private readonly auth = inject(AuthService);
  private readonly profileService = inject(ProfileService);
  private readonly guestSessionService = inject(GuestSessionService);
  private readonly sessionService = inject(SessionService);
  private readonly router = inject(Router);

  readonly studiesOptions = Object.entries(STUDIES_STATUS_LABELS) as [StudiesStatus, string][];
  readonly tabs: { id: ProfileTab; label: string }[] = [
    { id: 'mine', label: 'Mis sesiones' },
    { id: 'unassigned', label: 'Sesiones sin asignar' },
    { id: 'profile', label: 'Mi perfil' },
  ];

  activeTab = signal<ProfileTab>('mine');
  profile = signal<Profile | null>(null);
  email = signal('');

  mySessions = signal<VolunteerSessionView[]>([]);
  unassignedSessions = signal<VolunteerSessionView[]>([]);

  fullName = signal('');
  phone = signal('');
  bio = signal('');
  avatarUrl = signal('');
  professionalName = signal('');
  specialty = signal('');
  presentation = signal('');
  availableSchedule = signal('');
  photoUrl = signal('');
  sessionOrientation = signal('');
  studiesStatus = signal<StudiesStatus | ''>('');
  professionalRegistryNumber = signal('');
  place = signal('');

  loading = signal(true);
  sessionsLoading = signal(false);
  saving = signal(false);
  assigningId = signal<string | null>(null);
  managingSessionId = signal<string | null>(null);
  managingAction = signal<'release' | 'complete' | null>(null);
  message = signal('');
  sessionsError = signal('');

  currentPassword = signal('');
  newPassword = signal('');
  confirmPassword = signal('');
  passwordSaving = signal(false);
  passwordError = signal('');
  passwordSuccess = signal('');

  scheduleModalOpen = signal(false);
  scheduleTarget = signal<VolunteerSessionView | null>(null);
  scheduleDateTime = signal('');
  scheduleSaving = signal(false);
  scheduleError = signal('');
  scheduleCalendarUrl = signal('');

   isLoggedIn = computed(() => !!this.auth.currentUser());

  constructor() {
    effect(() => {
      const user = this.auth.currentUser();
      if (user) {
        this.email.set(user.email);
        void this.loadProfile(user.id);
        void this.loadSessions(user.id);
      } else {
        this.loading.set(false);
      }
    });
  }

  setTab(tab: ProfileTab) {
    this.activeTab.set(tab);
  }

  private async loadProfile(userId: string) {
    this.loading.set(true);
    try {
      const p = await this.profileService.getProfile(userId);
      this.profile.set(p);

      this.fullName.set(p?.full_name ?? '');
      this.phone.set(p?.phone ?? '');
      this.bio.set(p?.bio ?? '');
      this.avatarUrl.set(p?.avatar_url ?? '');
      this.professionalName.set(p?.professional_name ?? '');
      this.specialty.set(p?.specialty ?? '');
      this.presentation.set(p?.presentation ?? '');
      this.availableSchedule.set(p?.available_schedule ?? '');
      this.photoUrl.set(p?.photo_url ?? '');
      this.sessionOrientation.set(p?.session_orientation ?? '');
      this.studiesStatus.set(p?.studies_status ?? '');
      this.professionalRegistryNumber.set(p?.professional_registry_number ?? '');
      this.place.set(p?.place ?? '');
    } catch (err: unknown) {
      this.message.set(err instanceof Error ? err.message : 'Error al cargar el perfil');
    } finally {
      this.loading.set(false);
    }
  }

  private async loadSessions(userId: string) {
    this.sessionsLoading.set(true);
    this.sessionsError.set('');

    try {
      const [assignedGuest, assignedRegistered, unassignedGuest, unassignedRegistered] =
        await Promise.all([
          this.guestSessionService.listAssignedToMe(userId),
          this.sessionService.getMySessions(),
          this.guestSessionService.listUnassigned(),
          this.sessionService.listUnassigned(),
        ]);

      const myStatuses: SessionStatus[] = ['pending', 'accepted'];

      this.mySessions.set(
        this.buildMySessions(
          assignedGuest.filter((s) => myStatuses.includes(s.status)),
          assignedRegistered.filter((s) => myStatuses.includes(s.status)),
        ),
      );

      this.unassignedSessions.set(this.buildUnassignedSessions(unassignedGuest, unassignedRegistered));
    } catch (err: unknown) {
      this.sessionsError.set(
        err instanceof Error ? err.message : 'Error al cargar sesiones',
      );
    } finally {
      this.sessionsLoading.set(false);
    }
  }

    async onnav() {
  if (this.isLoggedIn()) {
    this.router.navigate(['/dashboard']);
  }
}

  private buildMySessions(guest: GuestSession[], registered: Session[]): VolunteerSessionView[] {
    const views = [
      ...guest.map((s) => this.mapGuestSession(s)),
      ...registered.map((s) => this.mapRegisteredSession(s)),
    ];
    return this.sortMySessions(views);
  }

  private buildUnassignedSessions(
    guest: GuestSession[],
    registered: Session[],
  ): VolunteerSessionView[] {
    const views = [
      ...guest.map((s) => this.mapGuestSession(s)),
      ...registered.map((s) => this.mapRegisteredSession(s)),
    ];
    return this.sortUnassignedSessions(views);
  }

  private sortMySessions(sessions: VolunteerSessionView[]): VolunteerSessionView[] {
    return [...sessions].sort((a, b) => {
      const aScheduled = a.scheduled_at ? new Date(a.scheduled_at).getTime() : null;
      const bScheduled = b.scheduled_at ? new Date(b.scheduled_at).getTime() : null;

      if (aScheduled !== null && bScheduled !== null) {
        return aScheduled - bScheduled;
      }
      if (aScheduled !== null) return -1;
      if (bScheduled !== null) return 1;

      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  }

  private sortUnassignedSessions(sessions: VolunteerSessionView[]): VolunteerSessionView[] {
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();

    return [...sessions].sort((a, b) => {
      const aStale = now - new Date(a.created_at).getTime() > sevenDaysMs;
      const bStale = now - new Date(b.created_at).getTime() > sevenDaysMs;

      if (aStale !== bStale) {
        return aStale ? -1 : 1;
      }

      const urgencyDiff = this.urgencyRank(a.urgency) - this.urgencyRank(b.urgency);
      if (urgencyDiff !== 0) {
        return urgencyDiff;
      }

      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  }

  private urgencyRank(urgency: GuestUrgency | null | undefined): number {
    if (urgency === 'high') return 0;
    if (urgency === 'medium') return 1;
    if (urgency === 'low') return 2;
    return 3;
  }

  private mapGuestSession(session: GuestSession): VolunteerSessionView {
    const contact = session.phone ?? session.email ?? 'Sin contacto';
    const detailParts = [
      session.urgency ? `Urgencia: ${this.urgencyLabel(session.urgency)}` : null,
      session.age_range ? `Edad: ${this.ageRangeLabel(session.age_range)}` : null,
      session.source === 'whatsapp' ? 'WhatsApp' : 'Web',
    ].filter(Boolean);

    return {
      id: session.id,
      type: 'guest',
      name: session.full_name,
      contact,
      status: session.status,
      scheduled_at: session.scheduled_at,
      created_at: session.created_at,
      urgency: session.urgency,
      detail: detailParts.join(' · ') || undefined,
      calendarDetails: [
        `Contacto: ${contact}`,
        detailParts.length ? detailParts.join(' · ') : null,
      ]
        .filter(Boolean)
        .join('\n'),
    };
  }

  private mapRegisteredSession(session: Session): VolunteerSessionView {
    return {
      id: session.id,
      type: 'registered',
      name: 'Sesión registrada',
      contact: session.scheduled_at
        ? `Agendada: ${formatCaracasDateTime(session.scheduled_at)}`
        : 'Sin fecha programada',
      status: session.status,
      scheduled_at: session.scheduled_at,
      created_at: session.created_at,
      calendarDetails: session.scheduled_at
        ? `Agendada previamente: ${formatCaracasDateTime(session.scheduled_at)}`
        : undefined,
    };
  }

  async assignToMe(sessionId: string, sessionType: AssignSessionType) {
    this.assigningId.set(sessionId);
    this.sessionsError.set('');

    try {
      await this.guestSessionService.assignVolunteer(sessionId, sessionType);
      const user = this.auth.currentUser();
      if (user) {
        await this.loadSessions(user.id);
      }
    } catch (err: unknown) {
      const user = this.auth.currentUser();
      if (user) {
        await this.loadSessions(user.id);
      }
      this.sessionsError.set(
        err instanceof Error ? err.message : 'No se pudo asignar la sesión',
      );
    } finally {
      this.assigningId.set(null);
    }
  }

  async releaseSession(sessionId: string, sessionType: AssignSessionType) {
    await this.manageSession(sessionId, sessionType, 'release');
  }

  async completeSession(sessionId: string, sessionType: AssignSessionType) {
    await this.manageSession(sessionId, sessionType, 'complete');
  }

  isManaging(sessionId: string, action: 'release' | 'complete'): boolean {
    return this.managingSessionId() === sessionId && this.managingAction() === action;
  }

  private async manageSession(
    sessionId: string,
    sessionType: AssignSessionType,
    action: 'release' | 'complete',
  ) {
    this.managingSessionId.set(sessionId);
    this.managingAction.set(action);
    this.sessionsError.set('');

    try {
      await this.guestSessionService.manageVolunteerSession(sessionId, sessionType, action);
      const user = this.auth.currentUser();
      if (user) {
        await this.loadSessions(user.id);
      }
    } catch (err: unknown) {
      this.sessionsError.set(
        err instanceof Error ? err.message : 'No se pudo actualizar la sesión',
      );
    } finally {
      this.managingSessionId.set(null);
      this.managingAction.set(null);
    }
  }

  async save() {
    const user = this.auth.currentUser();
    const current = this.profile();

    if (!user || !current) return;

    if (!this.fullName().trim()) {
      this.message.set('El nombre completo es obligatorio.');
      return;
    }

    this.saving.set(true);
    this.message.set('');

    try {
      const studies = this.studiesStatus();
      const payload: Partial<Profile> = {
        full_name: this.fullName().trim(),
        phone: nullIfEmpty(this.phone()),
        bio: nullIfEmpty(this.bio()),
        avatar_url: nullIfEmpty(this.avatarUrl()),
        professional_name: nullIfEmpty(this.professionalName()),
        specialty: nullIfEmpty(this.specialty()),
        presentation: nullIfEmpty(this.presentation()),
        available_schedule: nullIfEmpty(this.availableSchedule()),
        photo_url: nullIfEmpty(this.photoUrl()),
        session_orientation: nullIfEmpty(this.sessionOrientation()),
        studies_status: studies ? (studies as StudiesStatus) : null,
        professional_registry_number: nullIfEmpty(this.professionalRegistryNumber()),
        place: nullIfEmpty(this.place()),
      };

      const updated = await this.profileService.updateProfile(user.id, payload);
      this.profile.set(updated);
      this.message.set('Perfil actualizado');
    } catch (err: unknown) {
      this.message.set(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      this.saving.set(false);
    }
  }

  async changePassword() {
    this.passwordError.set('');
    this.passwordSuccess.set('');

    const current = this.currentPassword();
    const next = this.newPassword().trim();
    const confirm = this.confirmPassword().trim();

    if (!current) {
      this.passwordError.set('Indica tu contraseña actual.');
      return;
    }

    if (next.length < 8) {
      this.passwordError.set('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (next !== confirm) {
      this.passwordError.set('Las contraseñas nuevas no coinciden.');
      return;
    }

    if (next === current) {
      this.passwordError.set('La nueva contraseña debe ser distinta a la actual.');
      return;
    }

    this.passwordSaving.set(true);
    try {
      await this.auth.changePassword(current, next);
      this.currentPassword.set('');
      this.newPassword.set('');
      this.confirmPassword.set('');
      this.passwordSuccess.set('Contraseña actualizada correctamente.');
    } catch (err: unknown) {
      this.passwordError.set(
        err instanceof Error ? err.message : 'No se pudo cambiar la contraseña',
      );
    } finally {
      this.passwordSaving.set(false);
    }
  }

  statusLabel(status: SessionStatus): string {
    const labels: Record<SessionStatus, string> = {
      not_assigned: 'Sin asignar',
      pending: 'Pendiente',
      accepted: 'Aceptada',
      rejected: 'Rechazada',
      completed: 'Completada',
    };
    return labels[status];
  }

  formatDate(value: string): string {
    return new Date(value).toLocaleString('es-VE', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  }

  formatScheduledAt(iso: string | null): string | null {
    return iso ? formatCaracasDateTime(iso) : null;
  }

  openScheduleModal(session: VolunteerSessionView) {
    this.scheduleTarget.set(session);
    this.scheduleDateTime.set(
      session.scheduled_at
        ? dateToCaracasLocalInput(new Date(session.scheduled_at))
        : defaultScheduleLocalInput(),
    );
    this.scheduleError.set('');
    this.scheduleCalendarUrl.set(
      session.scheduled_at ? this.buildCalendarUrlForSession(session) : '',
    );
    this.scheduleModalOpen.set(true);
  }

  closeScheduleModal() {
    this.scheduleModalOpen.set(false);
    this.scheduleTarget.set(null);
    this.scheduleError.set('');
    this.scheduleCalendarUrl.set('');
  }

  googleCalendarUrl(session: VolunteerSessionView): string {
    return this.buildCalendarUrlForSession(session);
  }

  private buildCalendarUrlForSession(session: VolunteerSessionView): string {
    if (!session.scheduled_at) return '';

    return buildGoogleCalendarUrl({
      title: `Sesión: ${session.name}`,
      start: new Date(session.scheduled_at),
      details: session.calendarDetails,
    });
  }

  async saveSchedule() {
    const target = this.scheduleTarget();
    if (!target) return;

    this.scheduleError.set('');
    this.scheduleSaving.set(true);

    try {
      const scheduledAt = caracasLocalInputToDate(this.scheduleDateTime()).toISOString();
      await this.guestSessionService.manageVolunteerSession(
        target.id,
        target.type,
        'schedule',
        scheduledAt,
      );

      const user = this.auth.currentUser();
      if (user) {
        await this.loadSessions(user.id);
      }

      const updated = this.mySessions().find((s) => s.id === target.id && s.type === target.type);
      if (updated?.scheduled_at) {
        this.scheduleCalendarUrl.set(this.buildCalendarUrlForSession(updated));
      }
    } catch (err: unknown) {
      this.scheduleError.set(
        err instanceof Error ? err.message : 'No se pudo guardar el horario',
      );
    } finally {
      this.scheduleSaving.set(false);
    }
  }

  private ageRangeLabel(value: string): string {
    const labels: Record<string, string> = {
      under_10: 'Menos de 10',
      '11_18': '11 a 18',
      '19_30': '19 a 30',
      '31_50': '31 a 50',
      over_50: 'Más de 50',
    };
    return labels[value] ?? value;
  }

  private urgencyLabel(value: string): string {
    const labels: Record<string, string> = {
      high: 'Alta',
      medium: 'Media',
      low: 'Baja',
    };
    return labels[value] ?? value;
  }

  async signOut() {
    await this.auth.signOut();
  }
}
