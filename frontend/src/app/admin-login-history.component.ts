import { DatePipe } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';

interface LoginHistoryEntry {
  loginHistoryId: string;
  userId: string;
  displayName: string;
  email: string;
  succeeded: boolean;
  attemptedAtUtc: string;
}

@Component({
  selector: 'app-admin-login-history',
  imports: [DatePipe],
  template: `
    <section class="login-history-card" aria-labelledby="login-history-heading">
      <header>
        <div>
          <p class="history-kicker">ACCOUNT SECURITY</p>
          <h2 id="login-history-heading">Login history</h2>
          <p>Recent successful and unsuccessful attempts for known accounts.</p>
        </div>
        <button type="button" [disabled]="loading()" (click)="load()">Refresh</button>
      </header>

      @if (error()) {
        <p class="history-error" role="alert">{{ error() }}</p>
      } @else if (loading() && !entries().length) {
        <p class="history-empty" role="status">Loading login history…</p>
      } @else if (!entries().length) {
        <p class="history-empty">No login attempts have been recorded yet.</p>
      } @else {
        <div class="history-table-wrap">
          <table>
            <thead>
              <tr><th scope="col">Account</th><th scope="col">Result</th><th scope="col">Time (UTC)</th></tr>
            </thead>
            <tbody>
              @for (entry of entries(); track entry.loginHistoryId) {
                <tr>
                  <td><strong>{{ entry.displayName }}</strong><small>{{ entry.email }}</small></td>
                  <td><span class="history-result" [class.login-success]="entry.succeeded" [class.login-failure]="!entry.succeeded">{{ entry.succeeded ? 'Successful' : 'Failed' }}</span></td>
                  <td><time>{{ entry.attemptedAtUtc | date: 'MMM d, y · h:mm:ss a' : 'UTC' }}</time></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </section>
  `,
  styles: [`
    .login-history-card { margin-top: 24px; border: 1px solid var(--line, #35424e); border-radius: 14px; background: var(--surface, #17232e); padding: 22px; color: var(--ink, #edf2f7); }
    header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
    h2 { margin: 0; font-size: 19px; }
    header p { margin: 7px 0 0; color: var(--muted, #99a9b5); font-size: 13px; }
    .history-kicker { color: var(--muted, #99a9b5); font-size: 10px; font-weight: 750; letter-spacing: .12em; }
    button { border: 1px solid var(--line, #35424e); border-radius: 8px; background: transparent; color: inherit; padding: 8px 12px; cursor: pointer; }
    .history-table-wrap { overflow-x: auto; margin-top: 18px; }
    table { width: 100%; border-collapse: collapse; text-align: left; }
    th, td { border-bottom: 1px solid var(--line, #35424e); padding: 11px 8px; font-size: 13px; white-space: nowrap; }
    th { color: var(--muted, #99a9b5); font-size: 11px; }
    td small { display: block; margin-top: 4px; color: var(--muted, #99a9b5); }
    .history-result { border-radius: 999px; padding: 4px 8px; font-size: 11px; font-weight: 700; }
    .login-success { background: rgb(72 187 120 / 15%); color: #79dfa4; }
    .login-failure { background: rgb(245 101 101 / 15%); color: #ff9a9a; }
    .history-empty, .history-error { margin: 20px 0 0; color: var(--muted, #99a9b5); }
    .history-error { color: #ff9a9a; }
    @media (max-width: 560px) { .login-history-card { padding: 16px; } }
  `],
})
export class AdminLoginHistoryComponent {
  private readonly http = inject(HttpClient);
  protected readonly entries = signal<LoginHistoryEntry[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.http.get<LoginHistoryEntry[]>('/api/admin/login-history?take=50').subscribe({
      next: (entries) => {
        this.entries.set(entries);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.error.set(
          error instanceof HttpErrorResponse && error.status === 403
            ? 'Administrator access is required to view login history.'
            : 'Login history could not be loaded.',
        );
        this.loading.set(false);
      },
    });
  }
}
