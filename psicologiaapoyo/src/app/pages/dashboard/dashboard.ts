import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { SessionService } from '../../services/session.service';
import type { Session, SessionStatus } from '../../models/session.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe],
  templateUrl: './dashboard.html',
})
export class DashboardPage implements OnInit {
  readonly auth = inject(AuthService);
  private readonly sessionService = inject(SessionService);

  sessions = signal<Session[]>([]);
  loading = signal(true);

  // New session form
  scheduledAt = signal('');
  notes = signal('');
  creating = signal(false);

  ngOnInit() {
    this.loadSessions();
  }

  async loadSessions() {
    this.loading.set(true);
    try {
      const data = await this.sessionService.getMySessions();
      this.sessions.set(data);
    } catch {
      // silently fail
    } finally {
      this.loading.set(false);
    }
  }

  async createSession() {
    const user = this.auth.currentUser();
    if (!user) return;

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
    } catch {
      // silently fail
    } finally {
      this.creating.set(false);
    }
  }

  async updateStatus(sessionId: string, status: SessionStatus) {
    try {
      await this.sessionService.updateSessionStatus(sessionId, status);
      await this.loadSessions();
    } catch {
      // silently fail
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
