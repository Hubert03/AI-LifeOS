import { Injectable, signal } from '@angular/core';

export type LoaderStyle = 'gear' | 'pulse' | 'orbit';
export type AlertStyle = 'classic' | 'minimal' | 'glass';

const LOADER_STORAGE_KEY = 'ai-lifeos-loader-style';
const ALERT_STORAGE_KEY = 'ai-lifeos-alert-style';

@Injectable({ providedIn: 'root' })
export class UiPreferencesService {
  readonly loaderStyle = signal<LoaderStyle>(this.loadValue(LOADER_STORAGE_KEY, ['gear', 'pulse', 'orbit']));
  readonly alertStyle = signal<AlertStyle>(this.loadValue(ALERT_STORAGE_KEY, ['classic', 'minimal', 'glass']));

  setLoaderStyle(style: LoaderStyle): void {
    this.loaderStyle.set(style);
    localStorage.setItem(LOADER_STORAGE_KEY, style);
  }

  setAlertStyle(style: AlertStyle): void {
    this.alertStyle.set(style);
    localStorage.setItem(ALERT_STORAGE_KEY, style);
  }

  private loadValue<T extends string>(key: string, supported: readonly T[]): T {
    const stored = localStorage.getItem(key);
    return supported.find((value) => value === stored) ?? supported[0];
  }
}
