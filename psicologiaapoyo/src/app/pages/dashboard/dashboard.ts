import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { SessionService } from '../../services/session.service';
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

  sessions = signal<Session[]>([]);
  loading = signal(true);

  scheduledAt = signal('');
  notes = signal('');
  creating = signal(false);

  isLoggedIn = computed(() => !!this.auth.currentUser());

  ngOnInit() {
    this.loadSessions();
  }

  async onAuthAction() {
    if (this.isLoggedIn()) {
      await this.auth.signOut();
      this.router.navigate(['/dashboard']);
    } else {
      this.router.navigate(['/login']);
    }
  }

  async loadSessions() {
    this.loading.set(true);
    try {
      const data = await this.sessionService.getMySessions();
      this.sessions.set(data);
    } catch (e) {
      console.error('loadSessions error', e);
    } finally {
      this.loading.set(false);
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
        notes: this.notes(),
      });
      this.scheduledAt.set('');
      this.notes.set('');
      await this.loadSessions();
    } catch (e) {
      console.error('createSession error', e);
    } finally {
      this.creating.set(false);
    }
  }

  async updateStatus(sessionId: string, status: SessionStatus) {
    try {
      await this.sessionService.updateSessionStatus(sessionId, status);
      await this.loadSessions();
    } catch (e) {
      console.error('updateStatus error', e);
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
