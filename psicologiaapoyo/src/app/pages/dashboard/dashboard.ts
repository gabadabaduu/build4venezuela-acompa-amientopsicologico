import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ProfileService } from '../../services/profile.service';
import { SessionService } from '../../services/session.service';
import type { Session, SessionStatus } from '../../models/session.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, DatePipe],
  templateUrl: './dashboard.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage implements OnInit {
  readonly auth = inject(AuthService);
  private readonly profileService = inject(ProfileService);
  private readonly sessionService = inject(SessionService);
  private readonly fb = inject(FormBuilder);

  sessions = signal<Session[]>([]);
  role = signal<'patient' | 'psychologist' | null>(null);
  loading = signal(true);
  error = signal('');
  creating = signal(false);

  sessionForm = this.fb.nonNullable.group({
    scheduledAt: ['', Validators.required],
    notes: [''],
  });

  pendingSessions = computed(() =>
    this.sessions().filter((s) => s.status === 'pending'),
  );

  activeSessions = computed(() =>
    this.sessions().filter((s) => s.status === 'accepted' || s.status === 'completed'),
  );

  patientSessions = computed(() => this.sessions());

  ngOnInit() {
    void this.loadProfileAndSessions();
  }

  async loadProfileAndSessions() {
    this.loading.set(true);
    this.error.set('');

    try {
      const user = this.auth.currentUser();
      if (!user) {
        this.error.set('No autenticado');
        return;
      }

      const profile = await this.profileService.getProfile(user.id);
      if (!profile) {
        this.error.set('No se pudo cargar el perfil');
        this.role.set(null);
        return;
      }

      this.role.set(profile.role);
      const data = await this.sessionService.getMySessions();
      this.sessions.set(data);
    } catch (err: unknown) {
      this.error.set(err instanceof Error ? err.message : 'Error al cargar datos');
    } finally {
      this.loading.set(false);
    }
  }

  async createSession() {
    if (this.sessionForm.invalid) {
      this.sessionForm.markAllAsTouched();
      return;
    }

    const user = this.auth.currentUser();
    if (!user) return;

    this.creating.set(true);
    this.error.set('');

    try {
      const { scheduledAt, notes } = this.sessionForm.getRawValue();
      await this.sessionService.createSession({
        patient_id: user.id,
        scheduled_at: scheduledAt,
        notes: notes || undefined,
      });
      this.sessionForm.reset();
      await this.loadProfileAndSessions();
    } catch (err: unknown) {
      this.error.set(err instanceof Error ? err.message : 'Error al crear sesión');
    } finally {
      this.creating.set(false);
    }
  }

  async updateStatus(sessionId: string, status: SessionStatus) {
    this.error.set('');

    try {
      await this.sessionService.updateSessionStatus(sessionId, status);
      await this.loadProfileAndSessions();
    } catch (err: unknown) {
      this.error.set(err instanceof Error ? err.message : 'Error al actualizar sesión');
    }
  }

  statusLabel(status: SessionStatus): string {
    const labels: Record<SessionStatus, string> = {
      pending: 'Pendiente',
      accepted: 'Aceptada',
      rejected: 'Rechazada',
      completed: 'Completada',
    };
    return labels[status];
  }
}
