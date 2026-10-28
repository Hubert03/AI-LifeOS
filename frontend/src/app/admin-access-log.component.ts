import { DatePipe } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, effect, inject, input, signal, untracked } from '@angular/core';

interface AccessLogEntry {
  adminName: string;
  targetName: string;
  resource: string;
  createdAtUtc: string;
}

@Component({
  selector: 'app-admin-access-log',
  imports: [DatePipe],
  template: `
    <section class="overview-panel access-log-panel">
      <header class="overview-panel-heading">
        <div>
          <h2>Admin access log</h2>
          <p>Every time an administrator opens a member's workspace. Entries can't be edited.</p>
        </div>
        <span class="trash-count">{{ entries().length }}</span>
      </header>

      @if (error()) {
        <p class="overview-extra-error" role="alert">{{ error() }}</p>
      } @else if (loading() && !entries().length) {
        <p class="overview-extra-empty" role="status">Loading access log…</p>
      } @else if (!entries().length) {
        <p class="overview-extra-empty">No admin has opened a member's workspace yet.</p>
      } @else {
        <ul class="access-log-list">
          @for (e of entries(); track $index) {
            <li>
              <span><strong>{{ e.adminName }}</strong> viewed <strong>{{ e.targetName }}</strong>'s {{ e.resource }}</span>
              <time>{{ e.createdAtUtc | date: 'MMM d, y · h:mm a' }}</time>
            </li>
          }
        </ul>
      }
    </section>
  `,
})
export class AdminAccessLogComponent {
  private readonly http = inject(HttpClient);

  /** Pass any value that changes after a workspace loads, so the log refreshes. */
  readonly refreshOn = input<unknown>(null);

  protected readonly entries = signal<AccessLogEntry[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  private started = false;

  constructor() {
    effect(() => {
      const trigger = this.refreshOn();
      untracked(() => {
        if (trigger !== null || !this.started) {
          this.started = true;
          this.load();
        }
      });
    });
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.http.get<AccessLogEntry[]>('/api/admin/access-log?take=25').subscribe({
      next: (rows) => { this.entries.set(rows); this.loading.set(false); },
      error: (e: unknown) => {
        this.error.set(
          e instanceof HttpErrorResponse && e.status === 403
            ? 'Administrator access is required to view the access log.'
            : 'The access log could not be loaded.',
        );
        this.loading.set(false);
      },
    });
  }
}