import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './admin.html',
  styleUrls: ['./admin.css'],
})
export class AdminPage implements OnInit {
  private readonly auth = inject(AuthService);

  name = signal('');
  email = signal('');
  phone = signal('');
  submitted = signal(false);

  ngOnInit() {
    const user = this.auth.currentUser();
    if (user?.email) {
      this.email.set(user.email);
    }
  }

  onSubmit() {
    if (!this.name().trim() || !this.email().trim() || !this.phone().trim()) {
      return;
    }
    this.submitted.set(true);
  }

  async signOut() {
    await this.auth.signOut();
  }
}
