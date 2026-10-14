import { inject, Injectable, signal } from '@angular/core';
import { ThemeService } from './theme.service';
import { AlertStyle, UiPreferencesService } from './ui-preferences.service';

export interface ConfirmationRequest {
  title: string;
  message: string;
  confirmLabel: string;
  isLightTheme: boolean;
  alertStyle: AlertStyle;
}

@Injectable({ providedIn: 'root' })
export class ConfirmationService {
  private readonly themeService = inject(ThemeService);
  private readonly uiPreferences = inject(UiPreferencesService);
  readonly request = signal<ConfirmationRequest | null>(null);
  private resolveRequest: ((confirmed: boolean) => void) | null = null;

  confirm(request: Omit<ConfirmationRequest, 'isLightTheme' | 'alertStyle'>): Promise<boolean> {
    if (this.resolveRequest) {
      return Promise.resolve(false);
    }

    this.request.set({
      ...request,
      isLightTheme: !this.themeService.isDarkTheme(),
      alertStyle: this.uiPreferences.alertStyle(),
    });
    return new Promise<boolean>((resolve) => {
      this.resolveRequest = resolve;
    });
  }

  dismiss(confirmed: boolean): void {
    const resolve = this.resolveRequest;
    this.resolveRequest = null;
    this.request.set(null);
    resolve?.(confirmed);
  }
}
