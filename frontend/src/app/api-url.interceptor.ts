
import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../environments/environment';

export const apiUrlInterceptor: HttpInterceptorFn = (req, next) => {
  // Do not modify absolute URLs.
  if (/^https?:\/\//i.test(req.url)) {
    return next(req);
  }

  // In development, use the Angular proxy.
  if (!environment.production) {
    return next(req);
  }

  // Redirect API requests to the hosted backend in production.
  if (!req.url.startsWith('/api/')) {
    return next(req);
  }

  const apiUrl = environment.apiUrl.replace(/\/+$/, '');

  return next(
    req.clone({
      url: `${apiUrl}${req.url}`
    })
  );
};
