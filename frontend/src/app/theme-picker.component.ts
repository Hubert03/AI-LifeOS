import { Component, ElementRef, HostListener, inject, signal } from '@angular/core';
import { ThemeMode, ThemeService } from './theme.service';

@Component({
  selector: 'app-theme-picker',
  template: `
    <div class="theme-picker">
      <button
        class="theme-picker-trigger"
        type="button"
        aria-label="Choose workspace appearance"
        [attr.aria-expanded]="open()"
        (click)="open.set(!open())"
      >
        <span class="theme-swatch" [class]="currentPreview" aria-hidden="true"></span>
        <span class="theme-picker-label">Style</span>
        <span class="theme-chevron" aria-hidden="true">{{ open() ? '⌃' : '⌄' }}</span>
      </button>
      @if (open()) {
        <div class="theme-picker-panel" role="group" aria-label="Workspace color themes">
          <p>Choose a look</p>
          @for (option of options; track option.value) {
            <button
              class="theme-choice"
              type="button"
              [class.selected]="themes.theme() === option.value"
              [attr.aria-pressed]="themes.theme() === option.value"
              (click)="selectTheme(option.value)"
            >
              <span [class]="'theme-swatch ' + option.preview" aria-hidden="true"></span>
              <span class="theme-choice-copy"><strong>{{ option.name }}</strong><small>{{ option.description }}</small></span>
              @if (themes.theme() === option.value) { <span class="theme-check" aria-hidden="true">✓</span> }
            </button>
          }
        </div>
      }
    </div>
  `,
  styleUrl: './theme-picker.component.css',
})
export class ThemePickerComponent {
  protected readonly themes = inject(ThemeService);
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  protected readonly open = signal(false);
  protected readonly options = [
    { value: 'dark', name: 'Midnight', description: 'Deep and focused', preview: 'dark-preview' },
    { value: 'light', name: 'Light', description: 'Clear and airy', preview: 'light-preview' },
    { value: 'ocean', name: 'Ocean', description: 'Cool and calm', preview: 'ocean-preview' },
    { value: 'forest', name: 'Forest', description: 'Soft and grounded', preview: 'forest-preview' },
  ] as const;
  protected get currentPreview(): string {
    return `theme-swatch ${this.options.find((option) => option.value === this.themes.theme())?.preview ?? 'dark-preview'}`;
  }

  protected selectTheme(theme: ThemeMode): void {
    this.themes.setTheme(theme);
    this.open.set(false);
  }

  @HostListener('document:click', ['$event'])
  protected closeWhenClickingOutside(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  protected closeOnEscape(): void {
    this.open.set(false);
  }
}
