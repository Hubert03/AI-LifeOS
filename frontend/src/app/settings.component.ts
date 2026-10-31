import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from './auth.service';
import { AiProviderSettings, SettingsService } from './settings.service';
import { ThemePickerComponent } from './theme-picker.component';
import { ThemeMode, ThemeService } from './theme.service';
import { AlertStyle, LoaderStyle, UiPreferencesService } from './ui-preferences.service';
import { StyleCreatorService } from './style-creator.service';

@Component({
  selector: 'app-settings',
  imports: [FormsModule, RouterLink, ThemePickerComponent],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css',
})
export class SettingsComponent {
  private readonly authService = inject(AuthService);
  private readonly settingsService = inject(SettingsService);
  protected readonly themeService = inject(ThemeService);
  protected readonly uiPreferences = inject(UiPreferencesService);
  protected readonly styleCreator = inject(StyleCreatorService);
  protected readonly currentUser = this.authService.currentUser;
  protected readonly isDarkTheme = this.themeService.isDarkTheme;
  protected readonly themeOptions = [
    { value: 'dark', name: 'Midnight', description: 'Deep slate with violet glow', preview: 'dark-preview' },
    { value: 'light', name: 'Light', description: 'Bright, clear surfaces', preview: 'light-preview' },
    { value: 'ocean', name: 'Ocean', description: 'Cool blue and aqua accents', preview: 'ocean-preview' },
    { value: 'forest', name: 'Forest', description: 'Calm evergreen tones', preview: 'forest-preview' },
  ] as const;
  protected readonly loaderOptions = [
    { value: 'gear', name: 'Gearworks', description: 'A little machine at work' },
    { value: 'pulse', name: 'Pulse', description: 'A calm three-beat rhythm' },
    { value: 'orbit', name: 'Orbit', description: 'Three lights in motion' },
  ] as const;
  protected readonly alertOptions = [
    { value: 'classic', name: 'Studio', description: 'Centered with a clear action' },
    { value: 'minimal', name: 'Minimal', description: 'Compact and to the point' },
    { value: 'glass', name: 'Glass', description: 'Soft, layered glass surface' },
  ] as const;
  protected readonly displayName = signal(this.currentUser()?.displayName ?? '');
  protected readonly email = signal(this.currentUser()?.email ?? '');
  protected readonly currentPassword = signal('');
  protected readonly newPassword = signal('');
  protected readonly confirmPassword = signal('');
  protected readonly apiUrl = signal('https://openrouter.ai/api/v1/chat/completions');
  protected readonly model = signal('openrouter/free');
  protected readonly apiKey = signal('');
  protected readonly clearApiKey = signal(false);
  protected readonly aiSettings = signal<AiProviderSettings | null>(null);
  protected readonly aiSettingsLoading = signal(true);
  protected readonly profileSaving = signal(false);
  protected readonly passwordSaving = signal(false);
  protected readonly aiSaving = signal(false);
  protected readonly profileMessage = signal<string | null>(null);
  protected readonly profileError = signal<string | null>(null);
  protected readonly passwordMessage = signal<string | null>(null);
  protected readonly passwordError = signal<string | null>(null);
  protected readonly aiMessage = signal<string | null>(null);
  protected readonly aiError = signal<string | null>(null);

  constructor() {
    this.loadAiSettings();
  }

  protected setTheme(theme: ThemeMode): void {
    this.themeService.setTheme(theme);
  }

  protected setLoaderStyle(style: LoaderStyle): void {
    this.uiPreferences.setLoaderStyle(style);
  }

  protected setAlertStyle(style: AlertStyle): void {
    this.uiPreferences.setAlertStyle(style);
  }

  protected saveProfile(): void {
    this.profileSaving.set(true);
    this.profileError.set(null);
    this.profileMessage.set(null);
    this.authService.updateProfile(this.displayName().trim(), this.email().trim()).subscribe({
      next: (user) => {
        this.displayName.set(user.displayName);
        this.email.set(user.email);
        this.profileMessage.set('Your profile has been updated.');
      },
      error: (error: unknown) => {
        this.profileError.set(this.getErrorMessage(error));
        this.profileSaving.set(false);
      },
      complete: () => this.profileSaving.set(false),
    });
  }

  protected changePassword(): void {
    this.passwordError.set(null);
    this.passwordMessage.set(null);
    if (this.newPassword() !== this.confirmPassword()) {
      this.passwordError.set('The new password and confirmation do not match.');
      return;
    }

    this.passwordSaving.set(true);
    this.authService.changePassword(this.currentPassword(), this.newPassword()).subscribe({
      next: () => {
        this.currentPassword.set('');
        this.newPassword.set('');
        this.confirmPassword.set('');
        this.passwordMessage.set('Your password has been changed.');
      },
      error: (error: unknown) => {
        this.passwordError.set(this.getErrorMessage(error));
        this.passwordSaving.set(false);
      },
      complete: () => this.passwordSaving.set(false),
    });
  }

  protected saveAiSettings(): void {
    this.aiSaving.set(true);
    this.aiError.set(null);
    this.aiMessage.set(null);
    this.settingsService.updateAiProviderSettings({
      apiUrl: this.apiUrl().trim(),
      model: this.model().trim(),
      apiKey: this.apiKey(),
      clearApiKey: this.clearApiKey(),
    }).subscribe({
      next: (settings) => {
        this.applyAiSettings(settings);
        this.apiKey.set('');
        this.clearApiKey.set(false);
        this.aiMessage.set('Shared AI provider settings have been saved.');
      },
      error: (error: unknown) => {
        this.aiError.set(this.getErrorMessage(error));
        this.aiSaving.set(false);
      },
      complete: () => this.aiSaving.set(false),
    });
  }

  protected onClearApiKeyChanged(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.clearApiKey.set(checked);
    if (checked) {
      this.apiKey.set('');
    }
  }

  private loadAiSettings(): void {
    this.aiSettingsLoading.set(true);
    this.aiError.set(null);
    this.settingsService.getAiProviderSettings().subscribe({
      next: (settings) => this.applyAiSettings(settings),
      error: (error: unknown) => {
        this.aiError.set(this.getErrorMessage(error));
        this.aiSettingsLoading.set(false);
      },
      complete: () => this.aiSettingsLoading.set(false),
    });
  }

  private applyAiSettings(settings: AiProviderSettings): void {
    this.aiSettings.set(settings);
    this.apiUrl.set(settings.apiUrl);
    this.model.set(settings.model);
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const response = error.error as { message?: unknown; errors?: unknown } | null;
      if (typeof response?.message === 'string' && response.message.trim()) {
        return response.message;
      }
      if (Array.isArray(response?.errors) && response.errors.every((item) => typeof item === 'string')) {
        return response.errors.join(' ');
      }
      if (error.status === 0) {
        return 'Cannot reach the API. Make sure the .NET API is running.';
      }
      if (error.status === 401) {
        return 'Your session has expired. Please sign in again.';
      }
      return `The API could not save your settings (HTTP ${error.status}). Please try again.`;
    }
    return 'Could not save your settings. Please try again.';
  }
}
