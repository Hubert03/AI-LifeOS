import { Injectable, signal } from '@angular/core';

export type LoaderStyle = 'gear' | 'pulse' | 'orbit';
export type AlertStyle = 'classic' | 'minimal' | 'glass';
export type FocusMinutes = 25 | 45 | 60;
export type BreakMinutes = 5 | 10 | 15;

const LOADER_STORAGE_KEY = 'ai-lifeos-loader-style';
const ALERT_STORAGE_KEY = 'ai-lifeos-alert-style';
const FOCUS_MINUTES_KEY = 'ai-lifeos-focus-minutes';
const BREAK_MINUTES_KEY = 'ai-lifeos-break-minutes';
const WEEKLY_INSIGHTS_KEY = 'ai-lifeos-weekly-insights';

@Injectable({ providedIn: 'root' })
export class UiPreferencesService {
  readonly loaderStyle = signal<LoaderStyle>(this.loadValue(LOADER_STORAGE_KEY, ['gear', 'pulse', 'orbit']));
  readonly alertStyle = signal<AlertStyle>(this.loadValue(ALERT_STORAGE_KEY, ['classic', 'minimal', 'glass']));
  readonly focusMinutes = signal<FocusMinutes>(this.loadNumber(FOCUS_MINUTES_KEY, [25, 45, 60], 25));
  readonly breakMinutes = signal<BreakMinutes>(this.loadNumber(BREAK_MINUTES_KEY, [5, 10, 15], 5));
  readonly weeklyInsightsEnabled = signal(this.loadBoolean(WEEKLY_INSIGHTS_KEY, true));

  setLoaderStyle(style: LoaderStyle): void {
    this.loaderStyle.set(style);
    localStorage.setItem(LOADER_STORAGE_KEY, style);
  }

  setAlertStyle(style: AlertStyle): void {
    this.alertStyle.set(style);
    localStorage.setItem(ALERT_STORAGE_KEY, style);
  }

  setFocusMinutes(minutes: FocusMinutes): void {
    this.focusMinutes.set(minutes);
    localStorage.setItem(FOCUS_MINUTES_KEY, String(minutes));
  }

  setBreakMinutes(minutes: BreakMinutes): void {
    this.breakMinutes.set(minutes);
    localStorage.setItem(BREAK_MINUTES_KEY, String(minutes));
  }

  setWeeklyInsightsEnabled(enabled: boolean): void {
    this.weeklyInsightsEnabled.set(enabled);
    localStorage.setItem(WEEKLY_INSIGHTS_KEY, String(enabled));
  }

  private loadValue<T extends string>(key: string, supported: readonly T[]): T {
    const stored = localStorage.getItem(key);
    return supported.find((value) => value === stored) ?? supported[0];
  }

  private loadNumber<T extends number>(key: string, supported: readonly T[], fallback: T): T {
    const stored = Number(localStorage.getItem(key));
    return supported.find((value) => value === stored) ?? fallback;
  }

  private loadBoolean(key: string, fallback: boolean): boolean {
    const stored = localStorage.getItem(key);
    return stored === 'true' || (stored !== 'false' && fallback);
  }
}
