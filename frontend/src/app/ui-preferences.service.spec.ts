import { TestBed } from '@angular/core/testing';
import { UiPreferencesService } from './ui-preferences.service';

describe('UiPreferencesService', () => {
  beforeEach(() => {
    localStorage.removeItem('ai-lifeos-loader-style');
    localStorage.removeItem('ai-lifeos-alert-style');
    TestBed.configureTestingModule({});
  });

  it('persists the selected loader and confirmation styles', () => {
    const preferences = TestBed.inject(UiPreferencesService);

    preferences.setLoaderStyle('orbit');
    preferences.setAlertStyle('glass');

    expect(preferences.loaderStyle()).toBe('orbit');
    expect(preferences.alertStyle()).toBe('glass');
    expect(localStorage.getItem('ai-lifeos-loader-style')).toBe('orbit');
    expect(localStorage.getItem('ai-lifeos-alert-style')).toBe('glass');
  });
});
