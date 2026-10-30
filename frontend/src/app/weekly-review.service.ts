import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, switchMap } from 'rxjs';
import { AuthService } from './auth.service';

export interface WeeklyReview {
  headline: string;
  wins: string[];
  slipped: string[];
  focus: string[];
  encouragement: string;
  generatedAtUtc: string;
}

@Injectable({ providedIn: 'root' })
export class WeeklyReviewService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  readonly review = signal<WeeklyReview | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  private ownerId: string | null = null;

  /** Called when the card appears. Clears the review if a different user signed in. */
  syncOwner(): void {
    const uid = this.auth.currentUser()?.userId ?? null;
    if (this.ownerId !== uid) {
      this.review.set(null);
      this.error.set(null);
      this.ownerId = uid;
    }
  }

  /** Button action. Creates the first review, or refreshes the current one. */
  load(): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set(null);
    const request = this.review() ? this.fetchRefresh() : this.fetchCurrent();
    request.subscribe({
      next: (r) => { this.review.set(r); this.loading.set(false); },
      error: (e: unknown) => { this.error.set(this.describe(e)); this.loading.set(false); },
    });
  }

  private fetchCurrent(): Observable<WeeklyReview> {
    return this.http.get<WeeklyReview>('/api/ai/weekly-review');
  }

  private fetchRefresh(): Observable<WeeklyReview> {
    return this.http.get<{ token: string }>('/api/auth/csrf').pipe(
      switchMap(({ token }) =>
        this.http.post<WeeklyReview>('/api/ai/weekly-review/refresh', {}, {
          headers: new HttpHeaders({ 'X-CSRF-TOKEN': token }),
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
    return 'The review could not be created. Please try again.';
  }
}


// import { HttpClient, HttpHeaders } from '@angular/common/http';
// import { Injectable, inject } from '@angular/core';
// import { Observable, switchMap } from 'rxjs';

// export interface WeeklyReview {
//   headline: string;
//   wins: string[];
//   slipped: string[];
//   focus: string[];
//   encouragement: string;
//   generatedAtUtc: string;
// }

// @Injectable({ providedIn: 'root' })
// export class WeeklyReviewService {
//   private readonly http = inject(HttpClient);

//   get(): Observable<WeeklyReview> {
//     return this.http.get<WeeklyReview>('/api/ai/weekly-review');
//   }

//   refresh(): Observable<WeeklyReview> {
//     return this.http.get<{ token: string }>('/api/auth/csrf').pipe(
//       switchMap(({ token }) =>
//         this.http.post<WeeklyReview>('/api/ai/weekly-review/refresh', {}, {
//           headers: new HttpHeaders({ 'X-CSRF-TOKEN': token }),
//         }),
//       ),
//     );
//   }
// }