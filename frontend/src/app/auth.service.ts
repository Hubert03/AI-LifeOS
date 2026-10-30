import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, switchMap, tap, throwError } from 'rxjs';

export interface CurrentUser {
  userId: string;
  email: string;
  displayName: string;
  isAdmin: boolean;
  mustChangePassword: boolean;
}

// ✅ FIX 1: Change 'token' to 'token'
interface CsrfResponse {
  token: string; 
}

interface AuthErrorResponse {
  message?: string;
  errors?: string[];
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private csrfToken: string | null = null;

  readonly currentUser = signal<CurrentUser | null>(null);

  loadCsrfToken(): Observable<void> {
    return this.http.get<CsrfResponse>('/api/auth/csrf', {
      withCredentials: true
    }).pipe(
      // ✅ FIX 2: Read 'response.token' instead of 'response.token'
      tap((response) => (this.csrfToken = response.token)),
      map(() => undefined),
    );
  }
acceptInvitation(token: string, password: string): Observable<CurrentUser> {
  return this.loadCsrfToken().pipe(
    switchMap(() =>
      this.http.post<CurrentUser>(
        '/api/auth/accept-invitation',
        { token, password },
        {
          headers: this.csrfHeaders(),
          withCredentials: true
        }
      )
    ),
    tap((user) => this.currentUser.set(user))
  );
}


 login(email: string, password: string): Observable<CurrentUser> {
  return this.loadCsrfToken().pipe(
    switchMap(() =>
      this.http.post<CurrentUser>(
        '/api/auth/login',
        { email, password },
        {
          headers: this.csrfHeaders(),
          withCredentials: true
        },
      ),
    ),
    tap((user) => this.currentUser.set(user)),
  );
}
 
getCurrentUser(): Observable<CurrentUser | null> {
  return this.http.get<CurrentUser>('/api/auth/me', {
    withCredentials: true
  }).pipe(
    tap((user) => this.currentUser.set(user)),
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        this.currentUser.set(null);
        return of(null);
      }
      return throwError(() => error);
    }),
  );
}


 
logout(): Observable<void> {
  return this.loadCsrfToken().pipe(
    switchMap(() =>
      this.http.post<void>(
        '/api/auth/logout',
        {},
        {
          headers: this.csrfHeaders(),
          withCredentials: true
        }
      )
    ),
    tap(() => this.currentUser.set(null))
  );
}

  
updateProfile(displayName: string, email: string): Observable<CurrentUser> {
  return this.loadCsrfToken().pipe(
    switchMap(() =>
      this.http.put<CurrentUser>(
        '/api/auth/profile',
        { displayName, email },
        {
          headers: this.csrfHeaders(),
          withCredentials: true
        }
      )
    ),
    tap((user) => this.currentUser.set(user))
  );
}

  
changePassword(currentPassword: string, newPassword: string): Observable<void> {
  return this.loadCsrfToken().pipe(
    switchMap(() =>
      this.http.post<void>(
        '/api/auth/change-password',
        { currentPassword, newPassword },
        {
          headers: this.csrfHeaders(),
          withCredentials: true
        }
      )
    ),
    tap(() => {
      this.currentUser.update((user) =>
        user ? { ...user, mustChangePassword: false } : null
      );
    })
  );
}


  getErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const response = error.error as AuthErrorResponse | null;
      if (response?.errors?.length) {
        return response.errors.join(' ');
      }
      if (response?.message) {
        return response.message;
      }
      if (error.status === 0) {
        return 'Cannot reach the API. Make sure the .NET API is running.';
      }
    }
    // ✅ FIX 3: Catch the generic Error thrown by csrfHeaders() if token is missing
    if (error instanceof Error) {
      return error.message; 
    }

    return 'Something went wrong. Please try again.';
  }

  csrfHeaders(): HttpHeaders {
    if (!this.csrfToken) {
      throw new Error('A CSRF token is required before sending authentication requests.');
    }
    return new HttpHeaders({ 'X-CSRF-TOKEN': this.csrfToken });
  }
}
