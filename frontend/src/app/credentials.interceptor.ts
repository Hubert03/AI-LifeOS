import { HttpInterceptorFn } from '@angular/common/http';

export const credentialsInterceptor: HttpInterceptorFn = (req, next) => {
  // Only attach credentials to your API requests
  if (req.url.includes('/api/')) {
    const clonedReq = req.clone({ withCredentials: true });
    return next(clonedReq);
  }
  return next(req);
};