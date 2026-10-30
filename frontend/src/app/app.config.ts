// import { provideHttpClient, withInterceptors } from '@angular/common/http';
// import {
//   ApplicationConfig,
//   provideBrowserGlobalErrorListeners
// } from '@angular/core';
// import { provideRouter } from '@angular/router';
// import { routes } from './app.routes';
// import { apiUrlInterceptor } from './api-url.interceptor';

// export const appConfig: ApplicationConfig = {
//   providers: [
//     provideBrowserGlobalErrorListeners(),
//     provideHttpClient(
//       withInterceptors([apiUrlInterceptor])
//     ),
//     provideRouter(routes)
//   ]
// };
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router'; // <-- ADD THIS IMPORT
import { provideHttpClient, withInterceptors, withXsrfConfiguration } from '@angular/common/http';

import { routes } from './app.routes'; // <-- ADD THIS IMPORT
import { credentialsInterceptor } from './credentials.interceptor'; 

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes), // <-- CRITICAL: This tells Angular how to route!
    provideHttpClient(
      withInterceptors([credentialsInterceptor]), 
      withXsrfConfiguration({
        cookieName: '.AiLifeOS.AntiForgery', 
        headerName: 'X-CSRF-TOKEN'           
      })
    )
  ]
};