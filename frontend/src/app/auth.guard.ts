import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.getCurrentUser().pipe(
    map((user) =>
      !user
        ? router.createUrlTree(['/login'])
        : user.mustChangePassword
          ? router.createUrlTree(['/change-password'])
          : true,
    ),
    catchError(() =>
      of(router.createUrlTree(['/login'], { queryParams: { reason: 'api-unavailable' } })),
    ),
  );
};

export const passwordChangeGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.getCurrentUser().pipe(
    map((user) =>
      !user
        ? router.createUrlTree(['/login'])
        : user.mustChangePassword
          ? true
          : router.createUrlTree(['/']),
    ),
    catchError(() => of(router.createUrlTree(['/login']))),
  );
};

export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.getCurrentUser().pipe(
    map((user) =>
      !user
        ? router.createUrlTree(['/login'])
        : user.isAdmin
          ? true
          : router.createUrlTree(['/']),
    ),
    catchError(() => of(router.createUrlTree(['/login']))),
  );
};

// import { HttpClient, HttpErrorResponse } from '@angular/common/http';
// import { Injectable, inject, signal } from '@angular/core';
// import { Observable, catchError, map, of, switchMap, tap, throwError } from 'rxjs';

// export interface CurrentUser {
//   userId: string;
//   email: string;
//   displayName: string;
//   isAdmin: boolean;
//   mustChangePassword: boolean;
// }

// interface AuthErrorResponse {
//   message?: string;
//   errors?: string[];
// }

// @Injectable({ providedIn: 'root' })
// export class AuthService {
//   private readonly http = inject(HttpClient);
//   readonly currentUser = signal<CurrentUser | null>(null);

//   acceptInvitation(token: string, password: string): Observable<CurrentUser> {
//     return this.http.post<CurrentUser>(
//       '/api/auth/accept-invitation',
//       { token, password },
//       { withCredentials: true } // No headers needed anymore
//     ).pipe(
//       tap((user) => this.currentUser.set(user))
//     );
//   }

//   login(email: string, password: string): Observable<CurrentUser> {
//     return this.http.post<CurrentUser>(
//       '/api/auth/login',
//       { email, password },
//       { withCredentials: true } // No headers needed anymore
//     ).pipe(
//       tap((user) => this.currentUser.set(user)),
//     );
//   }
 
//   getCurrentUser(): Observable<CurrentUser | null> {
//     return this.http.get<CurrentUser>('/api/auth/me', {
//       withCredentials: true
//     }).pipe(
//       tap((user) => this.currentUser.set(user)),
//       catchError((error: HttpErrorResponse) => {
//         if (error.status === 401) {
//           this.currentUser.set(null);
//           return of(null);
//         }
//         return throwError(() => error);
//       }),
//     );
//   }
 
//   logout(): Observable<void> {
//     return this.http.post<void>(
//       '/api/auth/logout',
//       {},
//       { withCredentials: true }
//     ).pipe(
//       tap(() => this.currentUser.set(null))
//     );
//   }
  
//   updateProfile(displayName: string, email: string): Observable<CurrentUser> {
//     return this.http.put<CurrentUser>(
//       '/api/auth/profile',
//       { displayName, email },
//       { withCredentials: true }
//     ).pipe(
//       tap((user) => this.currentUser.set(user))
//     );
//   }
  
//   changePassword(currentPassword: string, newPassword: string): Observable<void> {
//     return this.http.post<void>(
//       '/api/auth/change-password',
//       { currentPassword, newPassword },
//       { withCredentials: true }
//     ).pipe(
//       tap(() => {
//         this.currentUser.update((user) =>
//           user ? { ...user, mustChangePassword: false } : null
//         );
//       })
//     );
//   }

//   getErrorMessage(error: unknown): string {
//     if (error instanceof HttpErrorResponse) {
//       const response = error.error as AuthErrorResponse | null;
//       if (response?.errors?.length) {
//         return response.errors.join(' ');
//       }
//       if (response?.message) {
//         return response.message;
//       }
//       if (error.status === 0) {
//         return 'Cannot reach the API. Make sure the .NET API is running.';
//       }
//     }
//     return 'Something went wrong. Please try again.';
//   }
// }
