import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { ThemeService } from './theme.service';

@Component({
  selector: 'app-change-password',
  imports: [FormsModule],
  template: `
    <main class="account-page" [attr.data-theme]="themeService.theme()">
      <section class="account-card">
        <p class="account-kicker">SECURE YOUR WORKSPACE</p>
        <h1>Choose a new password</h1>
        <p class="account-copy">Your temporary password must be replaced before you can continue.</p>
        @if (errorMessage()) { <p class="account-error" role="alert">{{ errorMessage() }}</p> }
        <form #passwordForm="ngForm" (ngSubmit)="submit()">
          <label for="current">Temporary password</label>
          <input id="current" name="current" type="password" autocomplete="current-password"
            [(ngModel)]="currentPassword" required maxlength="128" />
          <label for="new">New password</label>
          <input id="new" name="new" type="password" autocomplete="new-password"
            [(ngModel)]="newPassword" required minlength="12" maxlength="128" />
          <label for="confirm">Confirm new password</label>
          <input id="confirm" name="confirm" type="password" autocomplete="new-password"
            [(ngModel)]="confirmPassword" required minlength="12" maxlength="128" />
          <p class="account-hint">Use at least 12 characters, including uppercase, lowercase, a number, and a symbol.</p>
          <button type="submit" [disabled]="!passwordForm.valid || newPassword !== confirmPassword || isSubmitting()">
            {{ isSubmitting() ? 'Updating…' : 'Update password' }}
          </button>
        </form>
      </section>
    </main>
  `,
  styles: [`
    :host{display:block;min-height:100vh}.account-page{--canvas:#11131a;--surface:#1a1d27;--ink:#f4f3f8;--muted:#a7a8b8;--line:#343744;display:grid;min-height:100vh;place-items:center;padding:24px;background:radial-gradient(ellipse at 20% 10%,#8a66ff20,transparent 40%),var(--canvas);color:var(--ink)}.account-page[data-theme=light]{--canvas:#f5f4f8;--surface:#fff;--ink:#252334;--muted:#777488;--line:#e6e3ed}.account-card{width:min(100%,460px);padding:36px;border:1px solid var(--line);border-radius:24px;background:var(--surface);box-shadow:0 28px 80px #0005}.account-kicker{margin:0 0 8px;color:var(--muted);font-size:11px;font-weight:700;letter-spacing:.13em}.account-card h1{margin:0;font-size:28px}.account-copy,.account-hint{color:var(--muted);line-height:1.6}.account-copy{margin:10px 0 25px}.account-card form{display:grid}.account-card label{margin:14px 0 7px;font-size:13px;font-weight:600}.account-card input{min-height:44px;padding:0 12px;border:1px solid var(--line);border-radius:10px;background:transparent;color:var(--ink);font:inherit}.account-card button{min-height:46px;margin-top:12px;border:0;border-radius:11px;background:linear-gradient(120deg,#a68aff,#70cdb9);color:#211d30;font:inherit;font-weight:700;cursor:pointer}.account-card button:disabled{opacity:.55;cursor:not-allowed}.account-hint{margin:9px 0;font-size:12px}.account-error{padding:11px;border-radius:10px;background:#dc69691a;color:#f0a6a6}
  `],
})
export class ChangePasswordComponent {
  protected readonly themeService = inject(ThemeService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly isSubmitting = signal(false);
  protected currentPassword = '';
  protected newPassword = '';
  protected confirmPassword = '';

  protected submit(): void {
    if (this.isSubmitting() || this.newPassword !== this.confirmPassword) return;
    this.isSubmitting.set(true);
    this.errorMessage.set(null);
    this.authService.changePassword(this.currentPassword, this.newPassword).subscribe({
      next: () => void this.router.navigateByUrl('/'),
      error: (error: unknown) => {
        this.errorMessage.set(this.authService.getErrorMessage(error));
        this.isSubmitting.set(false);
      },
    });
  }
}
