import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SettingsService } from './settings.service';

describe('SettingsService', () => {
  let service: SettingsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SettingsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads AI settings without requesting or exposing the API key', () => {
    const settings = {
      apiUrl: 'https://openrouter.ai/api/v1/chat/completions',
      model: 'openrouter/free',
      apiKeyConfigured: true,
      updatedAtUtc: null,
    };

    service.getAiProviderSettings().subscribe((result) => expect(result).toEqual(settings));

    const request = http.expectOne('/api/settings/ai-provider');
    expect(request.request.method).toBe('GET');
    request.flush(settings);
  });

  it('saves provider settings with a CSRF token', () => {
    const settings = {
      apiUrl: 'https://openrouter.ai/api/v1/chat/completions',
      model: 'openrouter/free',
      apiKeyConfigured: true,
      updatedAtUtc: '2026-10-12T12:00:00Z',
    };
    const update = {
      apiUrl: settings.apiUrl,
      model: settings.model,
      apiKey: 'new-api-key',
      clearApiKey: false,
    };

    service.updateAiProviderSettings(update).subscribe((result) => expect(result).toEqual(settings));

    http.expectOne('/api/auth/csrf').flush({ requestToken: 'settings-token' });

    const request = http.expectOne('/api/settings/ai-provider');
    expect(request.request.method).toBe('PUT');
    expect(request.request.headers.get('X-CSRF-TOKEN')).toBe('settings-token');
    expect(request.request.body).toEqual(update);
    request.flush(settings);
  });
});
