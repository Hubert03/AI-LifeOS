import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, switchMap } from 'rxjs';
import { AuthService } from './auth.service';

export interface AiProviderSettings {
  apiUrl: string;
  model: string;
  apiKeyConfigured: boolean;
  updatedAtUtc: string | null;
}

export interface UpdateAiProviderSettings {
  apiUrl: string;
  model: string;
  apiKey: string;
  clearApiKey: boolean;
}

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  getAiProviderSettings(): Observable<AiProviderSettings> {
    return this.http.get<AiProviderSettings>('/api/settings/ai-provider');
  }

  updateAiProviderSettings(
    settings: UpdateAiProviderSettings,
  ): Observable<AiProviderSettings> {
    return this.authService.loadCsrfToken().pipe(
      switchMap(() =>
        this.http.put<AiProviderSettings>(
          '/api/settings/ai-provider',
          settings,
          { headers: this.authService.csrfHeaders() },
        ),
      ),
    );
  }
}
