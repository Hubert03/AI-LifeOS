import { DOCUMENT } from '@angular/common';
import { computed, inject, Injectable, signal } from '@angular/core';

export type ThemeMode = 'dark' | 'light' | 'ocean' | 'forest';

const THEME_STORAGE_KEY = 'ai-lifeos-theme';
const THEMES: readonly ThemeMode[] = ['dark', 'light', 'ocean', 'forest'];

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly selectedTheme = signal<ThemeMode>(this.loadTheme());

  readonly theme = this.selectedTheme.asReadonly();
  readonly isDarkTheme = computed(() => this.selectedTheme() !== 'light');

  constructor() {
    this.applyTheme(this.selectedTheme());
  }

  setTheme(theme: ThemeMode): void {
    this.selectedTheme.set(theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    this.applyTheme(theme);
  }

  toggleTheme(): void {
    this.setTheme(this.isDarkTheme() ? 'light' : 'dark');
  }

  private loadTheme(): ThemeMode {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    return THEMES.find((theme) => theme === storedTheme) ?? 'dark';
  }

  private applyTheme(theme: ThemeMode): void {
    this.document.documentElement.dataset['theme'] = theme;
    this.document.documentElement.style.colorScheme = theme === 'light' ? 'light' : 'dark';
  }
}
