import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, switchMap } from 'rxjs';
import { AuthService } from './auth.service';

export interface Briefing {
  summary: string;
  priorities: { title: string; reason: string }[];
  goalToWatch: { title: string; note: string } | null;
  suggestion: string;
  generatedAtUtc: string;
}

const RETRY_AFTER_FAILURE_MS = 60_000;

@Injectable({ providedIn: 'root' })
export class BriefingService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  readonly briefing = signal<Briefing | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  private ownerId: string | null = null;
  private loadedDay = '';
  private lastFailureAt = 0;

  /** Called when the card appears. Reuses what is already in memory. */
  ensureLoaded(): void {
    this.resetIfOwnerOrDayChanged();
    if (this.loading() || this.briefing()) return;
    if (this.error() && Date.now() - this.lastFailureAt < RETRY_AFTER_FAILURE_MS) return;
    this.run(this.fetchToday());
  }

  /** Called by the button. Refreshes only when there is something to refresh. */
  reload(): void {
    if (this.loading()) return;
    this.run(this.briefing() ? this.fetchRefresh() : this.fetchToday());
  }

  private run(request: Observable<Briefing>): void {
    this.loading.set(true);
    this.error.set(null);
    request.subscribe({
      next: (b) => {
        this.briefing.set(b);
        this.loadedDay = this.today();
        this.loading.set(false);
      },
      error: (e: unknown) => {
        this.error.set(this.describe(e));
        this.lastFailureAt = Date.now();
        this.loading.set(false);
      },
    });
  }

  private resetIfOwnerOrDayChanged(): void {
    const uid = this.auth.currentUser()?.userId ?? null;
    if (this.ownerId !== uid || (this.briefing() && this.loadedDay !== this.today())) {
      this.briefing.set(null);
      this.error.set(null);
      this.lastFailureAt = 0;
      this.ownerId = uid;
    }
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private fetchToday(): Observable<Briefing> {
    return this.http.get<Briefing>('/api/ai/briefing');
  }

  private fetchRefresh(): Observable<Briefing> {
    return this.http.get<{ requestToken: string }>('/api/auth/csrf').pipe(
      switchMap(({ requestToken }) =>
        this.http.post<Briefing>('/api/ai/briefing/refresh', {}, {
          headers: new HttpHeaders({ 'X-CSRF-TOKEN': requestToken }),
        }),
      ),
    );
  }

  private describe(e: unknown): string {
    if (e instanceof HttpErrorResponse) {
      if (e.status === 0) return 'Cannot reach the API.';
      if (e.status === 401) return 'Your session has expired. Please sign in again.';
      const detail = (e.error as { detail?: string } | null)?.detail;
      if (detail) return detail;
    }
    return 'The briefing could not be created. Please try again.';
  }
}

// import { HttpClient, HttpHeaders } from '@angular/common/http';
// import { Injectable, inject } from '@angular/core';
// import { Observable, switchMap } from 'rxjs';

// export interface Briefing {
//   summary: string;
//   priorities: { title: string; reason: string }[];
//   goalToWatch: { title: string; note: string } | null;
//   suggestion: string;
//   generatedAtUtc: string;
// }

// @Injectable({ providedIn: 'root' })
// export class BriefingService {
//   private readonly http = inject(HttpClient);

//   get(): Observable<Briefing> {
//     return this.http.get<Briefing>('/api/ai/briefing');
//   }

//   refresh(): Observable<Briefing> {
//     return this.http.get<{ requestToken: string }>('/api/auth/csrf').pipe(
//       switchMap(({ requestToken }) =>
//         this.http.post<Briefing>('/api/ai/briefing/refresh', {}, {
//           headers: new HttpHeaders({ 'X-CSRF-TOKEN': requestToken }),
//         }),
//       ),
//     );
//   }
// }