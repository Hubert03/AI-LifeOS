import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from './auth.service';
import { ThemeService } from './theme.service';

@Component({
  selector: 'app-accept-invitation',
  imports: [FormsModule, RouterLink],
  template: `
    <main class="account-page" [attr.data-theme]="themeService.theme()">
      <section class="account-card">
        <a class="account-brand" routerLink="/login">AI LifeOS</a>
        <p class="account-kicker">TEAM INVITATION</p>
        <h1>Set up your account</h1>
        <p class="account-copy">Choose a strong password to join your private workspace.</p>
        @if (errorMessage()) {
          <p class="account-error" role="alert">{{ errorMessage() }}</p>
        }
        @if (successMessage()) {
          <p class="account-success" role="status">{{ successMessage() }}</p>
        } @else {
          <form #inviteForm="ngForm" (ngSubmit)="submit()">
            <label for="password">Password</label>
            <input id="password" name="password" type="password" autocomplete="new-password"
              [(ngModel)]="password" required minlength="12" maxlength="128" />
            <label for="confirm">Confirm password</label>
            <input id="confirm" name="confirm" type="password" autocomplete="new-password"
              [(ngModel)]="confirmPassword" required minlength="12" maxlength="128" />
            <p class="account-hint">Use at least 12 characters, including uppercase, lowercase, a number, and a symbol.</p>
            <button type="submit" [disabled]="!inviteForm.valid || password !== confirmPassword || isSubmitting()">
              {{ isSubmitting() ? 'Creating account…' : 'Accept invitation' }}
            </button>
          </form>
        }
      </section>
    </main>
  `,
  styles: [`
    :host{display:block;min-height:100vh}.account-page{--canvas:#11131a;--surface:#1a1d27;--ink:#f4f3f8;--muted:#a7a8b8;--line:#343744;--accent:#a68aff;display:grid;min-height:100vh;place-items:center;padding:24px;background:radial-gradient(ellipse at 20% 10%,#8a66ff20,transparent 40%),var(--canvas);color:var(--ink)}.account-page[data-theme=light]{--canvas:#f5f4f8;--surface:#fff;--ink:#252334;--muted:#777488;--line:#e6e3ed;--accent:#6743dc}.account-card{width:min(100%,460px);padding:36px;border:1px solid var(--line);border-radius:24px;background:var(--surface);box-shadow:0 28px 80px #0005}.account-brand{color:var(--ink);font-weight:750;text-decoration:none}.account-kicker{margin:35px 0 8px;color:var(--muted);font-size:11px;font-weight:700;letter-spacing:.13em}.account-card h1{margin:0;font-size:28px}.account-copy,.account-hint{color:var(--muted);line-height:1.6}.account-copy{margin:10px 0 25px}.account-card form{display:grid}.account-card label{margin:14px 0 7px;font-size:13px;font-weight:600}.account-card input{min-height:44px;padding:0 12px;border:1px solid var(--line);border-radius:10px;background:transparent;color:var(--ink);font:inherit}.account-card button{min-height:46px;margin-top:12px;border:0;border-radius:11px;background:linear-gradient(120deg,#a68aff,#70cdb9);color:#211d30;font:inherit;font-weight:700;cursor:pointer}.account-card button:disabled{opacity:.55;cursor:not-allowed}.account-hint{margin:9px 0;font-size:12px}.account-error,.account-success{padding:11px;border-radius:10px;background:#dc69691a;color:#f0a6a6}.account-success{background:#65cbb21a;color:#6ce0c6}
  `],
})
export class AcceptInvitationComponent {
  protected readonly themeService = inject(ThemeService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly isSubmitting = signal(false);
  protected password = '';
  protected confirmPassword = '';
  private readonly token = this.route.snapshot.queryParamMap.get('token') ?? '';

  protected submit(): void {
    if (this.isSubmitting() || !this.token || this.password !== this.confirmPassword) {
      if (!this.token) this.errorMessage.set('This invitation link is missing its token.');
      return;
    }
    this.isSubmitting.set(true);
    this.errorMessage.set(null);
    this.authService.acceptInvitation(this.token, this.password).subscribe({
      next: () => {
        this.successMessage.set('Your account is ready. Opening your workspace…');
        void this.router.navigateByUrl('/');
      },
      error: (error: unknown) => {
        this.errorMessage.set(this.authService.getErrorMessage(error));
        this.isSubmitting.set(false);
      },
    });
  }
}
