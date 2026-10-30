
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import {
  provideHttpClient,
  withInterceptors,
  withXsrfConfiguration
} from '@angular/common/http';

import { routes } from './app.routes';
import { apiUrlInterceptor } from './api-url.interceptor';
import { credentialsInterceptor } from './credentials.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([
        apiUrlInterceptor,
        credentialsInterceptor
      ]),
      withXsrfConfiguration({
        cookieName: '.AiLifeOS.AntiForgery',
        headerName: 'X-CSRF-TOKEN'
      })
    )
  ]
};
