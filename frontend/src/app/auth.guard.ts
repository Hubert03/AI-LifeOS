import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.getCurrentUser().pipe(
    map((user) => (user ? true : router.createUrlTree(['/login']))),
    catchError(() =>
      of(router.createUrlTree(['/login'], { queryParams: { reason: 'api-unavailable' } })),
    ),
  );
};
