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
