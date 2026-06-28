import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { GuestSessionService } from '../../services/guest-session.service';
import { GuestSessionApiService } from '../../services/guest-session-api.service';
import { ProfileService } from '../../services/profile.service';
import { SessionService } from '../../services/session.service';
import type {
  GuestAgeRange,
  GuestSession,
  GuestUrgency,
} from '../../models/guest-session.model';
import type { Session, SessionStatus } from '../../models/session.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css'],
})
export class DashboardPage implements OnInit {
  readonly auth = inject(AuthService);
  private readonly sessionService = inject(SessionService);
  private readonly router = inject(Router);
  private readonly guestSessionService = inject(GuestSessionService);
  private readonly guestSessionApi = inject(GuestSessionApiService);
  private readonly profileService = inject(ProfileService);

  sessions = signal<Session[]>([]);
  guestSessions = signal<GuestSession[]>([]);
  unassignedGuestSessions = signal<GuestSession[]>([]);
  unassignedSessions = signal<Session[]>([]);
  isVolunteer = signal(false);
  loading = signal(true);
  assigningId = signal<string | null>(null);

  scheduledAt = signal('');
  creating = signal(false);

  hotlineName = signal('');
  hotlinePhone = signal('');
  hotlineEmail = signal('');
  hotlineAge = signal<GuestAgeRange | ''>('');
  hotlineUrgency = signal<GuestUrgency | ''>('medium');
  hotlineSubmitting = signal(false);
  hotlineError = signal('');
  hotlineContactError = signal(false);
  hotlineSuccess = signal(false);

  isLoggedIn = computed(() => !!this.auth.currentUser());

  ngOnInit() {
    this.loadDashboard();
  }

  async loadDashboard() {
    this.loading.set(true);
    try {
      const user = this.auth.currentUser();
      if (!user) return;

      const profile = await this.profileService.getProfile(user.id);
      const volunteer = profile?.role === 'volunteer';
      this.isVolunteer.set(volunteer);

      if (volunteer) {
        const [assigned, unassignedGuest, unassignedRegistered, assignedGuest] = await Promise.all([
          this.sessionService.getMySessions(),
          this.guestSessionService.listUnassigned(),
          this.sessionService.listUnassigned(),
          this.guestSessionService.listAssignedToMe(user.id),
        ]);
        this.sessions.set(assigned);
        this.guestSessions.set(assignedGuest);
        this.unassignedGuestSessions.set(unassignedGuest);
        this.unassignedSessions.set(unassignedRegistered);
      } else {
        const data = await this.sessionService.getMySessions();
        this.sessions.set(data);
        this.guestSessions.set([]);
        this.unassignedGuestSessions.set([]);
        this.unassignedSessions.set([]);
      }
    } catch {
      // silently fail
    } finally {
      this.loading.set(false);
    }
  }

  async onAuthAction() {
  if (this.isLoggedIn()) {
    await this.auth.signOut();
    this.router.navigate(['/dashboard']);
  } else {
    this.router.navigate(['/login']);
  }
}


  async createSession() {
    const user = this.auth.currentUser();
    if (!user) return;
    if (!this.scheduledAt()) return;

    this.creating.set(true);
    try {
      await this.sessionService.createSession({
        patient_id: user.id,
        scheduled_at: this.scheduledAt(),
      });
      this.scheduledAt.set('');
      await this.loadDashboard();
    } catch {
      // silently fail
    } finally {
      this.creating.set(false);
    }
  }

  async requestHotline() {
    this.hotlineError.set('');
    this.hotlineContactError.set(false);
    this.hotlineSuccess.set(false);

    const phone = this.hotlinePhone().trim();
    const email = this.hotlineEmail().trim();

    if (!this.hotlineName().trim() || !this.hotlineAge() || !this.hotlineUrgency()) {
      this.hotlineError.set('Por favor completa todos los campos.');
      return;
    }

    if (!phone && !email) {
      this.hotlineContactError.set(true);
      this.hotlineError.set('Indícanos un teléfono o un correo electrónico para contactarte.');
      return;
    }

    this.hotlineSubmitting.set(true);
    try {
      await this.guestSessionApi.createSession({
        full_name: this.hotlineName().trim(),
        phone: phone || undefined,
        email: email || undefined,
        age_range: this.hotlineAge() as GuestAgeRange,
        urgency: this.hotlineUrgency() as GuestUrgency,
      });
      this.hotlineSuccess.set(true);
      this.hotlineName.set('');
      this.hotlinePhone.set('');
      this.hotlineEmail.set('');
      this.hotlineAge.set('');
      this.hotlineUrgency.set('medium');
    } catch (err: unknown) {
      this.hotlineError.set(
        err instanceof Error ? err.message : 'No se pudo enviar la solicitud.',
      );
    } finally {
      this.hotlineSubmitting.set(false);
    }
  }

  async assignVolunteer(sessionId: string, sessionType: 'guest' | 'registered') {
    this.assigningId.set(sessionId);
    try {
      await this.guestSessionService.assignVolunteer(sessionId, sessionType);
      await this.loadDashboard();
    } catch {
      // silently fail
    } finally {
      this.assigningId.set(null);
    }
  }

  async updateStatus(sessionId: string, status: SessionStatus) {
    try {
      await this.sessionService.updateSessionStatus(sessionId, status);
      await this.loadDashboard();
    } catch {
      // silently fail
    }
  }

  async updateGuestStatus(sessionId: string, status: SessionStatus) {
    try {
      await this.guestSessionService.updateStatus(sessionId, status);
      await this.loadDashboard();
    } catch {
      // silently fail
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
}
