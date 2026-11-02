import { TestBed } from '@angular/core/testing';
import { UiPreferencesService } from './ui-preferences.service';

describe('UiPreferencesService', () => {
  beforeEach(() => {
    localStorage.removeItem('ai-lifeos-loader-style');
    localStorage.removeItem('ai-lifeos-alert-style');
    localStorage.removeItem('ai-lifeos-focus-minutes');
    localStorage.removeItem('ai-lifeos-break-minutes');
    localStorage.removeItem('ai-lifeos-weekly-insights');
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

  it('persists focus rhythm and weekly insight preferences', () => {
    const preferences = TestBed.inject(UiPreferencesService);
    preferences.setFocusMinutes(45);
    preferences.setBreakMinutes(10);
    preferences.setWeeklyInsightsEnabled(false);

    expect(localStorage.getItem('ai-lifeos-focus-minutes')).toBe('45');
    expect(localStorage.getItem('ai-lifeos-break-minutes')).toBe('10');
    expect(localStorage.getItem('ai-lifeos-weekly-insights')).toBe('false');
  });

  it('uses safe defaults for unsupported saved focus durations', () => {
    localStorage.setItem('ai-lifeos-focus-minutes', '90');
    localStorage.setItem('ai-lifeos-break-minutes', '-5');

    const preferences = TestBed.inject(UiPreferencesService);
    expect(preferences.focusMinutes()).toBe(25);
    expect(preferences.breakMinutes()).toBe(5);
  });
});
